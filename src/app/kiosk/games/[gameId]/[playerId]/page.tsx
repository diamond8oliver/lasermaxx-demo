"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";

const MAX_CODENAME_LENGTH = 12;
const DEBOUNCE_MS = 300;

interface ValidationResult {
  valid: boolean;
  message: string;
}

interface PlayerData {
  id: number;
  realName: string;
}

export default function CodenameEntryPage() {
  const router = useRouter();
  const params = useParams<{ gameId: string; playerId: string }>();
  const searchParams = useSearchParams();
  const gameId = params.gameId;
  const playerId = params.playerId;
  const fromTeam = searchParams.get("from") === "team";

  // Player data
  const [player, setPlayer] = useState<PlayerData | null>(null);
  const [playerLoading, setPlayerLoading] = useState(true);

  // Codename input
  const [codename, setCodename] = useState("");
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [validating, setValidating] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Suggestions
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);

  // History
  const [history, setHistory] = useState<string[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  // Submit
  const [submitting, setSubmitting] = useState(false);

  // Fetch player data
  useEffect(() => {
    async function fetchPlayer() {
      try {
        const res = await fetch(`/api/games/${gameId}/players?status=waiting`);
        if (!res.ok) throw new Error("Failed to fetch player");
        const players = await res.json();
        const found = players.find(
          (p: PlayerData) => String(p.id) === playerId
        );
        if (found) {
          setPlayer(found);
        }
      } catch {
        // Player fetch failed - will show loading state
      } finally {
        setPlayerLoading(false);
      }
    }
    fetchPlayer();
  }, [gameId, playerId]);

  // Fetch suggestions
  useEffect(() => {
    async function fetchSuggestions() {
      try {
        const res = await fetch("/api/suggested-codenames?count=6");
        if (!res.ok) throw new Error("Failed to fetch suggestions");
        const data = await res.json();
        setSuggestions(
          Array.isArray(data)
            ? data.map((s: { codename: string } | string) =>
                typeof s === "string" ? s : s.codename
              )
            : []
        );
      } catch {
        setSuggestions([]);
      } finally {
        setSuggestionsLoading(false);
      }
    }
    fetchSuggestions();
  }, []);

  // Fetch codename history once player loads
  useEffect(() => {
    if (!player?.realName) {
      setHistoryLoading(false);
      return;
    }
    async function fetchHistory() {
      try {
        const res = await fetch(
          `/api/codename-history?realName=${encodeURIComponent(player!.realName)}`
        );
        if (!res.ok) throw new Error("Failed to fetch history");
        const data = await res.json();
        setHistory(
          Array.isArray(data)
            ? data.map((h: { codename: string } | string) =>
                typeof h === "string" ? h : h.codename
              )
            : []
        );
      } catch {
        setHistory([]);
      } finally {
        setHistoryLoading(false);
      }
    }
    fetchHistory();
  }, [player]);

  // Validate codename with debounce
  const validateCodename = useCallback(
    (value: string) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      if (!value.trim()) {
        setValidation(null);
        setValidating(false);
        return;
      }

      setValidating(true);
      debounceRef.current = setTimeout(async () => {
        try {
          const res = await fetch("/api/validate-codename", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              codename: value.trim(),
              gameId: Number(gameId),
              playerId: Number(playerId),
            }),
          });
          const data = await res.json();
          setValidation({
            valid: data.valid ?? false,
            message: data.message ?? (data.valid ? "AVAILABLE" : "UNAVAILABLE"),
          });
        } catch {
          setValidation({ valid: false, message: "VALIDATION ERROR" });
        } finally {
          setValidating(false);
        }
      }, DEBOUNCE_MS);
    },
    [gameId, playerId]
  );

  // Handle input change
  function handleInputChange(value: string) {
    const sanitized = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const trimmed = sanitized.slice(0, MAX_CODENAME_LENGTH);
    setCodename(trimmed);
    validateCodename(trimmed);
  }

  // Handle selecting a suggestion or history codename
  function handleSelectCodename(name: string) {
    const upper = name.toUpperCase().slice(0, MAX_CODENAME_LENGTH);
    setCodename(upper);
    validateCodename(upper);
  }

  // Handle submit
  async function handleSubmit() {
    if (!validation?.valid || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/games/${gameId}/players/${playerId}/codename`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ codename: codename.trim() }),
        }
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setValidation({
          valid: false,
          message: errData.error ?? "SUBMISSION FAILED",
        });
        setSubmitting(false);
        return;
      }

      const result = await res.json();
      const vestNumber = result.player?.vestNumber ?? result.vestNumber ?? "";
      const confirmedCodename = result.player?.codename ?? codename.trim();
      const team = result.team ?? "";
      const isBirthday = result.isBirthday ? "1" : "";
      const birthdayMessage = result.birthdayMessage ?? "";

      const confirmParams = new URLSearchParams({
        vest: String(vestNumber),
        codename: confirmedCodename,
        ...(team && { team }),
        ...(isBirthday && { birthday: isBirthday }),
        ...(birthdayMessage && { birthdayMessage }),
      });

      router.push(
        `/kiosk/games/${gameId}/${playerId}/confirm?${confirmParams.toString()}`
      );
    } catch {
      setValidation({ valid: false, message: "NETWORK ERROR" });
      setSubmitting(false);
    }
  }

  const isValid = validation?.valid === true;
  const canSubmit = isValid && !submitting && codename.trim().length > 0;

  if (playerLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-xl uppercase tracking-wider text-lm-gray animate-text-pulse">
          LOADING...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col px-8 py-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() =>
            router.push(
              fromTeam
                ? `/kiosk/games/${gameId}/${playerId}/team`
                : `/kiosk/games/${gameId}`
            )
          }
          className="rounded-sm border border-lm-mid px-6 py-3 text-sm font-bold uppercase tracking-wider text-lm-gray transition-colors active:bg-lm-mid/30"
        >
          BACK
        </button>
        <div className="text-center">
          <h1 className="text-2xl font-bold uppercase tracking-wider text-lm-light">
            CHOOSE YOUR CODENAME
          </h1>
          {player && (
            <p className="mt-1 text-sm uppercase tracking-wider text-lm-gray">
              AGENT: {player.realName}
            </p>
          )}
        </div>
        <div className="w-24" />
      </div>

      {/* Divider */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-lm-cyan/30 to-transparent mb-6" />

      {/* Input Section */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            value={codename}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="ENTER CODENAME..."
            autoFocus
            className="w-full rounded-sm border-2 border-lm-mid bg-lm-charcoal px-6 py-5 text-2xl font-bold uppercase tracking-wider text-lm-green placeholder:text-lm-gray/40 focus:border-lm-green focus:outline-none transition-colors"
          />
          {/* Character counter */}
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold tracking-wider text-lm-gray">
            {codename.length}/{MAX_CODENAME_LENGTH}
          </span>
        </div>

        {/* Validation feedback */}
        <div className="mt-3 h-8 flex items-center">
          {validating && (
            <span className="text-sm uppercase tracking-wider text-lm-yellow animate-text-pulse">
              VALIDATING...
            </span>
          )}
          {!validating && validation && (
            <div className="flex items-center gap-2">
              <span
                className={`text-xl ${validation.valid ? "text-lm-green" : "text-lm-red"}`}
              >
                {validation.valid ? "\u2713" : "\u2717"}
              </span>
              <span
                className={`text-sm font-bold uppercase tracking-wider ${
                  validation.valid ? "text-lm-green" : "text-lm-red"
                }`}
              >
                {validation.message}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Suggested Codenames */}
      <div className="mb-6">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-lm-gray">
          SUGGESTED CODENAMES
        </h2>
        {suggestionsLoading ? (
          <p className="text-sm uppercase tracking-wider text-lm-gray/60 animate-text-pulse">
            LOADING...
          </p>
        ) : suggestions.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {suggestions.map((name, i) => (
              <button
                key={i}
                onClick={() => handleSelectCodename(name)}
                className="rounded-sm border border-lm-cyan/40 bg-lm-dark px-5 py-3 text-base font-bold uppercase tracking-wider text-lm-cyan transition-all active:border-lm-cyan active:bg-lm-cyan/10 hover:border-lm-cyan/80"
              >
                {name}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm uppercase tracking-wider text-lm-gray/40">
            NO SUGGESTIONS AVAILABLE
          </p>
        )}
      </div>

      {/* Past Codenames */}
      {player && (
        <div className="mb-8">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-lm-gray">
            YOUR PAST CODENAMES
          </h2>
          {historyLoading ? (
            <p className="text-sm uppercase tracking-wider text-lm-gray/60 animate-text-pulse">
              LOADING...
            </p>
          ) : history.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {history.map((name, i) => (
                <button
                  key={i}
                  onClick={() => handleSelectCodename(name)}
                  className="rounded-sm border border-lm-purple/40 bg-lm-dark px-5 py-3 text-base font-bold uppercase tracking-wider text-lm-purple transition-all active:border-lm-purple active:bg-lm-purple/10 hover:border-lm-purple/80"
                >
                  {name}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm uppercase tracking-wider text-lm-gray/40">
              NO HISTORY FOUND - FIRST TIME PLAYER
            </p>
          )}
        </div>
      )}

      {/* Submit Button */}
      <div className="mt-auto pt-4 pb-2">
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={`w-full rounded-sm border-2 py-5 text-xl font-bold uppercase tracking-wider transition-all ${
            canSubmit
              ? "border-lm-green bg-lm-green/10 text-lm-green active:bg-lm-green/20 animate-pulse-glow"
              : "border-lm-mid bg-lm-dark text-lm-gray/40 cursor-not-allowed"
          }`}
        >
          {submitting ? "SUBMITTING..." : "LOCK IN"}
        </button>
      </div>
    </div>
  );
}
