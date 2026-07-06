"use client";
import { formatCurrency } from "@/utils/format";
import { useList } from "@/utils/useList";
import { useEffect, useState } from "react";
import SubmitResultModal from "../modals/SubmitResultModal";
import { RefreshButton } from "../ui/RefreshButton";


export default function BonusesDeductionsTable({ userId }: { userId: string }) {
    const [submitStatus, setSubmitStatus] = useState<"loading" | "success" | "error" | null>(null);
    const [message, setMessage] = useState("");
    const [adjustments, setAdjustments] = useState<any[]>([]);
    const [isAdjModalOpen, setIsAdjModalOpen] = useState(false);
    const [newAdj, setNewAdj] = useState({ userId: "", type: "bonus", amount: "", reason: "" });
    const { items: users } = useList("/api/users");

    const fetchAdjustments = async () => {
        const [adjRes] = await Promise.all([
            fetch("/api/payroll/adjustments"),
        ]);
        if (adjRes.ok) setAdjustments(await adjRes.json());
    };

    useEffect(() => {
        fetchAdjustments();
    }, []);

    const handleSaveAdjustment = async () => {
        setSubmitStatus("loading");
        try {
            const res = await fetch("/api/payroll/adjustments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...newAdj, adminId: userId }),
            });
            if (res.ok) {
                setSubmitStatus("success");
                setMessage("Payroll Adjustment saved successfully");
                setIsAdjModalOpen(false);
                setNewAdj({ userId: "", type: "bonus", amount: "", reason: "" });
                fetchAdjustments(); // Refresh the list
            } else {
                setSubmitStatus("error");
            }
        } catch {
            setSubmitStatus("error");
            setMessage("Could not save payroll adjustment");
        }
    };

    return (
        <div className = "bg-(--secondary) p-6 rounded-xl shadow-xl w-full h-full flex flex-col">
        {/* --- ADJUSTMENTS SECTION --- */ }
                <div className="h-full">
                    <div className="h-full">
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h3 className="text-2xl font-bold">Pending Adjustments</h3>
                                <p className="text-md text-gray-500">Bonuses and deductions waiting for the next payroll cycle.</p>
                            </div>
                            <div className="flex gap-4">
                            <RefreshButton onRefresh={() => {fetchAdjustments();}} />
                            <button
                                onClick={() => setIsAdjModalOpen(true)}
                                className="bg-purple-400 text-purple-800 px-4 py-2 rounded-lg font-bold hover:bg-purple-800 hover:text-white transition-colors cursor-pointer"
                            >
                                + Log Adjustment
                            </button>
                            </div>
                        </div>

                        <div className="bg-(--tertiary) h-vh80 rounded-xl shadow-sm overflow-auto">
                            <table className="w-full text-left text-md">
                                <thead className="bg-white border-b-2 border-(--quarteary)">
                                    <tr>
                                        <th className="p-4 font-semibold">Employee</th>
                                        <th className="p-4 font-semibold">Type</th>
                                        <th className="p-4 font-semibold">Amount</th>
                                        <th className="p-4 font-semibold">Reason</th>
                                        <th className="p-4 font-semibold text-right">Date Logged</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {adjustments.length === 0 ? (
                                        <tr className="bg-(--tertiary)"><td colSpan={5} className="p-4 text-center text-white text-2xl">No pending adjustments.</td></tr>
                                    ) : adjustments.map((adj) => (
                                        <tr key={adj._id} className="border-b hover:bg-gray-50 bg-(--tertiary)">
                                            <td className="p-4 font-bold capitalize">{adj.user?.firstName} {adj.user?.lastName}</td>
                                            <td className="p-4">
                                                <span className={`px-4 py-2 rounded-full text-md font-bold uppercase ${adj.type === 'bonus' ? 'bg-green-400 text-green-800' : 'bg-red-400 text-red-800'}`}>
                                                    {adj.type}
                                                </span>
                                            </td>
                                            <td className={`p-4 font-mono font-bold ${adj.type === 'bonus' ? 'text-green-800' : 'text-red-800'}`}>{formatCurrency(adj.amount)}</td>
                                            <td className={`p-2 font-bold`}>
                                                <span className={`p-2 rounded-xl ${adj.type === 'bonus' ? 'bg-green-400 text-green-800' : 'bg-red-400 text-red-800'}`}>
                                                    {adj.reason}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right text-gray-400">{new Date(adj.createdAt).toLocaleDateString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* --- ADJUSTMENT MODAL --- */}
                    {isAdjModalOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                            <div className="bg-(--tertiary) p-6 rounded-xl shadow-2xl w-[600px]">
                                <h3 className="text-xl font-bold mb-4 border-b pb-2 text-center">Log Payroll Adjustment</h3>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-md font-bold text-gray-700 mb-1">Employee</label>
                                        <div className="w-full bg-white shadow-xl rounded-lg p-2">
                                            <select
                                                value={newAdj.userId}
                                                onChange={(e) => setNewAdj({ ...newAdj, userId: e.target.value })}
                                                className="w-full h-full"
                                            >
                                                <option value="">Select Employee...</option>
                                                {users.map(u => (
                                                    <option key={u._id} value={u._id}>{u.firstName} {u.lastName}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="flex gap-4">
                                        <div className="flex-1">
                                            <label className="block text-md font-bold text-gray-700 mb-1">Type</label>
                                            <div className="w-full rounded-lg p-2 bg-white shadow-xl">
                                                <select
                                                    value={newAdj.type}
                                                    onChange={(e) => setNewAdj({ ...newAdj, type: e.target.value })}
                                                    className="w-full h-full"
                                                >
                                                    <option value="bonus">Bonus (+)</option>
                                                    <option value="deduction">Deduction (-)</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-md font-bold text-gray-700 mb-1">Amount ($)</label>
                                            <input
                                                type="number"
                                                inputMode="decimal"
                                                min={0}
                                                value={newAdj.amount || ""}
                                                onChange={(e) => setNewAdj({ ...newAdj, amount: e.target.value })}
                                                className="w-full bg-white shadow-xl rounded-lg p-2"
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-md font-bold text-gray-700 mb-1">Reason</label>
                                        <input
                                            type="text"
                                            value={newAdj.reason}
                                            onChange={(e) => setNewAdj({ ...newAdj, reason: e.target.value })}
                                            className="w-full bg-white shadow-xl rounded-lg p-2"
                                            placeholder="e.g., Uniform Fee, Sales Bonus"
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 mt-6">
                                    <button onClick={() => setIsAdjModalOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-bold">Cancel</button>
                                    <button onClick={handleSaveAdjustment} disabled={!newAdj.userId || !newAdj.amount || !newAdj.reason} className="px-4 py-2 bg-purple-600 text-white rounded-lg font-bold disabled:bg-purple-300">
                                        Save Adjustment
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
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