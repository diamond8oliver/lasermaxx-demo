"use client";

import { useRouter } from "next/navigation";

export default function KioskWelcomePage() {
  const router = useRouter();

  return (
    <div
      className="flex flex-1 flex-col items-center justify-center gap-12 px-8"
      onClick={() => router.push("/kiosk/games")}
    >
      {/* Title */}
      <div className="text-center">
        <h1 className="text-2xl font-bold uppercase tracking-[0.3em] text-lm-gray">
          LASERMAXX CODENAMES
        </h1>
        <div className="mt-3 h-px w-64 mx-auto bg-gradient-to-r from-transparent via-lm-green/40 to-transparent" />
      </div>

      {/* Tap to Start Button */}
      <button
        className="animate-pulse-glow rounded-sm border-2 border-lm-green px-16 py-8 text-3xl font-bold uppercase tracking-wider text-lm-green transition-colors active:bg-lm-green/20"
        onClick={(e) => {
          e.stopPropagation();
          router.push("/kiosk/games");
        }}
      >
        TAP TO START
      </button>

      {/* Bottom hint */}
      <p className="animate-text-pulse text-sm uppercase tracking-widest text-lm-gray/60">
        TOUCH ANYWHERE TO BEGIN
      </p>
    </div>
  );
}
