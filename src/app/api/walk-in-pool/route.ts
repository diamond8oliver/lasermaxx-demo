import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emitToStaff } from "@/lib/socket-server";
import { EVENTS } from "@/lib/socket-events";

// GET /api/walk-in-pool - List all walk-in pool entries
export async function GET() {
  try {
    const entries = await db.walkInPool.findMany({
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(entries);
  } catch (error) {
    console.error("GET /api/walk-in-pool error:", error);
    return NextResponse.json(
      { error: "Failed to fetch walk-in pool" },
      { status: 500 }
    );
  }
}

// POST /api/walk-in-pool - Add to walk-in pool
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { realName } = body;

    if (!realName || typeof realName !== "string" || realName.trim().length < 2) {
      return NextResponse.json(
        { error: "realName is required (min 2 characters)" },
        { status: 400 }
      );
    }

    const entry = await db.walkInPool.create({
      data: { realName: realName.trim() },
    });

    emitToStaff(EVENTS.WALKIN_POOL_UPDATED, {
      action: "added",
      realName: entry.realName,
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error("POST /api/walk-in-pool error:", error);
    return NextResponse.json(
      { error: "Failed to add to walk-in pool" },
      { status: 500 }
    );
  }
}

// DELETE /api/walk-in-pool - Remove from walk-in pool
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id || typeof id !== "number") {
      return NextResponse.json(
        { error: "id is required" },
        { status: 400 }
      );
    }

    const entry = await db.walkInPool.delete({ where: { id } });

    emitToStaff(EVENTS.WALKIN_POOL_UPDATED, {
      action: "removed",
      realName: entry.realName,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/walk-in-pool error:", error);
    return NextResponse.json(
      { error: "Failed to remove from walk-in pool" },
      { status: 500 }
    );
  }
}
