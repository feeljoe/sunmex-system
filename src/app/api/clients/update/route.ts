// /app/api/clients/update/route.ts
import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import Client from "@/models/Client";

export async function PATCH(req: NextRequest) {
  try {
    await connectToDatabase();

    const body = await req.json();

    const {
      clientNumber,
      clientName,
      chain,
      contactName,
      phoneNumber,
      billingAddress,
      paymentTerm,
      creditLimit,
      frequency,
      visitingDays,
    } = body;

    if (!clientNumber) {
      return NextResponse.json(
        { error: "clientNumber required" },
        { status: 400 }
      );
    }

    const client = await Client.findOneAndUpdate(
      { clientNumber },
      {
        clientName,
        chain,
        contactName,
        phoneNumber,
        billingAddress,
        paymentTerm,
        creditLimit,
        frequency,
        visitingDays,
      },
      { new: true }
    );

    if (!client) {
      return NextResponse.json(
        { error: "Client not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(client);

  } catch (error) {
    console.error("Client update error:", error);
    return NextResponse.json(
      { error: "Failed to update client" },
      { status: 500 }
    );
  }
}