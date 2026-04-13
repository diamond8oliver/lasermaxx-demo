export const EVENTS = {
  // Server -> All
  GAME_CREATED: "game:created",
  GAME_UPDATED: "game:updated",
  GAME_DELETED: "game:deleted",

  // Server -> Staff
  CODENAME_SUBMITTED: "codename:submitted",
  PLAYERS_IMPORTED: "players:imported",
  WALKIN_POOL_UPDATED: "walkin-pool:updated",
  PLAYER_ADDED: "player:added",
  TEAM_ASSIGNED: "team:assigned",
  BIRTHDAY_MARKED: "birthday:marked",

  // Server -> Kiosk
  CODENAME_APPROVED: "codename:approved",
  CODENAME_REJECTED: "codename:rejected",
  CODENAME_EDITED: "codename:edited",

  // Client -> Server
  JOIN_GAME: "join-game",
  LEAVE_GAME: "leave-game",
  JOIN_STAFF: "join:staff",
  JOIN_KIOSK: "join:kiosk",
} as const;
