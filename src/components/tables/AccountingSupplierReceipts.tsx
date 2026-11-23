"use client";
import { useList } from '@/utils/useList';
import { RefreshButton } from '@/components/ui/RefreshButton';
import { SearchBar } from '@/components/ui/SearchBar';
import { useEffect, useState } from 'react';
import { SupplierReceiptSummaryModal } from "@/components/modals/SupplierReceiptSummaryModal";
import SubmitResultModal from '@/components/modals/SubmitResultModal';
import { DateRangePicker } from '../ui/DateRangePicker';
import { DateTime } from 'luxon';
import { formatCurrency } from '@/utils/format';
import { PaginatedSelect } from '../ui/PaginatedSelect';
import { AnimatePresence, motion } from 'framer-motion';
import { SingleDatePicker } from '../ui/SingleDatePicker';

export function AccountingSupplierReceiptsTable() {
  const [page, setPage] = useState(1);
  const [limit] = useState(100);
  const [search, setSearch] = useState("");
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"success" | "loading" | "info" | "error" | null>(null);
  const [message, setMessage] = useState("");
  const [fromDate, setFromDate] = useState(() => DateTime.now().setZone("America/Phoenix").startOf("week").toFormat("yyyy-MM-dd"));
  const [toDate, setToDate] = useState(() => DateTime.now().setZone("America/Phoenix").endOf("week").toFormat("yyyy-MM-dd"));

  // Payment State
  const [paymentInputs, setPaymentInputs] = useState<Record<string, any>>({});
  const [expandedPaymentRows, setExpandedPaymentRows] = useState<Set<string>>(() => new Set());
  type SupplierPaymentDateEdit = {
    receiptId: string;
    invoice: string;
    paymentId: string;
    paymentType: string;
    checkNumber?: string;
    amount: number;
    originalDate: string | null;
    receivedAt: string | null;
  };

  const [paymentDateEdit, setPaymentDateEdit] = useState<SupplierPaymentDateEdit | null>(null);
  const [editedPaymentDate, setEditedPaymentDate] = useState("");
  const [confirmDateUpdate, setConfirmDateUpdate] = useState(false);
  const [updatingPaymentDate, setUpdatingPaymentDate] = useState(false);
  const [paymentDateError, setPaymentDateError] = useState("");

  type SupplierPaymentToDelete = {
    receiptId: string;
    invoice: string;
    paymentId: string;
    paymentType: string;
    amount: number;
    checkNumber?: string;
    date: string | null;
    receivedAt: string | null;
  };

  const [paymentToDelete, setPaymentToDelete] = useState<SupplierPaymentToDelete | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [deletingPayment, setDeletingPayment] = useState(false);
  const [deletePaymentError, setDeletePaymentError] = useState("");

  const togglePaymentHistory = (receiptId: string) => {
    setExpandedPaymentRows((prev) => {
      const next = new Set(prev);
      if (next.has(receiptId)) {
        next.delete(receiptId);
      } else {
        next.add(receiptId);
      }
      return next;
    });
  };
  const todayPhoenix = () => DateTime.now().setZone("America/Phoenix").toFormat("yyyy-MM-dd");

  const getPaymentDate = (
    paymentDate?: string | Date | null,
    receivedAt?: string | Date | null
  ) => {
    const candidates = [
      { value: paymentDate, source: "payment" },
      { value: receivedAt, source: "receipt" },
    ] as const;

    for (const candidate of candidates) {
      if (!candidate.value) continue;

      const date = DateTime.fromJSDate(
        new Date(candidate.value)
      ).setZone("America/Phoenix");

      if (date.isValid) {
        return {
          date: date.toFormat("MM/dd/yyyy"),
          source: candidate.source,
        };
      }
    }

    return {
      date: "Payment date unavailable",
      source: "unavailable" as const,
    };
  };

  const toPhoenixInputDate = (
    value?: string | Date | null
  ) => {
    if (!value) {
      return DateTime.now()
        .setZone("America/Phoenix")
        .toFormat("yyyy-MM-dd");
    }

    const parsed = DateTime.fromJSDate(
      new Date(value)
    ).setZone("America/Phoenix");

    return parsed.isValid
      ? parsed.toFormat("yyyy-MM-dd")
      : DateTime.now()
        .setZone("America/Phoenix")
        .toFormat("yyyy-MM-dd");
  };

  const formatDate = (v?: string) => v ? new Date(v).toLocaleDateString() : "-";

  const { items, total, meta, reload } = useList('/api/supplierReceipts', { page, limit, search, fromDate, toDate, supplier: selectedSupplier });

  const amountPaid = meta?.amountPaid || 0;
  const amountOwed = meta?.amountOwed || 0;

  useEffect(() => { setPage(1); }, [search, fromDate, toDate]);

  useEffect(() => {
    setTimeout(() => { setSubmitStatus(null); }, 3000);
  }, [reload]);

  const totalPages = total > 0 ? Math.ceil(total / limit) : 1;

  const orderSummary = (receipt: any) => {
    setSelectedReceipt(receipt);
    setShowSummary(true);
  }

  // --- NEW PAYMENT HANDLER ---

  const [payingReceiptId, setPayingReceiptId] =
    useState<string | null>(null);

  // --- SUPPLIER RECEIPT PAYMENT HANDLER ---
  const handlePay = async (receiptId: string) => {
    if (payingReceiptId !== null) return;

    const input = paymentInputs[receiptId];

    if (!input) return;
    const paymentDate = input.paymentDate || todayPhoenix();
    const parsedPaymentDate = DateTime.fromFormat(paymentDate, "yyyy-MM-dd", { zone: "America/Phoenix" });
    if (!parsedPaymentDate.isValid || parsedPaymentDate.toFormat("yyyy-MM-dd") !== paymentDate) {
      setSubmitStatus("info");
      setMessage("Please select a valid payment date.");
      return;
    }
    const effectivePaymentDate = parsedPaymentDate.set({ hour: 12, minute: 0, second: 0, millisecond: 0 }).toISO();

    const method = input.method;
    const amount = Number(input.amount);
    const checkNumber = String(
      input.checkNumber ?? ""
    ).trim();

    if (!["cash", "check", "transfer"].includes(method)) {
      setSubmitStatus("info");
      setMessage("Please select a payment method.");
      return;
    }

    if (
      input.amount === "" ||
      input.amount == null ||
      !Number.isFinite(amount) ||
      amount < 0
    ) {
      setSubmitStatus("info");
      setMessage("Please enter a valid payment amount.");
      return;
    }

    if (method === "check" && !checkNumber) {
      setSubmitStatus("info");
      setMessage("Please enter the check number.");
      return;
    }

    try {
      setPayingReceiptId(receiptId);

      // IMPORTANT:
      // Send only the new payment.
      // The API appends it to existing payments.
      const response = await fetch(
        `/api/supplierReceipts/${receiptId}/pay`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "same-origin",
          body: JSON.stringify({
            payments: [
              {
                type: method,
                amount,
                ...(method === "check"
                  ? { checkNumber }
                  : {}),
                date: effectivePaymentDate,
              },
            ],
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ??
          "Failed to record supplier payment."
        );
      }

      setPaymentInputs((prev) => ({
        ...prev,
        [receiptId]: {},
      }));

      await reload();
    } catch (error: any) {
      console.error(
        "SUPPLIER RECEIPT PAYMENT ERROR:",
        error
      );
      setSubmitStatus("error");

      setMessage(
        error.message ??
        "Unable to record supplier payment."
      );
    } finally {
      setPayingReceiptId(null);
    }
  };


  const getStatusStyle = (status: string) => {
    if (status === "paid") return "bg-green-200 text-green-800";
    if (status === "overdue") return "bg-red-200 text-red-800";
    return "bg-yellow-200 text-yellow-800";
  };

  const openPaymentDateEditor = (
    receipt: any,
    payment: any
  ) => {
    if (!payment._id) {
      setSubmitStatus("error");
      setMessage("This payment does not have an ID.");
      return;
    }

    setPaymentDateEdit({
      receiptId: String(receipt._id),
      invoice: receipt.invoice,
      paymentId: String(payment._id),
      paymentType: payment.type,
      checkNumber: payment.checkNumber,
      amount: Number(payment.amount),
      originalDate: payment.date || null,
      receivedAt: receipt.receivedAt || null,
    });

    // First use the saved payment date.
    // Otherwise use the receipt arrival date.
    setEditedPaymentDate(
      toPhoenixInputDate(
        payment.date || receipt.receivedAt
      )
    );

    setConfirmDateUpdate(false);
    setPaymentDateError("");
  };

  const handleUpdatePaymentDate = async () => {
    if (!paymentDateEdit || updatingPaymentDate) return;

    setUpdatingPaymentDate(true);
    setPaymentDateError("");

    try {
      const response = await fetch(
        `/api/supplierReceipts/${paymentDateEdit.receiptId}/pay/update-date`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "same-origin",
          body: JSON.stringify({
            paymentId: paymentDateEdit.paymentId,
            paymentDate: editedPaymentDate,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "Unable to update payment date."
        );
      }

      // Fetch authoritative updated payment data.
      await reload();

      setPaymentDateEdit(null);
      setConfirmDateUpdate(false);

      setSubmitStatus("success");
      setMessage(
        result.unchanged
          ? "Payment date is already correct."
          : "Supplier payment date updated successfully."
      );
    } catch (error: any) {
      setPaymentDateError(
        error.message || "Failed to update payment date."
      );
    } finally {
      setUpdatingPaymentDate(false);
    }
  };

  const openDeletePayment = (
    receipt: any,
    payment: any
  ) => {
    if (!payment._id) {
      setSubmitStatus("error");
      setMessage("This payment does not have an ID.");
      return;
    }

    setPaymentToDelete({
      receiptId: String(receipt._id),
      invoice: receipt.invoice,
      paymentId: String(payment._id),
      paymentType: payment.type,
      amount: Number(payment.amount),
      checkNumber: payment.checkNumber,
      date: payment.date || null,
      receivedAt: receipt.receivedAt || null,
    });

    setDeleteReason("");
    setDeletePaymentError("");
  };

  const handleDeletePayment = async () => {
    if (!paymentToDelete || deletingPayment) return;

    const reason = deleteReason.trim();

    if (reason.length < 5 || reason.length > 500) {
      setDeletePaymentError(
        "Please enter a reason between 5 and 500 characters."
      );
      return;
    }

    setDeletingPayment(true);
    setDeletePaymentError("");

    try {
      const response = await fetch(
        `/api/supplierReceipts/${paymentToDelete.receiptId}/pay/${paymentToDelete.paymentId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "same-origin",
          body: JSON.stringify({
            reason,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.error || "Unable to delete payment."
        );
      }

      // Reload authoritative information from MongoDB.
      await reload();

      setPaymentToDelete(null);
      setDeleteReason("");

      setSubmitStatus("success");
      setMessage(
        "Supplier payment deleted successfully. Invoice balance updated."
      );
    } catch (error: any) {
      setDeletePaymentError(
        error.message || "Failed to delete payment."
      );
    } finally {
      setDeletingPayment(false);
    }
  };

  return (
    <div className='bg-(--secondary) rounded-lg shadow-xl p-6 flex flex-col h-[75vh] w-[90vw]'>
      <p className="border-b border-(--quarteary) text-center text-xl font-bold mb-4">Filters</p>
      <div className="flex gap-4 mb-5 items-center justify-center">
        <PaginatedSelect
          endpoint="/api/suppliers"
          value={selectedSupplier}
          onChange={setSelectedSupplier}
          placeholder="All Suppliers"
        />
        {(selectedSupplier) && (
          <button
            onClick={() => { setSelectedSupplier(""); }}
            className="text-md p-2 rounded-xl bg-red-400 text-white hover:underline hover:bg-red-200 transition-all duration:300 cursor-pointer whitespace-nowrap"
          >
            Reset Filters
          </button>
        )}
      </div>
      <div className="flex justify-between items-center gap-5 mb-4">
        <DateRangePicker
          fromDate={fromDate}
          toDate={toDate}
          onChange={(from, to) => {
            setFromDate(from);
            setToDate(to);
          }}
        />
        <SearchBar placeholder="Search Invoice / PO / Client Name ..." onSearch={setSearch} debounce />
        <RefreshButton onRefresh={() => { reload(); setSubmitStatus("loading"); }} />
      </div>

      <div className='flex-1 overflow-auto bg-white rounded-xl shadow-xl'>
        <table className='w-full text-left text-sm'>
          <thead className='bg-gray-100 sticky top-0'>
            <tr className='border-b'>
              <th className='p-2 whitespace-nowrap'>Invoice</th>
              <th className='p-2 whitespace-nowrap'>PO</th>
              <th className='p-2 whitespace-nowrap'>Supplier</th>
              <th className='p-2 whitespace-nowrap text-center'>Date Arrived</th>
              <th className='p-2 whitespace-nowrap text-right'>Total</th>
              <th className='p-2 whitespace-nowrap text-right'>Paid</th>
              <th className='p-2 whitespace-nowrap text-right'>Balance</th>
              <th className='p-2 whitespace-nowrap text-center'>Status</th>
              <th className='p-2 whitespace-nowrap text-center min-w-[420px]'>Payment / History</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr><td colSpan={9} className='p-4 text-center text-gray-500'>No receipts found</td></tr>
            )}

            {items.map((it: any) => {
              // Calculate specific row values
              const paidAmount = it.payments?.reduce((sum: number, p: any) => sum + p.amount, 0) || 0;
              const balance = Math.max(it.total - paidAmount, 0);
              const currentStatus = it.paymentStatus || "pending";

              return (
                <tr key={it._id} className='border-b hover:bg-gray-50 cursor-pointer transition-colors' onClick={() => orderSummary(it)}>
                  <td className='p-2 whitespace-nowrap font-bold'>
                    <span>{it.invoice}</span>
                  </td>
                  <td>
                    <span className="p-2 whitespace-nowrap">{it.poNumber}</span>
                  </td>
                  <td className='p-2 whitespace-nowrap capitalize'>{it.supplier?.name.toLowerCase()}</td>
                  <td className='p-2 whitespace-nowrap text-center'>{formatDate(it.receivedAt)}</td>
                  <td className='p-2 whitespace-nowrap text-right'>{formatCurrency(it.total)}</td>
                  <td className='p-2 whitespace-nowrap text-right text-green-600'>{formatCurrency(paidAmount)}</td>
                  <td className={`p-2 whitespace-nowrap text-right font-bold ${balance > 0 ? "text-red-600" : "text-green-600"}`}>{formatCurrency(balance)}</td>
                  <td className='p-2 whitespace-nowrap text-center'>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusStyle(currentStatus)}`}>
                      {currentStatus.toUpperCase()}
                    </span>
                  </td>

                  {/* PAYMENT COLUMN */}
                  <td className='p-2 min-w-[420px] align-top' onClick={(e) => e.stopPropagation()}>
                    <div className='flex flex-col w-full gap-3'>
                      {it.payments && it.payments.length > 0 && (
                        <div className='flex flex-col w-full border-b border-gray-300 pb-2'>
                          <div className='flex items-center justify-between'>
                            <button
                              type='button'
                              onClick={() => togglePaymentHistory(it._id)}
                              aria-expanded={expandedPaymentRows.has(it._id)}
                              className='flex items-center gap-2 text-gray-700 hover:text-blue-700 cursor-poiner font-bold text-sm'>
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={2.5}
                                stroke="currentColor"
                                className={`size-5 transition-transform duration-300 ${expandedPaymentRows.has(it._id)
                                  ? "rotate-90"
                                  : ""
                                  }`}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="m9 18 6-6-6-6"
                                />
                              </svg>
                              <span> Payment History ({it.payments.length})</span>
                            </button>
                            <span className='text-xs text-gray-500 font-bold'>
                              {formatCurrency(paidAmount)}
                            </span>
                          </div>
                          <AnimatePresence initial={false}>
                            {expandedPaymentRows.has(it._id) && (
                              <motion.div
                                key={`supplier-payment-history-${it._id}`}
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ height: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }, opacity: { duration: 0.2, ease: "easeInOut" }, }}
                                style={{ overflow: "hidden" }}
                                className='w-full'
                              >
                                <div className='flex flex-col gap-2 mt-3'>

                                  {it.payments.map((p: any, idx: number) => (
                                    <div
                                      key={p._id || idx}
                                      className="flex items-center gap-2 bg-gray-50 rounded-lg p-2 border border-gray-200"
                                    >
                                      {/* EDIT PAYMENT DATE */}
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openPaymentDateEditor(it, p);
                                        }}
                                        title="Click to edit payment date"
                                        className="flex-1 min-w-0 flex flex-col gap-1 text-left hover:bg-blue-100 rounded-lg p-2 transition-colors cursor-pointer"
                                      >
                                        {/* PAYMENT TYPE AND AMOUNT */}
                                        <div className="flex items-center justify-between gap-3 w-full">
                                          <span className="font-bold text-gray-700">
                                            {p.type === "cash" && "Cash"}

                                            {p.type === "check" &&
                                              `Check${p.checkNumber ? ` #${p.checkNumber}` : ""}`}

                                            {p.type === "transfer" && "Transfer"}
                                          </span>

                                          <span className="font-bold text-gray-800">
                                            {formatCurrency(Number(p.amount) || 0)}
                                          </span>
                                        </div>

                                        {/* PAYMENT DATE + EDIT ICON */}
                                        <div className="flex items-center justify-between w-full gap-2 text-xs text-gray-500">
                                          <div className="flex flex-col gap-1">
                                            <span>
                                              Paid: {getPaymentDate(p.date, it.receivedAt).date}
                                            </span>

                                            {getPaymentDate(p.date, it.receivedAt).source ===
                                              "receipt" && (
                                                <span className="text-[10px] text-amber-700 font-medium">
                                                  Using receipt arrival date
                                                </span>
                                              )}
                                          </div>

                                          <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            strokeWidth={1.5}
                                            stroke="currentColor"
                                            className="size-4 shrink-0"
                                          >
                                            <path
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125"
                                            />
                                          </svg>
                                        </div>
                                      </button>

                                      {/* DELETE PAYMENT BUTTON */}
                                      <button
                                        type="button"
                                        title="Delete payment"
                                        aria-label="Delete payment"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openDeletePayment(it, p);
                                        }}
                                        className="shrink-0 p-2 bg-red-100 text-red-700 rounded-xl hover:bg-red-600 hover:text-white transition-colors cursor-pointer"
                                      >
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          fill="none"
                                          viewBox="0 0 24 24"
                                          strokeWidth={1.5}
                                          stroke="currentColor"
                                          className="size-5"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                                          />
                                        </svg>
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                      {currentStatus !== "paid" && (
                        <div className='flex flex-col gap-3 w-full'>
                          {it.payments && it.payments.length > 0 && (
                            <div className='flex items-center justify-between bg-yellow-100 text-yellow-800 px-3 py-2 rounded-lg text-sm font-bold'>
                              <span>Remaining Balance</span>
                              <span>{formatCurrency(balance)}</span>
                            </div>
                          )}
                          <div className='flex flex-wrap w-full items-center gap-2 justify-between'>
                            <select
                              value={paymentInputs[it._id]?.method || ""}
                              onChange={(e) => setPaymentInputs((prev) => ({
                                ...prev, [it._id]: {
                                  ...prev[it._id],
                                  method: e.target.value,
                                },
                              }))}
                              className='bg-blue-200 shadow h-10 w-28 rounded-xl text-gray-700 font-bold text-center outline-none cursor-pointer text-sm'
                            >
                              <option value="">Type</option>
                              <option value="cash">Cash</option>
                              <option value="check">Check</option>
                              <option value="transfer">Transfer</option>
                            </select>
                            <input
                              type='number'
                              inputMode='decimal'
                              min="0.01"
                              max={balance}
                              step="0.01"
                              placeholder='Amount'
                              value={paymentInputs[it._id]?.amount ?? ""}
                              onChange={(e) => setPaymentInputs((prev) => ({
                                ...prev, [it._id]: {
                                  ...prev[it._id],
                                  amount: e.target.value,
                                },
                              }))}
                              className='bg-blue-200 shadow text-gray-700 font-bold rounded-xl px-2 w-28 h-10 outline-none text-sm'
                            />
                            {paymentInputs[it._id]?.method === "check" && (
                              <input
                                type='text'
                                placeholder='Check #'
                                value={paymentInputs[it._id]?.checkNumber || ""}
                                onChange={(e) => setPaymentInputs((prev) => ({
                                  ...prev, [it._id]: {
                                    ...prev[it._id],
                                    checkNumber: e.target.value,
                                  },
                                }))}
                                className='bg-blue-200 shadow text-gray-700 font-bold rounded-xl h-10 px-2 w-24 outline-none text-sm'
                              />
                            )}
                            <SingleDatePicker
                              text='Select Payment Date'
                              value={paymentInputs[it._id]?.paymentDate || todayPhoenix()}
                              onChange={(e) => setPaymentInputs((prev) => ({
                                ...prev, [it._id]: {
                                  ...prev[it._id],
                                  paymentDate: e,
                                },
                              }))}
                              reason='Accounting'
                            />
                            <button
                              type='button'
                              disabled={
                                payingReceiptId !== null ||
                                !paymentInputs[it._id]?.method ||
                                !paymentInputs[it._id]?.amount ||
                                Number(paymentInputs[it._id]?.amount) < 0 ||
                                Number(paymentInputs[it._id]?.amount) > balance ||
                                (
                                  paymentInputs[it._id]?.method === "check" &&
                                  !String(paymentInputs[it._id]?.checkNumber || "").trim()
                                )
                              }
                              onClick={() => handlePay(it._id)}
                              className='bg-green-400 text-green-800 hover:bg-green-800 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed h-10 px-4 rounded-xl cursor-pointer transition-colors font-bold text-sm'
                            >
                              {payingReceiptId === it._id ? "Saving..." : "Pay"}
                            </button>
                          </div>
                        </div>
                      )}
                      {currentStatus === "paid" && (
                        <div className='flex items-center justify-center gap-2 text-green-700 text-xs font-bold'>
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                          </svg>
                          <span>Fully Paid</span>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className='flex justify-end p-1 gap-5 font-bold mt-2 text-lg'>
        <div>Amount Paid: <span className='text-green-600'>{formatCurrency(amountPaid)}</span></div>
        <div>Amount Owed: <span className='text-red-600'>{formatCurrency(amountOwed)}</span></div>
      </div>

      <div className="flex justify-end items-center gap-4">
        <span className=''>Showing {items.length} of {total} receipts</span>
        <button disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="p-2 bg-blue-400 text-blue-800 hover:text-white hover:bg-blue-800 transition-colors rounded-xl shadow-xl disabled:opacity-50">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </button>
        <span className="px-3 py-1">Page {page} of {totalPages || 1}</span>
        <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="p-2 bg-blue-400 text-blue-800 hover:text-white hover:bg-blue-800 transition-colors rounded-xl disabled:opacity-50">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
        </button>
      </div>


      {/* ==========================================
          SUPPLIER PAYMENT DATE EDIT MODAL
          ========================================== */}
      {paymentDateEdit && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => {
            if (!updatingPaymentDate) {
              setPaymentDateEdit(null);
            }
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md flex flex-col gap-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* HEADER */}
            <div className="border-b pb-3">
              <h2 className="text-xl font-bold text-gray-800 text-center">
                Edit Supplier Payment Date
              </h2>

              <p className="text-center text-gray-500 text-sm mt-1">
                Invoice {paymentDateEdit.invoice}
              </p>
            </div>

            {/* PAYMENT DETAILS */}
            <div className="bg-gray-50 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 text-sm">
                  Payment Method
                </span>

                <span className="font-bold text-gray-800 capitalize">
                  {paymentDateEdit.paymentType}
                  {paymentDateEdit.paymentType === "check" &&
                    paymentDateEdit.checkNumber
                    ? ` #${paymentDateEdit.checkNumber}`
                    : ""}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-500 text-sm">
                  Amount
                </span>

                <span className="font-bold text-green-700">
                  {formatCurrency(paymentDateEdit.amount)}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-gray-500 text-sm">
                  Current Display Date
                </span>

                <span className="font-bold text-gray-800">
                  {getPaymentDate(
                    paymentDateEdit.originalDate,
                    paymentDateEdit.receivedAt
                  ).date}
                </span>
              </div>

              {!paymentDateEdit.originalDate &&
                paymentDateEdit.receivedAt && (
                  <p className="text-xs text-amber-700">
                    This payment does not have its own saved date.
                    The current display uses the receipt arrival date.
                  </p>
                )}
            </div>

            {!confirmDateUpdate ? (
              <>
                {/* DATE INPUT */}
                <div className="flex flex-col gap-2">
                  <label className="font-bold text-gray-700 text-sm">
                    Correct Payment Date
                  </label>
                  <SingleDatePicker
                    text='Select new payment date'
                    value={editedPaymentDate}
                    onChange={(e) => {
                      setEditedPaymentDate(e);
                      setPaymentDateError("");
                    }}
                    reason="Accounting"
                  />

                  <p className="text-xs text-gray-500">
                    This changes only the selected payment's date.
                  </p>
                </div>

                {paymentDateError && (
                  <p className="text-red-600 text-sm">
                    {paymentDateError}
                  </p>
                )}

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentDateEdit(null)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    disabled={!editedPaymentDate}
                    onClick={() => setConfirmDateUpdate(true)}
                    className="px-4 py-2 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 disabled:opacity-50 cursor-pointer"
                  >
                    Continue
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* CONFIRMATION */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex flex-col gap-3">
                  <h3 className="font-bold text-yellow-900">
                    Confirm Payment Date Change
                  </h3>

                  <p className="text-sm text-gray-700">
                    Are you sure you want to update this payment date?
                  </p>

                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">
                      Previous Display Date
                    </span>

                    <span className="font-bold">
                      {getPaymentDate(
                        paymentDateEdit.originalDate,
                        paymentDateEdit.receivedAt
                      ).date}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500">
                      New Payment Date
                    </span>

                    <span className="font-bold text-green-700">
                      {DateTime.fromFormat(
                        editedPaymentDate,
                        "yyyy-MM-dd"
                      ).toFormat("MM/dd/yyyy")}
                    </span>
                  </div>

                  <p className="text-xs text-yellow-800">
                    The modification will be saved with an audit
                    record identifying the user and the date
                    of the change.
                  </p>
                </div>

                {paymentDateError && (
                  <p className="text-red-600 text-sm">
                    {paymentDateError}
                  </p>
                )}

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    disabled={updatingPaymentDate}
                    onClick={() => setConfirmDateUpdate(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 disabled:opacity-50 cursor-pointer"
                  >
                    Back
                  </button>

                  <button
                    type="button"
                    disabled={updatingPaymentDate}
                    onClick={handleUpdatePaymentDate}
                    className="px-4 py-2 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 disabled:opacity-50 cursor-pointer"
                  >
                    {updatingPaymentDate
                      ? "Saving..."
                      : "Confirm Update"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ==========================================
          DELETE SUPPLIER PAYMENT MODAL
          ========================================== */}
      {paymentToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => {
            if (!deletingPayment) {
              setPaymentToDelete(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-payment-title"
            className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md flex flex-col gap-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* HEADER */}
            <div className="text-center border-b pb-4">
              <div className="flex justify-center mb-3">
                <div className="bg-red-100 text-red-600 rounded-full p-4">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="size-8"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v3.75m0 3.75h.008v.008H12v-.008ZM10.29 3.86 1.82 18.14A2.25 2.25 0 0 0 3.76 21.5h16.48a2.25 2.25 0 0 0 1.94-3.36L13.71 3.86a2 2 0 0 0-3.42 0Z"
                    />
                  </svg>
                </div>
              </div>

              <h2
                id="delete-payment-title"
                className="text-xl font-bold text-gray-800"
              >
                Delete Supplier Payment
              </h2>

              <p className="text-sm text-gray-500 mt-2">
                Invoice {paymentToDelete.invoice}
              </p>
            </div>

            {/* PAYMENT DETAILS */}
            <div className="bg-gray-50 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex justify-between gap-3 text-sm">
                <span className="text-gray-500">Payment Method</span>
                <span className="font-bold capitalize text-gray-800">
                  {paymentToDelete.paymentType}
                  {paymentToDelete.paymentType === "check" &&
                    paymentToDelete.checkNumber
                    ? ` #${paymentToDelete.checkNumber}`
                    : ""}
                </span>
              </div>

              <div className="flex justify-between gap-3 text-sm">
                <span className="text-gray-500">Amount</span>
                <span className="font-bold text-red-600">
                  {formatCurrency(paymentToDelete.amount)}
                </span>
              </div>

              <div className="flex justify-between gap-3 text-sm">
                <span className="text-gray-500">Payment Date</span>
                <span className="font-bold">
                  {getPaymentDate(
                    paymentToDelete.date,
                    paymentToDelete.receivedAt
                  ).date}
                </span>
              </div>
            </div>

            {/* WARNING */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
              <p className="text-sm text-yellow-900">
                Deleting this payment will remove it from the
                invoice's active payment history and recalculate
                the outstanding balance.
              </p>

              <p className="text-xs text-yellow-800 mt-2">
                An audit record containing the original payment
                information, deletion reason, user, and timestamp
                will be preserved.
              </p>
            </div>

            {/* DELETION REASON */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-gray-700">
                Reason for Deletion *
              </label>

              <textarea
                value={deleteReason}
                onChange={(e) => {
                  setDeleteReason(e.target.value);
                  setDeletePaymentError("");
                }}
                placeholder="Example: Payment was recorded on the wrong invoice."
                rows={3}
                maxLength={500}
                disabled={deletingPayment}
                className="w-full border border-gray-300 rounded-xl p-3 resize-none outline-none focus:ring-2 focus:ring-red-400 text-gray-800"
              />

              <p className="text-xs text-gray-500">
                Required: 5–500 characters.
              </p>
            </div>

            {deletePaymentError && (
              <p className="text-sm text-red-600 font-medium">
                {deletePaymentError}
              </p>
            )}

            {/* ACTION BUTTONS */}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                disabled={deletingPayment}
                onClick={() => setPaymentToDelete(null)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={
                  deletingPayment ||
                  deleteReason.trim().length < 5 ||
                  deleteReason.trim().length > 500
                }
                onClick={handleDeletePayment}
                className="px-4 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {deletingPayment
                  ? "Deleting..."
                  : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <SupplierReceiptSummaryModal open={showSummary} receipt={selectedReceipt} onClose={() => { setShowSummary(false); setSelectedReceipt(null); }} />

      {submitStatus && (
        <SubmitResultModal status={submitStatus} message={message} onClose={() => { setSubmitStatus(null); setMessage(""); }} collection='Supplier Receipts' />
      )}
    </div>
  );
}