import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import jwt from "jsonwebtoken";
import { authOptions, getUserFromRequest } from "@/lib/auth";
import { connectToDatabase } from "@/lib/db";
import CompanySettings from "@/models/CompanySettings";
import { authenticateMobile } from "@/lib/mobileAuth";

// Extract user from JWT (Mobile) OR Session (Web)
async function getUser(req: Request) {
  // 1. Try to read the Bearer token sent by the React Native app
  const authHeader = req.headers.get("authorization");
  
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      // Decode the JWT. (Make sure this secret matches the one used in your login route)
      const decoded = jwt.verify(
        token, 
        process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET as string
      ) as any;

      if (decoded && ["admin", "driver", "vendor"].includes(decoded.role)) {
        // Map _id to id if your JWT uses MongoDB's _id
        return {
           ...decoded,
           id: decoded.id || decoded._id 
        };
      }
    } catch (error) {
      console.log("Mobile JWT Verification Failed:", error);
      // We don't throw here yet so it can fall back to checking web cookies
    }
  }

  // 2. Fallback: If no valid header, try NextAuth cookies (for web dashboard)
  const session = await getServerSession(authOptions);
  const user = session?.user;
  
  if (!user || !["admin", "driver", "vendor"].includes(user.role)) {
    throw new Error("Unauthorized");
  }

  return user;
}

export async function GET(req: Request) {
    try {
        const user = await getUser(req);
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        
        await connectToDatabase();
        
        const settings = await CompanySettings.findOne({
            key: "main",
        }).lean();
        
        return NextResponse.json(
            settings ?? {
              key: "main",
              companyName: "",
              address: {
                street: "",
                street2: "",
                city: "",
                state: "",
                zipCode: "",
                country: "USA",
              },
              phone: "",
              email: "",
              website: "",
            }
          );
        } catch (error) {
          console.error("Company settings GET error:", error);
      
          return NextResponse.json(
            { error: "Failed to get company settings" },
            { status: 500 }
          );
        }
      }
      
      export async function PUT(req: Request) {
        try {
          const session = await getServerSession(authOptions);
      
          if (!session?.user?.id) {
            return NextResponse.json(
              { error: "Unauthorized" },
              { status: 401 }
            );
          }
      
          if (session.user.role !== "admin") {
            return NextResponse.json(
              { error: "Admin access required" },
              { status: 403 }
            );
          }
      
          const body = await req.json();
      
          if (
            !body ||
            typeof body !== "object" ||
            Array.isArray(body)
          ) {
            return NextResponse.json(
              { error: "Invalid request body" },
              { status: 400 }
            );
          }
      
          const allowedFields = [
            "companyName",
            "phone",
            "email",
            "website",
          ] as const;
      
          const update: Record<string, string | object> = {};
      
          for (const field of allowedFields) {
            if (body[field] !== undefined) {
              if (typeof body[field] !== "string") {
                return NextResponse.json(
                  { error: `Invalid ${field}` },
                  { status: 400 }
                );
              }
      
              update[field] = body[field].trim();
            }
          }
      
          // Update individual address fields, preserving omitted ones.
          const addressFields = [
            "street",
            "street2",
            "city",
            "state",
            "zipCode",
            "country",
          ] as const;
      
          if (body.address !== undefined) {
            if (
              !body.address ||
              typeof body.address !== "object" ||
              Array.isArray(body.address)
            ) {
              return NextResponse.json(
                { error: "Invalid address" },
                { status: 400 }
              );
            }
      
            for (const field of addressFields) {
              if (body.address[field] !== undefined) {
                if (typeof body.address[field] !== "string") {
                  return NextResponse.json(
                    { error: `Invalid address.${field}` },
                    { status: 400 }
                  );
                }
      
                update[`address.${field}`] =
                  body.address[field].trim();
              }
            }
          }
      
          await connectToDatabase();
      
          const settings = await CompanySettings.findOneAndUpdate(
            { key: "main" },
            {
              $set: {
                ...update,
                updatedBy: session.user.id,
              },
              $setOnInsert: {
                key: "main",
              },
            },
            {
              new: true,
              upsert: true,
              runValidators: true,
            }
          ).lean();
      
          return NextResponse.json({
            success: true,
            settings,
          });
      
        } catch (error) {
          console.error("Company settings PUT error:", error);
      
          return NextResponse.json(
            { error: "Failed to update company settings" },
            { status: 500 }
          );
        }
      }