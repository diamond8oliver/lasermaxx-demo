import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateCodename } from "@/lib/codename-validator";
import { assignNextVest } from "@/lib/vest-assigner";
import { emitToStaff } from "@/lib/socket-server";
import { EVENTS } from "@/lib/socket-events";
import type { CodenameSubmittedPayload } from "@/types";

type RouteParams = {
  params: Promise<{ gameId: string; playerId: string }>;
};

// POST /api/games/[gameId]/players/[playerId]/codename - Guest submits codename
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { gameId, playerId } = await params;
    const gId = parseInt(gameId, 10);
    const pId = parseInt(playerId, 10);

    if (isNaN(gId) || isNaN(pId)) {
      return NextResponse.json(
        { error: "Invalid game or player ID" },
        { status: 400 }
      );
    }

    // Verify player exists and belongs to this game
    const player = await db.player.findFirst({
      where: { id: pId, gameId: gId },
    });
    if (!player) {
      return NextResponse.json(
        { error: "Player not found in this game" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { codename } = body;

    if (!codename || typeof codename !== "string") {
      return NextResponse.json(
        { error: "codename is required" },
        { status: 400 }
      );
    }

    const normalized = codename.toUpperCase().trim();

    // Validate the codename
    const validation = await validateCodename(normalized, gId, pId);
    if (!validation.valid) {
      return NextResponse.json(
        { valid: false, error: validation.error },
        { status: 422 }
      );
    }

    // Check auto-approve setting
    const autoApproveSetting = await db.setting.findUnique({
      where: { key: "autoApprove" },
    });
    const autoApprove = autoApproveSetting?.value === "true";

    const newStatus = autoApprove ? "approved" : "pending";

    // Auto-assign vest if auto-approved (birthday person gets vest #1)
    let vestNumber: number | null = null;
    if (autoApprove) {
      vestNumber = await assignNextVest(gId, player.isBirthday);
    }

    // Update the player
    const updated = await db.player.update({
      where: { id: pId },
      data: {
        codename: normalized,
        status: newStatus,
        ...(vestNumber !== null ? { vestNumber } : {}),
      },
    });

    // Record in codename history
    await db.codenameHistory.create({
      data: {
        realName: player.realName,
        codename: normalized,
      },
    });

    // Get game for birthday message
    const game = await db.game.findUnique({
      where: { id: gId },
      select: { birthdayMessage: true },
    });

    // Notify staff
    const payload: CodenameSubmittedPayload = {
      playerId: updated.id,
      gameId: gId,
      codename: normalized,
      vestNumber: updated.vestNumber,
      status: updated.status as CodenameSubmittedPayload["status"],
      realName: player.realName,
      team: updated.team,
      isBirthday: updated.isBirthday,
    };
    emitToStaff(EVENTS.CODENAME_SUBMITTED, payload);

    return NextResponse.json({
      player: updated,
      autoApproved: autoApprove,
      team: updated.team,
      isBirthday: updated.isBirthday,
      birthdayMessage: updated.isBirthday ? game?.birthdayMessage : null,
    });
  } catch (error) {
    console.error(
      "POST /api/games/[gameId]/players/[playerId]/codename error:",
      error
    );
    return NextResponse.json(
      { error: "Failed to submit codename" },
      { status: 500 }
    );
  }
}
