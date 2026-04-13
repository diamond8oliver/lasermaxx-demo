-- CreateTable
CREATE TABLE "WalkInPool" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "realName" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Game" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "startTime" DATETIME NOT NULL,
    "groupLabel" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "vestCount" INTEGER NOT NULL DEFAULT 20,
    "gameMode" TEXT NOT NULL DEFAULT 'Solo 15 Min',
    "isTeamMode" BOOLEAN NOT NULL DEFAULT false,
    "showGameMode" BOOLEAN NOT NULL DEFAULT true,
    "birthdayPerson" TEXT,
    "birthdayMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Game" ("createdAt", "groupLabel", "id", "startTime", "status", "updatedAt", "vestCount") SELECT "createdAt", "groupLabel", "id", "startTime", "status", "updatedAt", "vestCount" FROM "Game";
DROP TABLE "Game";
ALTER TABLE "new_Game" RENAME TO "Game";
CREATE TABLE "new_Player" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "gameId" INTEGER NOT NULL,
    "realName" TEXT NOT NULL,
    "codename" TEXT,
    "vestNumber" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "team" TEXT,
    "isWalkIn" BOOLEAN NOT NULL DEFAULT false,
    "isBirthday" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Player_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Player" ("codename", "createdAt", "gameId", "id", "realName", "status", "updatedAt", "vestNumber") SELECT "codename", "createdAt", "gameId", "id", "realName", "status", "updatedAt", "vestNumber" FROM "Player";
DROP TABLE "Player";
ALTER TABLE "new_Player" RENAME TO "Player";
CREATE INDEX "Player_gameId_status_idx" ON "Player"("gameId", "status");
CREATE INDEX "Player_realName_idx" ON "Player"("realName");
CREATE UNIQUE INDEX "Player_gameId_vestNumber_key" ON "Player"("gameId", "vestNumber");
CREATE UNIQUE INDEX "Player_gameId_codename_key" ON "Player"("gameId", "codename");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
