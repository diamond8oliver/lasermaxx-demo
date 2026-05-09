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
/*  Static team palette — mirrors LMX Console v8.12                    */
/* ------------------------------------------------------------------ */

const TEAMS = [
  { key: "RED",    label: "Red Team",    color: "#ff3333" },
  { key: "GREEN",  label: "Green Team",  color: "#00cc66" },
  { key: "BLUE",   label: "Blue Team",   color: "#00aaff" },
  { key: "PINK",   label: "Pink Team",   color: "#ff66cc" },
  { key: "YELLOW", label: "Yellow Team", color: "#ffcc00" },
  { key: "OCEAN",  label: "Ocean Team",  color: "#00ddee" },
] as const;

/* ------------------------------------------------------------------ */
/*  Time / date formatting                                             */
/* ------------------------------------------------------------------ */

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatLongDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function gameModeDuration(mode: string): string {
  const m = mode.match(/(\d+)\s*Min/i);
  return m ? `${m[1]} Minutes` : "15 Minutes";
}

function gameModeType(mode: string, isTeamMode: boolean): string {
  if (/team/i.test(mode) || isTeamMode) return "Team";
  if (/free for all|battle/i.test(mode)) return "FFA";
  return "Solo";
}

/* ------------------------------------------------------------------ */
/*  Feed entry                                                         */
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

/* ================================================================== */
/*  MAIN — LMX Console v8.12 clone                                     */
/* ================================================================== */

export default function ControlPage() {
  /* ---- State ---- */
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
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

  // Add player popover
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [addPlayerName, setAddPlayerName] = useState("");
  const [addPlayerPaste, setAddPlayerPaste] = useState("");

  // Activity / feed panel
  const [showActivity, setShowActivity] = useState(false);

  // Walk-in pool panel
  const [showPool, setShowPool] = useState(false);
  const [walkInName, setWalkInName] = useState("");

  const selectedGameIdRef = useRef<number | null>(null);
  selectedGameIdRef.current = selectedGameId;

  /* ---- Fetchers ---- */
  const fetchGames = useCallback(async () => {
    try {
      const res = await fetch("/api/games");
      if (res.ok) setGames(await res.json());
    } catch {/* silent */}
  }, []);

  const fetchPlayers = useCallback(async (gameId: number) => {
    try {
      const res = await fetch(`/api/games/${gameId}/players`);
      if (res.ok) {
        const data: Player[] = await res.json();
        setPlayers(data);
        return data;
      }
    } catch {/* silent */}
    return null;
  }, []);

  const fetchGameDetail = useCallback(async (gameId: number) => {
    try {
      const res = await fetch(`/api/games/${gameId}`);
      if (res.ok) setSelectedGame(await res.json());
    } catch {/* silent */}
  }, []);

  const fetchWalkInPool = useCallback(async () => {
    try {
      const res = await fetch("/api/walk-in-pool");
      if (res.ok) setWalkInPool(await res.json());
    } catch {/* silent */}
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

  /* ---- Polling (3s, replaces Socket.IO for serverless) ---- */
  useEffect(() => {
    const seen = new Set<string>();
    const interval = setInterval(async () => {
      fetchGames();
      fetchWalkInPool();
      const gId = selectedGameIdRef.current;
      if (gId) {
        fetchGameDetail(gId);
        const allPlayers = await fetchPlayers(gId);
        if (allPlayers) {
          const candidates = allPlayers.filter(
            (p) => p.codename && (p.status === "pending" || p.status === "approved")
          );
          for (const p of candidates) {
            const key = `${p.id}-${p.codename}-${p.status}`;
            if (!seen.has(key)) {
              seen.add(key);
              setFeed((prev) => [{
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
              }, ...prev].slice(0, 50));
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
    if (!ngTime) { setNgError("TIME IS REQUIRED"); return; }
    setNgSaving(true);
    setNgError("");
    const today = new Date();
    const [hh, mm] = ngTime.split(":");
    today.setHours(parseInt(hh), parseInt(mm), 0, 0);
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
      setNgTime(""); setNgLabel(""); setNgVestCount("20");
      setNgGameMode(GAME_MODES[0]); setNgTeamMode(false);
      setNgBirthdayPerson(""); setNgBirthdayMessage("");
      fetchGames();
    } catch {
      setNgError("NETWORK ERROR");
    } finally {
      setNgSaving(false);
    }
  }

  async function handleGameStatus(gameId: number, status: Game["status"]) {
    try {
      await fetch(`/api/games/${gameId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      fetchGames();
      fetchGameDetail(gameId);
    } catch {/* silent */}
  }

  async function handleDeleteGame(gameId: number) {
    if (!confirm("DELETE THIS GAME?")) return;
    try {
      await fetch(`/api/games/${gameId}`, { method: "DELETE" });
      if (selectedGameId === gameId) {
        setSelectedGameId(null); setSelectedGame(null); setPlayers([]);
      }
      fetchGames();
    } catch {/* silent */}
  }

  async function changeGameMode(mode: string) {
    if (!selectedGameId) return;
    try {
      await fetch(`/api/games/${selectedGameId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameMode: mode }),
      });
      fetchGameDetail(selectedGameId);
      fetchGames();
    } catch {/* silent */}
  }

  /* ---- Player actions ---- */
  async function quickAddPlayer() {
    if (!addPlayerName.trim() || !selectedGameId) return;
    try {
      await fetch(`/api/games/${selectedGameId}/players`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ realName: addPlayerName.trim() }),
      });
      setAddPlayerName("");
      fetchPlayers(selectedGameId);
      fetchGames();
    } catch {/* silent */}
  }

  async function pasteAddPlayers() {
    if (!addPlayerPaste.trim() || !selectedGameId) return;
    try {
      await fetch(`/api/games/${selectedGameId}/players`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pastedText: addPlayerPaste }),
      });
      setAddPlayerPaste("");
      fetchPlayers(selectedGameId);
      fetchGames();
    } catch {/* silent */}
  }

  /* ---- Walk-in pool actions ---- */
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
    } catch {/* silent */}
  }

  async function removeFromWalkInPool(id: number) {
    try {
      await fetch("/api/walk-in-pool", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      fetchWalkInPool();
    } catch {/* silent */}
  }

  async function assignWalkInToGame(poolEntry: WalkInPool) {
    if (!selectedGameId) return;
    try {
      await fetch(`/api/games/${selectedGameId}/players`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ realName: poolEntry.realName, isWalkIn: true }),
      });
      await fetch("/api/walk-in-pool", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: poolEntry.id }),
      });
      fetchPlayers(selectedGameId);
      fetchWalkInPool();
      fetchGames();
    } catch {/* silent */}
  }

  /* ---- Feed actions ---- */
  async function approveFeedEntry(entry: FeedEntry) {
    try {
      await fetch(`/api/games/${entry.gameId}/players/${entry.playerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      });
      setFeed((prev) => prev.map((f) => f.id === entry.id ? { ...f, status: "approved" as PlayerStatus } : f));
      if (entry.gameId === selectedGameId) fetchPlayers(selectedGameId);
    } catch {/* silent */}
  }

  async function rejectFeedEntry(entry: FeedEntry) {
    try {
      await fetch(`/api/games/${entry.gameId}/players/${entry.playerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "rejected" }),
      });
      setFeed((prev) => prev.map((f) => f.id === entry.id ? { ...f, status: "rejected" as PlayerStatus } : f));
      if (entry.gameId === selectedGameId) fetchPlayers(selectedGameId);
    } catch {/* silent */}
  }

  /* ---- Computed ---- */
  const teamCounts: Record<string, number> = TEAMS.reduce((acc, t) => {
    acc[t.key] = players.filter((p) => p.team === t.key).length;
    return acc;
  }, {} as Record<string, number>);

  const vestMap: Record<number, Player | undefined> = {};
  players.forEach((p) => { if (p.vestNumber) vestMap[p.vestNumber] = p; });

  const totalPacks = selectedGame?.vestCount ?? 30;
  const pendingFeedCount = feed.filter((f) => f.status === "pending").length;

  const nextAvailableGame = games.find((g) => g.status === "draft" || g.status === "open");

  /* ================================================================ */
  /*  RENDER                                                           */
  /* ================================================================ */

  return (
    <div className="flex flex-col h-screen bg-lm-black text-lm-light overflow-hidden">

      {/* ============================================================ */}
      {/*  HEADER — LASERMAXX brand + tab bar (right)                   */}
      {/* ============================================================ */}
      <header className="h-9 shrink-0 bg-[#070710] border-b border-lm-cyan/40 flex items-stretch">
        <div className="flex items-center px-3 gap-2 border-r border-lm-cyan/30 bg-[#0a0a18]">
          <span className="inline-block w-3 h-3 bg-lm-cyan" style={{ clipPath: "polygon(50% 0, 100% 50%, 50% 100%, 0 50%)" }} />
          <span className="text-lm-cyan font-bold text-[13px] tracking-[0.18em]">LASERMAXX</span>
        </div>
        <div className="ml-auto flex items-stretch text-[10px] uppercase tracking-wider">
          {["Stamcards", "Play instructor", "Show next", "Start Game", "Application data"].map((t, i) => (
            <button
              key={t}
              onClick={() => {
                if (t === "Start Game" && selectedGameId && selectedGame?.status === "open")
                  handleGameStatus(selectedGameId, "in_progress");
              }}
              className={`px-4 flex items-center border-l border-lm-cyan/20 transition-colors ${
                i === 3 && selectedGame?.status === "open"
                  ? "bg-lm-cyan/10 text-lm-cyan font-bold"
                  : "text-lm-gray hover:text-lm-light hover:bg-[#0e0e1a]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </header>

      {/* ============================================================ */}
      {/*  MAIN — 6-column grid                                         */}
      {/* ============================================================ */}
      <div className="flex-1 flex min-h-0 p-2 gap-1 bg-[#070710]">

        {/* ---- 1. Action sidebar ---- */}
        <aside className="w-[88px] shrink-0 flex flex-col gap-1">
          <ActionButton label="Cancel" onClick={() => { setSelectedGameId(null); setSelectedGame(null); setPlayers([]); }} />
          <ActionButton label="New Group" highlight onClick={() => setShowNewGame(true)} />
          <ActionButton label="Calendar" onClick={() => {}} />
          <ActionButton label="Edit Game" onClick={() => selectedGameId && handleGameStatus(selectedGameId, "open")} />
          <ActionButton label="Edit Group" onClick={() => setShowPool((s) => !s)} />
          <ActionButton
            label={pendingFeedCount > 0 ? `Activity (${pendingFeedCount})` : "Activity"}
            small
            alert={pendingFeedCount > 0}
            onClick={() => setShowActivity((s) => !s)}
          />
          {selectedGameId && (
            <ActionButton label="Delete" small danger onClick={() => handleDeleteGame(selectedGameId)} />
          )}
        </aside>

        {/* ---- 2. Time column ---- */}
        <Column header="Time" width="w-[150px]">
          <div className="flex-1 overflow-y-auto">
            {/* "Next Available" pinned cell */}
            {nextAvailableGame && (
              <button
                onClick={() => selectGame(nextAvailableGame.id)}
                className={`w-full text-left px-2 py-2 border-b border-lm-cyan/10 transition-colors ${
                  selectedGameId === nextAvailableGame.id
                    ? "bg-lm-cyan/15 outline outline-1 outline-lm-cyan -outline-offset-1"
                    : "hover:bg-lm-cyan/5"
                }`}
              >
                <div className="text-[9px] uppercase tracking-wider text-lm-cyan/70">Next Available</div>
                <div className="text-base font-bold text-lm-light tabular-nums">{formatTime(nextAvailableGame.startTime)}</div>
              </button>
            )}
            {/* All other games */}
            {games.filter((g) => g.id !== nextAvailableGame?.id).map((game) => {
              const isSel = selectedGameId === game.id;
              const count = game._count?.players ?? 0;
              return (
                <button
                  key={game.id}
                  onClick={() => selectGame(game.id)}
                  className={`w-full text-left px-2 py-1.5 border-b border-lm-cyan/10 transition-colors ${
                    isSel
                      ? "bg-lm-cyan/15 outline outline-1 outline-lm-cyan -outline-offset-1"
                      : "hover:bg-lm-cyan/5"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-bold tabular-nums ${isSel ? "text-lm-cyan" : "text-lm-light"}`}>
                      {formatTime(game.startTime)}
                    </span>
                    <span className="text-[9px] text-lm-gray tabular-nums">{count}P</span>
                  </div>
                  {game.groupLabel && (
                    <div className="text-[9px] text-lm-gray truncate">{game.groupLabel}</div>
                  )}
                </button>
              );
            })}
            {games.length === 0 && (
              <div className="px-2 py-3 text-center text-[10px] text-lm-mid uppercase">No games</div>
            )}
          </div>
          <ColumnFooter label="Other timespan" onClick={() => setShowNewGame(true)} />
        </Column>

        {/* ---- 3. Game style column ---- */}
        <Column header="Game style" width="w-[180px]">
          <div className="flex-1 overflow-y-auto">
            {GAME_MODES.map((mode, idx) => {
              const isSel = selectedGame?.gameMode === mode;
              const num = idx + 1;
              return (
                <button
                  key={mode}
                  onClick={() => changeGameMode(mode)}
                  disabled={!selectedGameId}
                  className={`w-full text-left px-2 py-1.5 border-b border-lm-cyan/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    isSel
                      ? "bg-lm-cyan/15 outline outline-1 outline-lm-cyan -outline-offset-1 text-lm-cyan"
                      : "text-lm-light hover:bg-lm-cyan/5"
                  }`}
                >
                  <span className="text-[11px] tabular-nums">{num} - {mode}</span>
                </button>
              );
            })}
          </div>
          <ColumnFooter label="Select.." onClick={() => {}} />
        </Column>

        {/* ---- 4. Teams column ---- */}
        <Column header="Teams" width="w-[140px]">
          <div className="flex-1 overflow-y-auto">
            {TEAMS.map((team) => {
              const count = teamCounts[team.key] || 0;
              const isActive = selectedGame?.isTeamMode && (team.key === "RED" || team.key === "BLUE");
              return (
                <div
                  key={team.key}
                  className={`flex items-center justify-between px-2 py-1.5 border-b border-lm-cyan/10 ${
                    isActive ? "" : "opacity-60"
                  }`}
                >
                  <span
                    className="text-[11px] font-bold uppercase tracking-wide"
                    style={{ color: team.color }}
                  >
                    {team.label}
                  </span>
                  {count > 0 && (
                    <span className="text-[11px] font-bold text-lm-light tabular-nums">{count}</span>
                  )}
                </div>
              );
            })}
          </div>
        </Column>

        {/* ---- 5. Packs grid ---- */}
        <Column header="Packs" width="flex-1">
          <div className="flex-1 overflow-y-auto p-2">
            <div className="grid grid-cols-6 gap-1">
              {Array.from({ length: totalPacks }).map((_, i) => {
                const num = i + 1;
                const player = vestMap[num];
                const teamColor = TEAMS.find((t) => t.key === player?.team)?.color;
                return (
                  <div
                    key={num}
                    className="aspect-square border border-lm-cyan/30 flex items-center justify-center relative bg-[#0a0a18] hover:border-lm-cyan/60 transition-colors group"
                    style={teamColor ? { borderColor: teamColor, backgroundColor: `${teamColor}22` } : {}}
                    title={player ? `${player.realName} (${player.codename || "no codename"})` : `Pack ${num}`}
                  >
                    {/* Shield/vest icon */}
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill={teamColor || "#1a1a2a"} stroke={teamColor || "#00ffcc"} strokeWidth="1.5" opacity={player ? 1 : 0.7}>
                      <path d="M12 2 L20 5 V12 C20 17 16 21 12 22 C8 21 4 17 4 12 V5 Z" />
                    </svg>
                    {/* Vest number */}
                    <span className="absolute bottom-0 right-0.5 text-[8px] font-bold text-lm-cyan/70 tabular-nums leading-none">
                      {num}
                    </span>
                    {/* Player initial */}
                    {player && (
                      <span className="absolute top-0 left-0.5 text-[8px] font-bold leading-none" style={{ color: teamColor || "#00ffcc" }}>
                        {(player.codename || player.realName).charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="px-2 py-1 border-t border-lm-cyan/20 text-right">
            <span className="text-[10px] text-lm-cyan/70 tabular-nums">1 - {totalPacks} &rarr;</span>
          </div>
        </Column>

        {/* ---- 6. Right panel — Packs on/off + Game info ---- */}
        <aside className="w-[170px] shrink-0 flex flex-col gap-1">
          <ActionButton label="Packs on" small onClick={() => {}} />
          <ActionButton label="Packs off" small onClick={() => {}} />
          <ActionButton label="Add" small highlight onClick={() => setShowAddPlayer(true)} />

          <div className="flex-1 flex flex-col border border-lm-cyan/30 bg-[#0a0a18] mt-1 min-h-0">
            <div className="px-2 py-1 border-b border-lm-cyan/20 text-[10px] font-bold text-lm-cyan/80 uppercase tracking-wider">
              Game
            </div>
            {selectedGame ? (
              <>
                <div className="px-2 py-1.5 border-b border-lm-cyan/10">
                  <div className="text-xs font-bold text-lm-light uppercase truncate">
                    {selectedGame.groupLabel || "COMP NIGHT"}
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {players.length === 0 ? (
                    <div className="px-2 py-3 text-center text-[10px] text-lm-mid uppercase">No players</div>
                  ) : (
                    players.map((p, i) => {
                      const teamColor = TEAMS.find((t) => t.key === p.team)?.color;
                      return (
                        <div key={p.id} className="flex items-center gap-1 px-2 py-0.5 border-b border-lm-cyan/5">
                          <span className="text-[10px] text-lm-mid tabular-nums">{i + 1}</span>
                          <span className="text-[10px] text-lm-mid">-</span>
                          <span
                            className="text-[10px] font-bold uppercase truncate flex-1"
                            style={{ color: teamColor || "var(--color-lm-light)" }}
                          >
                            {p.codename || p.realName}
                          </span>
                          {p.vestNumber && (
                            <span className="text-[9px] text-lm-cyan/70 tabular-nums">({p.vestNumber})</span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center px-2 py-4">
                <span className="text-[10px] text-lm-mid italic uppercase">No game selected</span>
              </div>
            )}
            <button
              onClick={() => setShowNewGame(true)}
              className="border-t border-lm-cyan/30 text-lm-cyan hover:bg-lm-cyan/10 py-2 text-[11px] font-bold uppercase tracking-wider transition-colors"
            >
              Create
            </button>
          </div>
        </aside>
      </div>

      {/* ============================================================ */}
      {/*  FOOTER — info strip                                          */}
      {/* ============================================================ */}
      <footer className="h-7 shrink-0 bg-[#0a0a18] border-t border-lm-cyan/30 flex items-center px-3 text-[10px] text-lm-gray tracking-wide">
        {selectedGame ? (
          <>
            <span className="text-lm-light">{formatLongDate(selectedGame.startTime)} {formatTime(selectedGame.startTime)}</span>
            <span className="mx-3 text-lm-mid">|</span>
            <span>{selectedGame.gameMode}</span>
            <span className="mx-3 text-lm-mid">/</span>
            <span>Type: <span className="text-lm-cyan">{gameModeType(selectedGame.gameMode, selectedGame.isTeamMode)}</span></span>
            <span className="mx-3 text-lm-mid">/</span>
            <span>Duration: <span className="text-lm-cyan">{gameModeDuration(selectedGame.gameMode)}</span></span>
            <span className="ml-auto text-lm-mid">{games.length} sessions today</span>
          </>
        ) : (
          <span className="text-lm-mid">— No session selected —</span>
        )}
      </footer>

      {/* ============================================================ */}
      {/*  NEW GAME MODAL                                               */}
      {/* ============================================================ */}
      {showNewGame && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <form onSubmit={createGame} className="bg-[#0a0a18] border border-lm-cyan/40 p-4 w-80 space-y-2 shadow-[0_0_40px_rgba(0,255,204,0.2)]">
            <div className="text-[11px] font-bold text-lm-cyan uppercase tracking-[0.2em] mb-2 pb-2 border-b border-lm-cyan/20">
              New Session
            </div>
            <FormField label="Time">
              <input type="time" value={ngTime} onChange={(e) => setNgTime(e.target.value)}
                className="w-full bg-[#070710] border border-lm-cyan/30 text-lm-light text-sm px-2 py-1 focus:outline-none focus:border-lm-cyan" />
            </FormField>
            <FormField label="Group Label">
              <input type="text" value={ngLabel} onChange={(e) => setNgLabel(e.target.value)} placeholder="e.g. Birthday Party"
                className="w-full bg-[#070710] border border-lm-cyan/30 text-lm-light text-sm px-2 py-1 placeholder:text-lm-mid focus:outline-none focus:border-lm-cyan" />
            </FormField>
            <FormField label="Game Mode">
              <select value={ngGameMode} onChange={(e) => setNgGameMode(e.target.value)}
                className="w-full bg-[#070710] border border-lm-cyan/30 text-lm-light text-sm px-2 py-1 focus:outline-none focus:border-lm-cyan">
                {GAME_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </FormField>
            <FormField label="Vest Count">
              <input type="number" value={ngVestCount} onChange={(e) => setNgVestCount(e.target.value)} min={1} max={50}
                className="w-full bg-[#070710] border border-lm-cyan/30 text-lm-light text-sm px-2 py-1 focus:outline-none focus:border-lm-cyan" />
            </FormField>
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase text-lm-gray tracking-wider">Team Mode</span>
              <label className="relative cursor-pointer">
                <input type="checkbox" checked={ngTeamMode} onChange={(e) => setNgTeamMode(e.target.checked)} className="sr-only peer" />
                <div className="w-9 h-4 bg-[#070710] border border-lm-cyan/30 peer-checked:bg-lm-cyan/20 peer-checked:border-lm-cyan flex items-center">
                  <div className={`w-3 h-3 transition-all ${ngTeamMode ? "translate-x-5 bg-lm-cyan" : "translate-x-0.5 bg-lm-mid"}`} />
                </div>
              </label>
            </div>
            <FormField label="Birthday Person">
              <input type="text" value={ngBirthdayPerson} onChange={(e) => setNgBirthdayPerson(e.target.value)} placeholder="Optional"
                className="w-full bg-[#070710] border border-lm-cyan/30 text-lm-light text-sm px-2 py-1 placeholder:text-lm-mid focus:outline-none focus:border-lm-yellow" />
            </FormField>
            <FormField label="Birthday Message">
              <input type="text" value={ngBirthdayMessage} onChange={(e) => setNgBirthdayMessage(e.target.value)} placeholder="e.g. Happy Birthday!"
                className="w-full bg-[#070710] border border-lm-cyan/30 text-lm-light text-sm px-2 py-1 placeholder:text-lm-mid focus:outline-none focus:border-lm-yellow" />
            </FormField>
            {ngError && <div className="text-[10px] font-bold text-lm-red uppercase">{ngError}</div>}
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={ngSaving}
                className="flex-1 border border-lm-cyan text-lm-cyan text-[11px] font-bold uppercase tracking-wider py-2 hover:bg-lm-cyan/15 disabled:opacity-50">
                {ngSaving ? "Creating..." : "Create"}
              </button>
              <button type="button" onClick={() => setShowNewGame(false)}
                className="flex-1 border border-lm-mid text-lm-gray text-[11px] font-bold uppercase tracking-wider py-2 hover:text-lm-light hover:border-lm-gray">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ============================================================ */}
      {/*  ADD PLAYER MODAL                                             */}
      {/* ============================================================ */}
      {showAddPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setShowAddPlayer(false)}>
          <div className="bg-[#0a0a18] border border-lm-cyan/40 p-4 w-96 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="text-[11px] font-bold text-lm-cyan uppercase tracking-[0.2em] mb-2 pb-2 border-b border-lm-cyan/20">
              Add Players {selectedGame ? `→ ${formatTime(selectedGame.startTime)}` : ""}
            </div>
            {!selectedGameId ? (
              <div className="text-[11px] text-lm-yellow uppercase">Select a game first</div>
            ) : (
              <>
                <FormField label="Single name">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={addPlayerName}
                      onChange={(e) => setAddPlayerName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") quickAddPlayer(); }}
                      placeholder="ADD NAME..."
                      className="flex-1 bg-[#070710] border border-lm-cyan/30 text-lm-light text-sm px-2 py-1 placeholder:text-lm-mid focus:outline-none focus:border-lm-cyan uppercase"
                    />
                    <button
                      onClick={quickAddPlayer}
                      disabled={!addPlayerName.trim()}
                      className="border border-lm-cyan text-lm-cyan text-[10px] font-bold uppercase px-3 py-1 hover:bg-lm-cyan/10 disabled:opacity-40"
                    >Add</button>
                  </div>
                </FormField>
                <FormField label={`Bulk paste (${addPlayerPaste.split(/\r?\n/).filter((l) => l.trim().length >= 2).length} names)`}>
                  <textarea
                    value={addPlayerPaste}
                    onChange={(e) => setAddPlayerPaste(e.target.value)}
                    rows={5}
                    placeholder="One name per line..."
                    className="w-full bg-[#070710] border border-lm-cyan/30 text-lm-light text-sm px-2 py-1 placeholder:text-lm-mid focus:outline-none focus:border-lm-cyan resize-none"
                  />
                  <button
                    onClick={pasteAddPlayers}
                    disabled={addPlayerPaste.split(/\r?\n/).filter((l) => l.trim().length >= 2).length === 0}
                    className="mt-1 border border-lm-cyan text-lm-cyan text-[10px] font-bold uppercase px-3 py-1 hover:bg-lm-cyan/10 disabled:opacity-40 w-full"
                  >Load all</button>
                </FormField>
              </>
            )}
            <div className="flex justify-end pt-2 border-t border-lm-cyan/20">
              <button onClick={() => setShowAddPlayer(false)} className="border border-lm-mid text-lm-gray text-[10px] font-bold uppercase px-3 py-1 hover:text-lm-light">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/*  WALK-IN POOL OVERLAY                                          */}
      {/* ============================================================ */}
      {showPool && (
        <div className="fixed top-12 right-2 w-72 bg-[#0a0a18] border border-lm-cyan/40 z-40 max-h-[70vh] flex flex-col">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-lm-cyan/30">
            <span className="text-[10px] font-bold text-lm-cyan uppercase tracking-wider">Walk-In Pool ({walkInPool.length})</span>
            <button onClick={() => setShowPool(false)} className="text-lm-gray hover:text-lm-light text-xs">✕</button>
          </div>
          <div className="px-3 py-2 border-b border-lm-cyan/20 flex gap-2">
            <input
              type="text"
              value={walkInName}
              onChange={(e) => setWalkInName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addToWalkInPool(); }}
              placeholder="ADD TO POOL..."
              className="flex-1 bg-[#070710] border border-lm-cyan/30 text-lm-light text-[11px] px-2 py-1 placeholder:text-lm-mid focus:outline-none focus:border-lm-cyan uppercase"
            />
            <button onClick={addToWalkInPool} disabled={!walkInName.trim()} className="border border-lm-cyan text-lm-cyan text-[10px] font-bold uppercase px-2 py-1 hover:bg-lm-cyan/10 disabled:opacity-40">
              Add
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {walkInPool.length === 0 ? (
              <div className="px-3 py-4 text-center text-[10px] text-lm-mid uppercase">Empty</div>
            ) : (
              walkInPool.map((entry) => (
                <div key={entry.id} className="flex items-center gap-2 px-3 py-1.5 border-b border-lm-cyan/10">
                  <span className="text-[11px] text-lm-light flex-1">{entry.realName}</span>
                  {selectedGameId && (
                    <button onClick={() => assignWalkInToGame(entry)} className="border border-lm-cyan text-lm-cyan text-[9px] font-bold uppercase px-1.5 py-0.5 hover:bg-lm-cyan/10" title="Assign to selected game">+G</button>
                  )}
                  <button onClick={() => removeFromWalkInPool(entry.id)} className="text-lm-gray hover:text-lm-red text-[9px] font-bold">✕</button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/*  ACTIVITY (live feed) OVERLAY                                  */}
      {/* ============================================================ */}
      {showActivity && (
        <div className="fixed top-12 right-2 w-80 bg-[#0a0a18] border border-lm-cyan/40 z-40 max-h-[70vh] flex flex-col">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-lm-cyan/30">
            <span className="text-[10px] font-bold text-lm-cyan uppercase tracking-wider">Live Feed ({feed.length})</span>
            <button onClick={() => setShowActivity(false)} className="text-lm-gray hover:text-lm-light text-xs">✕</button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {feed.length === 0 ? (
              <div className="px-3 py-4 text-center text-[10px] text-lm-mid uppercase">No submissions yet</div>
            ) : (
              feed.map((entry) => {
                const teamColor = TEAMS.find((t) => t.key === entry.team)?.color;
                return (
                  <div key={entry.id} className="px-3 py-2 border-b border-lm-cyan/10">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[10px] text-lm-light">{entry.realName}</span>
                      <span className={`text-[9px] font-bold uppercase ${
                        entry.status === "approved" ? "text-lm-cyan" :
                        entry.status === "rejected" ? "text-lm-red" :
                        "text-lm-yellow"
                      }`}>
                        {entry.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: teamColor || "var(--color-lm-cyan)" }}>
                        {entry.codename}
                      </span>
                      {entry.vestNumber && <span className="text-[9px] text-lm-cyan/70">V{entry.vestNumber}</span>}
                      {entry.status === "pending" && (
                        <div className="ml-auto flex items-center gap-1">
                          <button onClick={() => approveFeedEntry(entry)} className="border border-lm-cyan text-lm-cyan text-[9px] font-bold uppercase px-1.5 py-0.5 hover:bg-lm-cyan/10">OK</button>
                          <button onClick={() => rejectFeedEntry(entry)} className="border border-lm-red/50 text-lm-red text-[9px] font-bold uppercase px-1.5 py-0.5 hover:bg-lm-red/10">X</button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function ActionButton({
  label, onClick, highlight, danger, alert, small,
}: {
  label: string;
  onClick: () => void;
  highlight?: boolean;
  danger?: boolean;
  alert?: boolean;
  small?: boolean;
}) {
  const colorClass = danger
    ? "border-lm-red/50 text-lm-red hover:bg-lm-red/10"
    : highlight
    ? "border-lm-cyan text-lm-cyan hover:bg-lm-cyan/15 bg-lm-cyan/5"
    : alert
    ? "border-lm-yellow text-lm-yellow hover:bg-lm-yellow/10 animate-pulse"
    : "border-lm-cyan/30 text-lm-light hover:bg-lm-cyan/10 hover:border-lm-cyan/60";
  return (
    <button
      onClick={onClick}
      className={`w-full ${small ? "py-2" : "py-3"} text-[10px] font-bold uppercase tracking-wider border bg-[#0a0a18] transition-colors ${colorClass}`}
    >
      {label}
    </button>
  );
}

function Column({
  header, width, children,
}: {
  header: string;
  width: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`${width} shrink-0 flex flex-col border border-lm-cyan/30 bg-[#0a0a18] min-h-0`}>
      <div className="px-2 py-1 border-b border-lm-cyan/20 text-[10px] font-bold text-lm-cyan/80 uppercase tracking-wider">
        {header}
      </div>
      {children}
    </div>
  );
}

function ColumnFooter({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="border-t border-lm-cyan/20 text-[10px] font-bold text-lm-cyan/70 uppercase tracking-wider py-2 hover:bg-lm-cyan/10 hover:text-lm-cyan transition-colors"
    >
      {label}
    </button>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] uppercase text-lm-gray tracking-wider mb-1">{label}</label>
      {children}
    </div>
  );
}
