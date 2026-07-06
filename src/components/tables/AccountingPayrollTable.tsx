"use client";
import { useEffect, useState } from "react";
import { formatCurrency } from "@/utils/format";
import { DateTime } from "luxon";
import { DateRangePicker } from "../ui/DateRangePicker";
import { useList } from "@/utils/useList";
import { RefreshButton } from "../ui/RefreshButton";
import SubmitResultModal from "../modals/SubmitResultModal";

  export default function PayrollTable() {
    const [fromDate, setFromDate] = useState<string>(() => DateTime.now().setZone("America/Phoenix").startOf("week").toFormat("yyyy-MM-dd"));
    const [toDate, setToDate] = useState<string>(() => DateTime.now().setZone("America/Phoenix").endOf("week").toFormat("yyyy-MM-dd"));
    const [submitStatus, setSubmitStatus] = useState<"loading" | "success" | "error" | "info" | null>(null);
    const [message, setMessage] = useState("");
    const {items: paychecks, loading, reload } = useList("/api/payroll", {
      from: fromDate,
      to: toDate,
    });
    const [localStatuses, setLocalStatuses] = useState<Record<string,string>>({});
    
    const toggleStatus = (id: string, currentApiStatus: string) => {
      setLocalStatuses((prev) => {
        const current = prev[id] || currentApiStatus;
        return {...prev, [id]: current === "paid" ? "pending" : "paid" };
      });
    };

    useEffect(() => {
        if (loading) {
          setSubmitStatus((prev) => {
            // Prevent table reloads from overwriting payment Success/Error messages
            if (prev === "success" || prev === "error") return prev;
            
            setMessage("Fetching records...");
            return "loading";
          });
        } else {
          setSubmitStatus((prev) => {
            // Only clear the modal if it was specifically showing the loading state
            if (prev === "loading") return null;
            return prev;
          });
        }
      }, [loading]);

    return (
      <div className="p-4 h-full">
        <h1 className="text-3xl font-bold text-center mb-2 dark:text-white ">Payroll Management</h1>
        <div className="bg-(--secondary) font-mono rounded-xl shadow-xl p-6 h-[75vh] w-[90vw] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-5 items-center">
            <DateRangePicker
              fromDate={fromDate}
              toDate={toDate}
              onChange={(from, to) => {
                setFromDate(from);
                setToDate(to);
              }}
            />
            </div>
        <RefreshButton onRefresh={() => {
          reload();
        }} />
        </div>
        {/* Table Container */}
        <div className="overflow-y-auto bg-white rounded-xl shadow-xl flex-1">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-(--tertiary) z-10 border-b">
              <tr>
                <th className="p-4 font-semibold">Employee Name</th>
                <th className="p-4 font-semibold text-center">Role</th>
                <th className="p-4 font-semibold text-right text-center">Base Salary</th>
                <th className="p-4 font-semibold text-right text-center">Commission</th>
                <th className="p-4 font-semibold text-center">Adjustments</th>
                <th className="p-4 font-semibold text-center">Total Due</th>
                <th className="p-4 font-semibold text-center">Status</th>
                <th className="p-4 font-semibold text-center">Action</th>
              </tr>
            </thead>
            <tbody>
            {loading ? (
                <tr><td colSpan={8} className="text-center p-8">Calculating Payroll...</td></tr>
              ) : paychecks.map((check) => {
                const totalDue = check.baseSalary + check.commission + check.bonuses - check.deductions;
                const displayStatus = localStatuses[check.id] || check.status;
                
                return (
                  <tr key={check.id} className="border-b hover:bg-gray-100 transition-colors">
                    <td className="p-2 font-bold capitalize">
                      {check.firstName} {check.lastName}
                    </td>
                    <td className="p-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        check.role === 'vendor' ? 'bg-purple-400 text-purple-800' : check.role === 'warehouse' ? 'bg-blue-400 text-blue-800'
                        : check.role === 'driver' ? 'bg-green-400 text-green-800' : 'bg-orange-400 text-orange-800'
                      }`}>
                        {check.role}
                      </span>
                    </td>
                    <td className="p-2 text-right text-gray-600">
                      {formatCurrency(check.baseSalary)}
                    </td>
                    <td className="p-2 text-right text-green-600 font-medium">
                      {check.commission > 0 ? formatCurrency(check.commission) : "-"}
                    </td>
                    <td className="p-2 text-right">
                      {check.adjustmentDetails?.length > 0 ? (
                        <div className="flex flex-col gap-1 items-end">
                          {check.adjustmentDetails.map((adj: any, i: number) => (
                            <div key={i} className="flex items-center gap-2 text-xs">
                              <span className="text-gray-500 italic" title={adj.reason}>
                                {adj.reason.length > 15 ? adj.reason.substring(0, 15) + "..." : adj.reason}
                              </span>
                              <span className={`font-bold ${adj.type === 'bonus' ? 'text-green-600' : 'text-red-600'}`}>
                                {adj.type === 'bonus' ? '+' : '-'}{formatCurrency(adj.amount)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="p-2 text-right font-bold text-lg border-l-2">
                      {formatCurrency(totalDue)}
                    </td>
                    <td className="p-2 text-center">
                      <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                        check.status === "paid" 
                          ? "bg-green-100 text-green-800" 
                          : "bg-yellow-100 text-yellow-800"
                      }`}>
                        {check.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-2 text-center">
                      <button
                        onClick={() => toggleStatus(check.id, displayStatus)}
                        className={`p-2 rounded-lg font-bold text-white transition-all shadow-md ${
                          check.status === "paid"
                            ? "bg-gray-400 hover:bg-gray-500"
                            : "bg-blue-600 hover:bg-blue-500"
                        }`}
                      >
                        {check.status === "paid" ? "Mark Pending" : "Mark Paid"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {submitStatus && (
        <SubmitResultModal
          message={message}
          status={submitStatus}
          collection="Payroll"
          />
      )}
      </div>
    )
  }