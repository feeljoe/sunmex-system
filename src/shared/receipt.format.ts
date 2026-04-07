import { Receipt } from "./receipt.types";

const money = (v: number) => `$${v.toFixed(2)}`;

export function formatReceiptForPrint(
    receipt: Receipt
): string {
    let out = "";

    out+= "Sunmex Distribution LLC \n";
    out+= "---------------------------";
    out+= `Receipt: ${receipt.receiptNumber} \n`;
    out += `Order: ${receipt.preorderNumber} \n`;
    out += `Client: ${receipt.clientName}\n`;

    if(receipt.routeName){
        out += `Route: ${receipt.routeName}\n`;
    }
    out += `Date: ${new Date(
        receipt.deliveredAt
    ).toLocaleString()}\n\n`;

    receipt.items.forEach(item => {
        out += `${item.name}\n`;
        out += `${item.quantity} x ${money(item.unitPrice)} ${money(item.lineTotal)}\n`;

        if(item.deviationReason){
            out += `(${item.deviationReason.toUpperCase()})\n`;
        }
    });

    out+= "---------------------------";
    out += `SUBTOTAL: ${money(receipt.totals.subtotal)}\n`;
    out += `TOTAL: ${money(receipt.totals.total)}\n\n`;

    out += `PAID WITH: ${receipt.payment.method.toUpperCase()}\n`;

    if(
        receipt.payment.method === "check" &&
        receipt.payment.checkNumber
    ) {
        out += `CHECK #: ${receipt.payment.checkNumber}\n`;
    }

    out += `\nThank You!\n\n`;

    out += "\x1D\x56\x00";

    return out;
}