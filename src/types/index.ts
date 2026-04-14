// Game modes
export const GAME_MODES = [
  "Solo 15 Min",
  "Solo 20 Min",
  "Team 15 Min",
  "Team 20 Min",
  "Free For All",
  "Vampire",
  "VIP",
  "Hit Streaks",
  "Battle Royale",
] as const;

export type GameMode = (typeof GAME_MODES)[number];

// Game types
export type GameStatus = "draft" | "open" | "in_progress" | "completed";

export interface Game {
  id: number;
  startTime: string;
  groupLabel: string | null;
  status: GameStatus;
  vestCount: number;
  gameMode: string;
  isTeamMode: boolean;
  showGameMode: boolean;
  birthdayPerson: string | null;
  birthdayMessage: string | null;
  createdAt: string;
  updatedAt: string;
  players?: Player[];
  _count?: { players: number };
}

// Player types
export type PlayerStatus = "waiting" | "pending" | "approved" | "rejected";

export interface Player {
  id: number;
  gameId: number;
  realName: string;
  codename: string | null;
  vestNumber: number | null;
  status: PlayerStatus;
  team: string | null;
  isWalkIn: boolean;
  isBirthday: boolean;
  createdAt: string;
  updatedAt: string;
}

// Walk-in pool
export interface WalkInPool {
  id: number;
  realName: string;
  createdAt: string;
}

// Validation
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

// Settings
export interface AppSettings {
  autoApprove: boolean;
  vestCount: number;
  confirmationTimeout: number;
  inactivityTimeout: number;
}

// Socket events
export interface CodenameSubmittedPayload {
  playerId: number;
  gameId: number;
  codename: string;
  vestNumber: number | null;
  status: PlayerStatus;
  realName: string;
  team: string | null;
  isBirthday: boolean;
}

export interface CodenameActionPayload {
  playerId: number;
  gameId: number;
  codename: string;
  vestNumber?: number;
  status: PlayerStatus;
}

export interface GameUpdatedPayload {
  gameId: number;
}

export interface PlayersImportedPayload {
  gameId: number;
  count: number;
}

export interface WalkInPoolUpdatedPayload {
  action: "added" | "removed";
  realName: string;
}

export interface PlayerAddedPayload {
  gameId: number;
  playerId: number;
  realName: string;
}

export interface TeamAssignedPayload {
  gameId: number;
  playerId: number;
  team: string;
}

export interface BirthdayMarkedPayload {
  gameId: number;
  playerId: number;
  isBirthday: boolean;
}
