import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import Route from "@/models/Route";
import jwt from "jsonwebtoken";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Extract user from JWT (Mobile)
async function getUser(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(
        token, 
        process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET as string
      ) as any;
      if (decoded) return { ...decoded, id: decoded.id || decoded._id };
    } catch (error) {
      console.log("JWT Failed:", error);
    }
  }
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");
  return session.user;
}

export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const user = await getUser(req);

    // Find the route assigned to this specific vendor
    const route = await Route.findOne({ user: user.userId })
    .populate({path: "clients", populate: { path: "billingAddress"}})
    .populate("user")
    .populate({path: "inventory", populate: {path: "product", populate: {path: "brand"}}});

    if (!route) {
      return NextResponse.json({ error: "No route assigned to this user" }, { status: 404 });
    }

    return NextResponse.json(route);
  } catch (err: any) {
    console.log("error: ", err);
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}