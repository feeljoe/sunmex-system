export type ReceiptIssue = {
    field: "invoice" | "items" | "product";
    index?: number;
    message: string;
};

export function getReceiptIssues(form: any): ReceiptIssue[] {
    const issues: ReceiptIssue[] = [];

    if (!String(form.invoice ?? "").trim()) {
        issues.push({
            field: "invoice",
            message: "Supplier Invoice number is required.",
        });
    }

    const items = form.items ?? [];

    if (items.length === 0) {
        issues.push({
            field: "items",
            message: "There are no products to receive.",
        });
        return issues;
    }
    items.forEach((item: any, index: number) => {
        const name = item.product?.name ?? `Product ${index + 1}`;
        const qty = Number(item.receivedQuantity);
        const cost = Number(item.actualCost);

        if (!item.counted) {
            issues.push({
                field: "product",
                index,
                message: `${name}: Mark this product as counted.`,
            });
        }
        if (item.receivedQuantity === "" || item.receivedQuantity == null || !Number.isInteger(qty) || qty < 0) {
            issues.push({
                field: "product",
                index,
                message: `${name}: Enter a valid received quantity.`,
            });
        }
        if (item.actualCost === "" || item.actualCost == null || !Number.isFinite(cost) || cost < 0) {
            issues.push({
                field: "product",
                index,
                message: `${name}: Enter a valid actual cost.`,
            });
        }


        if (Number.isInteger(qty) && qty === 0 && (item.lots?.length ?? 0) !== 0) {
            issues.push({field: "product", index, message: `${name}: zero received units cannot have inventory lots.`});
        }

        if (Number.isInteger(qty) && qty > 0) {
            const lots = item.lots ?? [];

            const allocated = lots.reduce(
                (sum: number, lot: any) =>
                    sum + Number(lot.quantity || 0),
                0
            );

            const validLots =
                lots.length > 0 &&
                lots.every((lot: any) => {
                    const lotQty = Number(lot.quantity);

                    if (
                        lot.quantity === "" ||
                        !Number.isInteger(lotQty) ||
                        lotQty <= 0
                    ) {
                        return false;
                    }

                    if (lot.expirationChoice === "notRequired") {
                        return true;
                    }

                    if (
                        lot.expirationChoice !== "date" ||
                        !lot.expirationDate
                    ) {
                        return false;
                    }

                    const match =
                        /^(\d{4})-(\d{2})-(\d{2})$/.exec(
                            lot.expirationDate
                        );

                    if (!match) return false;

                    const year = Number(match[1]);
                    const month = Number(match[2]);
                    const day = Number(match[3]);

                    const parsed = new Date(
                        Date.UTC(year, month - 1, day, 12)
                    );

                    return (
                        parsed.getUTCFullYear() === year &&
                        parsed.getUTCMonth() === month - 1 &&
                        parsed.getUTCDate() === day
                    );
                });

            if (!validLots || allocated !== qty) {
                issues.push({
                    field: "product",
                    index,
                    message:
                        `${name}: Allocate all received units ` +
                        "to valid inventory lots.",
                });
            }
        }
    });
    return issues;
}

export function isReceiptReady(form: any): boolean {
    return (Boolean(form.supplierOrderId) && getReceiptIssues(form).length === 0);
}