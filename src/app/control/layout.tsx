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
  return <>{children}</>;
}
