"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Game {
  id: number;
  startTime: string;
  groupLabel: string | null;
  status: string;
  vestCount: number;
  gameMode: string;
  isTeamMode: boolean;
  showGameMode: boolean;
  birthdayPerson: string | null;
  _count: { players: number };
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).toUpperCase();
}

export default function GameSelectionPage() {
  const router = useRouter();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchGames() {
      try {
        const res = await fetch("/api/games");
        if (!res.ok) throw new Error("Failed to fetch games");
        const data = await res.json();
        // Only show open games
        const openGames = data.filter((g: Game) => g.status === "open");
        setGames(openGames);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load games");
      } finally {
        setLoading(false);
      }
    }
    fetchGames();
  }, []);

  return (
    <div className="flex flex-1 flex-col px-8 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => router.push("/kiosk")}
          className="rounded-sm border border-lm-mid px-6 py-3 text-sm font-bold uppercase tracking-wider text-lm-gray transition-colors active:bg-lm-mid/30"
        >
          BACK
        </button>
        <h1 className="text-2xl font-bold uppercase tracking-wider text-lm-light">
          SELECT YOUR GAME
        </h1>
        <div className="w-24" /> {/* Spacer for centering */}
      </div>

      {/* Divider */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-lm-green/30 to-transparent mb-8" />

      {/* Content */}
      {loading && (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-xl uppercase tracking-wider text-lm-gray animate-text-pulse">
            LOADING...
          </p>
        </div>
      )}

      {error && (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-xl uppercase tracking-wider text-lm-red">{error}</p>
        </div>
      )}

      {!loading && !error && games.length === 0 && (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-xl uppercase tracking-wider text-lm-gray">
            NO GAMES AVAILABLE
          </p>
        </div>
      )}

      {!loading && !error && games.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {games.map((game) => (
            <button
              key={game.id}
              onClick={() => router.push(`/kiosk/games/${game.id}`)}
              className="group flex flex-col items-center gap-3 rounded-sm border-2 border-lm-mid bg-lm-charcoal p-6 transition-all active:border-lm-green active:bg-lm-green/10 hover:border-lm-green/60"
            >
              {/* Time */}
              <span className="text-3xl font-bold text-lm-green">
                {formatTime(game.startTime)}
              </span>

              {/* Badges row */}
              <div className="flex items-center gap-2 flex-wrap justify-center">
                {/* Game Mode Badge */}
                {game.showGameMode && (
                  <span className="rounded-full border border-lm-cyan/50 bg-lm-cyan/10 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-lm-cyan">
                    {game.gameMode}
                  </span>
                )}

                {/* Team Mode Badge */}
                {game.isTeamMode && (
                  <span className="rounded-full border border-lm-purple/50 bg-lm-purple/10 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-lm-purple">
                    TEAM GAME
                  </span>
                )}

                {/* Birthday Indicator */}
                {game.birthdayPerson && (
                  <span className="rounded-full border border-lm-yellow/50 bg-lm-yellow/10 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-lm-yellow">
                    &#9733; BIRTHDAY
                  </span>
                )}
              </div>

              {/* Group Label */}
              {game.groupLabel && (
                <span className="text-lg font-bold uppercase tracking-wider text-lm-light">
                  {game.groupLabel}
                </span>
              )}

              {/* Player Count */}
              <div className="flex items-center gap-2 text-sm uppercase tracking-wider text-lm-gray">
                <span>{game._count.players}</span>
                <span>/</span>
                <span>{game.vestCount} PLAYERS</span>
              </div>

              {/* Status indicator */}
              <div className="h-1 w-16 rounded-full bg-lm-dark">
                <div
                  className="h-full rounded-full bg-lm-green transition-all"
                  style={{
                    width: `${Math.min((game._count.players / game.vestCount) * 100, 100)}%`,
                  }}
                />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
