import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emitToAll } from "@/lib/socket-server";
import { EVENTS } from "@/lib/socket-events";

type RouteParams = { params: Promise<{ gameId: string }> };

// GET /api/games/[gameId] - Get game with players
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { gameId } = await params;
    const id = parseInt(gameId, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid game ID" }, { status: 400 });
    }

    const game = await db.game.findUnique({
      where: { id },
      include: {
        players: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    return NextResponse.json(game);
  } catch (error) {
    console.error("GET /api/games/[gameId] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch game" },
      { status: 500 }
    );
  }
}

// PATCH /api/games/[gameId] - Update game status/label
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { gameId } = await params;
    const id = parseInt(gameId, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid game ID" }, { status: 400 });
    }

    const body = await request.json();
    const { status, groupLabel, gameMode, isTeamMode, showGameMode, birthdayPerson, birthdayMessage } = body;

    const validStatuses = ["draft", "open", "in_progress", "completed"];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (status !== undefined) updateData.status = status;
    if (groupLabel !== undefined) updateData.groupLabel = groupLabel;
    if (gameMode !== undefined) updateData.gameMode = gameMode;
    if (isTeamMode !== undefined) updateData.isTeamMode = isTeamMode;
    if (showGameMode !== undefined) updateData.showGameMode = showGameMode;
    if (birthdayPerson !== undefined) updateData.birthdayPerson = birthdayPerson || null;
    if (birthdayMessage !== undefined) updateData.birthdayMessage = birthdayMessage || null;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const game = await db.game.update({
      where: { id },
      data: updateData,
      include: {
        players: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    emitToAll(EVENTS.GAME_UPDATED, { gameId: game.id });

    return NextResponse.json(game);
  } catch (error) {
    console.error("PATCH /api/games/[gameId] error:", error);
    return NextResponse.json(
      { error: "Failed to update game" },
      { status: 500 }
    );
  }
}

// DELETE /api/games/[gameId] - Delete game
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { gameId } = await params;
    const id = parseInt(gameId, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid game ID" }, { status: 400 });
    }

    await db.game.delete({ where: { id } });

    emitToAll(EVENTS.GAME_DELETED, { gameId: id });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/games/[gameId] error:", error);
    return NextResponse.json(
      { error: "Failed to delete game" },
      { status: 500 }
    );
  }
}
