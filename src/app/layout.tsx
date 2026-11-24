import type { Metadata } from "next";
import "@fontsource/syne/700.css";
import "@fontsource/syne/800.css";
import "@fontsource/outfit/400.css";
import "@fontsource/outfit/500.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Northline",
  description: "A small open district. Walk, drive the harbor cab, and buy a room.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
