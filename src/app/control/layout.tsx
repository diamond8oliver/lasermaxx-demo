import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "LASERMAXX CONTROL",
  description: "Staff control panel for LaserMaxx Codenames",
};

export default function ControlLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-lm-charcoal flex flex-col">
      {/* Header Bar */}
      <header className="h-14 bg-lm-black border-b border-lm-mid flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-6">
          <h1 className="text-lm-green font-bold text-lg tracking-[0.2em] uppercase">
            LASERMAXX CONTROL
          </h1>
          <span className="text-xs font-bold uppercase tracking-wider text-lm-gray border border-lm-mid px-3 py-1">
            STAFF PANEL
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-block w-2 h-2 rounded-full bg-lm-green animate-pulse" />
          <span className="text-xs text-lm-green font-bold uppercase tracking-wider">
            ONLINE
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
