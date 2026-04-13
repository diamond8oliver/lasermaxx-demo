import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/codename-history - Get history by realName (case-insensitive)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const realName = searchParams.get("realName");

    if (!realName) {
      return NextResponse.json(
        { error: "realName query parameter is required" },
        { status: 400 }
      );
    }

    // SQLite LIKE is case-insensitive for ASCII by default
    const history = await db.codenameHistory.findMany({
      where: {
        realName: {
          equals: realName,
        },
      },
      orderBy: { usedAt: "desc" },
    });

    return NextResponse.json(history);
  } catch (error) {
    console.error("GET /api/codename-history error:", error);
    return NextResponse.json(
      { error: "Failed to fetch codename history" },
      { status: 500 }
    );
  }
}
