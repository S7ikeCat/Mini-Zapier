import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AutoFlow | Automation Platform",
  description: "Mini-Zapier automation platform built with Next.js, Prisma and PostgreSQL",
};

export const viewport: Viewport = {
  width: 1280,
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}