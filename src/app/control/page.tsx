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
  const [ngVestCount, setNgVestCount] = useState("48");
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

  // Calendar overlay (full session list / delete actions)
  const [showCalendar, setShowCalendar] = useState(false);

  // Packs grid pagination
  const PACKS_PER_PAGE = 30;
  const [packsPage, setPacksPage] = useState(0);

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
      setNgTime(""); setNgLabel(""); setNgVestCount("48");
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

  const totalPacks = selectedGame?.vestCount ?? 48;
  const totalPages = Math.max(1, Math.ceil(totalPacks / PACKS_PER_PAGE));
  const currentPage = Math.min(packsPage, totalPages - 1);
  const pageStart = currentPage * PACKS_PER_PAGE;
  const pageEnd = Math.min(pageStart + PACKS_PER_PAGE, totalPacks);
  const pendingFeedCount = feed.filter((f) => f.status === "pending").length;

  const nextAvailableGame = games.find((g) => g.status === "draft" || g.status === "open");

  /* ================================================================ */
  /*  RENDER                                                           */
  /* ================================================================ */

  return (
    <div className="flex flex-col h-screen bg-[#1c1f24] text-lm-light overflow-hidden">

      {/* Cyan window-title strip */}
      <div className="h-1.5 shrink-0 bg-gradient-to-b from-lm-cyan to-[#00cca0]" />

      {/* ============================================================ */}
      {/*  HEADER — LASERMAXX brand + tab bar                            */}
      {/* ============================================================ */}
      <header className="h-12 shrink-0 bg-black flex items-stretch border-b border-black">
        <div className="flex items-center px-4 gap-2.5">
          {/* Starburst icon */}
          <svg viewBox="0 0 24 24" className="w-6 h-6" fill="white">
            <path d="M12 2 L13.5 8.5 L20 6 L15.5 11 L22 12.5 L15.5 14 L20 19 L13.5 16 L12 22 L10.5 16 L4 19 L8.5 14 L2 12.5 L8.5 11 L4 6 L10.5 8.5 Z" />
          </svg>
          <div className="leading-none">
            <div className="text-white font-black text-[20px] tracking-[0.05em] italic" style={{ fontFamily: "Impact, 'Arial Black', sans-serif", letterSpacing: "0.02em" }}>
              LASERMAXX
            </div>
            <div className="text-lm-cyan text-[8px] tracking-[0.35em] uppercase mt-0.5 font-bold">
              LET&rsquo;S PLAY!
            </div>
          </div>
        </div>
        <div className="ml-auto flex items-stretch text-[11px] tracking-wide">
          {["Standby", "Play Instruction", "Show next", "Start Game", "Application form"].map((t) => {
            const isStart = t === "Start Game" && selectedGameId && selectedGame?.status === "open";
            return (
              <button
                key={t}
                onClick={() => {
                  if (t === "Start Game" && selectedGameId && selectedGame?.status === "open")
                    handleGameStatus(selectedGameId, "in_progress");
                }}
                className={`px-5 flex items-center transition-colors ${
                  isStart
                    ? "text-lm-cyan font-bold"
                    : "text-[#8a8d92] hover:text-white"
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>
      </header>

      {/* ============================================================ */}
      {/*  MAIN — graph-paper bg + 5 big action cards + dynamic grid   */}
      {/* ============================================================ */}
      <div className="flex-1 flex min-h-0 lmx-grid-bg">

        {/* ---- 1. Action sidebar — 5 BIG card buttons ---- */}
        <aside className="w-[108px] shrink-0 flex flex-col gap-1.5 p-1.5">
          <BigActionButton
            label="New Game"
            icon="game"
            selected={false}
            onClick={() => setShowNewGame(true)}
          />
          <BigActionButton
            label="New Group"
            icon="group"
            onClick={() => setShowNewGame(true)}
          />
          <BigActionButton
            label="Calendar"
            icon="calendar"
            onClick={() => setShowCalendar(true)}
          />
          <BigActionButton
            label="Edit Game"
            icon="game"
            disabled={!selectedGameId}
            onClick={() => selectedGameId && setShowAddPlayer(true)}
          />
          <BigActionButton
            label="Edit Group"
            icon="group"
            onClick={() => setShowPool((s) => !s)}
          />

          {pendingFeedCount > 0 && (
            <button
              onClick={() => setShowActivity(true)}
              className="mt-auto text-[9px] uppercase tracking-wider text-black font-bold bg-lm-yellow py-1.5 hover:bg-lm-yellow/80 animate-pulse"
            >
              {pendingFeedCount} pending
            </button>
          )}
        </aside>

        {/* ---- Idle state — empty graph paper when nothing selected ---- */}
        {!selectedGameId ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center opacity-30">
              <svg viewBox="0 0 24 24" className="w-16 h-16 mx-auto mb-3 text-lm-cyan" fill="currentColor">
                <path d="M12 2 L13.5 8.5 L20 6 L15.5 11 L22 12.5 L15.5 14 L20 19 L13.5 16 L12 22 L10.5 16 L4 19 L8.5 14 L2 12.5 L8.5 11 L4 6 L10.5 8.5 Z" />
              </svg>
              <p className="text-[11px] text-lm-light/60 uppercase tracking-[0.2em]">
                Press &ldquo;New Game&rdquo; or &ldquo;Calendar&rdquo;
              </p>
            </div>
          </div>
        ) : (
        <div className="flex-1 flex min-h-0 p-1.5 gap-1.5">

        {/* ---- 2. Time column — Next Available + Other timespan ---- */}
        <Column header="Time" width="w-[120px]">
          <div className="flex-1 flex flex-col">
            {/* Next Available — large highlighted cell */}
            <button
              onClick={() => nextAvailableGame && selectGame(nextAvailableGame.id)}
              disabled={!nextAvailableGame}
              className={`px-2 py-3 border-b border-lm-cyan/20 transition-colors text-center disabled:opacity-50 ${
                nextAvailableGame && selectedGameId === nextAvailableGame.id
                  ? "bg-lm-cyan/15 outline outline-1 outline-lm-cyan -outline-offset-1"
                  : "hover:bg-lm-cyan/8"
              }`}
            >
              <div className="text-[9px] uppercase tracking-wider text-lm-cyan/70 leading-tight">
                Next<br/>Available
              </div>
              <div className="text-lg font-bold text-lm-light tabular-nums mt-1">
                {nextAvailableGame ? formatTime(nextAvailableGame.startTime) : "—"}
              </div>
            </button>

            {/* Other timespan — second cell */}
            <button
              onClick={() => setShowNewGame(true)}
              className="px-2 py-3 border-b border-lm-cyan/20 hover:bg-lm-cyan/8 transition-colors text-center"
            >
              <div className="text-[10px] uppercase tracking-wider text-lm-light leading-tight">
                Other<br/>timespan
              </div>
            </button>

            <div className="flex-1" />
          </div>
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
              {Array.from({ length: pageEnd - pageStart }).map((_, i) => {
                const num = pageStart + i + 1;
                const player = vestMap[num];
                const teamColor = TEAMS.find((t) => t.key === player?.team)?.color;
                return (
                  <div
                    key={num}
                    className="aspect-square border border-lm-cyan/30 flex items-center justify-center relative bg-[#0a0a18] hover:border-lm-cyan/60 transition-colors"
                    style={teamColor ? { borderColor: teamColor, backgroundColor: `${teamColor}22` } : {}}
                    title={player ? `${player.realName} (${player.codename || "no codename"})` : `Pack ${num}`}
                  >
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill={teamColor || "#1a1a2a"} stroke={teamColor || "#00ffcc"} strokeWidth="1.5" opacity={player ? 1 : 0.7}>
                      <path d="M12 2 L20 5 V12 C20 17 16 21 12 22 C8 21 4 17 4 12 V5 Z" />
                    </svg>
                    <span className="absolute bottom-0 right-0.5 text-[8px] font-bold text-lm-cyan/70 tabular-nums leading-none">
                      {num}
                    </span>
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
          {/* Pagination footer — ← / → controls */}
          <div className="px-2 py-1 border-t border-lm-cyan/20 flex items-center justify-end gap-2">
            <button
              onClick={() => setPacksPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="text-[12px] text-lm-cyan/70 hover:text-lm-cyan disabled:opacity-30 disabled:cursor-not-allowed leading-none px-1"
            >
              &larr;
            </button>
            <span className="text-[10px] text-lm-cyan/70 tabular-nums">
              {pageStart + 1} - {pageEnd}
            </span>
            <button
              onClick={() => setPacksPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage >= totalPages - 1}
              className="text-[12px] text-lm-cyan/70 hover:text-lm-cyan disabled:opacity-30 disabled:cursor-not-allowed leading-none px-1"
            >
              &rarr;
            </button>
          </div>
        </Column>

        {/* ---- 6. Right panel — Packs on/off + Game info ---- */}
        <aside className="w-[160px] shrink-0 flex flex-col gap-1.5">
          <button onClick={() => {}} className="w-full py-2 text-[10px] font-bold uppercase tracking-wider border border-[#3a3e46] bg-[#262a31] text-white hover:bg-[#2e323a]">Packs on</button>
          <button onClick={() => {}} className="w-full py-2 text-[10px] font-bold uppercase tracking-wider border border-[#3a3e46] bg-[#262a31] text-white hover:bg-[#2e323a]">Packs off</button>
          <button onClick={() => setShowAddPlayer(true)} className="w-full py-2 text-[10px] font-bold uppercase tracking-wider border border-lm-cyan bg-lm-cyan/15 text-lm-cyan hover:bg-lm-cyan/25">Add</button>

          <div className="flex-1 flex flex-col border border-[#3a3e46] bg-[#262a31]/95 mt-1 min-h-0 backdrop-blur-sm">
            <div className="px-2 py-1.5 border-b border-[#3a3e46] text-[10px] font-bold text-white uppercase tracking-wider">
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
              Save Changes
            </button>
          </div>
        </aside>
        </div>
        )}
      </div>

      {/* ============================================================ */}
      {/*  FOOTER — vest counts (left) + Backup/Support (right)         */}
      {/* ============================================================ */}
      <footer className="h-8 shrink-0 bg-[#101317] border-t border-black flex items-stretch text-[10px]">
        <div className="flex items-center gap-4 px-3 text-[#9da1a6]">
          {/* small icons */}
          <button onClick={() => setShowActivity(true)} className="hover:text-white" title="Activity">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><path d="M4 4h16v3H4zm0 5h10v3H4zm0 5h13v3H4z"/></svg>
          </button>
          <button onClick={() => setShowPool(true)} className="hover:text-white" title="Walk-in pool">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor"><circle cx="12" cy="8" r="3"/><path d="M6 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/></svg>
          </button>
          <div className="flex items-center gap-1.5">
            <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="currentColor"><path d="M12 2 L20 5 V12 C20 17 16 21 12 22 C8 21 4 17 4 12 V5 Z"/></svg>
            <span className="text-white font-bold tabular-nums">{totalPacks} Vests</span>
          </div>
          <div className="flex items-center gap-1.5">
            <svg viewBox="0 0 24 24" className="w-3 h-3 text-[#9da1a6]" fill="currentColor"><path d="M12 2 L20 5 V12 C20 17 16 21 12 22 C8 21 4 17 4 12 V5 Z"/></svg>
            <span className="tabular-nums">0 Junior vests</span>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center text-[9px] text-[#5a5d62]">
          {selectedGame ? (
            <>
              <span>{formatLongDate(selectedGame.startTime)} {formatTime(selectedGame.startTime)}</span>
              <span className="mx-2">&middot;</span>
              <span>{selectedGame.gameMode}</span>
              <span className="mx-2">&middot;</span>
              <span>{gameModeDuration(selectedGame.gameMode)}</span>
            </>
          ) : (
            <span>&copy; 2026 - LaserMaxx Lasergames B.V. - LMXbooking v6.2.3.0</span>
          )}
        </div>
        <div className="flex items-stretch">
          <button className="px-4 text-[#9da1a6] hover:text-white text-[10px]">Backup</button>
          <button className="px-4 text-[#9da1a6] hover:text-white text-[10px]">Support</button>
        </div>
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
      {/*  CALENDAR — full session list with delete                      */}
      {/* ============================================================ */}
      {showCalendar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setShowCalendar(false)}>
          <div className="bg-[#0a0a18] border border-lm-cyan/40 w-[420px] max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-3 py-2 border-b border-lm-cyan/30">
              <span className="text-[11px] font-bold text-lm-cyan uppercase tracking-[0.2em]">Calendar &middot; Sessions</span>
              <button onClick={() => setShowCalendar(false)} className="text-lm-gray hover:text-lm-light text-xs">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {games.length === 0 ? (
                <div className="px-3 py-6 text-center text-[11px] text-lm-mid uppercase">No sessions today</div>
              ) : (
                games.map((g) => {
                  const count = g._count?.players ?? 0;
                  const isSel = selectedGameId === g.id;
                  return (
                    <div
                      key={g.id}
                      className={`flex items-center gap-2 px-3 py-2 border-b border-lm-cyan/10 ${isSel ? "bg-lm-cyan/10" : ""}`}
                    >
                      <button
                        onClick={() => { selectGame(g.id); setShowCalendar(false); }}
                        className="flex-1 text-left flex items-center gap-3"
                      >
                        <span className="text-sm font-bold text-lm-light tabular-nums w-12">{formatTime(g.startTime)}</span>
                        <span className="text-[10px] text-lm-gray flex-1 truncate">{g.groupLabel || "—"}</span>
                        <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 border ${
                          g.status === "open" ? "border-lm-cyan text-lm-cyan" :
                          g.status === "in_progress" ? "border-lm-yellow text-lm-yellow" :
                          g.status === "completed" ? "border-lm-blue text-lm-blue" :
                          "border-lm-mid text-lm-gray"
                        }`}>{g.status.replace("_", " ")}</span>
                        <span className="text-[9px] text-lm-mid tabular-nums w-8 text-right">{count}P</span>
                      </button>
                      <button
                        onClick={() => handleDeleteGame(g.id)}
                        className="text-[9px] font-bold text-lm-red hover:bg-lm-red/10 border border-lm-red/30 px-1.5 py-0.5 uppercase"
                      >Del</button>
                    </div>
                  );
                })
              )}
            </div>
            <div className="px-3 py-2 border-t border-lm-cyan/20 flex justify-end gap-2">
              <button onClick={() => { setShowNewGame(true); setShowCalendar(false); }} className="border border-lm-cyan text-lm-cyan text-[10px] font-bold uppercase px-3 py-1 hover:bg-lm-cyan/10">+ New Session</button>
              <button onClick={() => setShowCalendar(false)} className="border border-lm-mid text-lm-gray text-[10px] font-bold uppercase px-3 py-1 hover:text-lm-light">Close</button>
            </div>
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

function BigActionButton({
  label, icon, onClick, selected, disabled,
}: {
  label: string;
  icon: "game" | "group" | "calendar";
  onClick: () => void;
  selected?: boolean;
  disabled?: boolean;
}) {
  const iconSvg =
    icon === "game" ? (
      <svg viewBox="0 0 24 24" className="w-7 h-7" fill="currentColor">
        <path d="M12 3a4 4 0 014 4v1h-8V7a4 4 0 014-4zm-6 7h12l-1 10H7L6 10z" />
      </svg>
    ) : icon === "group" ? (
      <svg viewBox="0 0 24 24" className="w-7 h-7" fill="currentColor">
        <circle cx="7" cy="8" r="2.5" />
        <circle cx="17" cy="8" r="2.5" />
        <circle cx="12" cy="6" r="2.5" />
        <path d="M3 19c0-2.2 1.8-4 4-4s4 1.8 4 4M13 19c0-2.2 1.8-4 4-4s4 1.8 4 4M8 17c0-2.2 1.8-4 4-4s4 1.8 4 4" />
      </svg>
    ) : (
      <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="5" width="18" height="16" rx="1" />
        <path d="M3 9h18M8 3v4M16 3v4" />
      </svg>
    );

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`lmx-action-btn ${selected ? "selected" : ""} flex flex-col items-center justify-center gap-1 h-[88px] text-white text-[10px] font-medium tracking-wide disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      <span className="leading-none">{label}</span>
      <span className="text-white/85">{iconSvg}</span>
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
    <div className={`${width} shrink-0 flex flex-col border border-[#3a3e46] bg-[#262a31]/95 min-h-0 backdrop-blur-sm`}>
      <div className="px-2 py-1.5 border-b border-[#3a3e46] text-[10px] font-bold text-white uppercase tracking-wider">
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
