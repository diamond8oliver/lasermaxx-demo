"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function TeamSelectionPage() {
  const router = useRouter();
  const params = useParams<{ gameId: string; playerId: string }>();
  const gameId = params.gameId;
  const playerId = params.playerId;

  const [submitting, setSubmitting] = useState(false);

  async function handleTeamSelect(team: string) {
    if (submitting) return;
    setSubmitting(true);

    try {
      const res = await fetch(`/api/games/${gameId}/players/${playerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team }),
      });

      if (!res.ok) {
        setSubmitting(false);
        return;
      }

      router.push(`/kiosk/games/${gameId}/${playerId}?from=team`);
    } catch {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-12 px-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold uppercase tracking-wider text-lm-light">
          SELECT YOUR TEAM
        </h1>
        <div className="mt-3 h-px w-64 mx-auto bg-gradient-to-r from-transparent via-lm-purple/40 to-transparent" />
      </div>

      {/* Team buttons */}
      <div className="flex gap-8">
        <button
          onClick={() => handleTeamSelect("RED")}
          disabled={submitting}
          className="flex h-48 w-48 flex-col items-center justify-center gap-3 rounded-sm border-4 border-lm-red bg-lm-red/10 transition-all active:bg-lm-red/25 hover:bg-lm-red/20 hover:border-lm-red disabled:opacity-50"
        >
          <span className="text-5xl font-bold text-lm-red">RED</span>
          <span className="text-sm font-bold uppercase tracking-wider text-lm-red/70">
            TEAM
          </span>
        </button>

        <button
          onClick={() => handleTeamSelect("BLUE")}
          disabled={submitting}
          className="flex h-48 w-48 flex-col items-center justify-center gap-3 rounded-sm border-4 border-lm-blue bg-lm-blue/10 transition-all active:bg-lm-blue/25 hover:bg-lm-blue/20 hover:border-lm-blue disabled:opacity-50"
        >
          <span className="text-5xl font-bold text-lm-blue">BLUE</span>
          <span className="text-sm font-bold uppercase tracking-wider text-lm-blue/70">
            TEAM
          </span>
        </button>
      </div>

      {/* Back button */}
      <button
        onClick={() => router.push(`/kiosk/games/${gameId}`)}
        className="rounded-sm border border-lm-mid px-6 py-3 text-sm font-bold uppercase tracking-wider text-lm-gray transition-colors active:bg-lm-mid/30"
      >
        BACK
      </button>
    </div>
  );
}
