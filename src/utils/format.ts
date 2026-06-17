export function formatCurrency(amount: number | null | undefined): string {
    if (amount == null || isNaN(amount)) return "$0.00";

    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2, // Ensures it always shows .00
        maximumFractionDigits: 2, // Prevents it from showing .001
    }).format(amount);
}
