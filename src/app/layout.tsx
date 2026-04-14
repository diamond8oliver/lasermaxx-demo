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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full bg-lm-black text-lm-light font-[var(--font-display)]">
        {children}
      </body>
    </html>
  );
}
