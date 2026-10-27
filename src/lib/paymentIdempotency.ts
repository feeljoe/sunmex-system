import { createHash } from "crypto";
export function getPaymentOperationId(req: Request): string | null {
    const value = req.headers.get("Idempotency-Key");
    if(!value) return null;
    if(value.length > 128 || !/^[a-zA-Z0-9_-]+$/.test(value)) {
        throw new Error("Invalid Idempotency-Key");
    }
    return value;
}
export function hashPaymentRequest(value:unknown): string {
    return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}
