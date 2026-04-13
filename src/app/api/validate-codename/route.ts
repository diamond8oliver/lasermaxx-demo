import { NextRequest, NextResponse } from "next/server";
import { validateCodename } from "@/lib/codename-validator";

// POST /api/validate-codename - Live validation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { codename, gameId, playerId } = body;

    if (!codename || typeof codename !== "string") {
      return NextResponse.json(
        { valid: false, error: "codename is required" },
        { status: 400 }
      );
    }

    if (gameId === undefined || gameId === null) {
      return NextResponse.json(
        { valid: false, error: "gameId is required" },
        { status: 400 }
      );
    }

    const gId = typeof gameId === "string" ? parseInt(gameId, 10) : gameId;
    if (isNaN(gId)) {
      return NextResponse.json(
        { valid: false, error: "Invalid gameId" },
        { status: 400 }
      );
    }

    const pId = playerId ? (typeof playerId === "string" ? parseInt(playerId, 10) : playerId) : undefined;

    const result = await validateCodename(codename, gId, pId);

    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/validate-codename error:", error);
    return NextResponse.json(
      { valid: false, error: "Validation failed" },
      { status: 500 }
    );
  }
}
