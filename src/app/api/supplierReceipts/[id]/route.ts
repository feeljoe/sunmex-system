import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import SupplierReceipt from "@/models/SupplierReceipt";
import ProductInventory from "@/models/ProductInventory";
import ForeignInventory from "@/models/ForeignInventory";
import User from "@/models/User";

type InputLot = { lotId?: string; quantity: number; expirationDate: string | null };
type InputItem = { product: string; receivedQuantity: number; actualCost: number; lots: InputLot[] };
type NormalizedLot = { lotId?: string; quantity: number; expirationDate: Date | null };
type NormalizedItem = { product: string; quantity: number; cost: number; lots: NormalizedLot[] };

class EditError extends Error {
    constructor(message: string, public status = 400) { super(message); }
}

function parseDate(value: unknown): Date | null {
    if (value === null) return null;
    if (typeof value !== "string") throw new EditError("Expiration date must be YYYY-MM-DD or null");
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!m) throw new EditError("Expiration date must be YYYY-MM-DD or null");
    const y = +m[1], mo = +m[2], d = +m[3];
    const dt = new Date(Date.UTC(y, mo - 1, d, 12));
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d)
        throw new EditError("Invalid expiration date");
    return dt;
}
function dateKey(v: unknown): string | null {
    if (v == null) return null;
    const d = new Date(v as string);
    if (!Number.isFinite(d.getTime())) throw new EditError("Invalid stored expiration date", 409);
    return d.toISOString().slice(0, 10);
}
function normalize(raw: unknown): Map<string, NormalizedItem> {
    if (!Array.isArray(raw) || !raw.length) throw new EditError("items must be a non-empty array");
    const out = new Map<string, NormalizedItem>();
    for (const item of raw as InputItem[]) {
        if (!item || !mongoose.isValidObjectId(item.product) || out.has(String(item.product)))
            throw new EditError("Invalid or duplicate product");
        if (item.receivedQuantity === null || item.receivedQuantity === undefined ||
            typeof item.receivedQuantity !== "number" || !Number.isSafeInteger(item.receivedQuantity) || item.receivedQuantity < 0)
            throw new EditError("Invalid received quantity");
        if (typeof item.actualCost !== "number" || !Number.isFinite(item.actualCost) || item.actualCost < 0)
            throw new EditError("Invalid actual cost");
        if (!Array.isArray(item.lots)) throw new EditError("Missing lots array");
        const seen = new Set<string>();
        const lots: NormalizedLot[] = item.lots.map((lot) => {
            if (!lot || typeof lot.quantity !== "number" || !Number.isSafeInteger(lot.quantity) || lot.quantity <= 0)
                throw new EditError("Lot quantity must be a positive integer");
            if (lot.lotId != null) {
                if (!mongoose.isValidObjectId(lot.lotId) || seen.has(String(lot.lotId)))
                    throw new EditError("Invalid or duplicate lot ID");
                seen.add(String(lot.lotId));
            }
            return { lotId: lot.lotId == null ? undefined : String(lot.lotId), quantity: lot.quantity, expirationDate: parseDate(lot.expirationDate) };
        });
        if (lots.reduce((sum, lot) => sum + lot.quantity, 0) !== item.receivedQuantity)
            throw new EditError("Lot quantities must equal received quantity");
        if (item.receivedQuantity === 0 && lots.length) throw new EditError("Zero-quantity line must not contain lots");
        out.set(String(item.product), { product: String(item.product), quantity: item.receivedQuantity, cost: item.actualCost, lots });
    }
    return out;
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
    const { id } = await context.params;
    if (!mongoose.isValidObjectId(id)) return NextResponse.json({ error: "Invalid receipt ID" }, { status: 400 });
    const auth = await getServerSession(authOptions);
    if (!auth?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await connectToDatabase();
    if (auth?.user?.role !== "admin") return NextResponse.json({ error: "Admin authorization required" }, { status: 403 });
    const body = await req.json().catch(() => null);
    if (!body || typeof body.expectedUpdatedAt !== "string" || !Number.isFinite(Date.parse(body.expectedUpdatedAt)) ||
        typeof body.invoice !== "string" || !body.invoice.trim() ||
        typeof body.reason !== "string" || !body.reason.trim() || body.reason.trim().length > 1000) {
        return NextResponse.json({ error: "Valid invoice and correction reason are required" }, { status: 400 });
    }
    let incoming: Map<string, NormalizedItem>;
    try { incoming = normalize(body.items); }
    catch (e) { return NextResponse.json({ error: (e as Error).message }, { status: 400 }); }

    const session = await mongoose.startSession();
    try {
        let response: { receiptId: string; total: number; changes: number } | null = null;
        await session.withTransaction(async () => {
            const receipt = await SupplierReceipt.findById(id).session(session);
            if (!receipt) throw new EditError("Supplier receipt not found", 404);
            if (new Date(receipt.updatedAt).getTime() !== new Date(body.expectedUpdatedAt).getTime())
                throw new EditError("This receipt changed since you opened it. Refresh and review the latest values.", 409);
            if (receipt.paymentStatus === "paid") throw new EditError("This supplier invoice has already been paid and cannot be edited", 409);
            if (receipt.items.length !== incoming.size) throw new EditError("All original receipt products must be included");
            const changes: Array<{ field: string; product?: mongoose.Types.ObjectId; previousValue: unknown; newValue: unknown }> = [];
            const invoice = body.invoice.trim();
            if (receipt.invoice !== invoice) changes.push({ field: "invoice", previousValue: receipt.invoice, newValue: invoice });

            for (const line of receipt.items) {
                const productId = String(line.product);
                const input = incoming.get(productId);
                if (!input) throw new EditError(`Missing original product ${productId}`);
                const product = new mongoose.Types.ObjectId(productId);
                const oldQty = Number(line.receivedQuantity);
                const oldCost = Number(line.actualCost);
                const oldLots = (line.lots?.length ? line.lots : oldQty > 0 ? [
                    { lotId: line.lotId, quantity: oldQty, expirationDate: line.expirationDate },
                ] : []) as Array<{ lotId: mongoose.Types.ObjectId; quantity: number; expirationDate: Date | null }>;
                if (oldLots.some(l => !l.lotId)) throw new EditError(`Missing legacy lot ID for ${productId}`, 409);
                const oldIds = new Set(oldLots.map(l => String(l.lotId)));
                const inputById = new Map(input.lots.filter(l => l.lotId).map(l => [l.lotId!, l]));
                for (const l of input.lots) if (l.lotId && !oldIds.has(l.lotId))
                    throw new EditError(`Lot ${l.lotId} is not owned by this receipt`, 409);
                const lotChanges = oldLots.some(old => {
                    const target = inputById.get(String(old.lotId));
                    return !target || target.quantity !== Number(old.quantity) ||
                        dateKey(target.expirationDate) !== dateKey(old.expirationDate) || input.cost !== oldCost;
                }) || input.lots.some(l => !l.lotId);
                const qtyChanged = input.quantity !== oldQty;
                const costChanged = input.cost !== oldCost;
                if (!lotChanges && !qtyChanged && !costChanged) continue;

                if (Number(receipt.inventoryEditVersion ?? 0) !== 1) {
                    throw new EditError(
                        `Product ${productId} belongs to a receipt created ` +
                        "before verified lot-movement tracking. " +
                        "Its inventory quantities, costs, and lots cannot " +
                        "be changed without a verified historical audit.",
                        409
                    );
                }

                const inventory = await ProductInventory.findOne({ product }).session(session);
                if (!inventory) throw new EditError(`Phoenix inventory missing for ${productId}`, 409);
                const delta = input.quantity - oldQty;
                const currentInventory = Number(inventory.currentInventory);
                const adjustedInventory = currentInventory + delta;
                if (!Number.isSafeInteger(currentInventory) ||
                    !Number.isSafeInteger(delta) ||
                    !Number.isSafeInteger(adjustedInventory) ||
                    adjustedInventory < 0) {
                    throw new EditError(
                        `Cannot correct the received quantity for ` +
                        `product ${productId}. ` +
                        `The adjustment would result in an invalid ` +
                        `or negative available inventory balance.`,
                        409
                    );
                }

                // ============================================================
                // VALIDATE LOT CORRECTIONS
                // Allow quantity edits after sales/movements.
                // Protect history, reservations and foreign transfers.
                // ============================================================

                for (const old of oldLots) {
                    const oldId = String(old.lotId);
                    const next = inputById.get(oldId);

                    const invLot = inventory.lots.id(old.lotId);

                    if (!invLot) {
                        throw new EditError(
                            `Inventory lot ${oldId} not found`,
                            409
                        );
                    }

                    const oldQuantity = Number(old.quantity);
                    const originalQty = Number(invLot.originalQty);
                    const currentQty = Number(invLot.currentQty);
                    const reservedQty = Number(
                        invLot.onRouteReservedQty ?? 0
                    );

                    if (
                        !Number.isSafeInteger(originalQty) ||
                        !Number.isSafeInteger(currentQty) ||
                        !Number.isSafeInteger(reservedQty) ||
                        originalQty < 0 ||
                        currentQty < 0 ||
                        reservedQty < 0 ||
                        originalQty !== oldQuantity
                    ) {
                        throw new EditError(
                            `Lot ${oldId} has inconsistent inventory balances.`,
                            409
                        );
                    }

                    // Check whether this lot exists in foreign inventory.
                    const transferred = Boolean(
                        await ForeignInventory.exists({
                            "lots._id": old.lotId,
                        }).session(session)
                    );

                    // A removed lot must have no recorded movement
                    // and must still contain its entire original stock.
                    if (!next) {
                        if (
                            invLot.hasMovement !== false ||
                            currentQty !== originalQty ||
                            reservedQty !== 0 ||
                            transferred
                        ) {
                            throw new EditError(
                                `Lot ${oldId} cannot be deleted because it ` +
                                `has movement history, reservations, or transfers.`,
                                409
                            );
                        }

                        continue;
                    }

                    const quantityDelta =
                        next.quantity - oldQuantity;

                    const costChanged =
                        input.cost !== oldCost;

                    const expirationChanged =
                        dateKey(next.expirationDate) !==
                        dateKey(old.expirationDate);

                    const hasMovement =
                        invLot.hasMovement !== false ||
                        currentQty !== originalQty ||
                        reservedQty > 0 ||
                        transferred;

                    // Prevent rewriting historical metadata
                    // on a lot that has already been used.
                    if (
                        hasMovement &&
                        (costChanged || expirationChanged)
                    ) {
                        throw new EditError(
                            `Lot ${oldId} has inventory movements. ` +
                            `Its historical cost or expiration date ` +
                            `cannot be changed through this correction.`,
                            409
                        );
                    }

                    const newCurrentQty =
                        currentQty + quantityDelta;

                    const newOriginalQty =
                        originalQty + quantityDelta;

                    // Prevent negative balances and reductions
                    // that consume reserved units.
                    if (
                        !Number.isSafeInteger(newCurrentQty) ||
                        !Number.isSafeInteger(newOriginalQty) ||
                        newCurrentQty < 0 ||
                        newOriginalQty < 0 ||
                        newCurrentQty < reservedQty
                    ) {
                        throw new EditError(
                            `Lot ${oldId} cannot be reduced by ` +
                            `${Math.abs(quantityDelta)} units. ` +
                            `Insufficient unreserved lot quantity.`,
                            409
                        );
                    }

                    // Existing foreign transfers can be left untouched
                    // when the receipt quantity is increased.
                    // Decreases require checking cross-warehouse movements.
                    if (transferred && quantityDelta < 0) {
                        throw new EditError(`Lot ${oldId} has been transferred to another ` +
                            `warehouse. Decreasing its receipt quantity ` +
                            `requires cross-warehouse reconciliation.`,
                            409);
                    }
                }

                const beforeLots = oldLots.map(l => ({ lotId: String(l.lotId), quantity: Number(l.quantity), expirationDate: dateKey(l.expirationDate) }));
                const afterLots: Array<{ lotId: mongoose.Types.ObjectId; quantity: number; expirationDate: Date | null }> = [];
                const now = new Date();
                for (const next of input.lots) {
                    if (next.lotId) {
                        const currentLot = inventory.lots.id(next.lotId);

                        if (!currentLot) {
                            throw new EditError(`Inventory lot ${next.lotId} not found`, 409);
                        }
                        const old = oldLots.find(l => String(l.lotId) === next.lotId);
                        if (!old) {
                            throw new EditError(`Lot ${next.lotId} does not belong to this receipt`, 409);
                        }

                        const oldQty = Number(old.quantity);
                        const newQty = Number(next.quantity);

                        // Only apply the difference.
                        // Never overwrite existing inventory with received quantity.
                        const lotDelta = newQty - oldQty;

                        const existingCurrentQty =
                            Number(currentLot.currentQty);

                        const reservedQty =
                            Number(currentLot.onRouteReservedQty ?? 0);

                        const adjustedCurrentQty =
                            existingCurrentQty + lotDelta;

                        if (!Number.isSafeInteger(adjustedCurrentQty) || adjustedCurrentQty < 0 || adjustedCurrentQty < reservedQty) {
                            throw new EditError(
                                `Cannot update lot ${next.lotId}. ` +
                                `Insufficient unreserved inventory.`,
                                409);
                        }

                        // Correct the originally received quantity.
                        currentLot.originalQty = newQty;

                        // Preserve sales, transfers and previous movement deductions.
                        currentLot.currentQty = adjustedCurrentQty;

                        // Metadata changes were already validated in Step 4.
                        currentLot.cost = input.cost;
                        currentLot.expirationDate = next.expirationDate;

                        // IMPORTANT:
                        // Do not reset hasMovement or onRouteReservedQty.
                        // They must preserve their existing values.

                        afterLots.push({
                            lotId: old.lotId,
                            quantity: newQty,
                            expirationDate: next.expirationDate,
                        });
                    } else {
                        const newId = new mongoose.Types.ObjectId();
                        inventory.lots.push({
                            _id: newId,
                            lotNumber: `LOT-${invoice.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 40)}-${String(newId).slice(-8)}`,
                            cost: input.cost,
                            originalQty: next.quantity,
                            currentQty: next.quantity,
                            onRouteReservedQty: 0,
                            receivedAt: receipt.receivedAt ?? now,
                            expirationDate: next.expirationDate,
                            hasMovement: false,
                            lastMovementAt: null,
                        });
                        afterLots.push({ lotId: newId, quantity: next.quantity, expirationDate: next.expirationDate });
                    }
                }
                for (const old of oldLots) {
                    if (!inputById.has(String(old.lotId))) inventory.lots.pull({ _id: old.lotId });
                }
                inventory.currentInventory = adjustedInventory;
                await inventory.save({ session });

                if (qtyChanged) changes.push({ field: "receivedQuantity", product, previousValue: oldQty, newValue: input.quantity });
                if (costChanged) changes.push({ field: "actualCost", product, previousValue: oldCost, newValue: input.cost });
                if (lotChanges) changes.push({ field: "lots", product, previousValue: beforeLots, newValue: afterLots.map(l => ({ lotId: String(l.lotId), quantity: l.quantity, expirationDate: dateKey(l.expirationDate) })) });
                line.receivedQuantity = input.quantity;
                line.actualCost = input.cost;
                line.lots = afterLots;
                // Keep legacy fields empty for new multi-lot edits; legacy data lives in items[].lots now.
                line.lotId = undefined;
                line.expirationDate = null;
            }
            if (!changes.length) throw new EditError("No changes detected");
            receipt.invoice = invoice;
            receipt.total = receipt.items.reduce((sum: number, line: any) => sum + Number(line.receivedQuantity) * Number(line.actualCost), 0);
            receipt.lastEditedAt = new Date();
            receipt.lastEditedBy = auth?.user?.id;
            receipt.editHistory.push({ editedBy: auth?.user?.id, editedAt: receipt.lastEditedAt, reason: body.reason.trim(), changes });
            await receipt.save({ session });
            response = { receiptId: String(receipt._id), total: receipt.total, changes: changes.length };
        }, { readConcern: { level: "snapshot" }, writeConcern: { w: "majority" } });
        return NextResponse.json({ success: true, response });
    } catch (e: any) {
        const status = e instanceof EditError ? e.status : 500;
        console.error("Supplier receipt multi-lot PATCH failed", e);
        return NextResponse.json({ error: status === 500 ? "Unable to update receipt. Check server logs." : e.message }, { status });
    } finally {
        await session.endSession();
    }
}
