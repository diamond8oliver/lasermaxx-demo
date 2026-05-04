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

  const fetchPlayers = useCallback(async (gameId: number, showLoading = false) => {
    if (showLoading) setLoadingPlayers(true);
    try {
      const res = await fetch(`/api/games/${gameId}/players`);
      if (res.ok) {
        const data: Player[] = await res.json();
        setPlayers(data);
        return data;
      }
    } catch {
      // silent
    } finally {
      if (showLoading) setLoadingPlayers(false);
    }
    return null;
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
    fetchPlayers(gameId, true);
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

      // If a game is selected, refresh players once and build feed from the same data
      const gId = selectedGameIdRef.current;
      if (gId) {
        fetchGameDetail(gId);
        const allPlayers = await fetchPlayers(gId);

        // Build live feed from players with pending status or recent codename submissions
        if (allPlayers) {
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
  /*  RENDER — LMX Console v8.12 style                                 */
  /* ================================================================ */

  return (
    <div className="flex h-[calc(100vh-2.5rem)]">
      {/* ============================================================ */}
      {/*  LEFT SIDEBAR — LMX-style stacked action buttons              */}
      {/* ============================================================ */}
      <aside className="w-36 shrink-0 bg-[#0e0e1a] border-r border-lm-cyan/15 flex flex-col">
        {/* Action buttons */}
        <div className="flex flex-col">
          <button
            onClick={() => setShowNewGame(true)}
            className="w-full text-left px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-lm-cyan border-b border-lm-cyan/15 bg-lm-cyan/8 hover:bg-lm-cyan/15 transition-colors"
          >
            New Group
          </button>
          {selectedGameId && selectedGame?.status === "draft" && (
            <button
              onClick={() => handleGameStatus(selectedGameId, "open")}
              className="w-full text-left px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-lm-green border-b border-lm-cyan/15 hover:bg-lm-green/10 transition-colors"
            >
              Open Game
            </button>
          )}
          {selectedGameId && selectedGame?.status === "open" && (
            <button
              onClick={() => handleGameStatus(selectedGameId, "in_progress")}
              className="w-full text-left px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-lm-yellow border-b border-lm-cyan/15 hover:bg-lm-yellow/10 transition-colors"
            >
              Start Game
            </button>
          )}
          {selectedGameId && selectedGame?.status === "in_progress" && (
            <button
              onClick={() => handleGameStatus(selectedGameId, "completed")}
              className="w-full text-left px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-lm-blue border-b border-lm-cyan/15 hover:bg-lm-blue/10 transition-colors"
            >
              Complete
            </button>
          )}
          {selectedGameId && (
            <button
              onClick={() => handleDeleteGame(selectedGameId)}
              className="w-full text-left px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-lm-red border-b border-lm-cyan/15 hover:bg-lm-red/10 transition-colors"
            >
              Delete Game
            </button>
          )}
          {selectedGameId && (
            <button
              onClick={exportGameList}
              className="w-full text-left px-3 py-2.5 text-[10px] font-bold uppercase tracking-wider text-lm-gray border-b border-lm-cyan/15 hover:bg-lm-cyan/8 hover:text-lm-light transition-colors"
            >
              Export List
            </button>
          )}
        </div>

        {/* Time slots — game list */}
        <div className="border-t border-lm-cyan/15 mt-auto">
          <div className="px-3 py-1.5 border-b border-lm-cyan/15">
            <span className="text-[9px] font-bold text-lm-gray uppercase tracking-[0.15em]">
              Time &middot; {games.length} today
            </span>
          </div>
          <div className="overflow-y-auto max-h-[calc(100vh-20rem)]">
            {loadingGames ? (
              <div className="px-3 py-4 text-center">
                <span className="text-[10px] text-lm-gray uppercase tracking-wider animate-text-pulse">
                  Loading...
                </span>
              </div>
            ) : games.length === 0 ? (
              <div className="px-3 py-4 text-center">
                <span className="text-[10px] text-lm-mid uppercase">No games</span>
              </div>
            ) : (
              games.map((game) => {
                const isSelected = selectedGameId === game.id;
                const playerCount = game._count?.players ?? 0;
                return (
                  <button
                    key={game.id}
                    onClick={() => selectGame(game.id)}
                    className={`w-full text-left px-3 py-2 border-b border-lm-cyan/10 transition-colors ${
                      isSelected
                        ? "bg-lm-cyan/12 border-l-2 border-l-lm-cyan"
                        : "hover:bg-[#14142a] border-l-2 border-l-transparent"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${isSelected ? "text-lm-cyan" : "text-lm-light"}`}>
                        {formatTime(game.startTime)}
                      </span>
                      <StatusBadge status={game.status} />
                    </div>
                    {game.groupLabel && (
                      <div className="text-[9px] text-lm-gray truncate mt-0.5">
                        {game.groupLabel}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-0.5">
                      {game.showGameMode && (
                        <span className="text-[8px] font-bold text-lm-cyan">{game.gameMode}</span>
                      )}
                      {game.isTeamMode && (
                        <span className="text-[8px] font-bold text-lm-purple">TEAM</span>
                      )}
                      {game.birthdayPerson && (
                        <span className="text-[8px] text-lm-yellow">&#9733;</span>
                      )}
                      <span className="text-[8px] text-lm-mid ml-auto">{playerCount}P</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </aside>

      {/* ============================================================ */}
      {/*  CENTER — Player Grid (LMX Packs-style)                       */}
      {/* ============================================================ */}
      <div className="flex-1 flex flex-col overflow-hidden bg-[#0a0a16]">
        {!selectedGameId ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-lm-mid text-2xl mb-3">&#9654;</div>
              <p className="text-[11px] text-lm-gray uppercase tracking-wider">
                Select a game from the left panel
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Game header bar */}
            <div className="bg-[#0e0e1a] border-b border-lm-cyan/20 px-3 py-2 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-lm-light">
                  {selectedGame ? formatTime(selectedGame.startTime) : "..."}
                </span>
                {selectedGame?.groupLabel && (
                  <span className="text-[11px] text-lm-gray">{selectedGame.groupLabel}</span>
                )}
                {selectedGame && <StatusBadge status={selectedGame.status} />}
                {selectedGame?.showGameMode && (
                  <span className="text-[9px] font-bold text-lm-cyan border border-lm-cyan/30 px-1.5 py-0.5">
                    {selectedGame.gameMode}
                  </span>
                )}
                {selectedGame?.isTeamMode && (
                  <span className="text-[9px] font-bold text-lm-purple border border-lm-purple/30 px-1.5 py-0.5">
                    TEAM
                  </span>
                )}
                {selectedGame?.birthdayPerson && (
                  <span className="text-[10px] text-lm-yellow font-bold">
                    &#9733; {selectedGame.birthdayPerson}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider">
                <span className="text-lm-light">{stats.total}</span>
                <span className="text-lm-green">{stats.approved} OK</span>
                <span className="text-lm-yellow">{stats.pending} PEND</span>
                <span className="text-lm-gray">{stats.waiting} WAIT</span>
              </div>
            </div>

            {/* Quick add bar */}
            <div className="bg-[#0e0e1a] border-b border-lm-cyan/15 px-3 py-1.5 flex items-center gap-3">
              <input
                type="text"
                value={quickName}
                onChange={(e) => setQuickName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") quickAddPlayer(); }}
                placeholder="ADD NAME..."
                className="bg-[#0a0a16] border border-lm-cyan/20 text-lm-light text-[11px] px-2 py-1 w-44 placeholder:text-lm-mid focus:outline-none focus:border-lm-cyan/50 uppercase"
              />
              <button
                onClick={quickAddPlayer}
                disabled={!quickName.trim()}
                className="border border-lm-cyan/25 text-lm-green text-[10px] font-bold uppercase px-2.5 py-1 hover:bg-lm-green/10 disabled:opacity-40 transition-colors"
              >
                Add
              </button>
              <div className="w-px h-5 bg-lm-cyan/15" />
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="PASTE NAMES..."
                rows={1}
                className="bg-[#0a0a16] border border-lm-cyan/20 text-lm-light text-[11px] px-2 py-1 w-52 placeholder:text-lm-mid focus:outline-none focus:border-lm-cyan/50 resize-none"
              />
              <button
                onClick={pasteAddPlayers}
                disabled={pasteLineCount === 0}
                className="border border-lm-cyan/25 text-lm-blue text-[10px] font-bold uppercase px-2.5 py-1 hover:bg-lm-blue/10 disabled:opacity-40 transition-colors whitespace-nowrap"
              >
                Load {pasteLineCount}
              </button>
            </div>

            {/* Player roster — LMX grid style */}
            <div className="flex-1 overflow-y-auto">
              {loadingPlayers ? (
                <div className="p-6 text-center">
                  <span className="text-[11px] text-lm-gray uppercase tracking-wider animate-text-pulse">
                    Loading roster...
                  </span>
                </div>
              ) : players.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-[11px] text-lm-mid uppercase tracking-wider">No players yet</p>
                </div>
              ) : (
                <table className="w-full border-collapse">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-[#12122a]">
                      <th className="text-[9px] font-bold text-lm-cyan/70 uppercase tracking-wider text-left px-2 py-1.5 border border-lm-cyan/20 w-8">#</th>
                      <th className="text-[9px] font-bold text-lm-cyan/70 uppercase tracking-wider text-left px-2 py-1.5 border border-lm-cyan/20 w-12">Vest</th>
                      <th className="text-[9px] font-bold text-lm-cyan/70 uppercase tracking-wider text-left px-2 py-1.5 border border-lm-cyan/20">Name</th>
                      <th className="text-[9px] font-bold text-lm-cyan/70 uppercase tracking-wider text-left px-2 py-1.5 border border-lm-cyan/20">Codename</th>
                      <th className="text-[9px] font-bold text-lm-cyan/70 uppercase tracking-wider text-left px-2 py-1.5 border border-lm-cyan/20 w-14">Team</th>
                      <th className="text-[9px] font-bold text-lm-cyan/70 uppercase tracking-wider text-center px-2 py-1.5 border border-lm-cyan/20 w-8">BD</th>
                      <th className="text-[9px] font-bold text-lm-cyan/70 uppercase tracking-wider text-left px-2 py-1.5 border border-lm-cyan/20 w-20">Status</th>
                      <th className="text-[9px] font-bold text-lm-cyan/70 uppercase tracking-wider text-left px-2 py-1.5 border border-lm-cyan/20 w-28">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {players.map((player, idx) => (
                      <tr
                        key={player.id}
                        className={`hover:bg-[#14142a] transition-colors ${
                          player.isBirthday ? "bg-lm-yellow/5" : ""
                        }`}
                      >
                        <td className="px-2 py-1 text-[11px] text-lm-mid border border-lm-cyan/12">
                          {idx + 1}
                        </td>
                        <td className="px-2 py-1 text-[11px] text-lm-yellow font-bold border border-lm-cyan/12">
                          {player.vestNumber ?? <span className="text-lm-mid">--</span>}
                        </td>
                        <td className="px-2 py-1 text-[11px] text-lm-light border border-lm-cyan/12">
                          {player.realName}
                          {player.isWalkIn && <span className="ml-1 text-[8px] text-lm-purple">WI</span>}
                        </td>
                        <td className="px-2 py-1 border border-lm-cyan/12">
                          {editingPlayerId === player.id ? (
                            <InlineEdit
                              player={player}
                              gameId={selectedGameId}
                              onSaved={() => { setEditingPlayerId(null); fetchPlayers(selectedGameId); }}
                            />
                          ) : (
                            <span className="text-[11px] text-lm-cyan font-bold uppercase tracking-wider">
                              {player.codename || <span className="text-lm-mid font-normal normal-case tracking-normal italic">awaiting...</span>}
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-1 border border-lm-cyan/12">
                          {player.team ? (
                            <span className={`text-[10px] font-bold ${player.team === "RED" ? "text-lm-red" : "text-lm-blue"}`}>
                              {player.team}
                            </span>
                          ) : selectedGame?.isTeamMode ? (
                            <div className="flex gap-px">
                              <button onClick={() => patchPlayer(player.id, { team: "RED" })} className="text-[9px] text-lm-red border border-lm-red/30 px-1 hover:bg-lm-red/10">R</button>
                              <button onClick={() => patchPlayer(player.id, { team: "BLUE" })} className="text-[9px] text-lm-blue border border-lm-blue/30 px-1 hover:bg-lm-blue/10">B</button>
                            </div>
                          ) : (
                            <span className="text-lm-mid text-[10px]">--</span>
                          )}
                        </td>
                        <td className="px-2 py-1 text-center border border-lm-cyan/12">
                          <button
                            onClick={() => patchPlayer(player.id, { isBirthday: !player.isBirthday })}
                            className={`text-sm leading-none ${player.isBirthday ? "text-lm-yellow" : "text-lm-mid hover:text-lm-yellow"}`}
                          >
                            {player.isBirthday ? "\u2605" : "\u2606"}
                          </button>
                        </td>
                        <td className="px-2 py-1 border border-lm-cyan/12">
                          <StatusBadge status={player.status} />
                        </td>
                        <td className="px-2 py-1 border border-lm-cyan/12">
                          <div className="flex items-center gap-px">
                            {player.status !== "approved" && (
                              <button onClick={() => patchPlayer(player.id, { status: "approved" })} className="border border-lm-green/30 text-lm-green text-[9px] font-bold uppercase px-1.5 py-0.5 hover:bg-lm-green/15">OK</button>
                            )}
                            {player.status !== "rejected" && (
                              <button onClick={() => patchPlayer(player.id, { status: "rejected" })} className="border border-lm-red/30 text-lm-red text-[9px] font-bold uppercase px-1.5 py-0.5 hover:bg-lm-red/15">X</button>
                            )}
                            <button onClick={() => setEditingPlayerId(player.id)} className="border border-lm-blue/30 text-lm-blue text-[9px] font-bold uppercase px-1.5 py-0.5 hover:bg-lm-blue/15">ED</button>
                            <button onClick={() => removePlayer(player.id)} className="text-[9px] font-bold text-lm-mid hover:text-lm-red px-1">DEL</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Pagination-style footer like LMX */}
              {players.length > 0 && (
                <div className="px-3 py-1.5 border-t border-lm-cyan/15 text-right">
                  <span className="text-[9px] text-lm-gray font-bold">
                    1-{players.length} &rarr;
                  </span>
                </div>
              )}

              {/* Walk-in pool */}
              {selectedGameId && (
                <div className="border-t border-lm-cyan/20 px-3 py-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[9px] font-bold text-lm-purple uppercase tracking-[0.15em]">
                      Walk-In Pool
                    </span>
                    <span className="text-[9px] text-lm-mid">{walkInPool.length} available</span>
                  </div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <input
                      type="text"
                      value={walkInName}
                      onChange={(e) => setWalkInName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") addToWalkInPool(); }}
                      placeholder="ADD TO POOL..."
                      className="bg-[#0a0a16] border border-lm-cyan/20 text-lm-light text-[11px] px-2 py-1 w-36 placeholder:text-lm-mid focus:outline-none focus:border-lm-purple/50"
                    />
                    <button
                      onClick={addToWalkInPool}
                      disabled={!walkInName.trim()}
                      className="border border-lm-purple/30 text-lm-purple text-[9px] font-bold uppercase px-2 py-1 hover:bg-lm-purple/10 disabled:opacity-40"
                    >
                      Add
                    </button>
                  </div>
                  {walkInPool.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {walkInPool.map((entry) => (
                        <div key={entry.id} className="inline-flex items-center gap-1 border border-lm-purple/25 px-1.5 py-0.5 bg-lm-purple/5">
                          <span className="text-[10px] font-bold text-lm-purple">{entry.realName}</span>
                          <button onClick={() => assignWalkInToGame(entry)} className="text-[8px] text-lm-green hover:text-lm-cyan font-bold" title="Assign to game">+G</button>
                          <button onClick={() => removeFromWalkInPool(entry.id)} className="text-[8px] text-lm-mid hover:text-lm-red font-bold" title="Remove">X</button>
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
      {/*  RIGHT PANEL — Game info + Live Feed                          */}
      {/* ============================================================ */}
      <aside className="w-56 shrink-0 bg-[#0e0e1a] border-l border-lm-cyan/15 flex flex-col overflow-hidden">
        {/* Game info card */}
        <div className="px-3 py-2 border-b border-lm-cyan/15">
          <div className="text-[9px] font-bold text-lm-gray uppercase tracking-[0.15em] mb-1.5">
            Game
          </div>
          {selectedGame ? (
            <div className="space-y-1">
              <div className="text-xs font-bold text-lm-light uppercase">
                {selectedGame.groupLabel || formatTime(selectedGame.startTime)}
              </div>
              {selectedGame.showGameMode && (
                <div className="text-[10px] text-lm-cyan">{selectedGame.gameMode}</div>
              )}
              <div className="text-[9px] text-lm-gray">
                {selectedGame.vestCount} Vests &middot; {stats.total} Players
              </div>
              {selectedGame.birthdayPerson && (
                <div className="text-[9px] text-lm-yellow font-bold">
                  &#9733; {selectedGame.birthdayPerson}
                </div>
              )}
            </div>
          ) : (
            <div className="text-[10px] text-lm-mid italic">No game selected</div>
          )}
        </div>

        {/* Player summary (like LMX right panel player list) */}
        {selectedGame && players.length > 0 && (
          <div className="px-3 py-2 border-b border-lm-cyan/15 max-h-48 overflow-y-auto">
            <div className="text-[9px] font-bold text-lm-gray uppercase tracking-[0.15em] mb-1">
              Packs of
            </div>
            {players.map((p, i) => (
              <div key={p.id} className="flex items-center gap-1.5 py-0.5">
                <span className="text-[9px] text-lm-mid w-4 text-right">{i + 1}</span>
                <span className="text-[9px] text-lm-mid">&ndash;</span>
                <span className="text-[10px] text-lm-light font-bold uppercase truncate">
                  {p.codename || p.realName}
                </span>
                {p.vestNumber && (
                  <span className="text-[8px] text-lm-yellow ml-auto">({p.vestNumber})</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Live feed */}
        <div className="px-3 py-1.5 border-b border-lm-cyan/15 flex items-center justify-between">
          <span className="text-[9px] font-bold text-lm-gray uppercase tracking-[0.15em]">
            Live Feed
          </span>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Pending approvals */}
          {pendingFeed.length > 0 && (
            <div className="border-b border-lm-yellow/20">
              <div className="px-3 py-1 bg-lm-yellow/8">
                <span className="text-[8px] font-bold text-lm-yellow uppercase tracking-wider">
                  Pending ({pendingFeed.length})
                </span>
              </div>
              {pendingFeed.map((entry) => (
                <div key={entry.id} className="px-3 py-1.5 border-b border-lm-cyan/10">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[10px] text-lm-light">{entry.realName}</span>
                    <div className="flex items-center gap-px">
                      <button onClick={() => approveFeedEntry(entry)} className="border border-lm-green/30 text-lm-green text-[9px] font-bold px-1.5 py-0.5 hover:bg-lm-green/15">OK</button>
                      <button onClick={() => rejectFeedEntry(entry)} className="border border-lm-red/30 text-lm-red text-[9px] font-bold px-1.5 py-0.5 hover:bg-lm-red/15">X</button>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-lm-cyan uppercase">{entry.codename}</span>
                    {entry.vestNumber && <span className="text-[9px] text-lm-yellow font-bold">V{entry.vestNumber}</span>}
                    {entry.team && (
                      <span className={`text-[8px] font-bold ${entry.team === "RED" ? "text-lm-red" : "text-lm-blue"}`}>{entry.team}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Resolved entries */}
          {resolvedFeed.map((entry) => (
            <div key={entry.id} className="px-3 py-1.5 border-b border-lm-cyan/8">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[10px] text-lm-gray">{entry.realName}</span>
                <StatusBadge status={entry.status} />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-lm-cyan uppercase">{entry.codename}</span>
                {entry.vestNumber && <span className="text-[9px] text-lm-yellow font-bold">V{entry.vestNumber}</span>}
                {entry.team && (
                  <span className={`text-[8px] font-bold ${entry.team === "RED" ? "text-lm-red" : "text-lm-blue"}`}>{entry.team}</span>
                )}
              </div>
            </div>
          ))}

          {feed.length === 0 && (
            <div className="px-3 py-4 text-center">
              <p className="text-[10px] text-lm-mid uppercase tracking-wider">No submissions yet</p>
            </div>
          )}
        </div>
      </aside>

      {/* ============================================================ */}
      {/*  NEW GAME MODAL (overlays when showNewGame is true)            */}
      {/* ============================================================ */}
      {showNewGame && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <form
            onSubmit={createGame}
            className="bg-[#12122a] border border-lm-cyan/30 p-4 w-80 space-y-2"
          >
            <div className="text-[10px] font-bold text-lm-cyan uppercase tracking-wider mb-2">
              New Session
            </div>

            <div>
              <label className="block text-[9px] uppercase text-lm-gray tracking-wider mb-0.5">Time</label>
              <input type="time" value={ngTime} onChange={(e) => setNgTime(e.target.value)}
                className="w-full bg-[#0a0a16] border border-lm-cyan/20 text-lm-light text-sm px-2 py-1 focus:outline-none focus:border-lm-cyan/50" />
            </div>

            <div>
              <label className="block text-[9px] uppercase text-lm-gray tracking-wider mb-0.5">Group Label</label>
              <input type="text" value={ngLabel} onChange={(e) => setNgLabel(e.target.value)} placeholder="e.g. Birthday Party"
                className="w-full bg-[#0a0a16] border border-lm-cyan/20 text-lm-light text-sm px-2 py-1 placeholder:text-lm-mid focus:outline-none focus:border-lm-cyan/50" />
            </div>

            <div>
              <label className="block text-[9px] uppercase text-lm-gray tracking-wider mb-0.5">Game Mode</label>
              <select value={ngGameMode} onChange={(e) => setNgGameMode(e.target.value)}
                className="w-full bg-[#0a0a16] border border-lm-cyan/20 text-lm-light text-sm px-2 py-1 focus:outline-none focus:border-lm-cyan/50">
                {GAME_MODES.map((mode) => <option key={mode} value={mode}>{mode}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[9px] uppercase text-lm-gray tracking-wider mb-0.5">Vest Count</label>
              <input type="number" value={ngVestCount} onChange={(e) => setNgVestCount(e.target.value)} min={1} max={50}
                className="w-full bg-[#0a0a16] border border-lm-cyan/20 text-lm-light text-sm px-2 py-1 focus:outline-none focus:border-lm-cyan/50" />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[9px] uppercase text-lm-gray tracking-wider">Team Mode</span>
              <label className="relative cursor-pointer">
                <input type="checkbox" checked={ngTeamMode} onChange={(e) => setNgTeamMode(e.target.checked)} className="sr-only peer" />
                <div className="w-9 h-4 bg-[#0a0a16] border border-lm-cyan/20 peer-checked:bg-lm-purple/20 peer-checked:border-lm-purple/40 flex items-center">
                  <div className={`w-3 h-3 transition-all ${ngTeamMode ? "translate-x-5 bg-lm-purple" : "translate-x-0.5 bg-lm-mid"}`} />
                </div>
              </label>
            </div>

            <div>
              <label className="block text-[9px] uppercase text-lm-gray tracking-wider mb-0.5">Birthday Person</label>
              <input type="text" value={ngBirthdayPerson} onChange={(e) => setNgBirthdayPerson(e.target.value)} placeholder="Optional"
                className="w-full bg-[#0a0a16] border border-lm-cyan/20 text-lm-light text-sm px-2 py-1 placeholder:text-lm-mid focus:outline-none focus:border-lm-yellow/50" />
            </div>

            <div>
              <label className="block text-[9px] uppercase text-lm-gray tracking-wider mb-0.5">Birthday Message</label>
              <input type="text" value={ngBirthdayMessage} onChange={(e) => setNgBirthdayMessage(e.target.value)} placeholder="e.g. Happy Birthday!"
                className="w-full bg-[#0a0a16] border border-lm-cyan/20 text-lm-light text-sm px-2 py-1 placeholder:text-lm-mid focus:outline-none focus:border-lm-yellow/50" />
            </div>

            {ngError && <div className="text-[10px] font-bold text-lm-red uppercase">{ngError}</div>}

            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={ngSaving}
                className="flex-1 border border-lm-green/40 text-lm-green text-[10px] font-bold uppercase tracking-wider py-1.5 hover:bg-lm-green/10 disabled:opacity-50">
                {ngSaving ? "Creating..." : "Create"}
              </button>
              <button type="button" onClick={() => setShowNewGame(false)}
                className="flex-1 border border-lm-mid text-lm-gray text-[10px] font-bold uppercase tracking-wider py-1.5 hover:text-lm-light hover:border-lm-gray">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
