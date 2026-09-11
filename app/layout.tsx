import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Duka — Stock, spoken.",
  description:
    "A voice-operated stock assistant for small shops. Review changes, keep your shelves in order, and prepare reorder drafts.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
