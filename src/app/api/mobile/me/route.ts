import { NextResponse } from "next/server";
import { authenticateMobile } from "@/lib/mobileAuth";

export async function GET(req: Request) {
  try {
    const user = await authenticateMobile(req);

    return NextResponse.json({
      user: {
        id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        username: user.username,
        role: user.userRole,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }
}