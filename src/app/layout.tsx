import type { Metadata, Viewport } from "next";
import { Noto_Sans_JP, Noto_Serif_JP } from "next/font/google";
import "./globals.css";

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
        {/* メッシュグラデ背景（fixed・全体） */}
        <div
          aria-hidden
          className="fixed inset-0 -z-10 bg-mesh-cream"
        />
        {/* ノイズ・テクスチャの上乗せ（ごくうすく） */}
        <div
          aria-hidden
          className="fixed inset-0 -z-10 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          }}
        />

        <main className="mx-auto max-w-md lg:max-w-6xl min-h-screen flex flex-col relative">
          {children}
        </main>
      </body>
    </html>
  );
}
