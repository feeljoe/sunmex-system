import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Client from '@/models/Client';
import PaymentTerm from "@/models/PaymentTerm";
import Chain from '@/models/Chain';
export async function GET(req: Request) {
  try{
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const page = Math.max(Number(searchParams.get("page")) || 1, 1);
    const limit = Math.min(Number(searchParams.get("limit")) || 25, 100);
    const search = searchParams.get("search")?.trim() || "";

    const query: any= {};
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(search);
    if(search){
      const chains = await Chain.find({
        name: {$regex: search, $options: "i"},
      }).select("_id");
      const chainIds = chains.map(c => c._id);

      const paymentTerms = await PaymentTerm.find({
        name: {$regex: search, $options: "i"},
      }).select("_id");
      const paymentTermIds = paymentTerms.map(pt => pt._id);
      query.$or = [
        {clientNumber: {$regex: search, $options: "i"}},
        {clientName: {$regex: search, $options: "i"}},
        {frequency: {$regex: search, $options: "i"}},
        {visitingDays: {$regex: search, $options: "i"}},
        { chain: {$in: chainIds}},
        { paymentTerm: {$in: paymentTermIds}},
        ...(isObjectId ? [{ _id: search }] : []),
      ];
    }

    const [items, total] = await Promise.all([
      Client.find(query)
      .populate("chain")
      .populate("paymentTerm")
      .sort({ clientName: 1})
      .skip((page - 1) * limit)
      .limit(limit),
      Client.countDocuments(query),
    ]);
    return NextResponse.json({
      items,
      total,
      page,
      limit,
    });
  }catch(err:any){
    return NextResponse.json({ error: String(err.message) }, {status: 500 });
  }
}

export async function POST(req: Request) {
  await connectToDatabase();
  try {
    const body = await req.json();

    const payload: any = {
      clientNumber: body.clientNumber,
      clientName: body.clientName,
      isChain: !!body.isChain,
      chain: body.chain || undefined,
      contactName: body.contactName || undefined,
      phoneNumber: body.phoneNumber || undefined,
      billingAddress: body.billingAddress,
      paymentTerm: body.paymentTerm || undefined,
      creditLimit: body.creditLimit,
      frequency: body.frequency,
      visitingDays: Array.isArray(body.visitingDays)
        ? body.visitingDays
        : (body.visitingDays ? [body.visitingDays] : undefined),
    };

    const created = await Client.create(payload);
    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Invalid data' }, { status: 400 });
  }
}
