
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OmniAgent - Multi-Agent Orchestration",
  description: "Enterprise-grade event-driven multi-agent orchestration and observability platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
