export type ReceiptPayment = {
    method: "cash" | "check";
    checkNumber?: number; 
};

export type ReceiptLineItem = {
    name: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    deviationReason?: "damaged" | "missing" | "returned";
};

export type ReceiptTotals = {
    subtotal: number;
    total: number;
};

export type Receipt = {
    receiptNumber: string;
    preorderNumber: string;
    clientName: string;
    routeName?: string;
    deliveredAt: string;
    driverName: string;

    items: ReceiptLineItem[];
    totals: ReceiptTotals;

    payment: ReceiptPayment;
    signature?: string;
};