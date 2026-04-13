import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/blocked-words - List all blocked words
export async function GET() {
  try {
    const words = await db.blockedWord.findMany({
      orderBy: { word: "asc" },
    });

    return NextResponse.json(words);
  } catch (error) {
    console.error("GET /api/blocked-words error:", error);
    return NextResponse.json(
      { error: "Failed to fetch blocked words" },
      { status: 500 }
    );
  }
}

// POST /api/blocked-words - Add a blocked word
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { word } = body;

    if (!word || typeof word !== "string") {
      return NextResponse.json(
        { error: "word is required" },
        { status: 400 }
      );
    }

    const normalized = word.toLowerCase().trim();
    if (normalized.length === 0) {
      return NextResponse.json(
        { error: "word cannot be empty" },
        { status: 400 }
      );
    }

    // Check for duplicate
    const existing = await db.blockedWord.findUnique({
      where: { word: normalized },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Word is already blocked" },
        { status: 409 }
      );
    }

    const blocked = await db.blockedWord.create({
      data: { word: normalized },
    });

    return NextResponse.json(blocked, { status: 201 });
  } catch (error) {
    console.error("POST /api/blocked-words error:", error);
    return NextResponse.json(
      { error: "Failed to add blocked word" },
      { status: 500 }
    );
  }
}

// DELETE /api/blocked-words - Remove a blocked word
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id || typeof id !== "number") {
      return NextResponse.json(
        { error: "id is required and must be a number" },
        { status: 400 }
      );
    }

    const existing = await db.blockedWord.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Blocked word not found" },
        { status: 404 }
      );
    }

    await db.blockedWord.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/blocked-words error:", error);
    return NextResponse.json(
      { error: "Failed to remove blocked word" },
      { status: 500 }
    );
  }
}
