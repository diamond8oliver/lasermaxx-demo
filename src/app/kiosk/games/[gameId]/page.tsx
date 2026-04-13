"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface Player {
  id: number;
  realName: string;
  codename: string | null;
  status: string;
  isBirthday: boolean;
  isWalkIn: boolean;
}

interface Game {
  id: number;
  isTeamMode: boolean;
}

export default function PlayerSelectionPage() {
  const router = useRouter();
  const params = useParams<{ gameId: string }>();
  const gameId = params.gameId;

  const [players, setPlayers] = useState<Player[]>([]);
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [playersRes, gameRes] = await Promise.all([
          fetch(`/api/games/${gameId}/players?status=waiting`),
          fetch(`/api/games/${gameId}`),
        ]);
        if (!playersRes.ok) throw new Error("Failed to fetch players");
        if (!gameRes.ok) throw new Error("Failed to fetch game");

        const playersData = await playersRes.json();
        const gameData = await gameRes.json();

        // Sort alphabetically by realName
        const sorted = [...playersData].sort((a: Player, b: Player) =>
          a.realName.localeCompare(b.realName)
        );
        setPlayers(sorted);
        setGame(gameData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load players");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [gameId]);

  function handlePlayerSelect(player: Player) {
    if (game?.isTeamMode) {
      // Team mode: go to team selection first
      router.push(`/kiosk/games/${gameId}/${player.id}/team`);
    } else {
      // Solo mode: go straight to codename entry
      router.push(`/kiosk/games/${gameId}/${player.id}`);
    }
  }

  const regularPlayers = players.filter((p) => !p.isWalkIn);
  const walkInPlayers = players.filter((p) => p.isWalkIn);

  return (
    <div className="flex flex-1 flex-col px-8 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => router.push("/kiosk/games")}
          className="rounded-sm border border-lm-mid px-6 py-3 text-sm font-bold uppercase tracking-wider text-lm-gray transition-colors active:bg-lm-mid/30"
        >
          BACK
        </button>
        <h1 className="text-2xl font-bold uppercase tracking-wider text-lm-light">
          SELECT YOUR NAME
        </h1>
        <div className="w-24" />
      </div>

      {/* Divider */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-lm-blue/30 to-transparent mb-8" />

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

      {!loading && !error && players.length === 0 && (
        <div className="flex flex-1 flex-col items-center justify-center gap-6">
          <p className="text-2xl uppercase tracking-wider text-lm-gray">
            NO PLAYERS AVAILABLE
          </p>
          <p className="text-sm uppercase tracking-wider text-lm-gray/60">
            ALL PLAYERS HAVE BEEN CLAIMED OR NO PLAYERS REGISTERED
          </p>
        </div>
      )}

      {!loading && !error && players.length > 0 && (
        <div className="overflow-y-auto max-h-[calc(100dvh-180px)] pb-4 space-y-6">
          {/* Regular players */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {regularPlayers.map((player) => (
              <button
                key={player.id}
                onClick={() => handlePlayerSelect(player)}
                className={`flex h-20 items-center justify-center gap-2 rounded-sm border-2 px-4 text-xl font-bold uppercase tracking-wider transition-all ${
                  player.isBirthday
                    ? "border-lm-yellow bg-lm-yellow/10 text-lm-yellow active:bg-lm-yellow/20 hover:border-lm-yellow"
                    : "border-lm-mid bg-lm-charcoal text-lm-light active:border-lm-blue active:bg-lm-blue/10 hover:border-lm-blue/60"
                }`}
              >
                {player.isBirthday && <span>&#9733;</span>}
                {player.realName}
              </button>
            ))}
          </div>

          {/* Walk-in players section */}
          {walkInPlayers.length > 0 && (
            <>
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-lm-purple/30" />
                <span className="text-xs font-bold uppercase tracking-wider text-lm-purple">
                  WALK-INS
                </span>
                <div className="h-px flex-1 bg-lm-purple/30" />
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {walkInPlayers.map((player) => (
                  <button
                    key={player.id}
                    onClick={() => handlePlayerSelect(player)}
                    className="flex h-20 items-center justify-center rounded-sm border-2 border-lm-purple/50 bg-lm-purple/10 px-4 text-xl font-bold uppercase tracking-wider text-lm-purple transition-all active:border-lm-purple active:bg-lm-purple/20 hover:border-lm-purple/80"
                  >
                    {player.realName}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
