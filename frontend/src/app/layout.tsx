import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Campus Intel — Unified Campus Dashboard",
  description: "One dashboard for everything on campus. Library, cafeteria, events, and academics — all powered by AI.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="noise">{children}</body>
    </html>
  );
}
