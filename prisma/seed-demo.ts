import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

async function main() {
  // Clear existing data
  await db.player.deleteMany();
  await db.game.deleteMany();
  await db.walkInPool.deleteMany();
  await db.setting.deleteMany();

  // Settings
  await db.setting.createMany({
    data: [
      { key: "autoApprove", value: "true" },
      { key: "vestCount", value: "20" },
      { key: "confirmationTimeout", value: "10" },
      { key: "inactivityTimeout", value: "45" },
    ],
  });

  // Create 3 demo games
  const now = new Date();
  const game1 = await db.game.create({
    data: {
      startTime: new Date(now.getTime() + 30 * 60000),
      groupLabel: "Birthday Bash",
      status: "open",
      vestCount: 20,
      gameMode: "Team 15 Min",
      isTeamMode: true,
      showGameMode: true,
      birthdayPerson: "Alex",
      birthdayMessage: "Happy Birthday Alex!",
    },
  });

  const game2 = await db.game.create({
    data: {
      startTime: new Date(now.getTime() + 90 * 60000),
      groupLabel: "Corporate Team Build",
      status: "open",
      vestCount: 20,
      gameMode: "Solo 20 Min",
      isTeamMode: false,
      showGameMode: true,
    },
  });

  const game3 = await db.game.create({
    data: {
      startTime: new Date(now.getTime() + 150 * 60000),
      groupLabel: null,
      status: "open",
      vestCount: 15,
      gameMode: "Free For All",
      isTeamMode: false,
      showGameMode: true,
    },
  });

  // Players for game 1 (birthday team game)
  const g1Names = ["Alex", "Jordan", "Taylor", "Morgan", "Casey", "Riley", "Sam", "Dakota"];
  for (let i = 0; i < g1Names.length; i++) {
    const name = g1Names[i];
    const isBirthday = name === "Alex";
    const team = i < 4 ? "RED" : "BLUE";
    const hasCodename = i < 5;
    await db.player.create({
      data: {
        gameId: game1.id,
        realName: name,
        isBirthday,
        team,
        codename: hasCodename ? ["PHOENIX", "VIPER", "GHOST", "STORM", "BLAZE"][i] || null : null,
        vestNumber: hasCodename ? (isBirthday ? 1 : i + 1) : null,
        status: hasCodename ? "approved" : "waiting",
      },
    });
  }

  // Players for game 2
  const g2Names = ["Chris", "Pat", "Jamie", "Drew", "Quinn"];
  for (let i = 0; i < g2Names.length; i++) {
    await db.player.create({
      data: {
        gameId: game2.id,
        realName: g2Names[i],
        status: i < 2 ? "pending" : "waiting",
        codename: i < 2 ? ["SHADOW", "TITAN"][i] : null,
        vestNumber: i < 2 ? i + 1 : null,
      },
    });
  }

  // Walk-in pool
  await db.walkInPool.createMany({
    data: [
      { realName: "Walk-In Mike" },
      { realName: "Walk-In Sarah" },
    ],
  });

  // Suggested codenames
  await db.suggestedCodename.createMany({
    data: [
      { codename: "PHANTOM", category: "stealth" },
      { codename: "THUNDER", category: "power" },
      { codename: "NOVA", category: "space" },
      { codename: "CIPHER", category: "tech" },
      { codename: "RAVEN", category: "nature" },
      { codename: "APEX", category: "power" },
      { codename: "ZERO", category: "tech" },
      { codename: "BLITZ", category: "action" },
    ],
  });

  console.log("Demo data seeded!");
}

main().catch(console.error).finally(() => db.$disconnect());
