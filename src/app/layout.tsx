import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LaserMaxx Codenames",
  description: "Codename selection kiosk for LaserMaxx laser tag",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-lm-black text-lm-light font-[var(--font-display)]">
        {children}
      </body>
    </html>
  );
}
