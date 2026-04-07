"use client";

import { useEffect, useState } from "react";
import SubmitResultModal from "./SubmitResultModal";

interface Props {
  open: boolean;
  client: any;
  chains: any[];
  paymentTerms: any[];
  onClose: () => void;
  onSaved: () => void;
}

const weekdays = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
];

export default function EditClientModal({
  open,
  client,
  chains,
  paymentTerms,
  onClose,
  onSaved,
}: Props) {
  const [form, setForm] = useState<any>({});
  const [chainSearch, setChainSearch] = useState("");
  const [selectedChain, setSelectedChain] = useState(client.chain?.name ?? "");
  const [billingAddress, setBillingAddress] = useState({
    addressLine: client.billingAddress?.addressLine || "",
    city: client.billingAddress?.city || "",
    state: client.billingAddress?.state || "",
    country: client.billingAddress?.country || "",
    zipCode: client.billingAddress?.zipCode || "",
  });
  // STATE
  const [submitStatus, setSubmitStatus] = useState<"loading" | "error" | "success" | null>(null);
  const [message, setMessage] = useState("");
  

  useEffect(() => {
    if (client) {
      setForm({
        ...client,
        chain: client.chain?._id,
        paymentTerm: client.paymentTerm?._id,
        billingAddress: client.billingAddress || {},
      });
      setBillingAddress({
        addressLine: client.billingAddress?.addressLine || "",
        city: client.billingAddress?.city || "",
        state: client.billingAddress?.state || "",
        country: client.billingAddress?.country || "",
        zipCode: client.billingAddress?.zipCode || "",
      });
    }
  }, [client]);

  function updateBillingAddress(field: string, value: string) {
    const updated = {
      ...billingAddress,
      [field]: value,
    };
  
    setBillingAddress(updated);
    setForm({ ...form, billingAddress: updated });
  }

  if (!open || !client) return null;

  const filteredChains =
    chainSearch.trim() === ""
      ? chains
      : chains.filter((c) =>
          c.name.toLowerCase().includes(chainSearch.toLowerCase())
      );

  const toggleDay = (day: string) => {
    const days = form.visitingDays || [];

    if (days.includes(day)) {
      setForm({
        ...form,
        visitingDays: days.filter((d: string) => d !== day),
      });
    } else {
      setForm({
        ...form,
        visitingDays: [...days, day],
      });
    }
  };

  const handleSave = async () => {
    setSubmitStatus("loading");
    const res = await fetch("/api/clients/update", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });
    
    if(!res.ok){
      const error = await res.json();
      setMessage(error?.error || "Could not submit preorder");
      return;
    }
    setSubmitStatus("success");
      setMessage("Client Updated");
    setTimeout(() => {
      onSaved();
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">

      <div className="bg-(--secondary) rounded-xl p-6 w-[700px]">
        <div className="text-xl mb-4 flex items-center gap-10">
          <h2 className="font-semibold">
            Edit Client {client.clientName}
          </h2>
          <h4 className="text-sm">
            ({client.billingAddress?.addressLine}, {client.billingAddress?.city} {client.billingAddress?.state}, {client.billingAddress?.zipCode})
          </h4>
        </div>
        <div className="grid grid-cols-2 gap-4">

          {/* Client Name */}
          <div className="flex flex-col">
          <label>Client name</label>
          <input
            value={form.clientName || ""}
            onChange={(e) =>
              setForm({ ...form, clientName: e.target.value })
            }
            placeholder="Client Name"
            className="bg-white shadow-xl p-2 rounded-xl"
          />
            </div>
          {/* Contact Name */}
          <div className="flex flex-col">
            <label>Contact Name:</label>
          <input
            value={form.contactName || ""}
            onChange={(e) =>
              setForm({ ...form, contactName: e.target.value })
            }
            placeholder="Contact Name"
            className="bg-white shadow-xl p-2 rounded-xl"
          />
</div>
          {/* Phone */}
          <div className="flex flex-col">
            <label>Phone Number</label>
          <input
            value={form.phoneNumber || ""}
            onChange={(e) =>
              setForm({ ...form, phoneNumber: e.target.value })
            }
            placeholder="Phone Number"
            className="bg-white shadow-xl p-2 rounded-xl"
          />
</div>
          {/* Credit Limit */}
          <div className="flex flex-col">
            <label>Credit limit</label>
          <input
            type="number"
            value={form.creditLimit || ""}
            onChange={(e) =>
              setForm({
                ...form,
                creditLimit: Number(e.target.value),
              })
            }
            placeholder="Credit Limit"
            className="bg-white shadow-xl p-2 rounded-xl"
          />
</div>
          {/* Frequency */}
          <div className="flex flex-col">
            <label>Visit Frequency</label>
          <select
            value={form.frequency || ""}
            onChange={(e) =>
              setForm({ ...form, frequency: e.target.value })
            }
            className="bg-white shadow-xl p-2 h-10 rounded-xl"
          >
            <option value="">Frequency</option>
            <option value="weekly">Weekly</option>
            <option value="biweekly">Biweekly</option>
            <option value="monthly">Monthly</option>
          </select>
          </div>
          {/* Payment Term */}
          <div className="flex flex-col">
            <label>Payment Term</label>
          <select
            value={form.paymentTerm || ""}
            onChange={(e) =>
              setForm({
                ...form,
                paymentTerm: e.target.value,
              })
            }
            className="bg-white shadow-xl p-2 h-10 rounded-xl"
          >
            <option value="">Payment Term</option>
            {paymentTerms.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
          </select>
          </div>

        </div>

        {/* Chain Search */}
        <div className="mt-4">
        <p className="text-sm text-gray-500 mb-1">
          Current Chain: <span className="font-semibold">{selectedChain || "None"}</span>
        </p>
          <input
            placeholder="Search Chain..."
            value={chainSearch}
            onChange={(e) =>
              setChainSearch(e.target.value)
            }
            className="bg-white shadow-xl p-2 rounded-xl w-full"
          />

            {chainSearch &&(
          <div className="bg-white shadow-xl p-2 rounded-xl mt-2 max-h-40 overflow-auto">

            {filteredChains.map((chain) => (
              <div
                key={chain._id}
                onClick={() => {
                  setForm({ ...form, chain: chain._id });
                  setSelectedChain(chain?.name);
                  setChainSearch("");
                }}
                className={`p-2 cursor-pointer hover:bg-gray-100 ${
                  form.chain === chain._id
                    ? "bg-gray-200"
                    : ""
                }`}
              >
                {chain.name}
              </div>
            ))}

          </div>
          )}
        </div>

        {/* Billing Address */}
        <div className="grid grid-cols lg:grid-cols-2 p-2 mt-4 gap-4">
        <div className="flex flex-col">
        <label>Address Line</label>
        <input
          placeholder="Address"
          value={billingAddress.addressLine}
          onChange={(e) => updateBillingAddress("addressLine", e.target.value)}
          className="bg-white shadow-xl p-2 rounded-xl w-full"
        />
        </div>

        <div className="flex flex-col">
        <label>City</label>
        <input
          placeholder="City"
          value={billingAddress.city}
          onChange={(e) => updateBillingAddress("city", e.target.value)}
          className="bg-white shadow-xl p-2 rounded-xl w-full"
        />
        </div>

        <div className="flex flex-col">
        <label>State</label>
        <select
          value={billingAddress.state}
          onChange={(e) => updateBillingAddress("state", e.target.value)}
          className="bg-white shadow-xl p-2 rounded-xl w-full h-10 lg:h-full"
        >
          <option value="">Select One</option>
          <option value="AZ">AZ</option>
        </select>
        </div>

        <div className="flex flex-col">
        <label>Zip Code</label>
        <input
          placeholder="Zip Code"
          value={billingAddress.zipCode}
          onChange={(e) => updateBillingAddress("zipCode", e.target.value)}
          className="bg-white shadow-xl p-2 rounded-xl w-full"
        />
        </div>
        </div>

        {/* Visiting Days */}
        <div className="mt-4">

          <p className="font-medium mb-2 text-center text-xl">
            Visiting Days
          </p>

          <div className="flex gap-10 flex-wrap justify-center items-center">

            {weekdays.map((day) => (
              <label key={day} className="flex gap-2">

                <input
                  type="checkbox"
                  className="h-5 w-5"
                  checked={
                    form.visitingDays?.includes(day) ||
                    false
                  }
                  onChange={() => toggleDay(day)}
                />

                {day}

              </label>
            ))}

          </div>

        </div>

        {/* Buttons */}
        <div className="flex justify-between gap-4 mt-6">

          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 rounded-xl shadow-xl hover:bg-gray-100 transition-all duration:300 cursor-pointer"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl shadow-xl hover:bg-blue-300 transition-all duration:300 cursor-pointer"
          >
            Save
          </button>

        </div>

      </div>
      {submitStatus && (
              <SubmitResultModal
                  status={submitStatus}
                  message={message}
                  onClose={() => {
                      setSubmitStatus(null);
                      setMessage("");
                  }}
                  collection="Client"
              />
            )}
    </div>
  );
}