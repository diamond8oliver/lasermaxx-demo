import { db } from "./db";

// Realistic player names
const PARTY_NAMES = [
  "Alex", "Jordan", "Taylor", "Morgan", "Casey", "Riley", "Sam", "Dakota",
  "Avery", "Quinn", "Skyler", "Reese", "Hayden", "Parker", "Cameron", "Logan",
];

const CORPORATE_NAMES = [
  "Chris Miller", "Pat Johnson", "Jamie Lee", "Drew Chen", "Quinn Torres",
  "Sanjay Patel", "Maria Garcia", "Kevin O'Brien", "Lena Kowalski", "David Kim",
  "Rachel Nguyen", "Marcus Brown", "Tanya Singh", "Brian Walsh", "Fatima Ali",
  "Josh Martinez", "Emily Sato", "Ryan Campbell", "Nadia Okafor", "Mike Reeves",
];

const SCHOOL_NAMES = [
  "Ethan", "Olivia", "Liam", "Emma", "Noah", "Ava", "Mason", "Sophia",
  "Lucas", "Isabella", "Aiden", "Mia", "Jackson", "Charlotte", "James", "Amelia",
  "Elijah", "Harper", "Ben", "Lily",
];

const WALKIN_NAMES = [
  "Jake", "Zoe", "Marcus", "Nina", "Tyler", "Priya", "Connor", "Luna",
];

const OPEN_PLAY_NAMES = [
  "Danny", "Chloe", "Oscar", "Megan", "Theo", "Jasmine", "Leo", "Kayla",
  "Will", "Sienna", "Max", "Freya",
];

// Codenames that feel like real laser tag picks
const CODENAMES = [
  "PHANTOM", "VIPER", "GHOST", "STORM", "BLAZE", "SHADOW", "TITAN",
  "NOVA", "CIPHER", "RAVEN", "APEX", "ZERO", "BLITZ", "COBRA",
  "RAPTOR", "ECHO", "FROST", "HAVOC", "JINX", "KRYPTO",
  "LYNX", "MATRIX", "OMEGA", "PYRO", "RECON", "SNIPER",
  "TURBO", "VENOM", "WRAITH", "XENON", "YETI", "ZEPHYR",
  "ACE", "BOLT", "CLAW", "DAGGER", "EAGLE", "FURY",
  "HAWK", "INFERNO", "JAGUAR", "KNIGHT", "LASER", "METEOR",
  "NITRO", "ONYX", "PROWLER", "ROCKET", "SPARK", "THUNDER",
];

const SUGGESTED_CODENAMES = [
  { codename: "PHANTOM", category: "stealth" },
  { codename: "THUNDER", category: "power" },
  { codename: "NOVA", category: "space" },
  { codename: "CIPHER", category: "tech" },
  { codename: "RAVEN", category: "nature" },
  { codename: "APEX", category: "power" },
  { codename: "ZERO", category: "tech" },
  { codename: "BLITZ", category: "action" },
  { codename: "WRAITH", category: "stealth" },
  { codename: "TURBO", category: "speed" },
  { codename: "ECHO", category: "stealth" },
  { codename: "FROST", category: "nature" },
  { codename: "COBRA", category: "nature" },
  { codename: "MATRIX", category: "tech" },
  { codename: "PYRO", category: "fire" },
  { codename: "BOLT", category: "speed" },
  { codename: "HAWK", category: "nature" },
  { codename: "ONYX", category: "gem" },
  { codename: "ROCKET", category: "space" },
  { codename: "DAGGER", category: "tactical" },
];

const BLOCKED_WORDS = [
  "admin", "staff", "test", "lasermaxx", "employee",
];

function todayAt(hours: number, minutes: number): Date {
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pick<T>(arr: T[], n: number): T[] {
  return shuffle(arr).slice(0, n);
}

export async function seedDemoData() {
  // Clear all existing data
  await db.codenameHistory.deleteMany();
  await db.player.deleteMany();
  await db.game.deleteMany();
  await db.walkInPool.deleteMany();
  await db.setting.deleteMany();
  await db.blockedWord.deleteMany();
  await db.suggestedCodename.deleteMany();

  // ── Settings ──────────────────────────────────────────────────────
  await db.setting.createMany({
    data: [
      { key: "autoApprove", value: "true" },
      { key: "vestCount", value: "20" },
      { key: "confirmationTimeout", value: "10" },
      { key: "inactivityTimeout", value: "45" },
    ],
  });

  // ── Blocked words ─────────────────────────────────────────────────
  await db.blockedWord.createMany({
    data: BLOCKED_WORDS.map((w) => ({ word: w })),
  });

  // ── Suggested codenames ───────────────────────────────────────────
  await db.suggestedCodename.createMany({
    data: SUGGESTED_CODENAMES,
  });

  // ── Codename pool for assigning ───────────────────────────────────
  const codenamePool = shuffle([...CODENAMES]);
  let codenameIdx = 0;
  function nextCodename(): string {
    return codenamePool[codenameIdx++ % codenamePool.length];
  }

  // ── GAME 1: Completed morning session (10:00 AM) ──────────────────
  const game1 = await db.game.create({
    data: {
      startTime: todayAt(10, 0),
      groupLabel: "Westfield School Field Trip",
      status: "completed",
      vestCount: 20,
      gameMode: "Team 15 Min",
      isTeamMode: true,
      showGameMode: true,
    },
  });

  const g1Names = pick(SCHOOL_NAMES, 16);
  for (let i = 0; i < g1Names.length; i++) {
    const cn = nextCodename();
    await db.player.create({
      data: {
        gameId: game1.id,
        realName: g1Names[i],
        team: i < 8 ? "RED" : "BLUE",
        codename: cn,
        vestNumber: i + 1,
        status: "approved",
      },
    });
    await db.codenameHistory.create({
      data: { realName: g1Names[i], codename: cn },
    });
  }

  // ── GAME 2: Birthday party — in progress (12:30 PM) ───────────────
  const game2 = await db.game.create({
    data: {
      startTime: todayAt(12, 30),
      groupLabel: "Alex's Birthday Party",
      status: "in_progress",
      vestCount: 20,
      gameMode: "Team 20 Min",
      isTeamMode: true,
      showGameMode: true,
      birthdayPerson: "Alex",
      birthdayMessage: "Happy Birthday Alex! Vest #1 is yours!",
    },
  });

  const g2Names = pick(PARTY_NAMES, 14);
  // Make sure "Alex" is in the list
  if (!g2Names.includes("Alex")) g2Names[0] = "Alex";
  for (let i = 0; i < g2Names.length; i++) {
    const name = g2Names[i];
    const isBirthday = name === "Alex";
    const team = i < 7 ? "RED" : "BLUE";
    const cn = nextCodename();
    await db.player.create({
      data: {
        gameId: game2.id,
        realName: name,
        isBirthday,
        team,
        codename: cn,
        status: "approved",
      },
    });
    await db.codenameHistory.create({
      data: { realName: name, codename: cn },
    });
  }
  // Assign vest numbers for game 2 (birthday=1, rest sequential)
  const g2Players = await db.player.findMany({ where: { gameId: game2.id }, orderBy: { id: "asc" } });
  let vestNum = 2;
  for (const p of g2Players) {
    if (p.isBirthday) {
      await db.player.update({ where: { id: p.id }, data: { vestNumber: 1 } });
    } else {
      await db.player.update({ where: { id: p.id }, data: { vestNumber: vestNum++ } });
    }
  }

  // ── GAME 3: Corporate team building — open, partially filled (2:00 PM) ─
  const game3 = await db.game.create({
    data: {
      startTime: todayAt(14, 0),
      groupLabel: "Acme Corp Team Building",
      status: "open",
      vestCount: 20,
      gameMode: "Solo 20 Min",
      isTeamMode: false,
      showGameMode: true,
    },
  });

  const g3Names = pick(CORPORATE_NAMES, 15);
  for (let i = 0; i < g3Names.length; i++) {
    if (i < 8) {
      // First 8: approved with codenames
      const cn = nextCodename();
      await db.player.create({
        data: {
          gameId: game3.id,
          realName: g3Names[i],
          codename: cn,
          vestNumber: i + 1,
          status: "approved",
        },
      });
      await db.codenameHistory.create({
        data: { realName: g3Names[i], codename: cn },
      });
    } else if (i < 11) {
      // 3 pending
      const cn = nextCodename();
      await db.player.create({
        data: {
          gameId: game3.id,
          realName: g3Names[i],
          codename: cn,
          status: "pending",
        },
      });
    } else {
      // Rest: waiting (haven't visited kiosk yet)
      await db.player.create({
        data: {
          gameId: game3.id,
          realName: g3Names[i],
          status: "waiting",
        },
      });
    }
  }

  // ── GAME 4: Vampire mode — open, few players (3:30 PM) ─────────────
  const game4 = await db.game.create({
    data: {
      startTime: todayAt(15, 30),
      groupLabel: null,
      status: "open",
      vestCount: 20,
      gameMode: "Vampire",
      isTeamMode: false,
      showGameMode: true,
    },
  });

  const g4Names = pick(OPEN_PLAY_NAMES, 6);
  for (let i = 0; i < g4Names.length; i++) {
    if (i < 3) {
      const cn = nextCodename();
      await db.player.create({
        data: {
          gameId: game4.id,
          realName: g4Names[i],
          codename: cn,
          vestNumber: i + 1,
          status: "approved",
        },
      });
      await db.codenameHistory.create({
        data: { realName: g4Names[i], codename: cn },
      });
    } else {
      await db.player.create({
        data: {
          gameId: game4.id,
          realName: g4Names[i],
          status: "waiting",
        },
      });
    }
  }

  // ── GAME 5: Team battle — open, filling up (5:00 PM) ──────────────
  const game5 = await db.game.create({
    data: {
      startTime: todayAt(17, 0),
      groupLabel: "Friday Night Laser Wars",
      status: "open",
      vestCount: 20,
      gameMode: "Team 15 Min",
      isTeamMode: true,
      showGameMode: true,
    },
  });

  const g5Names = pick([...PARTY_NAMES, ...OPEN_PLAY_NAMES], 12);
  for (let i = 0; i < g5Names.length; i++) {
    const team = i < 6 ? "RED" : "BLUE";
    if (i < 5) {
      const cn = nextCodename();
      await db.player.create({
        data: {
          gameId: game5.id,
          realName: g5Names[i],
          team,
          codename: cn,
          vestNumber: i + 1,
          status: "approved",
        },
      });
      await db.codenameHistory.create({
        data: { realName: g5Names[i], codename: cn },
      });
    } else if (i < 7) {
      const cn = nextCodename();
      await db.player.create({
        data: {
          gameId: game5.id,
          realName: g5Names[i],
          team,
          codename: cn,
          status: "pending",
        },
      });
    } else {
      await db.player.create({
        data: {
          gameId: game5.id,
          realName: g5Names[i],
          team,
          status: "waiting",
        },
      });
    }
  }

  // ── GAME 6: Battle Royale evening — open, empty (7:00 PM) ──────────
  await db.game.create({
    data: {
      startTime: todayAt(19, 0),
      groupLabel: "Saturday Night Showdown",
      status: "open",
      vestCount: 15,
      gameMode: "Battle Royale",
      isTeamMode: false,
      showGameMode: true,
    },
  });

  // ── Walk-in pool ──────────────────────────────────────────────────
  const walkIns = pick(WALKIN_NAMES, 4);
  await db.walkInPool.createMany({
    data: walkIns.map((name) => ({ realName: name })),
  });

  // ── Extra codename history (returning players) ────────────────────
  const historyEntries = [
    { realName: "Alex", codename: "PHOENIX" },
    { realName: "Alex", codename: "BLAZE" },
    { realName: "Alex", codename: "INFERNO" },
    { realName: "Jordan", codename: "VIPER" },
    { realName: "Jordan", codename: "COBRA" },
    { realName: "Chris Miller", codename: "SHADOW" },
    { realName: "Chris Miller", codename: "RECON" },
    { realName: "Chris Miller", codename: "STEALTH" },
    { realName: "Pat Johnson", codename: "TITAN" },
    { realName: "Ethan", codename: "RAPTOR" },
    { realName: "Ethan", codename: "HAWK" },
    { realName: "Olivia", codename: "NOVA" },
    { realName: "Olivia", codename: "SPARK" },
    { realName: "Danny", codename: "ACE" },
    { realName: "Danny", codename: "NITRO" },
    { realName: "Chloe", codename: "LYNX" },
    { realName: "Chloe", codename: "FROST" },
    { realName: "Chloe", codename: "ECHO" },
  ];
  for (const h of historyEntries) {
    await db.codenameHistory.create({ data: h });
  }

  return {
    games: 6,
    message: "Demo data seeded with today's dates",
  };
}
