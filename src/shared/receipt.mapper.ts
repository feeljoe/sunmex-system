import { Receipt } from "./receipt.types";

export function mapPreorderToReceipt(preorder:any): Receipt {
    const items = preorder.products.map((p: any) => {
        const deliveredQty = p.actualQuantity ?? p.quantity;
        const unitPrice = p.ProductInventory.product.unitPrice;

        return {
            name: p.ProductInventory.product.name,
            quantity: deliveredQty,
            unitPrice,
            lineTotal: deliveredQty * unitPrice,
            deviationReason: p.deviationReason,
        };
    });

    const subtotal = items.reduce(
        (sum: number, i: any) => sum + i.lineTotal,
        0
    );

    return {
        receiptNumber: `R-${preorder.number}`,
        preorderNumber: preorder.number,
        clientName: preorder.client.clientName,
        routeName: preorder.routeAssigned?.code,
        deliveredAt: preorder.deliveredAt,
        driverName: preorder.deliveredBy.firstName + " " + preorder.deliveredBy.lastName,

        items,
        totals: {
            subtotal,
            total: subtotal,
        },

        payment: {
            method: preorder.paymentMethod,
            checkNumber: preorder.checkNumber,
        },
        signature: preorder.deliverySignature,
    };
}