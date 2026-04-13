import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

type RouteParams = { params: Promise<{ gameId: string }> };

// GET /api/games/[gameId]/export - Export game roster as text
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
          where: { status: { in: ["approved", "pending"] } },
          orderBy: { vestNumber: "asc" },
        },
      },
    });

    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    const timeStr = new Date(game.startTime).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    const lines: string[] = [];
    lines.push(`LASERMAXX CODENAMES - GAME ROSTER`);
    lines.push(`================================`);
    lines.push(`Time: ${timeStr}`);
    if (game.groupLabel) lines.push(`Group: ${game.groupLabel}`);
    lines.push(`Mode: ${game.gameMode}`);
    if (game.isTeamMode) lines.push(`Type: Team Game`);
    if (game.birthdayPerson) lines.push(`Birthday: ${game.birthdayPerson}`);
    lines.push(`Players: ${game.players.length}`);
    lines.push(`================================`);
    lines.push(``);
    lines.push(`VEST  CODENAME        NAME            TEAM   BDAY`);
    lines.push(`----  --------------  --------------  -----  ----`);

    for (const p of game.players) {
      const vest = p.vestNumber ? String(p.vestNumber).padStart(2, " ") : "--";
      const codename = (p.codename || "---").padEnd(14, " ");
      const name = p.realName.padEnd(14, " ");
      const team = (p.team || "---").padEnd(5, " ");
      const bday = p.isBirthday ? " *" : "  ";
      lines.push(`  ${vest}  ${codename}  ${name}  ${team}  ${bday}`);
    }

    lines.push(``);
    lines.push(`Generated: ${new Date().toLocaleString()}`);

    return new NextResponse(lines.join("\n"), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="game-${id}-roster.txt"`,
      },
    });
  } catch (error) {
    console.error("GET /api/games/[gameId]/export error:", error);
    return NextResponse.json(
      { error: "Failed to export game" },
      { status: 500 }
    );
  }
}
