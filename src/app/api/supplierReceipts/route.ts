import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import SupplierReceipt from "@/models/SupplierReceipt";
import SupplierOrder from "@/models/SupplierOrder";
import ProductInventory from "@/models/ProductInventory";
import User from "@/models/User";
import Supplier from "@/models/Supplier";
import { DateTime } from "luxon";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const auth = await getServerSession(authOptions);
    if (!auth?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const page = Math.max(Number(searchParams.get("page")) || 1, 1);
    const limit = Math.min(Number(searchParams.get("limit")) || 25, 100);
    const search = (searchParams.get("search")?.trim() || "").slice(0, 100);
    const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");
    const supplier = searchParams.get("supplier");

    const query: any = {};
    if (search) {
      const suppliers = await Supplier.find({
        name: { $regex: escapedSearch, $options: "i" },
      }).select("_id");
      const supplierIds = suppliers.map(s => s._id);
      const supplierOrders = await SupplierOrder.find({
        poNumber: { $regex: escapedSearch, $options: "i" },
      }).select("_id");
      const supplierOrderIds = supplierOrders.map(so => so._id);
      query.$or = [
        { invoice: { $regex: escapedSearch, $options: "i" } },
        { supplier: { $in: supplierIds } },
        { supplierOrder: { $in: supplierOrderIds } },
        { poNumber: { $regex: escapedSearch, $options: "i" } },
      ];
    }
    if (supplier && mongoose.Types.ObjectId.isValid(supplier)) {
      query.supplier = new mongoose.Types.ObjectId(supplier);
    }
    if (fromDate || toDate) {
      query.receivedAt = {};
      if (fromDate) {

        query.receivedAt.$gte = DateTime.fromISO(fromDate)
          .setZone("America/Phoenix")
          .startOf("day")
          .toUTC()
          .toJSDate();
      }
      if (toDate) {
        query.receivedAt.$lte = DateTime.fromISO(toDate)
          .setZone("America/Phoenix")
          .endOf("day")
          .toUTC()
          .toJSDate();
      }
    }

    const statsPipeline = [
      { $match: query },
      {
        $project: {
          total: { $ifNull: ["$total", 0] },
          paidAmount: {
            $sum: {
              $map: {
                input: { $ifNull: ["$payments", []] },
                as: "p",
                in: { $ifNull: ["$$p.amount", 0] }
              }
            }
          }
        }
      },
      {
        $group: {
          _id: null,
          totalInvoice: { $sum: "$total" },
          totalPaid: { $sum: "$paidAmount" }
        }
      }
    ];

    const [items, total, statsResult] = await Promise.all([
      SupplierReceipt.find(query)
        .populate("supplier")
        .populate("supplierOrder")
        .populate("elaboratedBy")
        .populate({
          path: "items.product",
          populate: {
            path: "brand",
          },
        })
        .sort({ receivedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      SupplierReceipt.countDocuments(query),
      SupplierReceipt.aggregate(statsPipeline)
    ]);

    const amountPaid = statsResult[0]?.totalPaid || 0;
    const totalInvoice = statsResult[0]?.totalInvoice || 0;
    const amountOwed = Math.max(totalInvoice - amountPaid, 0);

    return NextResponse.json({
      items,
      total,
      page,
      limit,
      amountPaid,
      amountOwed,
    });
  } catch (err: any) {
    console.log("Error: ", err);
    return NextResponse.json({ error: String(err.message) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await getServerSession(authOptions);
  if (!auth?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectToDatabase();
  const authenticatedUser = await User.findById(auth.user.id).select("_id role");
  if (!authenticatedUser || !["admin", "warehouse"].includes(authenticatedUser.role)) {
    return NextResponse.json({ error: "Not authorized to receive supplier orders" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);

  if (!body) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const {
    invoice,
    supplierOrderId,
    items,
  } = body;

  if (
    typeof invoice !== "string" ||
    !invoice.trim() ||
    !mongoose.isValidObjectId(supplierOrderId) ||
    !Array.isArray(items) ||
    items.length === 0
  ) {
    return NextResponse.json(
      { error: "Missing or invalid required fields" },
      { status: 400 }
    );
  }

  const normalizedItems: any[] = [];
  const seenProducts = new Set<string>();

  // Convert YYYY-MM-DD into a stable UTC date.
  // Noon UTC avoids unintended date changes in AZ.
  const parseExpirationDate = (value: unknown) => {
    if (typeof value !== "string") {
      throw new Error("Expiration date must be YYYY-MM-DD");
    }

    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

    if (!match) {
      throw new Error("Expiration date must be YYYY-MM-DD");
    }

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);

    const date = new Date(
      Date.UTC(year, month - 1, day, 12)
    );

    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      throw new Error("Invalid expiration date");
    }

    return date;
  };

  try {
    // Validate before opening the transaction.
    for (const item of items) {
      const productId =
        typeof item.product === "string"
          ? item.product
          : item.product?._id;

      if (!mongoose.isValidObjectId(productId)) {
        throw new Error("Invalid product ID");
      }

      const productKey = String(productId);

      if (seenProducts.has(productKey)) {
        throw new Error(
          `Duplicate product in receipt: ${productKey}`
        );
      }

      seenProducts.add(productKey);

      const qty = Number(item.receivedQuantity);
      const ordered = Number(item.orderedQuantity);
      const unitCost = Number(item.unitCost);
      const actualCost = Number(item.actualCost);

      if (
        !Number.isInteger(qty) ||
        qty < 0 ||
        !Number.isInteger(ordered) ||
        ordered < 0
      ) {
        throw new Error(
          `Invalid quantity for product ${productKey}`
        );
      }

      if (
        item.unitCost === "" ||
        item.actualCost === "" ||
        item.unitCost == null ||
        item.actualCost == null ||
        !Number.isFinite(unitCost) ||
        !Number.isFinite(actualCost) ||
        unitCost < 0 ||
        actualCost < 0
      ) {
        throw new Error(
          `Invalid cost for product ${productKey}`
        );
      }


      const receivedLots = item.lots;

      if (!Array.isArray(receivedLots)) {
        throw new Error(
          `Missing lot allocations for product ${productKey}`
        );
      }

      if (qty === 0 && receivedLots.length > 0) {
        throw new Error(
          `Zero-quantity product ${productKey} cannot have lots`
        );
      }

      if (qty > 0 && receivedLots.length === 0) {
        throw new Error(
          `Product ${productKey} needs at least one lot`
        );
      }

      const normalizedLots = receivedLots.map((lot: any) => {
        const lotQty = Number(lot.quantity);

        if (
          lot.quantity === "" ||
          lot.quantity == null ||
          !Number.isInteger(lotQty) ||
          lotQty <= 0
        ) {
          throw new Error(
            `Invalid lot quantity for ${productKey}`
          );
        }

        return {
          lotId: new mongoose.Types.ObjectId(),
          quantity: lotQty,
          expirationDate:
            lot.expirationDate == null ||
              lot.expirationDate === ""
              ? null
              : parseExpirationDate(lot.expirationDate),
        };
      });

      const allocated = normalizedLots.reduce(
        (sum: number, lot: any) =>
          sum + lot.quantity,
        0
      );

      if (allocated !== qty) {
        throw new Error(
          `Lot quantities for ${productKey} must total ${qty}`
        );
      }


      normalizedItems.push({
        product: new mongoose.Types.ObjectId(productKey),
        orderedQuantity: ordered,
        receivedQuantity: qty,
        unitCost,
        actualCost,
        lots: normalizedLots,
      });
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    );
  }

  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const supplierOrder = await SupplierOrder.findById(
      supplierOrderId
    )
      .populate("supplier")
      .session(session);

    if (!supplierOrder) {
      throw new Error("Supplier order not found");
    }

    if (supplierOrder.status === "received") {
      throw new Error(
        "This supplier order has already been received"
      );
    }

    // Existing receipts are another safeguard against
    // duplicate receiving.
    const existingReceipt = await SupplierReceipt.findOne({
      supplierOrder: supplierOrderId,
    }).session(session);

    if (existingReceipt) {
      throw new Error(
        "A supplier receipt already exists for this order"
      );
    }


    // Validate against actual supplier order products.
    const orderItems = supplierOrder.products ?? [];

    if (normalizedItems.length !== orderItems.length) {
      throw new Error(
        "Receipt must include every supplier order product"
      );
    }

    const expectedProducts = new Map<string, number>();

    for (const orderItem of orderItems) {
      const id = String(
        orderItem.product?._id ?? orderItem.product
      );

      if (expectedProducts.has(id)) {
        throw new Error(
          "Supplier order contains duplicate product lines; " +
          "line-level receipt identification is required"
        );
      }

      expectedProducts.set(id, Number(orderItem.quantity));
    }

    for (const item of normalizedItems) {
      const productId = String(item.product);
      const expectedQty = expectedProducts.get(productId);

      if (
        expectedQty === undefined ||
        item.orderedQuantity !== expectedQty
      ) {
        throw new Error(
          `Receipt does not match purchase order: ${productId}`
        );
      }
    }

    const total = normalizedItems.reduce(
      (sum, item) =>
        sum +
        item.receivedQuantity * item.actualCost,
      0
    );

    // Atomically claim this supplier order for receiving.
    // A concurrent transaction attempting the same order
    // must not be allowed to complete another receipt.
    const claimedOrder =
      await SupplierOrder.findOneAndUpdate(
        {
          _id: supplierOrder._id,
          status: { $ne: "received" },
        },
        {
          $set: { status: "received" },
        },
        {
          session,
          new: true,
        }
      );

    if (!claimedOrder) {
      throw new Error(
        "Supplier order has already been received"
      );
    }

    const receivedAt = new Date();

    // CREATE SUPPLIER RECEIPT
    const [receipt] = await SupplierReceipt.create(
      [
        {
          invoice: invoice.trim(),
          poNumber: supplierOrder.poNumber,
          supplierOrder: supplierOrder._id,
          supplier: supplierOrder.supplier._id,
          requestedAt: supplierOrder.requestedAt,
          receivedAt,
          elaboratedBy: authenticatedUser._id,
          items: normalizedItems,
          total,
          inventoryEditVersion: 1,
        },
      ],
      { session }
    );


    let lotsCreated = 0;

    // UPDATE INVENTORY AND CREATE LOTS
    for (const item of normalizedItems) {
      if (item.receivedQuantity === 0) {
        continue;
      }

      const lotDocuments = item.lots.map((lot: any) => {
        const lotNumber =
          `LOT-${String(invoice)
            .trim()
            .replace(/[^a-zA-Z0-9_-]/g, "-")
            .slice(0, 40)}-${String(lot.lotId).slice(-8)}`;

        return {
          _id: lot.lotId,
          lotNumber,
          cost: item.actualCost,
          originalQty: lot.quantity,
          currentQty: lot.quantity,
          onRouteReservedQty: 0,
          receivedAt,
          expirationDate: lot.expirationDate,
        };
      });

      const updatedInventory =
        await ProductInventory.findOneAndUpdate(
          {
            product: item.product,
          },
          {
            $inc: {
              currentInventory: item.receivedQuantity,
            },
            $push: {
              lots: {
                $each: lotDocuments,
              },
            },
          },
          {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true,
            session,
          }
        );

      if (!updatedInventory) {
        throw new Error(
          `Failed to update inventory: ${item.product}`
        );
      }

      lotsCreated += lotDocuments.length;
    }
    await session.commitTransaction();

    return NextResponse.json(
      {
        success: true,
        receiptId: receipt._id,
        invoice: receipt.invoice,
        total,
        lotsCreated,
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }

    console.error(
      "Create supplier receipt error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error.message ||
          "Failed to receive supplier order",
      },
      { status: 400 }
    );
  } finally {
    await session.endSession();
  }
}