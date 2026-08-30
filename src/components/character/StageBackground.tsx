"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { CharacterStage } from "@/types";
import { loadProgress } from "@/lib/storage";

// ステージ別背景：mesh radial gradient レイヤー定義
const STAGE_BG: Record<CharacterStage, string> = {
  // Lv1 豆ころ：芽吹き前のクリーム×新緑
  1: "radial-gradient(at 12% 8%, rgba(220, 235, 200, 0.85) 0px, transparent 45%), radial-gradient(at 88% 0%, rgba(196, 224, 168, 0.55) 0px, transparent 50%), radial-gradient(at 8% 100%, rgba(244, 222, 189, 0.45) 0px, transparent 50%), radial-gradient(at 90% 90%, rgba(212, 200, 116, 0.4) 0px, transparent 55%), linear-gradient(135deg, #fdfcf3 0%, #f6f3e2 60%, #ecead0 100%)",

  // Lv2 芽：明るいピスタチオ・ライトイエローグリーン
  2: "radial-gradient(at 12% 8%, rgba(196, 224, 168, 0.85) 0px, transparent 45%), radial-gradient(at 88% 0%, rgba(220, 240, 180, 0.6) 0px, transparent 50%), radial-gradient(at 8% 100%, rgba(244, 222, 189, 0.4) 0px, transparent 50%), radial-gradient(at 90% 90%, rgba(180, 213, 140, 0.45) 0px, transparent 55%), linear-gradient(135deg, #fafdf3 0%, #f1f5dd 60%, #e2eccb 100%)",

  // Lv3 花：ピーチ×ローズの花畑
  3: "radial-gradient(at 12% 8%, rgba(255, 218, 215, 0.85) 0px, transparent 45%), radial-gradient(at 88% 0%, rgba(248, 200, 207, 0.55) 0px, transparent 50%), radial-gradient(at 8% 100%, rgba(255, 233, 218, 0.5) 0px, transparent 50%), radial-gradient(at 90% 90%, rgba(244, 154, 144, 0.35) 0px, transparent 55%), linear-gradient(135deg, #fff8f5 0%, #ffeae3 60%, #fbd6d4 100%)",

  // Lv4 さといも：アンバー×キャラメル
  4: "radial-gradient(at 12% 8%, rgba(255, 222, 173, 0.85) 0px, transparent 45%), radial-gradient(at 88% 0%, rgba(228, 181, 130, 0.55) 0px, transparent 50%), radial-gradient(at 8% 100%, rgba(244, 215, 178, 0.5) 0px, transparent 50%), radial-gradient(at 90% 90%, rgba(212, 165, 116, 0.5) 0px, transparent 55%), linear-gradient(135deg, #fdf8ed 0%, #f6e8c9 60%, #e9c799 100%)",

  // Lv5 メアリー：ローズゴールド（既存メイン）
  5: "radial-gradient(at 12% 8%, rgba(244, 222, 189, 0.85) 0px, transparent 45%), radial-gradient(at 88% 0%, rgba(228, 181, 130, 0.55) 0px, transparent 50%), radial-gradient(at 8% 100%, rgba(244, 154, 144, 0.35) 0px, transparent 50%), radial-gradient(at 90% 90%, rgba(212, 165, 116, 0.45) 0px, transparent 55%), linear-gradient(135deg, #fbf9f4 0%, #f5efe2 60%, #f1d8c1 100%)",

  // Lv6 大人メアリー：シャンパン×ゴールドの上品レア
  6: "radial-gradient(at 12% 8%, rgba(255, 240, 195, 0.95) 0px, transparent 45%), radial-gradient(at 88% 0%, rgba(244, 214, 184, 0.7) 0px, transparent 50%), radial-gradient(at 8% 100%, rgba(255, 233, 156, 0.55) 0px, transparent 50%), radial-gradient(at 90% 90%, rgba(212, 165, 116, 0.6) 0px, transparent 55%), radial-gradient(at 50% 50%, rgba(255, 248, 220, 0.4) 0px, transparent 60%), linear-gradient(135deg, #fef9e7 0%, #faecc2 50%, #ecd09a 100%)",

  // Lv7 メアリー侍：深い藍×紫×金のレジェンド
  7: "radial-gradient(at 12% 8%, rgba(225, 195, 235, 0.7) 0px, transparent 45%), radial-gradient(at 88% 0%, rgba(195, 195, 245, 0.6) 0px, transparent 50%), radial-gradient(at 8% 100%, rgba(255, 233, 156, 0.45) 0px, transparent 50%), radial-gradient(at 90% 90%, rgba(168, 145, 220, 0.55) 0px, transparent 55%), radial-gradient(at 50% 50%, rgba(255, 248, 220, 0.3) 0px, transparent 60%), linear-gradient(135deg, #f8f4fb 0%, #ede5f4 45%, #d6c5e8 100%)",

  // Lv8 豆侍：黄金が輝くゴールドレジェンド
  8: "radial-gradient(at 12% 8%, rgba(255, 240, 170, 0.95) 0px, transparent 45%), radial-gradient(at 88% 0%, rgba(255, 216, 100, 0.7) 0px, transparent 50%), radial-gradient(at 8% 100%, rgba(255, 233, 156, 0.6) 0px, transparent 50%), radial-gradient(at 90% 90%, rgba(211, 154, 22, 0.6) 0px, transparent 55%), radial-gradient(at 50% 50%, rgba(255, 250, 210, 0.45) 0px, transparent 60%), linear-gradient(135deg, #fffae6 0%, #ffeeb0 45%, #f0c850 100%)",

  // Lv9 ねこさん：ふんわりピンク×クリームの最上位
  9: "radial-gradient(at 12% 8%, rgba(255, 224, 235, 0.9) 0px, transparent 45%), radial-gradient(at 88% 0%, rgba(253, 164, 175, 0.55) 0px, transparent 50%), radial-gradient(at 8% 100%, rgba(255, 240, 210, 0.6) 0px, transparent 50%), radial-gradient(at 90% 90%, rgba(251, 207, 232, 0.6) 0px, transparent 55%), radial-gradient(at 50% 50%, rgba(255, 250, 240, 0.45) 0px, transparent 60%), linear-gradient(135deg, #fff8fa 0%, #ffe9f0 45%, #fbd6c8 100%)",
  // Lv10 ココちゃん：シルバー×ローズの最上位
  10: "radial-gradient(at 10% 6%, rgba(226, 232, 240, 0.95) 0px, transparent 45%), radial-gradient(at 90% 4%, rgba(203, 213, 225, 0.6) 0px, transparent 50%), radial-gradient(at 6% 96%, rgba(255, 228, 235, 0.7) 0px, transparent 50%), radial-gradient(at 92% 92%, rgba(226, 232, 240, 0.75) 0px, transparent 55%), radial-gradient(at 50% 50%, rgba(255, 255, 255, 0.5) 0px, transparent 60%), linear-gradient(135deg, #fbfcfe 0%, #eef1f7 45%, #ffe7ee 100%)",
};

export default function StageBackground() {
  const [stage, setStage] = useState<CharacterStage>(5);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setStage(loadProgress().character.stage);
    setMounted(true);

    // 別タブ・他コンポーネントでの更新検知（同タブ内更新は反映されるとは限らないがイベント発火を試みる）
    const onStorage = (e: StorageEvent) => {
      if (e.key === "toritsugi_progress") {
        setStage(loadProgress().character.stage);
      }
    };
    window.addEventListener("storage", onStorage);

    // 同タブ内のレベルアップにも追従するため、定期的にロードして変化があれば更新
    const tick = setInterval(() => {
      const s = loadProgress().character.stage;
      setStage((cur) => (cur !== s ? s : cur));
    }, 4000);

    return () => {
      window.removeEventListener("storage", onStorage);
      clearInterval(tick);
    };
  }, []);

  // SSR時はデフォルト（Lv5）背景を返す。クライアントマウント後に実際のステージへフェード。
  return (
    <div aria-hidden className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
      <AnimatePresence>
        <motion.div
          key={mounted ? `s${stage}` : "ssr"}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
          className="absolute inset-0"
          style={{ backgroundImage: STAGE_BG[mounted ? stage : 5] }}
        />
      </AnimatePresence>
      {/* ノイズテクスチャ（共通レイヤー） */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
    </div>
  );
}
