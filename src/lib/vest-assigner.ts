import { db } from "./db";

export async function assignNextVest(
  gameId: number,
  isBirthday?: boolean
): Promise<number | null> {
  return db.$transaction(async (tx) => {
    const game = await tx.game.findUnique({
      where: { id: gameId },
      select: { vestCount: true },
    });
    if (!game) return null;

    // Get all assigned vest numbers for this game
    const assigned = await tx.player.findMany({
      where: { gameId, vestNumber: { not: null } },
      select: { vestNumber: true },
      orderBy: { vestNumber: "asc" },
    });

    const usedNumbers = new Set(assigned.map((p) => p.vestNumber));

    // Birthday person always gets vest #1
    if (isBirthday && !usedNumbers.has(1)) {
      return 1;
    }

    // Find lowest available
    for (let i = 1; i <= game.vestCount; i++) {
      if (!usedNumbers.has(i)) {
        return i;
      }
    }

    return null; // All vests assigned
  });
}
