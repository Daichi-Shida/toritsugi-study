import type { Metadata, Viewport } from "next";
import { Noto_Sans_JP, Noto_Serif_JP } from "next/font/google";
import "./globals.css";
import StageBackground from "@/components/character/StageBackground";

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  variable: "--font-noto-sans-jp",
  display: "swap",
  weight: ["400", "500", "700"],
});

const notoSerifJP = Noto_Serif_JP({
  subsets: ["latin"],
  variable: "--font-noto-serif-jp",
  display: "swap",
  weight: ["500", "700"],
});

export const metadata: Metadata = {
  title: "登録販売者資格試験アプリ",
  description: "登録販売者資格試験の合格を目指す学習アプリ",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "登録販売者資格試験アプリ",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#d4a574",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" className={`${notoSansJP.variable} ${notoSerifJP.variable}`}>
      <body className="min-h-screen font-sans antialiased text-mocha-700 relative overflow-x-hidden">
        {/* キャラクターのレベルに応じて変化する背景 */}
        <StageBackground />

        <main className="mx-auto max-w-md lg:max-w-6xl min-h-screen flex flex-col relative">
          {children}
        </main>
      </body>
    </html>
  );
}
