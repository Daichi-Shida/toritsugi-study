import type { Metadata, Viewport } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  variable: "--font-noto-sans-jp",
  display: "swap",
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
  themeColor: "#d946ef",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" className={notoSansJP.variable}>
      <body className="min-h-screen bg-gradient-to-b from-primary-50 to-white font-sans antialiased">
        <main className="mx-auto max-w-md lg:max-w-6xl min-h-screen flex flex-col">
          {children}
        </main>
      </body>
    </html>
  );
}
