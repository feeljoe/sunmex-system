import jwt from "jsonwebtoken";
import User from "@/models/User";
import { connectToDatabase } from "@/lib/db";

export async function authenticateMobile(req: Request) {
  await connectToDatabase();

  const authHeader = req.headers.get("authorization");

  if (!authHeader) throw new Error("Unauthorized");

  const token = authHeader.split(" ")[1];

  const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

  const user = await User.findById(decoded.userId);

  if (!user) throw new Error("Unauthorized");

  return user;
}