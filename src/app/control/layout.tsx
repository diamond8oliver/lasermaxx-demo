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
    <div className="min-h-screen bg-[#0c0c14] flex flex-col">
      {/* LMX Console-style top bar */}
      <header className="h-10 bg-gradient-to-b from-[#1a1a2e] to-[#0e0e1a] border-b border-lm-cyan/20 flex items-center px-3 shrink-0">
        <div className="flex items-center gap-2 mr-6">
          <span className="text-lm-cyan text-sm leading-none">&#9670;</span>
          <div className="leading-tight">
            <h1 className="text-lm-light font-bold text-xs tracking-[0.15em] uppercase leading-none">
              LASERMAXX
            </h1>
            <span className="text-[8px] text-lm-gray tracking-[0.2em] uppercase">
              CODENAMES
            </span>
          </div>
        </div>

        <div className="flex-1" />

        <nav className="flex h-full items-end">
          <div className="px-5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-lm-cyan border-x border-t border-lm-cyan/30 bg-lm-cyan/8 -mb-px">
            Game Setup
          </div>
          <div className="px-5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-lm-gray border-x border-t border-lm-mid/40 bg-transparent -mb-px hover:text-lm-light cursor-default">
            Roster
          </div>
          <div className="px-5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-lm-gray border-x border-t border-lm-mid/40 bg-transparent -mb-px hover:text-lm-light cursor-default">
            Live Feed
          </div>
          <div className="px-5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-lm-gray border-x border-t border-lm-mid/40 bg-transparent -mb-px hover:text-lm-light cursor-default">
            Administration
          </div>
        </nav>

        <div className="flex items-center gap-1.5 ml-5">
          <span className="inline-block w-1.5 h-1.5 bg-lm-cyan animate-pulse" />
          <span className="text-[9px] text-lm-cyan font-bold uppercase tracking-wider">
            ONLINE
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
