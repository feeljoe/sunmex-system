"use client";
import { formatCurrency } from "@/utils/format";
import { useList } from "@/utils/useList";
import { useEffect, useState } from "react";
import SubmitResultModal from "../modals/SubmitResultModal";
import { RefreshButton } from "../ui/RefreshButton";

export default function BonusesDeductionsTable({ userId }: { userId: string }) {
    const [submitStatus, setSubmitStatus] = useState<"loading" | "success" | "error" | "info" | null>(null);
    const [message, setMessage] = useState("");
    const [adjustments, setAdjustments] = useState<any[]>([]);

    // Create State
    const [isAdjModalOpen, setIsAdjModalOpen] = useState(false);
    const [newAdj, setNewAdj] = useState({ userId: "", type: "bonus", amount: "", reason: "" });

    // Edit State
    const [editingAdj, setEditingAdj] = useState<any | null>(null);
    const [editReason, setEditReason] = useState("");

    // Delete State
    const [deletingAdj, setDeletingAdj] = useState<any | null>(null);

    const { items: users } = useList("/api/users", {
        limit: 100,
    });

    const fetchAdjustments = async () => {
        const [adjRes] = await Promise.all([
            fetch("/api/payroll/adjustments"),
        ]);
        if (adjRes.ok) setAdjustments(await adjRes.json());
    };

    useEffect(() => {
        fetchAdjustments();
    }, []);

    // ------------------------------------------------
    // CREATE LOGIC
    // ------------------------------------------------
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
                fetchAdjustments();
            } else {
                setSubmitStatus("error");
            }
        } catch {
            setSubmitStatus("error");
            setMessage("Could not save payroll adjustment");
        }
    };

    // ------------------------------------------------
    // EDIT LOGIC
    // ------------------------------------------------
    const openEditModal = (adj: any) => {
        setEditingAdj({
            _id: adj._id,
            userId: adj.user?._id || "",
            type: adj.type,
            amount: adj.amount,
            reason: adj.reason
        });
        setEditReason(""); // Reset the edit reason field
    };

    const handleUpdateAdjustment = async () => {
        // Validation: Ensure edit reason is provided
        if (!editReason.trim()) {
            setSubmitStatus("info");
            setMessage("A reason for editing is required.");
            return;
        }

        setSubmitStatus("loading");
        try {
            const res = await fetch(`/api/payroll/adjustments/${editingAdj._id}`, {
                method: "PATCH", // Or PUT, depending on your API setup
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...editingAdj,
                    adminId: userId,
                    editReason: editReason
                }),
            });

            if (res.ok) {
                setSubmitStatus("success");
                setMessage("Adjustment updated successfully");
                setEditingAdj(null);
                setEditReason("");
                fetchAdjustments();
            } else {
                setSubmitStatus("error");
                setMessage("Failed to update adjustment");
            }
        } catch {
            setSubmitStatus("error");
            setMessage("Network error while updating");
        }
    };

    // ------------------------------------------------
    // DELETE LOGIC
    // ------------------------------------------------
    const handleConfirmDelete = async () => {
        setSubmitStatus("loading");
        try {
            const res = await fetch(`/api/payroll/adjustments/${deletingAdj._id}`, {
                method: "DELETE",
            });

            if (res.ok) {
                setSubmitStatus("success");
                setMessage("Adjustment deleted successfully");
                setDeletingAdj(null);
                fetchAdjustments();
            } else {
                setSubmitStatus("error");
                setMessage("Failed to delete adjustment");
            }
        } catch {
            setSubmitStatus("error");
            setMessage("Network error while deleting");
        }
    };

    return (
        <div className="bg-(--secondary) p-6 rounded-xl shadow-xl w-[90vw] h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h3 className="text-2xl font-bold">Pending Adjustments</h3>
                    <p className="text-md text-gray-500">Bonuses and deductions waiting for the next payroll cycle.</p>
                </div>
                <div className="flex gap-4">
                    <RefreshButton onRefresh={fetchAdjustments} />
                    <button
                        onClick={() => setIsAdjModalOpen(true)}
                        className="bg-purple-400 text-purple-800 px-4 py-2 rounded-lg font-bold hover:bg-purple-800 hover:text-white transition-colors cursor-pointer"
                    >
                        + Log Adjustment
                    </button>
                </div>
            </div>

            <div className="flex-1 bg-white h-full w-full rounded-xl shadow-xl overflow-auto">
                <table className="w-full text-left text-md">
                    <thead className="bg-(--tertiary) border-b-2 border-(--quarteary) sticky top-0">
                        <tr>
                            <th className="p-4 font-semibold">Employee</th>
                            <th className="p-4 font-semibold text-center">Type</th>
                            <th className="p-4 font-semibold text-right">Amount</th>
                            <th className="p-4 font-semibold text-center">Reason</th>
                            <th className="p-4 font-semibold">Created By</th>
                            <th className="p-4 font-semibold text-center">Date Logged</th>
                            <th className="p-4 font-semibold text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white">
                        {adjustments.length === 0 ? (
                            <tr className="bg-white"><td colSpan={6} className="p-4 text-center text-2xl">No pending adjustments.</td></tr>
                        ) : adjustments.map((adj) => (
                            <tr key={adj._id} className="border-b hover:bg-gray-100">
                                <td className="p-4 font-bold capitalize">{adj.user?.firstName} {adj.user?.lastName}</td>
                                <td className="p-4 text-center">
                                    <span className={`px-4 py-2 rounded-full text-md font-bold uppercase ${adj.type === 'bonus' ? 'bg-green-400 text-green-800' : 'bg-red-400 text-red-800'}`}>
                                        {adj.type}
                                    </span>
                                </td>
                                <td className={`p-4 font-mono text-right font-bold ${adj.type === 'bonus' ? 'text-green-800' : 'text-red-800'}`}>{formatCurrency(adj.amount)}</td>
                                <td className="p-2 font-bold text-center">
                                    <span className={`p-2 rounded-xl ${adj.type === 'bonus' ? 'bg-green-400 text-green-800' : 'bg-red-400 text-red-800'}`}>
                                        {adj.reason}
                                    </span>
                                </td>
                                <td className="p-2 text-left font-bold">
                                    <span>
                                        {adj.createdBy?.firstName} {adj.createdBy?.lastName}
                                    </span>
                                </td>
                                <td className="p-4 text-center text-gray-600">{new Date(adj.createdAt).toLocaleDateString()}</td>
                                <td className="p-4">
                                    <div className="flex justify-around gap-3">
                                        {/* Edit Button */}
                                        <button
                                            onClick={() => openEditModal(adj)}
                                            className="p-2 bg-blue-400 text-blue-800 rounded-xl hover:bg-blue-800 hover:text-white transition-colors cursor-pointer shadow-sm"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                                            </svg>
                                        </button>

                                        {/* Delete Button */}
                                        <button
                                            onClick={() => setDeletingAdj(adj)}
                                            className="p-2 bg-red-400 text-red-800 rounded-xl hover:bg-red-800 hover:text-white transition-colors cursor-pointer shadow-sm"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                            </svg>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* --- CREATE ADJUSTMENT MODAL --- */}
            {isAdjModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-(--secondary) p-6 rounded-xl shadow-xl w-[600px]">
                        <h3 className="text-xl font-bold mb-4 border-b pb-2 text-center">Log Payroll Adjustment</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-md font-bold text-gray-700 mb-1">Employee</label>
                                <div className="w-full bg-white shadow-xl rounded-lg p-2">
                                    <select
                                        value={newAdj.userId}
                                        onChange={(e) => setNewAdj({ ...newAdj, userId: e.target.value })}
                                        className="w-full h-full outline-hidden"
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
                                            className="w-full h-full outline-hidden"
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
                                        className="w-full bg-white shadow-xl rounded-lg p-2 outline-hidden"
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
                                    className="w-full bg-white shadow-xl rounded-lg p-2 outline-hidden"
                                    placeholder="e.g., Uniform Fee, Sales Bonus"
                                />
                            </div>
                        </div>

                        <div className="flex justify-between mt-6">
                            <button onClick={() => setIsAdjModalOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-bold hover:bg-gray-300 transition-colors cursor-pointer">Cancel</button>
                            <button onClick={handleSaveAdjustment} disabled={!newAdj.userId || !newAdj.amount || !newAdj.reason} className="px-4 py-2 bg-purple-600 text-white rounded-lg font-bold disabled:bg-purple-300 hover:bg-purple-700 transition-colors cursor-pointer">
                                Save Adjustment
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- EDIT ADJUSTMENT MODAL --- */}
            {editingAdj && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-(--secondary) p-4 rounded-xl shadow-xl w-[600px]">
                        <h3 className="text-xl font-bold mb-4 border-b pb-2 text-center text-blue-800">Edit Adjustment</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-md font-bold text-gray-700 mb-1">Employee</label>
                                <div className="w-full bg-white shadow-xl rounded-lg p-2">
                                    <select
                                        value={editingAdj.userId}
                                        onChange={(e) => setEditingAdj({ ...editingAdj, userId: e.target.value })}
                                        className="w-full h-full outline-hidden"
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
                                            value={editingAdj.type}
                                            onChange={(e) => setEditingAdj({ ...editingAdj, type: e.target.value })}
                                            className="w-full h-full outline-hidden"
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
                                        value={editingAdj.amount || ""}
                                        onChange={(e) => setEditingAdj({ ...editingAdj, amount: e.target.value })}
                                        className="w-full bg-white shadow-xl rounded-lg p-2 outline-hidden"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-md font-bold text-gray-700 mb-1">Original Reason</label>
                                <input
                                    type="text"
                                    value={editingAdj.reason}
                                    onChange={(e) => setEditingAdj({ ...editingAdj, reason: e.target.value })}
                                    className="w-full bg-white shadow-xl rounded-lg p-2 outline-hidden"
                                />
                            </div>

                            {/* EDIT REASON FIELD */}
                            <div className="mt-4 pt-4 border-t border-gray-300">
                                <label className="block text-md font-bold text-blue-700 mb-1">Reason for Editing *</label>
                                <textarea
                                    rows={4}
                                    value={editReason}
                                    onChange={(e) => setEditReason(e.target.value)}
                                    className="w-full bg-white shadow-xl rounded-lg p-3 outline-hidden min-h-[80px] border-2 border-blue-200 focus:border-blue-400"
                                    placeholder="Explain why this adjustment was modified..."
                                />
                            </div>
                        </div>

                        <div className="flex justify-between gap-3 mt-6">
                            <button 
                                onClick={() => setEditingAdj(null)} 
                                className="px-2 py-2 bg-gray-300 text-gray-800 rounded-xl font-bold hover:bg-gray-800 hover:text-white transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleUpdateAdjustment} 
                                disabled={!editingAdj.userId || !editingAdj.amount || !editingAdj.reason} 
                                className="px-2 py-2 bg-blue-400 text-blue-800 hover:text-white rounded-xl font-bold disabled:bg-blue-300 hover:bg-blue-800 transition-colors cursor-pointer"
                            >
                                Update Adjustment
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- DELETE CONFIRMATION MODAL --- */}
            {deletingAdj && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-(--tertiary) p-6 rounded-xl shadow-2xl w-[450px]">
                        <h3 className="text-xl font-bold mb-4 text-red-600 text-center">Confirm Deletion</h3>
                        <p className="text-center text-gray-700 mb-6 font-medium">
                            Are you sure you want to delete this <span className="font-bold">{formatCurrency(deletingAdj.amount)}</span> {deletingAdj.type} for <span className="font-bold capitalize">{deletingAdj.user?.firstName} {deletingAdj.user?.lastName}</span>?
                        </p>

                        <div className="flex justify-between gap-3">
                            <button onClick={() => setDeletingAdj(null)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-bold flex-1 hover:bg-gray-300 transition-colors cursor-pointer">
                                Cancel
                            </button>
                            <button onClick={handleConfirmDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg font-bold flex-1 hover:bg-red-700 transition-colors cursor-pointer">
                                Yes, Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* STATUS MODAL */}
            {submitStatus && (
                <SubmitResultModal
                    status={submitStatus}
                    message={message}
                    onClose={() => {
                        setSubmitStatus(null);
                        setMessage("");
                    }}
                    collection="Payroll Adjustment"
                />
            )}
        </div>
    );
}