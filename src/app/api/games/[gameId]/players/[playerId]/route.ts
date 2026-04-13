import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { assignNextVest } from "@/lib/vest-assigner";
import { emitToGame, emitToStaff } from "@/lib/socket-server";
import { EVENTS } from "@/lib/socket-events";
import type { CodenameActionPayload, TeamAssignedPayload, BirthdayMarkedPayload } from "@/types";

type RouteParams = {
  params: Promise<{ gameId: string; playerId: string }>;
};

// PATCH /api/games/[gameId]/players/[playerId] - Staff edit player
export async function PATCH(request: NextRequest, { params }: RouteParams) {
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
    const existing = await db.player.findFirst({
      where: { id: pId, gameId: gId },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Player not found in this game" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { status, codename, vestNumber, team, isBirthday } = body;

    const updateData: Record<string, unknown> = {};

    // Handle codename update
    if (codename !== undefined) {
      const normalized = codename ? codename.toUpperCase().trim() : null;
      updateData.codename = normalized;

      // Record in history if setting a non-null codename
      if (normalized) {
        await db.codenameHistory.create({
          data: {
            realName: existing.realName,
            codename: normalized,
          },
        });
      }
    }

    // Handle vest number update
    if (vestNumber !== undefined) {
      updateData.vestNumber = vestNumber;
    }

    // Handle status update
    if (status !== undefined) {
      const validStatuses = ["waiting", "pending", "approved", "rejected"];
      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
          { status: 400 }
        );
      }
      updateData.status = status;

      // Auto-assign vest when approving a player without one
      if (status === "approved" && !existing.vestNumber && vestNumber === undefined) {
        const nextVest = await assignNextVest(gId);
        if (nextVest !== null) {
          updateData.vestNumber = nextVest;
        }
      }
    }

    // Handle team assignment
    if (team !== undefined) {
      updateData.team = team;
    }

    // Handle birthday marking
    if (isBirthday !== undefined) {
      updateData.isBirthday = isBirthday;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 }
      );
    }

    const updated = await db.player.update({
      where: { id: pId },
      data: updateData,
    });

    // Emit socket events based on the action
    const payload: CodenameActionPayload = {
      playerId: updated.id,
      gameId: gId,
      codename: updated.codename || "",
      vestNumber: updated.vestNumber ?? undefined,
      status: updated.status as CodenameActionPayload["status"],
    };

    if (status === "approved") {
      emitToGame(gId, EVENTS.CODENAME_APPROVED, payload);
    } else if (status === "rejected") {
      emitToGame(gId, EVENTS.CODENAME_REJECTED, payload);
    } else if (codename !== undefined) {
      emitToGame(gId, EVENTS.CODENAME_EDITED, payload);
    }

    if (team !== undefined) {
      const teamPayload: TeamAssignedPayload = {
        gameId: gId,
        playerId: updated.id,
        team: updated.team || "",
      };
      emitToStaff(EVENTS.TEAM_ASSIGNED, teamPayload);
    }

    if (isBirthday !== undefined) {
      const bdayPayload: BirthdayMarkedPayload = {
        gameId: gId,
        playerId: updated.id,
        isBirthday: updated.isBirthday,
      };
      emitToStaff(EVENTS.BIRTHDAY_MARKED, bdayPayload);
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/games/[gameId]/players/[playerId] error:", error);
    return NextResponse.json(
      { error: "Failed to update player" },
      { status: 500 }
    );
  }
}

// DELETE /api/games/[gameId]/players/[playerId] - Remove player from game
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    await db.player.delete({ where: { id: pId } });

    emitToStaff(EVENTS.GAME_UPDATED, { gameId: gId });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/games/[gameId]/players/[playerId] error:", error);
    return NextResponse.json(
      { error: "Failed to delete player" },
      { status: 500 }
    );
  }
}
