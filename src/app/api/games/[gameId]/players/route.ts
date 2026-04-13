import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parsePastedNames } from "@/lib/paste-parser";
import { emitToStaff } from "@/lib/socket-server";
import { EVENTS } from "@/lib/socket-events";

type RouteParams = { params: Promise<{ gameId: string }> };

// GET /api/games/[gameId]/players - List players, optional ?status= filter
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { gameId } = await params;
    const id = parseInt(gameId, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid game ID" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status");

    const where: Record<string, unknown> = { gameId: id };
    if (statusFilter) {
      where.status = statusFilter;
    }

    const players = await db.player.findMany({
      where,
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(players);
  } catch (error) {
    console.error("GET /api/games/[gameId]/players error:", error);
    return NextResponse.json(
      { error: "Failed to fetch players" },
      { status: 500 }
    );
  }
}

// POST /api/games/[gameId]/players - Add players (single, bulk, or pasted text)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { gameId } = await params;
    const id = parseInt(gameId, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid game ID" }, { status: 400 });
    }

    // Verify game exists
    const game = await db.game.findUnique({ where: { id } });
    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    const body = await request.json();
    const { realName, names, pastedText, isWalkIn } = body;

    let namesToAdd: string[] = [];
    let duplicates: string[] = [];

    if (realName && typeof realName === "string") {
      // Single player add
      namesToAdd = [realName.trim()];
    } else if (Array.isArray(names)) {
      // Bulk names array
      namesToAdd = names.filter((n: unknown) => typeof n === "string" && n.trim().length >= 2).map((n: string) => n.trim());
    } else if (pastedText && typeof pastedText === "string") {
      // Pasted text - parse by newlines
      const parsed = parsePastedNames(pastedText);
      namesToAdd = parsed.names;
      duplicates = parsed.duplicates;
    } else {
      return NextResponse.json(
        { error: "Provide realName, names[], or pastedText" },
        { status: 400 }
      );
    }

    if (namesToAdd.length === 0) {
      return NextResponse.json(
        { error: "No valid names provided" },
        { status: 400 }
      );
    }

    // Check if birthday person should be marked
    const birthdayName = game.birthdayPerson?.toLowerCase();

    // Create players in bulk
    const players = await db.$transaction(
      namesToAdd.map((name) =>
        db.player.create({
          data: {
            gameId: id,
            realName: name,
            status: "waiting",
            isWalkIn: isWalkIn === true,
            isBirthday: birthdayName ? name.toLowerCase() === birthdayName : false,
          },
        })
      )
    );

    emitToStaff(EVENTS.PLAYERS_IMPORTED, { gameId: id, count: players.length });

    return NextResponse.json(
      {
        imported: players.length,
        players,
        duplicatesRemoved: duplicates,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/games/[gameId]/players error:", error);
    return NextResponse.json(
      { error: "Failed to add players" },
      { status: 500 }
    );
  }
}
