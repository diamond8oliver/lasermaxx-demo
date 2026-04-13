import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { emitToAll } from "@/lib/socket-server";
import { EVENTS } from "@/lib/socket-events";
import { DEFAULT_VEST_COUNT } from "@/lib/constants";

// GET /api/games - List all games for today, ordered by startTime
export async function GET() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const games = await db.game.findMany({
      where: {
        startTime: {
          gte: today,
          lt: tomorrow,
        },
      },
      orderBy: { startTime: "asc" },
      include: {
        _count: { select: { players: true } },
      },
    });

    return NextResponse.json(games);
  } catch (error) {
    console.error("GET /api/games error:", error);
    return NextResponse.json(
      { error: "Failed to fetch games" },
      { status: 500 }
    );
  }
}

// POST /api/games - Create a new game
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { startTime, groupLabel, vestCount, gameMode, isTeamMode, showGameMode, birthdayPerson, birthdayMessage } = body;

    if (!startTime) {
      return NextResponse.json(
        { error: "startTime is required" },
        { status: 400 }
      );
    }

    const parsedTime = new Date(startTime);
    if (isNaN(parsedTime.getTime())) {
      return NextResponse.json(
        { error: "Invalid startTime format" },
        { status: 400 }
      );
    }

    const game = await db.game.create({
      data: {
        startTime: parsedTime,
        groupLabel: groupLabel || null,
        vestCount: vestCount ?? DEFAULT_VEST_COUNT,
        ...(gameMode !== undefined && { gameMode }),
        ...(isTeamMode !== undefined && { isTeamMode }),
        ...(showGameMode !== undefined && { showGameMode }),
        ...(birthdayPerson !== undefined && { birthdayPerson: birthdayPerson || null }),
        ...(birthdayMessage !== undefined && { birthdayMessage: birthdayMessage || null }),
      },
      include: {
        _count: { select: { players: true } },
      },
    });

    emitToAll(EVENTS.GAME_CREATED, { gameId: game.id });

    return NextResponse.json(game, { status: 201 });
  } catch (error) {
    console.error("POST /api/games error:", error);
    return NextResponse.json(
      { error: "Failed to create game" },
      { status: 500 }
    );
  }
}
