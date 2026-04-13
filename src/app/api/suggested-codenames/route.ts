import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/suggested-codenames - Get random suggested codenames
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const count = parseInt(searchParams.get("count") || "6", 10);
    const category = searchParams.get("category");

    const where: Record<string, unknown> = {};
    if (category) {
      where.category = category;
    }

    // Get total count for random selection
    const total = await db.suggestedCodename.count({ where });

    if (total === 0) {
      return NextResponse.json([]);
    }

    // For SQLite: fetch all IDs, randomly pick, then fetch those rows
    // This avoids SQLite's lack of native random ordering with limits
    const allCodenames = await db.suggestedCodename.findMany({
      where,
      select: { id: true, codename: true, category: true },
    });

    // Fisher-Yates shuffle and take the first `count`
    const shuffled = [...allCodenames];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const selected = shuffled.slice(0, Math.min(count, shuffled.length));

    return NextResponse.json(selected);
  } catch (error) {
    console.error("GET /api/suggested-codenames error:", error);
    return NextResponse.json(
      { error: "Failed to fetch suggested codenames" },
      { status: 500 }
    );
  }
}
