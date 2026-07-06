"use client";

import { useEffect, useState } from "react";
import { RefreshButton } from "../ui/RefreshButton";
import SubmitResultModal from "../modals/SubmitResultModal";
import { PaginatedSelect } from "../ui/PaginatedSelect";

type Tier = { minPrice: number; maxPrice: number | null; percentage: number };
type Rule = { 
    _id?: string;
    ruleType: "brand" | "category"; 
    targetId: string;
    targetName: string; 
    ruleModel: "Brand" | "Type";
    tiers: Tier[] 
};

type TargetModalState = {
    isOpen: boolean;
    mode: "add" | "edit";
    ruleIndex: number | null;
    ruleType: "brand" | "category";
    targetId: string;
    targetName: string;
};

export default function CommissionConfig({userId}: {userId: string}) {
  const [defaultRate, setDefaultRate] = useState<number>(1.5);
  const [rules, setRules] = useState<Rule[]>([]);
  const [submitStatus, setSubmitStatus] = useState<"loading" | "success" | "error" | null>(null);
  const [message, setMessage] = useState("");

  const [targetModal, setTargetModal] = useState<TargetModalState>({
    isOpen: false, mode: "add", ruleIndex: null, ruleType: "brand", targetId: "", targetName: ""
  });

  const fetchSettings = async () => {
    setSubmitStatus("loading");
    try {
        const res = await fetch("/api/commissions");
        const data = await res.json();
        
        if (res.ok) {
            setDefaultRate(data.defaultPercentage || 1.5);
            setRules(data.rules || []);
        } else {
            console.error("API Error:", data.error);
            setDefaultRate(1.5);
            setRules([]);
        }
    } catch (error: any) {
        setSubmitStatus("error");
        console.error("Error fetching rules: ", error);
        // Safety fallback in case of a hard network failure
        setDefaultRate(1.5);
        setRules([]);
    } finally {
        setSubmitStatus(null);
    }
  };

  useEffect(()=> {
      fetchSettings();
  }, []);

  useEffect(() => {
    setTimeout(() => {setSubmitStatus(null);},3000);
  }, [fetchSettings]);

  const openAddModal = () => {
    setTargetModal({ isOpen: true, mode: "add", ruleIndex: null, ruleType: "brand", targetId: "", targetName: ""});
  };
  const openEditModal = (index: number, rule: Rule) => {
    setTargetModal({ isOpen: true, mode: "edit", ruleIndex: index, ruleType: rule.ruleType, targetId: rule.targetId, targetName: rule.targetName});
  };

  const saveTargetModal = () => {
    if(!targetModal.targetId) {
        setSubmitStatus("error");
        setMessage("Please Select a brand or a category");
    }
    if(targetModal.mode === "add") {
        const newRule: Rule = {
            ruleType: targetModal.ruleType,
            ruleModel: targetModal.ruleType === "brand" ? "Brand" : "Type",
            targetId: targetModal.targetId,
            targetName: targetModal.targetName,
            tiers: [
                { minPrice: 0, maxPrice: null, percentage: 2 }
            ],
        };
        setRules([newRule, ...rules]);
    } else if (targetModal.mode === "edit" && targetModal.ruleIndex !== null) {
        const updatedRules = [...rules];
        updatedRules[targetModal.ruleIndex] = {
            ...updatedRules[targetModal.ruleIndex],
            ruleType: targetModal.ruleType,
            ruleModel: targetModal.ruleType === "brand" ? "Brand" : "Type",
            targetId: targetModal.targetId,
            targetName: targetModal.targetName,
        };
        setRules(updatedRules);
    }

    setTargetModal({ ...targetModal, isOpen: false});
  };

  const handleSave = async () => {
    setSubmitStatus("loading");
    try {
        const res = await fetch("/api/commissions", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({defaultPercentage: defaultRate, rules, user: userId}),
        });

        if(res.ok) {
            setSubmitStatus("success");
            setTimeout(() => setSubmitStatus(null), 2000);
        } else {
            setSubmitStatus("error");
        }
    } catch (error: any) {
        setSubmitStatus("error");
    }
  };

  const removeRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  const addTier = (ruleIndex: number) => {
    const updatedRules = [...rules];
    updatedRules[ruleIndex].tiers.push({minPrice: 0, maxPrice: null, percentage: 0});
    setRules(updatedRules);
  };

  const removeTier = (ruleIndex: number, tierIndex: number) => {
    const updatedRules = [...rules];
    updatedRules[ruleIndex].tiers = updatedRules[ruleIndex].tiers.filter((_, i) => i !== tierIndex);
    setRules(updatedRules);
  };

  const updateTier = (ruleIndex: number, tierIndex: number, field: keyof Tier, value: string) => {
    const updatedRules = [...rules];
    const numValue = value === "" ? null : Number(value);
    updatedRules[ruleIndex].tiers[tierIndex] = {
        ...updatedRules[ruleIndex].tiers[tierIndex],
        [field]: numValue,
    };
    setRules(updatedRules);
  };

  return (
    <div className="bg-(--secondary) p-5 rounded-xl shadow-xl w-[90vw] h-[80vh] flex flex-col font-mono">
      <div className="flex justify-between items-center border-b pb-4 mb-6">
        <div>
          <h2 className="text-2xl font-bold">Commission Rules</h2>
          <p className="text-gray-500">Configure global rates and specific item overrides.</p>
        </div>
        <div className="flex gap-4">
            <RefreshButton onRefresh={() => {fetchSettings();}} />
            <button 
                onClick={handleSave}
                className="bg-green-400 text-green-800 px-6 py-2 rounded-xl font-bold hover:bg-green-800 hover:text-white shadow-xl transition-all cursor-pointer"
            >
            Save Configuration
            </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Global Default Section */}
        <div className="mb-4 bg-white p-4 rounded-xl shadow-sm border-l-8 border-blue-400 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-800">Global Default Rate</h3>
            <p className="text-sm text-gray-500">Applied when a product does not match any specific rules.</p>
          </div>
          <div className="flex items-center gap-2">
            <input 
              type="number" 
              value={defaultRate} 
              onChange={(e) => setDefaultRate(Number(e.target.value))}
              className="border-2 border-gray-200 rounded-lg p-2 w-24 text-right font-bold text-lg"
            />
            <span className="text-xl font-bold text-gray-600">%</span>
          </div>
        </div>

        {/* Custom Rules Section */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">Active Rules:</h3>
            <button onClick={openAddModal} className="bg-blue-400 text-blue-800 px-2 py-2 rounded-xl font-bold hover:bg-blue-800 hover:text-white transition-colors cursor-pointer">
              Add New Rule
            </button>
          </div>

          <div className="grid grid-cols-2 gap-5">
            {rules.map((rule, ruleIdx) => (
              <div key={ruleIdx} className="bg-(--tertiary) rounded-xl shadow-xl overflow-hidden">
                <div className="bg-white px-6 py-3 border-b-2 border-(--primary) flex justify-between items-center">
                  {/* Clickable Header for Editing */}
                  <button 
                    onClick={() => openEditModal(ruleIdx, rule)}
                    className="flex items-center gap-3 hover:bg-gray-200 p-2 rounded-lg transition-colors cursor-pointer text-left"
                    title="Click to change Brand/Category"
                  >
                    <span className={`px-3 py-1 text-xs font-bold uppercase rounded-full tracking-wider ${
                      rule.ruleType === 'brand' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'
                    }`}>
                      {rule.ruleType}
                    </span>
                    <span className="font-bold text-lg text-gray-800">{rule.targetName}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-gray-400">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                    </svg>
                  </button>
                  <button onClick={() => removeRule(ruleIdx)} className="text-red-800 bg-red-400 rounded-xl py-2 px-4 text-sm font-bold hover:underline hover:text-white hover:bg-red-800 cursor-pointer transition-colors duration:500">Delete Rule</button>
                </div>

                <div className="p-4 space-y-2">
                  <div className="grid grid-cols-4 text-sm font-bold text-black text-center uppercase tracking-wider px-2">
                    <div>Min Price ($)</div>
                    <div>Max Price ($)</div>
                    <div>Commission Rate (%)</div>
                    <div></div>
                  </div>
                  
                  {rule.tiers.map((tier, tierIdx) => (
                    <div key={tierIdx} className="grid grid-cols-4 gap-4 items-center bg-gray-200 p-2 rounded-xl">
                      <input 
                        type="number" 
                        value={tier.minPrice} 
                        onChange={(e) => updateTier(ruleIdx, tierIdx, "minPrice", e.target.value)}
                        className="font-mono bg-white p-2 shadow-xl rounded-md text-center"
                      />
                      <input 
                        type="number" 
                        placeholder="∞"
                        value={tier.maxPrice === null ? "" : tier.maxPrice} 
                        onChange={(e) => updateTier(ruleIdx, tierIdx, "maxPrice", e.target.value)}
                        className="font-mono bg-white p-2 shadow-xl rounded-md text-center"
                      />
                      <input 
                        type="number" 
                        value={tier.percentage || ""} 
                        min={0}
                        max={100}
                        onChange={(e) => updateTier(ruleIdx, tierIdx, "percentage", e.target.value)}
                        className="font-bold text-green-600 bg-white p-2 border border-green-200 rounded-md text-center"
                      />
                      <div className="text-right pr-2">
                        <button onClick={() => removeTier(ruleIdx, tierIdx)} className="text-gray-800 bg-gray-400 px-4 py-2 rounded-xl hover:text-white hover:bg-red-600 font-bold text-sm cursor-pointer transition-colors duration:500">Remove</button>
                      </div>
                    </div>
                  ))}
                  
                  <button onClick={() => addTier(ruleIdx)} className="mt-2 text-sm text-blue-800 bg-blue-400 rounded-xl px-4 py-2 font-bold hover:underline hover:text-white hover:bg-blue-800 cursor-pointer transition-colors duration:500">
                    + Add Price Tier
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Target Selection Modal */}
      {targetModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white p-6 rounded-xl shadow-2xl w-[400px]">
                <h3 className="text-xl font-bold mb-4 border-b pb-2">
                    {targetModal.mode === "add" ? "Create New Rule" : "Edit Target"}
                </h3>
                
                <div className="mb-4">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Rule Type</label>
                    <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                                type="radio" 
                                checked={targetModal.ruleType === "brand"} 
                                onChange={() => setTargetModal({...targetModal, ruleType: "brand", targetId: "", targetName: ""})}
                                className="w-4 h-4 text-blue-600"
                            />
                            Brand
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                                type="radio" 
                                checked={targetModal.ruleType === "category"} 
                                onChange={() => setTargetModal({...targetModal, ruleType: "category", targetId: "", targetName: ""})}
                                className="w-4 h-4 text-blue-600"
                            />
                            Category
                        </label>
                    </div>
                </div>

                <div className="mb-6 h-32">
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                        Select {targetModal.ruleType === "brand" ? "Brand" : "Category"}
                    </label>
                    {/* Make sure the container has a high enough Z-index if PaginatedSelect drops down */}
                    <div className="relative z-50">
                        <PaginatedSelect
                            endpoint={targetModal.ruleType === "brand" ? "/api/brands" : "/api/types"}
                            value={targetModal.targetId}
                            onChange={(id, label) => setTargetModal({...targetModal, targetId: id, targetName: label})}
                            placeholder={`Select a ${targetModal.ruleType}...`}
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-10">
                    <button 
                        onClick={() => setTargetModal({...targetModal, isOpen: false})}
                        className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-bold hover:bg-gray-300"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={saveTargetModal}
                        disabled={!targetModal.targetId}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-500 disabled:bg-blue-300"
                    >
                        {targetModal.mode === "add" ? "Create Rule" : "Update Target"}
                    </button>
                </div>
            </div>
        </div>
      )}

      {submitStatus && (
          <SubmitResultModal
              status={submitStatus}
              message={message}
              onClose={() => {
                setSubmitStatus(null);
                setMessage("");
            }}
              collection="Commission Settings"
          />
      )}
    </div>
  );
}