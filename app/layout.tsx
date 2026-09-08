import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RecallRoute — Verified recall routing",
  description: "A GenLayer Intelligent Contract that routes a sealed product identity through two authoritative recall notices.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
