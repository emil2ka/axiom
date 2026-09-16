import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
  display: "swap",
});

const grotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "AXIOM — AI-наставник по поступлению",
    template: "%s · AXIOM",
  },
  description:
    "AXIOM проводит AI-интервью, запоминает важное о тебе и строит персональный маршрут поступления: университеты, сравнение, What If и следующий шаг.",
};

export const viewport: Viewport = {
  themeColor: "#05060b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${inter.variable} ${grotesk.variable}`}>
      <body>{children}</body>
    </html>
  );
}
