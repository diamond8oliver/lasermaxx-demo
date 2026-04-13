import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "LASERMAXX CODENAMES - KIOSK",
  description: "Codename selection kiosk terminal",
};

export default function KioskLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="kiosk-touch scanline-overlay h-dvh w-dvw overflow-hidden bg-lm-black flex flex-col">
      {children}
    </div>
  );
}
