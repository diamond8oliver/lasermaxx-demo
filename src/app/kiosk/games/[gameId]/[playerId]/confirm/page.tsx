"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const DEFAULT_TIMEOUT = 8;

export default function ConfirmationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const codename = searchParams.get("codename") ?? "UNKNOWN";
  const vest = searchParams.get("vest") ?? "?";
  const team = searchParams.get("team") ?? null;
  const isBirthday = searchParams.get("birthday") === "1";
  const birthdayMessage = searchParams.get("birthdayMessage") ?? null;

  const [timeout, setTimeout_] = useState(DEFAULT_TIMEOUT);
  const [remaining, setRemaining] = useState(DEFAULT_TIMEOUT);
  const startTimeRef = useRef<number>(Date.now());
  const timeoutLoaded = useRef(false);

  // Fetch dynamic timeout from settings
  useEffect(() => {
    async function loadTimeout() {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          const val = parseInt(data.confirmationTimeout);
          if (val > 0) {
            setTimeout_(val);
            setRemaining(val);
            startTimeRef.current = Date.now();
          }
        }
      } catch {
        // Use default
      } finally {
        timeoutLoaded.current = true;
      }
    }
    loadTimeout();
  }, []);

  useEffect(() => {
    if (!timeoutLoaded.current) return;

    startTimeRef.current = Date.now();

    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const left = Math.max(0, timeout - elapsed);
      setRemaining(left);

      if (left <= 0) {
        clearInterval(interval);
        router.push("/kiosk");
      }
    }, 50);

    return () => clearInterval(interval);
  }, [router, timeout]);

  const progress = remaining / timeout;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-10 px-8">
      {/* Mission Assigned Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold uppercase tracking-wider text-lm-green">
          MISSION ASSIGNED
        </h1>
        <div className="mt-3 h-px w-80 mx-auto bg-gradient-to-r from-transparent via-lm-green/50 to-transparent" />
      </div>

      {/* Codename Display */}
      <div className="text-center">
        <p className="mb-2 text-sm font-bold uppercase tracking-widest text-lm-gray">
          YOUR CODENAME
        </p>
        <p className="text-5xl font-bold uppercase tracking-wider text-lm-cyan">
          {codename}
        </p>
      </div>

      {/* Team Badge */}
      {team && (
        <div className="flex items-center gap-2">
          <span
            className={`rounded-sm border-2 px-6 py-2 text-lg font-bold uppercase tracking-wider ${
              team === "RED"
                ? "border-lm-red bg-lm-red/15 text-lm-red"
                : "border-lm-blue bg-lm-blue/15 text-lm-blue"
            }`}
          >
            TEAM {team}
          </span>
        </div>
      )}

      {/* Vest Number Badge */}
      <div className="flex flex-col items-center gap-2">
        <p className="text-sm font-bold uppercase tracking-widest text-lm-gray">
          {isBirthday ? "BIRTHDAY VEST" : "VEST NUMBER"}
        </p>
        <div
          className={`flex h-28 w-28 items-center justify-center rounded-full border-4 bg-lm-dark ${
            isBirthday ? "border-lm-yellow" : "border-lm-yellow"
          }`}
        >
          <span className="text-5xl font-bold text-lm-yellow">{vest}</span>
        </div>
      </div>

      {/* Birthday Message */}
      {isBirthday && birthdayMessage && (
        <div className="text-center">
          <p className="text-xl font-bold uppercase tracking-wider text-lm-yellow">
            &#9733; {birthdayMessage} &#9733;
          </p>
        </div>
      )}

      {/* Report to Briefing */}
      <p className="animate-text-pulse text-lg font-bold uppercase tracking-widest text-lm-green/80">
        REPORT TO BRIEFING ROOM
      </p>

      {/* Countdown Bar */}
      <div className="w-full max-w-md">
        <div className="h-2 w-full overflow-hidden rounded-full bg-lm-dark">
          <div
            className="h-full rounded-full bg-lm-green transition-all duration-100 ease-linear"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <p className="mt-2 text-center text-xs uppercase tracking-wider text-lm-gray/60">
          RETURNING TO START IN {Math.ceil(remaining)}S
        </p>
      </div>
    </div>
  );
}
