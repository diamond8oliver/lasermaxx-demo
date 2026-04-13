"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { GAME_MODES } from "@/types";
import type {
  Game,
  Player,
  PlayerStatus,
  WalkInPool,
} from "@/types";

/* ------------------------------------------------------------------ */
/*  Status badge                                                       */
/* ------------------------------------------------------------------ */

const STATUS_STYLES: Record<string, string> = {
  waiting: "bg-lm-gray/20 text-lm-gray border-lm-gray/40",
  pending: "bg-lm-yellow/15 text-lm-yellow border-lm-yellow/40",
  approved: "bg-lm-green/15 text-lm-green border-lm-green/40",
  rejected: "bg-lm-red/15 text-lm-red border-lm-red/40",
  draft: "bg-lm-gray/20 text-lm-gray border-lm-gray/40",
  open: "bg-lm-green/15 text-lm-green border-lm-green/40",
  in_progress: "bg-lm-yellow/15 text-lm-yellow border-lm-yellow/40",
  completed: "bg-lm-blue/15 text-lm-blue border-lm-blue/40",
};

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.waiting;
  return (
    <span
      className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${style}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Time formatting                                                    */
/* ------------------------------------------------------------------ */

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/* ------------------------------------------------------------------ */
/*  Feed entry type                                                    */
/* ------------------------------------------------------------------ */

interface FeedEntry {
  id: string;
  playerId: number;
  gameId: number;
  realName: string;
  codename: string;
  vestNumber: number | null;
  status: PlayerStatus;
  team: string | null;
  isBirthday: boolean;
  timestamp: number;
}

/* ------------------------------------------------------------------ */
/*  Inline edit codename                                               */
/* ------------------------------------------------------------------ */

function InlineEdit({
  player,
  gameId,
  onSaved,
}: {
  player: Player;
  gameId: number;
  onSaved: () => void;
}) {
  const [value, setValue] = useState(player.codename || "");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!value.trim()) return;
    setSaving(true);
    try {
      await fetch(`/api/games/${gameId}/players/${player.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codename: value.trim() }),
      });
      onSaved();
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-1">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value.toUpperCase())}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") onSaved();
        }}
        maxLength={12}
        autoFocus
        className="bg-lm-dark border border-lm-blue text-lm-light text-xs px-1.5 py-0.5 w-28 focus:outline-none focus:border-lm-cyan uppercase"
      />
      <button
        onClick={save}
        disabled={saving}
        className="text-[10px] font-bold text-lm-green hover:text-lm-cyan disabled:opacity-50"
      >
        OK
      </button>
      <button
        onClick={onSaved}
        className="text-[10px] font-bold text-lm-gray hover:text-lm-light"
      >
        X
      </button>
    </div>
  );
}

/* ================================================================== */
/*  MAIN CONTROL PAGE                                                  */
/* ================================================================== */

export default function ControlPage() {
  /* ---- State ---- */
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loadingGames, setLoadingGames] = useState(true);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [walkInPool, setWalkInPool] = useState<WalkInPool[]>([]);
  const [feed, setFeed] = useState<FeedEntry[]>([]);

  // New game form
  const [showNewGame, setShowNewGame] = useState(false);
  const [ngTime, setNgTime] = useState("");
  const [ngLabel, setNgLabel] = useState("");
  const [ngVestCount, setNgVestCount] = useState("20");
  const [ngGameMode, setNgGameMode] = useState<string>(GAME_MODES[0]);
  const [ngTeamMode, setNgTeamMode] = useState(false);
  const [ngBirthdayPerson, setNgBirthdayPerson] = useState("");
  const [ngBirthdayMessage, setNgBirthdayMessage] = useState("");
  const [ngSaving, setNgSaving] = useState(false);
  const [ngError, setNgError] = useState("");

  // Quick add
  const [quickName, setQuickName] = useState("");
  // Paste add
  const [pasteText, setPasteText] = useState("");

  // Ref to avoid stale closure in socket handlers
  const selectedGameIdRef = useRef<number | null>(null);
  selectedGameIdRef.current = selectedGameId;

  /* ---- Fetchers ---- */
  const fetchGames = useCallback(async () => {
    try {
      const res = await fetch("/api/games");
      if (res.ok) setGames(await res.json());
    } catch {
      // silent
    } finally {
      setLoadingGames(false);
    }
  }, []);

  const fetchPlayers = useCallback(async (gameId: number) => {
    setLoadingPlayers(true);
    try {
      const res = await fetch(`/api/games/${gameId}/players`);
      if (res.ok) setPlayers(await res.json());
    } catch {
      // silent
    } finally {
      setLoadingPlayers(false);
    }
  }, []);

  const fetchGameDetail = useCallback(async (gameId: number) => {
    try {
      const res = await fetch(`/api/games/${gameId}`);
      if (res.ok) setSelectedGame(await res.json());
    } catch {
      // silent
    }
  }, []);

  const fetchWalkInPool = useCallback(async () => {
    try {
      const res = await fetch("/api/walk-in-pool");
      if (res.ok) setWalkInPool(await res.json());
    } catch {
      // silent
    }
  }, []);

  function selectGame(gameId: number) {
    setSelectedGameId(gameId);
    fetchGameDetail(gameId);
    fetchPlayers(gameId);
  }

  /* ---- Initial fetch ---- */
  useEffect(() => {
    fetchGames();
    fetchWalkInPool();
  }, [fetchGames, fetchWalkInPool]);

  /* ---- Polling (replaces Socket.IO for Vercel serverless) ---- */
  useEffect(() => {
    const seenPlayerIds = new Set<string>();

    const interval = setInterval(async () => {
      // Always refresh games and walk-in pool
      fetchGames();
      fetchWalkInPool();

      // If a game is selected, refresh its players and build feed from pending/recent
      const gId = selectedGameIdRef.current;
      if (gId) {
        fetchGameDetail(gId);
        fetchPlayers(gId);

        // Build live feed from players with pending status or recent codename submissions
        try {
          const res = await fetch(`/api/games/${gId}/players`);
          if (res.ok) {
            const allPlayers: Player[] = await res.json();
            const feedCandidates = allPlayers.filter(
              (p) => p.codename && (p.status === "pending" || p.status === "approved")
            );
            for (const p of feedCandidates) {
              const key = `${p.id}-${p.codename}-${p.status}`;
              if (!seenPlayerIds.has(key)) {
                seenPlayerIds.add(key);
                const entry: FeedEntry = {
                  id: `${p.id}-${Date.now()}-${Math.random()}`,
                  playerId: p.id,
                  gameId: gId,
                  realName: p.realName,
                  codename: p.codename!,
                  vestNumber: p.vestNumber,
                  status: p.status as PlayerStatus,
                  team: p.team,
                  isBirthday: p.isBirthday,
                  timestamp: Date.now(),
                };
                setFeed((prev) => [entry, ...prev].slice(0, 50));
              }
            }
          }
        } catch {
          // silent
        }
      }
    }, 3000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---- Game actions ---- */
  async function createGame(e: React.FormEvent) {
    e.preventDefault();
    if (!ngTime) {
      setNgError("TIME IS REQUIRED");
      return;
    }
    setNgSaving(true);
    setNgError("");

    const today = new Date();
    const [hours, minutes] = ngTime.split(":");
    today.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    try {
      const res = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startTime: today.toISOString(),
          groupLabel: ngLabel || null,
          vestCount: parseInt(ngVestCount) || 20,
          gameMode: ngGameMode,
          isTeamMode: ngTeamMode,
          birthdayPerson: ngBirthdayPerson || null,
          birthdayMessage: ngBirthdayMessage || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setNgError(data.error || "FAILED");
        return;
      }
      setShowNewGame(false);
      setNgTime("");
      setNgLabel("");
      setNgVestCount("20");
      setNgGameMode(GAME_MODES[0]);
      setNgTeamMode(false);
      setNgBirthdayPerson("");
      setNgBirthdayMessage("");
      fetchGames();
    } catch {
      setNgError("NETWORK ERROR");
    } finally {
      setNgSaving(false);
    }
  }

  async function handleGameStatus(
    gameId: number,
    status: "draft" | "open" | "in_progress" | "completed"
  ) {
    try {
      await fetch(`/api/games/${gameId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      fetchGames();
      fetchGameDetail(gameId);
    } catch {
      // silent
    }
  }

  async function handleDeleteGame(gameId: number) {
    if (!confirm("DELETE THIS GAME? This cannot be undone.")) return;
    try {
      await fetch(`/api/games/${gameId}`, { method: "DELETE" });
      if (selectedGameId === gameId) {
        setSelectedGameId(null);
        setSelectedGame(null);
        setPlayers([]);
      }
      fetchGames();
    } catch {
      // silent
    }
  }

  /* ---- Player actions ---- */
  async function quickAddPlayer() {
    if (!quickName.trim() || !selectedGameId) return;
    try {
      await fetch(`/api/games/${selectedGameId}/players`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ realName: quickName.trim() }),
      });
      setQuickName("");
      fetchPlayers(selectedGameId);
      fetchGames();
    } catch {
      // silent
    }
  }

  async function pasteAddPlayers() {
    if (!pasteText.trim() || !selectedGameId) return;
    try {
      await fetch(`/api/games/${selectedGameId}/players`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pastedText: pasteText }),
      });
      setPasteText("");
      fetchPlayers(selectedGameId);
      fetchGames();
    } catch {
      // silent
    }
  }

  async function patchPlayer(
    playerId: number,
    data: Record<string, unknown>
  ) {
    if (!selectedGameId) return;
    try {
      await fetch(`/api/games/${selectedGameId}/players/${playerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      fetchPlayers(selectedGameId);
    } catch {
      // silent
    }
  }

  async function removePlayer(playerId: number) {
    if (!selectedGameId) return;
    try {
      await fetch(`/api/games/${selectedGameId}/players/${playerId}`, {
        method: "DELETE",
      });
      fetchPlayers(selectedGameId);
      fetchGames();
    } catch {
      // silent
    }
  }

  /* ---- Walk-in pool actions ---- */
  const [walkInName, setWalkInName] = useState("");

  async function addToWalkInPool() {
    if (!walkInName.trim()) return;
    try {
      await fetch("/api/walk-in-pool", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ realName: walkInName.trim() }),
      });
      setWalkInName("");
      fetchWalkInPool();
    } catch {
      // silent
    }
  }

  async function removeFromWalkInPool(id: number) {
    try {
      await fetch("/api/walk-in-pool", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      fetchWalkInPool();
    } catch {
      // silent
    }
  }

  async function assignWalkInToGame(poolEntry: WalkInPool) {
    if (!selectedGameId) return;
    try {
      await fetch(`/api/games/${selectedGameId}/players`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ realName: poolEntry.realName, isWalkIn: true }),
      });
      // Remove from pool
      await fetch("/api/walk-in-pool", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: poolEntry.id }),
      });
      fetchPlayers(selectedGameId);
      fetchWalkInPool();
      fetchGames();
    } catch {
      // silent
    }
  }

  /* ---- Feed actions ---- */
  async function approveFeedEntry(entry: FeedEntry) {
    try {
      await fetch(`/api/games/${entry.gameId}/players/${entry.playerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      });
      setFeed((prev) =>
        prev.map((f) =>
          f.id === entry.id ? { ...f, status: "approved" as PlayerStatus } : f
        )
      );
      if (entry.gameId === selectedGameId) {
        fetchPlayers(selectedGameId);
      }
    } catch {
      // silent
    }
  }

  async function rejectFeedEntry(entry: FeedEntry) {
    try {
      await fetch(`/api/games/${entry.gameId}/players/${entry.playerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "rejected" }),
      });
      setFeed((prev) =>
        prev.map((f) =>
          f.id === entry.id ? { ...f, status: "rejected" as PlayerStatus } : f
        )
      );
      if (entry.gameId === selectedGameId) {
        fetchPlayers(selectedGameId);
      }
    } catch {
      // silent
    }
  }

  async function exportGameList() {
    if (!selectedGameId) return;
    window.open(`/api/games/${selectedGameId}/export`, "_blank");
  }

  /* ---- Computed ---- */
  const stats = {
    total: players.length,
    approved: players.filter((p) => p.status === "approved").length,
    pending: players.filter((p) => p.status === "pending").length,
    waiting: players.filter((p) => p.status === "waiting").length,
    rejected: players.filter((p) => p.status === "rejected").length,
  };

  const pasteLineCount = pasteText
    .split(/\r?\n/)
    .filter((l) => l.trim().length >= 2).length;

  const pendingFeed = feed.filter((f) => f.status === "pending");
  const resolvedFeed = feed.filter((f) => f.status !== "pending");

  /* ---- Editing state for player rows ---- */
  const [editingPlayerId, setEditingPlayerId] = useState<number | null>(null);

  /* ================================================================ */
  /*  RENDER                                                           */
  /* ================================================================ */

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* ============================================================ */}
      {/*  LEFT COLUMN - Game Setup (w-72)                              */}
      {/* ============================================================ */}
      <aside className="w-72 shrink-0 bg-lm-black border-r border-lm-mid flex flex-col overflow-hidden">
        <div className="p-4 border-b border-lm-mid">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold text-lm-light uppercase tracking-[0.15em]">
              GAME SLOTS
            </h2>
            <span className="text-[10px] text-lm-gray">
              {games.length} TODAY
            </span>
          </div>
          {!showNewGame && (
            <button
              onClick={() => setShowNewGame(true)}
              className="w-full bg-lm-green/15 border border-lm-green/40 text-lm-green text-xs font-bold uppercase tracking-wider py-2 hover:bg-lm-green/25 transition-colors"
            >
              + NEW SESSION
            </button>
          )}
        </div>

        {/* New game form */}
        {showNewGame && (
          <div className="p-3 border-b border-lm-mid">
            <form
              onSubmit={createGame}
              className="border border-lm-green/30 bg-lm-black/50 p-3 space-y-2"
            >
              <div className="text-[10px] font-bold text-lm-green uppercase tracking-wider">
                NEW SESSION
              </div>

              <div>
                <label className="block text-[10px] uppercase text-lm-gray tracking-wider mb-0.5">
                  TIME
                </label>
                <input
                  type="time"
                  value={ngTime}
                  onChange={(e) => setNgTime(e.target.value)}
                  className="w-full bg-lm-dark border border-lm-mid text-lm-light text-sm px-2 py-1 focus:outline-none focus:border-lm-green"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-lm-gray tracking-wider mb-0.5">
                  GROUP LABEL
                </label>
                <input
                  type="text"
                  value={ngLabel}
                  onChange={(e) => setNgLabel(e.target.value)}
                  placeholder="e.g. Birthday Party"
                  className="w-full bg-lm-dark border border-lm-mid text-lm-light text-sm px-2 py-1 placeholder:text-lm-mid focus:outline-none focus:border-lm-green"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-lm-gray tracking-wider mb-0.5">
                  GAME MODE
                </label>
                <select
                  value={ngGameMode}
                  onChange={(e) => setNgGameMode(e.target.value)}
                  className="w-full bg-lm-dark border border-lm-mid text-lm-light text-sm px-2 py-1 focus:outline-none focus:border-lm-green"
                >
                  {GAME_MODES.map((mode) => (
                    <option key={mode} value={mode}>
                      {mode}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase text-lm-gray tracking-wider mb-0.5">
                  VEST COUNT
                </label>
                <input
                  type="number"
                  value={ngVestCount}
                  onChange={(e) => setNgVestCount(e.target.value)}
                  min={1}
                  max={50}
                  className="w-full bg-lm-dark border border-lm-mid text-lm-light text-sm px-2 py-1 focus:outline-none focus:border-lm-green"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase text-lm-gray tracking-wider">
                  TEAM MODE
                </span>
                <label className="relative cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ngTeamMode}
                    onChange={(e) => setNgTeamMode(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-lm-dark border border-lm-mid peer-checked:bg-lm-purple/20 peer-checked:border-lm-purple/50 transition-colors flex items-center">
                    <div
                      className={`w-4 h-4 transition-all ${
                        ngTeamMode
                          ? "translate-x-5 bg-lm-purple"
                          : "translate-x-0.5 bg-lm-mid"
                      }`}
                    />
                  </div>
                </label>
              </div>

              <div>
                <label className="block text-[10px] uppercase text-lm-gray tracking-wider mb-0.5">
                  BIRTHDAY PERSON
                </label>
                <input
                  type="text"
                  value={ngBirthdayPerson}
                  onChange={(e) => setNgBirthdayPerson(e.target.value)}
                  placeholder="Optional"
                  className="w-full bg-lm-dark border border-lm-mid text-lm-light text-sm px-2 py-1 placeholder:text-lm-mid focus:outline-none focus:border-lm-yellow"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-lm-gray tracking-wider mb-0.5">
                  BIRTHDAY MESSAGE
                </label>
                <input
                  type="text"
                  value={ngBirthdayMessage}
                  onChange={(e) => setNgBirthdayMessage(e.target.value)}
                  placeholder="e.g. Happy Birthday!"
                  className="w-full bg-lm-dark border border-lm-mid text-lm-light text-sm px-2 py-1 placeholder:text-lm-mid focus:outline-none focus:border-lm-yellow"
                />
              </div>

              {ngError && (
                <div className="text-[10px] font-bold text-lm-red uppercase">
                  {ngError}
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={ngSaving}
                  className="flex-1 bg-lm-green/20 border border-lm-green/50 text-lm-green text-xs font-bold uppercase tracking-wider py-1.5 hover:bg-lm-green/30 disabled:opacity-50 transition-colors"
                >
                  {ngSaving ? "CREATING..." : "CREATE"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewGame(false)}
                  className="flex-1 bg-lm-dark border border-lm-mid text-lm-gray text-xs font-bold uppercase tracking-wider py-1.5 hover:text-lm-light transition-colors"
                >
                  CANCEL
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Game list */}
        <div className="flex-1 overflow-y-auto">
          {loadingGames ? (
            <div className="p-4 text-center">
              <span className="text-xs text-lm-gray uppercase tracking-wider animate-text-pulse">
                LOADING...
              </span>
            </div>
          ) : games.length === 0 ? (
            <div className="p-4 text-center">
              <span className="text-xs text-lm-mid uppercase tracking-wider">
                NO GAMES TODAY
              </span>
            </div>
          ) : (
            games.map((game) => {
              const isSelected = selectedGameId === game.id;
              const playerCount = game._count?.players ?? 0;

              return (
                <button
                  key={game.id}
                  onClick={() => selectGame(game.id)}
                  className={`w-full text-left p-3 border-b border-lm-mid/50 transition-colors ${
                    isSelected
                      ? "bg-lm-dark border-l-2 border-l-lm-green"
                      : "hover:bg-lm-charcoal border-l-2 border-l-transparent"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-sm font-bold ${
                        isSelected ? "text-lm-green" : "text-lm-light"
                      }`}
                    >
                      {formatTime(game.startTime)}
                    </span>
                    <StatusBadge status={game.status} />
                  </div>

                  {/* Badges */}
                  <div className="flex items-center gap-1 flex-wrap mb-1">
                    {game.showGameMode && (
                      <span className="text-[9px] font-bold text-lm-cyan border border-lm-cyan/40 px-1.5 py-0 rounded-full">
                        {game.gameMode}
                      </span>
                    )}
                    {game.isTeamMode && (
                      <span className="text-[9px] font-bold text-lm-purple border border-lm-purple/40 px-1.5 py-0 rounded-full">
                        TEAM
                      </span>
                    )}
                    {game.birthdayPerson && (
                      <span className="text-[9px] font-bold text-lm-yellow">
                        &#9733;
                      </span>
                    )}
                  </div>

                  {game.groupLabel && (
                    <div className="text-[11px] text-lm-gray truncate mb-1">
                      {game.groupLabel}
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-lm-mid uppercase">
                      {playerCount} PLAYER{playerCount !== 1 ? "S" : ""}
                    </span>
                    <span className="text-[10px] text-lm-mid">
                      {game.vestCount} VESTS
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* ============================================================ */}
      {/*  CENTER COLUMN - Player Management (flex-1)                   */}
      {/* ============================================================ */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selectedGameId ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-lm-mid text-4xl mb-4">&#9654;</div>
              <p className="text-sm text-lm-gray uppercase tracking-wider">
                SELECT A GAME TO VIEW DETAILS
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Game header */}
            <div className="bg-lm-black border-b border-lm-mid p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-4">
                  <h2 className="text-lg font-bold text-lm-light uppercase tracking-wider">
                    {selectedGame
                      ? formatTime(selectedGame.startTime)
                      : "LOADING..."}
                  </h2>
                  {selectedGame?.groupLabel && (
                    <span className="text-sm text-lm-gray">
                      {selectedGame.groupLabel}
                    </span>
                  )}
                  {selectedGame && (
                    <StatusBadge status={selectedGame.status} />
                  )}
                  {selectedGame?.birthdayPerson && (
                    <span className="text-xs text-lm-yellow font-bold">
                      &#9733; {selectedGame.birthdayPerson}
                    </span>
                  )}
                </div>
              </div>

              {/* Status controls + stats */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {selectedGame?.status === "draft" && (
                    <button
                      onClick={() =>
                        handleGameStatus(selectedGameId, "open")
                      }
                      className="bg-lm-green/15 border border-lm-green/40 text-lm-green text-[10px] font-bold uppercase px-3 py-1 hover:bg-lm-green/25 transition-colors"
                    >
                      OPEN FOR PLAYERS
                    </button>
                  )}
                  {selectedGame?.status === "open" && (
                    <button
                      onClick={() =>
                        handleGameStatus(selectedGameId, "in_progress")
                      }
                      className="bg-lm-yellow/15 border border-lm-yellow/40 text-lm-yellow text-[10px] font-bold uppercase px-3 py-1 hover:bg-lm-yellow/25 transition-colors"
                    >
                      START GAME
                    </button>
                  )}
                  {selectedGame?.status === "in_progress" && (
                    <button
                      onClick={() =>
                        handleGameStatus(selectedGameId, "completed")
                      }
                      className="bg-lm-blue/15 border border-lm-blue/40 text-lm-blue text-[10px] font-bold uppercase px-3 py-1 hover:bg-lm-blue/25 transition-colors"
                    >
                      COMPLETE
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteGame(selectedGameId)}
                    className="bg-lm-red/10 border border-lm-red/30 text-lm-red text-[10px] font-bold uppercase px-3 py-1 hover:bg-lm-red/20 transition-colors"
                  >
                    DELETE
                  </button>
                </div>
                <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-wider">
                  <span className="text-lm-light">{stats.total} TOTAL</span>
                  <span className="text-lm-green">{stats.approved} OK</span>
                  <span className="text-lm-yellow">
                    {stats.pending} PENDING
                  </span>
                  <span className="text-lm-gray">
                    {stats.waiting} WAITING
                  </span>
                </div>
              </div>
            </div>

            {/* Quick add + Paste add */}
            <div className="bg-lm-charcoal border-b border-lm-mid p-3 flex items-start gap-4">
              {/* Quick add */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={quickName}
                  onChange={(e) => setQuickName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") quickAddPlayer();
                  }}
                  placeholder="ADD NAME..."
                  className="bg-lm-dark border border-lm-mid text-lm-light text-xs px-3 py-1.5 w-48 placeholder:text-lm-mid focus:outline-none focus:border-lm-green uppercase"
                />
                <button
                  onClick={quickAddPlayer}
                  disabled={!quickName.trim()}
                  className="bg-lm-green/15 border border-lm-green/40 text-lm-green text-[10px] font-bold uppercase px-3 py-1.5 hover:bg-lm-green/25 disabled:opacity-50 transition-colors"
                >
                  ADD
                </button>
              </div>

              {/* Paste add */}
              <div className="flex items-end gap-2">
                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder="PASTE NAMES (ONE PER LINE)..."
                  rows={2}
                  className="bg-lm-dark border border-lm-mid text-lm-light text-xs px-3 py-1.5 w-64 placeholder:text-lm-mid focus:outline-none focus:border-lm-blue resize-none"
                />
                <button
                  onClick={pasteAddPlayers}
                  disabled={pasteLineCount === 0}
                  className="bg-lm-blue/15 border border-lm-blue/40 text-lm-blue text-[10px] font-bold uppercase px-3 py-1.5 hover:bg-lm-blue/25 disabled:opacity-50 transition-colors whitespace-nowrap"
                >
                  LOAD {pasteLineCount} NAME{pasteLineCount !== 1 ? "S" : ""}
                </button>
              </div>
            </div>

            {/* Player roster */}
            <div className="flex-1 overflow-y-auto">
              {loadingPlayers ? (
                <div className="p-8 text-center">
                  <span className="text-xs text-lm-gray uppercase tracking-wider animate-text-pulse">
                    LOADING ROSTER...
                  </span>
                </div>
              ) : players.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm text-lm-mid uppercase tracking-wider mb-2">
                    NO PLAYERS YET
                  </p>
                  <p className="text-xs text-lm-mid">
                    Use quick add or paste a list above
                  </p>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="sticky top-0 bg-lm-charcoal z-10">
                    <tr className="border-b border-lm-mid">
                      <th className="text-[10px] font-bold text-lm-gray uppercase tracking-wider text-left px-3 py-2 w-8">
                        #
                      </th>
                      <th className="text-[10px] font-bold text-lm-gray uppercase tracking-wider text-left px-3 py-2 w-14">
                        VEST
                      </th>
                      <th className="text-[10px] font-bold text-lm-gray uppercase tracking-wider text-left px-3 py-2">
                        NAME
                      </th>
                      <th className="text-[10px] font-bold text-lm-gray uppercase tracking-wider text-left px-3 py-2">
                        CODENAME
                      </th>
                      <th className="text-[10px] font-bold text-lm-gray uppercase tracking-wider text-left px-3 py-2 w-16">
                        TEAM
                      </th>
                      <th className="text-[10px] font-bold text-lm-gray uppercase tracking-wider text-left px-3 py-2 w-10">
                        BD
                      </th>
                      <th className="text-[10px] font-bold text-lm-gray uppercase tracking-wider text-left px-3 py-2 w-20">
                        STATUS
                      </th>
                      <th className="text-[10px] font-bold text-lm-gray uppercase tracking-wider text-left px-3 py-2">
                        ACTIONS
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {players.map((player, idx) => (
                      <tr
                        key={player.id}
                        className={`border-b border-lm-mid/30 hover:bg-lm-dark/50 transition-colors ${
                          player.isBirthday ? "bg-lm-yellow/5" : ""
                        }`}
                      >
                        <td className="px-3 py-1.5 text-xs text-lm-mid">
                          {idx + 1}
                        </td>
                        <td className="px-3 py-1.5 text-xs text-lm-yellow font-bold font-mono">
                          {player.vestNumber ?? (
                            <span className="text-lm-mid">--</span>
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-xs text-lm-light font-medium">
                          {player.realName}
                          {player.isWalkIn && (
                            <span className="ml-1 text-[9px] text-lm-purple">
                              WI
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-1.5">
                          {editingPlayerId === player.id ? (
                            <InlineEdit
                              player={player}
                              gameId={selectedGameId}
                              onSaved={() => {
                                setEditingPlayerId(null);
                                fetchPlayers(selectedGameId);
                              }}
                            />
                          ) : (
                            <span className="text-xs text-lm-cyan font-bold uppercase tracking-wider">
                              {player.codename || (
                                <span className="text-lm-mid italic normal-case tracking-normal font-normal">
                                  awaiting...
                                </span>
                              )}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-1.5">
                          {player.team ? (
                            <span
                              className={`text-[10px] font-bold ${
                                player.team === "RED"
                                  ? "text-lm-red"
                                  : "text-lm-blue"
                              }`}
                            >
                              {player.team}
                            </span>
                          ) : selectedGame?.isTeamMode ? (
                            <div className="flex gap-0.5">
                              <button
                                onClick={() =>
                                  patchPlayer(player.id, { team: "RED" })
                                }
                                className="text-[9px] text-lm-red border border-lm-red/30 px-1 hover:bg-lm-red/10"
                              >
                                R
                              </button>
                              <button
                                onClick={() =>
                                  patchPlayer(player.id, { team: "BLUE" })
                                }
                                className="text-[9px] text-lm-blue border border-lm-blue/30 px-1 hover:bg-lm-blue/10"
                              >
                                B
                              </button>
                            </div>
                          ) : (
                            <span className="text-lm-mid text-[10px]">
                              --
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-1.5">
                          <button
                            onClick={() =>
                              patchPlayer(player.id, {
                                isBirthday: !player.isBirthday,
                              })
                            }
                            className={`text-sm ${
                              player.isBirthday
                                ? "text-lm-yellow"
                                : "text-lm-mid hover:text-lm-yellow"
                            }`}
                            title="Toggle birthday"
                          >
                            {player.isBirthday ? "★" : "☆"}
                          </button>
                        </td>
                        <td className="px-3 py-1.5">
                          <StatusBadge status={player.status} />
                        </td>
                        <td className="px-3 py-1.5">
                          <div className="flex items-center gap-1">
                            {player.status !== "approved" && (
                              <button
                                onClick={() =>
                                  patchPlayer(player.id, {
                                    status: "approved",
                                  })
                                }
                                className="bg-lm-green/15 border border-lm-green/40 text-lm-green text-[10px] font-bold uppercase px-1.5 py-0.5 hover:bg-lm-green/25 transition-colors"
                              >
                                OK
                              </button>
                            )}
                            {player.status !== "rejected" && (
                              <button
                                onClick={() =>
                                  patchPlayer(player.id, {
                                    status: "rejected",
                                  })
                                }
                                className="bg-lm-red/15 border border-lm-red/40 text-lm-red text-[10px] font-bold uppercase px-1.5 py-0.5 hover:bg-lm-red/25 transition-colors"
                              >
                                X
                              </button>
                            )}
                            <button
                              onClick={() => setEditingPlayerId(player.id)}
                              className="bg-lm-blue/15 border border-lm-blue/40 text-lm-blue text-[10px] font-bold uppercase px-1.5 py-0.5 hover:bg-lm-blue/25 transition-colors"
                            >
                              ED
                            </button>
                            <button
                              onClick={() => removePlayer(player.id)}
                              className="text-[10px] font-bold text-lm-mid hover:text-lm-red transition-colors px-1"
                              title="Remove player"
                            >
                              DEL
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Walk-in pool section */}
              {selectedGameId && (
                <div className="border-t border-lm-mid p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-[10px] font-bold text-lm-purple uppercase tracking-[0.15em]">
                      WALK-IN POOL
                    </h3>
                    <span className="text-[10px] text-lm-mid">
                      {walkInPool.length} AVAILABLE
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="text"
                      value={walkInName}
                      onChange={(e) => setWalkInName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") addToWalkInPool();
                      }}
                      placeholder="ADD TO POOL..."
                      className="bg-lm-dark border border-lm-mid text-lm-light text-xs px-2 py-1 w-40 placeholder:text-lm-mid focus:outline-none focus:border-lm-purple"
                    />
                    <button
                      onClick={addToWalkInPool}
                      disabled={!walkInName.trim()}
                      className="bg-lm-purple/15 border border-lm-purple/40 text-lm-purple text-[10px] font-bold uppercase px-2 py-1 hover:bg-lm-purple/25 disabled:opacity-50 transition-colors"
                    >
                      ADD
                    </button>
                  </div>
                  {walkInPool.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {walkInPool.map((entry) => (
                        <div
                          key={entry.id}
                          className="inline-flex items-center gap-1.5 bg-lm-purple/10 border border-lm-purple/30 px-2 py-1"
                        >
                          <span className="text-xs font-bold text-lm-purple">
                            {entry.realName}
                          </span>
                          <button
                            onClick={() => assignWalkInToGame(entry)}
                            className="text-[9px] text-lm-green hover:text-lm-cyan font-bold"
                            title="Assign to game"
                          >
                            +G
                          </button>
                          <button
                            onClick={() => removeFromWalkInPool(entry.id)}
                            className="text-[9px] text-lm-mid hover:text-lm-red font-bold"
                            title="Remove"
                          >
                            X
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ============================================================ */}
      {/*  RIGHT COLUMN - Live Feed (w-72)                              */}
      {/* ============================================================ */}
      <aside className="w-72 shrink-0 bg-lm-black border-l border-lm-mid flex flex-col overflow-hidden">
        <div className="p-4 border-b border-lm-mid flex items-center justify-between">
          <h2 className="text-xs font-bold text-lm-light uppercase tracking-[0.15em]">
            LIVE FEED
          </h2>
          {selectedGameId && (
            <button
              onClick={exportGameList}
              className="bg-lm-cyan/15 border border-lm-cyan/40 text-lm-cyan text-[9px] font-bold uppercase px-2 py-0.5 hover:bg-lm-cyan/25 transition-colors"
            >
              EXPORT LIST
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Pending approvals */}
          {pendingFeed.length > 0 && (
            <div className="border-b border-lm-yellow/30">
              <div className="px-3 py-1.5 bg-lm-yellow/10">
                <span className="text-[9px] font-bold text-lm-yellow uppercase tracking-wider">
                  PENDING APPROVAL ({pendingFeed.length})
                </span>
              </div>
              {pendingFeed.map((entry) => (
                <div
                  key={entry.id}
                  className="px-3 py-2 border-b border-lm-mid/30"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-lm-light font-medium">
                      {entry.realName}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => approveFeedEntry(entry)}
                        className="bg-lm-green/20 text-lm-green text-[10px] font-bold px-2 py-0.5 hover:bg-lm-green/30"
                      >
                        OK
                      </button>
                      <button
                        onClick={() => rejectFeedEntry(entry)}
                        className="bg-lm-red/20 text-lm-red text-[10px] font-bold px-2 py-0.5 hover:bg-lm-red/30"
                      >
                        X
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-lm-cyan uppercase">
                      {entry.codename}
                    </span>
                    {entry.vestNumber && (
                      <span className="text-[10px] text-lm-yellow font-bold">
                        V{entry.vestNumber}
                      </span>
                    )}
                    {entry.team && (
                      <span
                        className={`text-[9px] font-bold ${
                          entry.team === "RED"
                            ? "text-lm-red"
                            : "text-lm-blue"
                        }`}
                      >
                        {entry.team}
                      </span>
                    )}
                    {entry.isBirthday && (
                      <span className="text-[10px] text-lm-yellow">
                        &#9733;
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Resolved entries */}
          {resolvedFeed.length > 0 && (
            <div>
              {resolvedFeed.map((entry) => (
                <div
                  key={entry.id}
                  className="px-3 py-2 border-b border-lm-mid/20"
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[11px] text-lm-gray">
                      {entry.realName}
                    </span>
                    <StatusBadge status={entry.status} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-lm-cyan uppercase">
                      {entry.codename}
                    </span>
                    {entry.vestNumber && (
                      <span className="text-[10px] text-lm-yellow font-bold">
                        V{entry.vestNumber}
                      </span>
                    )}
                    {entry.team && (
                      <span
                        className={`text-[9px] font-bold ${
                          entry.team === "RED"
                            ? "text-lm-red"
                            : "text-lm-blue"
                        }`}
                      >
                        {entry.team}
                      </span>
                    )}
                    {entry.isBirthday && (
                      <span className="text-[10px] text-lm-yellow">
                        &#9733;
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {feed.length === 0 && (
            <div className="p-4 text-center">
              <p className="text-xs text-lm-mid uppercase tracking-wider">
                NO SUBMISSIONS YET
              </p>
              <p className="text-[10px] text-lm-mid mt-1">
                Codenames will appear here in real-time
              </p>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
