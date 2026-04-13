-- CreateTable
CREATE TABLE "Game" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "startTime" DATETIME NOT NULL,
    "groupLabel" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "vestCount" INTEGER NOT NULL DEFAULT 20,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Player" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "gameId" INTEGER NOT NULL,
    "realName" TEXT NOT NULL,
    "codename" TEXT,
    "vestNumber" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Player_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BlockedWord" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "word" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "SuggestedCodename" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "codename" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general'
);

-- CreateTable
CREATE TABLE "CodenameHistory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "realName" TEXT NOT NULL,
    "codename" TEXT NOT NULL,
    "usedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL
);

-- CreateIndex
CREATE INDEX "Player_gameId_status_idx" ON "Player"("gameId", "status");

-- CreateIndex
CREATE INDEX "Player_realName_idx" ON "Player"("realName");

-- CreateIndex
CREATE UNIQUE INDEX "Player_gameId_vestNumber_key" ON "Player"("gameId", "vestNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Player_gameId_codename_key" ON "Player"("gameId", "codename");

-- CreateIndex
CREATE UNIQUE INDEX "BlockedWord_word_key" ON "BlockedWord"("word");

-- CreateIndex
CREATE UNIQUE INDEX "SuggestedCodename_codename_key" ON "SuggestedCodename"("codename");

-- CreateIndex
CREATE INDEX "CodenameHistory_realName_idx" ON "CodenameHistory"("realName");
