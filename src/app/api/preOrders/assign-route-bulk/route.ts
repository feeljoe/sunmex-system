import { connectToDatabase } from "@/lib/db";
import PreOrder from "@/models/PreOrder";
import Route from "@/models/Route";
import CreditMemo from "@/models/CreditMemo";
import { NextResponse } from "next/server";
import { DateTime } from "luxon";

// HELPER: add/subtract business days
function addBusinessDays(date: Date, days: number): DateTime {
  let result = DateTime.fromJSDate(date);
  const increment = days >= 0 ? 1 : -1;
  let remaining = Math.abs(days);
  while (remaining > 0) {
    result = result.plus({ days: increment });
    const weekday = result.weekday; // 1 = Mon, 7 = Sun
    if (weekday >= 1 && weekday <= 5) remaining--;
  }
  return result;
}

export async function PATCH(req: Request) {
  await connectToDatabase();

  try {
    const {
      routeId,
      preorderIds = [],
      creditMemoIds = [],
      deliveryDate,
    } = await req.json();

    if (
      !routeId ||
      (!Array.isArray(preorderIds) && !Array.isArray(creditMemoIds))
    ) {
      return NextResponse.json(
        { error: "Invalid payload" },
        { status: 400 }
      );
    }

    const route = await Route.findById(routeId);
    if (!route) {
      return NextResponse.json(
        { error: "Route not found" },
        { status: 404 }
      );
    }

    let assignedPreorders = 0;
    let assignedCreditMemos = 0;

    // -----------------------------
    // ASSIGN PREORDERS
    // -----------------------------
    if (preorderIds.length > 0) {
      const preorders = await PreOrder.find({
        _id: { $in: preorderIds },
      }).populate("client");

      for (const preorder of preorders) {
        const newStatus =
          preorder.status === "ready"
            ? preorder.status
            : "assigned";

        preorder.routeAssigned = route._id;
        preorder.status = newStatus;

        await preorder.save();
        assignedPreorders++;

        const clientId =
          typeof preorder.client === "object"
            ? preorder.client._id
            : preorder.client;

        // Link pending credit memo if it exists
        const pendingCreditMemo = await CreditMemo.findOne({
          client: clientId,
          status: "pending",
          routeAssigned: { $exists: false },
        });

        if (pendingCreditMemo) {
          pendingCreditMemo.routeAssigned = route._id;
          pendingCreditMemo.preorder = preorder._id;

          await pendingCreditMemo.save();
          assignedCreditMemos++;
        }
      }
    }

    // -----------------------------
    // ASSIGN STANDALONE CREDIT MEMOS
    // -----------------------------
    if (creditMemoIds.length > 0) {
      const creditMemos = await CreditMemo.find({
        _id: { $in: creditMemoIds },
      });

      for (const cm of creditMemos) {
        cm.routeAssigned = route._id;

        // Keep preorder null if standalone
        if (!cm.preorder) {
          cm.preorder = null;
        }
        if(deliveryDate !== undefined && deliveryDate !== null && deliveryDate !== ""){
          const selectedDelivery = DateTime.fromISO(deliveryDate).setZone("America/Phoenix");
          const startOfPickUp = selectedDelivery.startOf("day");
          const pickUpDay = addBusinessDays(startOfPickUp.toJSDate(), -2);
          cm.createdAt = pickUpDay.toUTC().toJSDate();
        }

        await cm.save();
        assignedCreditMemos++;
      }
    }

    return NextResponse.json(
      {
        success: true,
        preordersAssigned: assignedPreorders,
        creditMemosAssigned: assignedCreditMemos,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Bulk assign error:", err);

    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}