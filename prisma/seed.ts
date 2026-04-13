import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SUGGESTED_CODENAMES = [
  // Animals
  { codename: "SHADOWFOX", category: "animal" },
  { codename: "THUNDERWOLF", category: "animal" },
  { codename: "IRONHAWK", category: "animal" },
  { codename: "STORMRAVEN", category: "animal" },
  { codename: "FROSTBEAR", category: "animal" },
  { codename: "NIGHTOWL", category: "animal" },
  { codename: "STEELVIPER", category: "animal" },
  { codename: "BLAZELION", category: "animal" },
  { codename: "DARKPANTHER", category: "animal" },
  { codename: "FIREHAWK", category: "animal" },
  { codename: "GHOSTWOLF", category: "animal" },
  { codename: "COBRASTRIKE", category: "animal" },
  // Space
  { codename: "STARDUST", category: "space" },
  { codename: "NOVA", category: "space" },
  { codename: "NEBULA", category: "space" },
  { codename: "COMET", category: "space" },
  { codename: "ECLIPSE", category: "space" },
  { codename: "ASTEROID", category: "space" },
  { codename: "PULSAR", category: "space" },
  { codename: "COSMOS", category: "space" },
  { codename: "ORBIT", category: "space" },
  { codename: "QUASAR", category: "space" },
  { codename: "ZENITH", category: "space" },
  { codename: "SOLARIS", category: "space" },
  // Tactical
  { codename: "PHANTOM", category: "tactical" },
  { codename: "STRIKER", category: "tactical" },
  { codename: "MAVERICK", category: "tactical" },
  { codename: "VANGUARD", category: "tactical" },
  { codename: "SENTINEL", category: "tactical" },
  { codename: "RECON", category: "tactical" },
  { codename: "APEX", category: "tactical" },
  { codename: "CIPHER", category: "tactical" },
  { codename: "SPECTER", category: "tactical" },
  { codename: "BLITZ", category: "tactical" },
  { codename: "ROGUE", category: "tactical" },
  { codename: "TITAN", category: "tactical" },
  // Mythical
  { codename: "PHOENIX", category: "mythical" },
  { codename: "DRAGON", category: "mythical" },
  { codename: "GRIFFIN", category: "mythical" },
  { codename: "VALKYRIE", category: "mythical" },
  { codename: "KRAKEN", category: "mythical" },
  { codename: "HYDRA", category: "mythical" },
  { codename: "MINOTAUR", category: "mythical" },
  { codename: "CERBERUS", category: "mythical" },
  { codename: "CHIMERA", category: "mythical" },
  { codename: "PEGASUS", category: "mythical" },
  { codename: "FENRIR", category: "mythical" },
  { codename: "LEVIATHAN", category: "mythical" },
  // Energy / Elements
  { codename: "BLAZE", category: "element" },
  { codename: "THUNDER", category: "element" },
  { codename: "FROST", category: "element" },
  { codename: "STORM", category: "element" },
  { codename: "INFERNO", category: "element" },
  { codename: "VOLTAGE", category: "element" },
  { codename: "AVALANCHE", category: "element" },
  { codename: "CYCLONE", category: "element" },
  { codename: "EMBER", category: "element" },
  { codename: "SURGE", category: "element" },
  { codename: "TORRENT", category: "element" },
  { codename: "PLASMA", category: "element" },
  // Cool / Fun
  { codename: "TURBO", category: "fun" },
  { codename: "PIXEL", category: "fun" },
  { codename: "NEON", category: "fun" },
  { codename: "SONIC", category: "fun" },
  { codename: "ROCKET", category: "fun" },
  { codename: "LASER", category: "fun" },
  { codename: "FLASH", category: "fun" },
  { codename: "BOLT", category: "fun" },
  { codename: "ACE", category: "fun" },
  { codename: "NITRO", category: "fun" },
  { codename: "SHADOW", category: "fun" },
  { codename: "VENOM", category: "fun" },
];

const BLOCKED_WORDS = [
  "fuck", "shit", "ass", "damn", "hell", "bitch", "dick", "cock",
  "pussy", "cunt", "fag", "slut", "whore", "nigger", "nigga",
  "retard", "spic", "chink", "kike", "dyke", "twat", "wank",
  "piss", "tits", "boob", "porn", "sex", "rape", "nazi",
  "kill", "murder", "die", "dead", "drug", "meth", "weed",
  "hate", "racist",
];

const DEFAULT_SETTINGS = [
  { key: "autoApprove", value: "true" },
  { key: "vestCount", value: "20" },
  { key: "confirmationTimeout", value: "8" },
  { key: "inactivityTimeout", value: "45" },
];

async function main() {
  console.log("Seeding database...");

  for (const cn of SUGGESTED_CODENAMES) {
    await prisma.suggestedCodename.upsert({
      where: { codename: cn.codename },
      update: {},
      create: cn,
    });
  }
  console.log(`  Seeded ${SUGGESTED_CODENAMES.length} suggested codenames`);

  for (const word of BLOCKED_WORDS) {
    await prisma.blockedWord.upsert({
      where: { word },
      update: {},
      create: { word },
    });
  }
  console.log(`  Seeded ${BLOCKED_WORDS.length} blocked words`);

  for (const setting of DEFAULT_SETTINGS) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: {},
      create: setting,
    });
  }
  console.log(`  Seeded ${DEFAULT_SETTINGS.length} settings`);

  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
