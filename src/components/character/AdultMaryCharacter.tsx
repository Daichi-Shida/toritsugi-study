// HOPE — メアリー（Lv5）が成長して大人になった姿。
// 白髪→銀×金のプラチナブロンドへ、青い目はそのまま継承。
// FBI女捜査官として希望(HOPE)を胸に薬の世界を守る。
// レアキャラ：キラキラ演出はCharacterDisplay側で重ねる
export default function AdultMaryCharacter({ size = 80 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* 銀と金の間：プラチナブロンドのグラデ */}
        <linearGradient id="platinumHair" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f5e9c4" />
          <stop offset="50%" stopColor="#e0d3a5" />
          <stop offset="100%" stopColor="#c8b988" />
        </linearGradient>
        <linearGradient id="platinumHairDark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d6c89a" />
          <stop offset="100%" stopColor="#a8996f" />
        </linearGradient>
        {/* スーツ：ダークネイビー */}
        <linearGradient id="suitGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a2238" />
          <stop offset="100%" stopColor="#0d1322" />
        </linearGradient>
        {/* 拳銃：ガンメタル */}
        <linearGradient id="gunMetal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#5a5e66" />
          <stop offset="100%" stopColor="#2a2d33" />
        </linearGradient>
      </defs>

      {/* 後ろ髪（プラチナブロンド・サイドダウン） */}
      <ellipse cx="40" cy="50" rx="17" ry="24" fill="url(#platinumHairDark)" />
      <path d="M23 38 Q20 56 24 70 L29 70 L29 40 Z" fill="url(#platinumHairDark)" />
      <path d="M57 38 Q60 56 56 70 L51 70 L51 40 Z" fill="url(#platinumHairDark)" />

      {/* 首 */}
      <rect x="36" y="46" width="8" height="9" rx="3" fill="#fbd4ae" />

      {/* 黒スーツ＋白シャツ */}
      <path d="M22 56 L26 75 L54 75 L58 56 Q50 53 40 53 Q30 53 22 56 Z" fill="url(#suitGrad)" />
      {/* 白シャツ襟元 */}
      <path d="M34 55 L40 64 L46 55 L46 75 L34 75 Z" fill="#fafafa" />
      {/* ネクタイ（細・ダークレッド） */}
      <path d="M39 58 L41 58 L42 75 L38 75 Z" fill="#8b1d2c" />
      {/* スーツの襟ライン */}
      <path d="M30 56 L37 60 L34 75 Z" fill="#0a0f1c" opacity="0.7" />
      <path d="M50 56 L43 60 L46 75 Z" fill="#0a0f1c" opacity="0.7" />

      {/* イヤピース（イヤホンコード） */}
      <path d="M53 36 Q56 40 56 48 Q57 56 56 60" stroke="#888" strokeWidth="0.6" fill="none" />
      <circle cx="53.5" cy="35" r="1.3" fill="#222" />

      {/* FBIバッジ（胸元） */}
      <ellipse cx="32" cy="62" rx="2.2" ry="2.6" fill="#d4af37" stroke="#9b7f24" strokeWidth="0.4" />
      <text x="32" y="63.5" fontSize="2.4" textAnchor="middle" fill="#3a2c0a" fontFamily="serif" fontWeight="bold">FBI</text>

      {/* 顔 */}
      <ellipse cx="40" cy="36" rx="13" ry="14.5" fill="#fbd4ae" />

      {/* 前髪（流れる斜めバング・プラチナ） */}
      <path d="M27 26 Q30 17 42 19 Q52 21 53 30 Q50 24 42 24 Q34 24 30 30 Z" fill="url(#platinumHair)" />
      <path d="M27 27 Q33 31 30 40" stroke="#d6c89a" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M53 28 Q48 36 52 42" stroke="#d6c89a" strokeWidth="2.5" fill="none" strokeLinecap="round" />

      {/* 眉（凛々しく細め） */}
      <path d="M30 30 Q34 28.5 37.5 30" stroke="#8a7a4a" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <path d="M42.5 30 Q46 28.5 50 30" stroke="#8a7a4a" strokeWidth="1.4" fill="none" strokeLinecap="round" />

      {/* 目（青・少しシャープに大人っぽく） */}
      <ellipse cx="34" cy="36" rx="3.6" ry="3.8" fill="white" />
      <ellipse cx="46" cy="36" rx="3.6" ry="3.8" fill="white" />
      <ellipse cx="34.5" cy="36.5" rx="2.4" ry="2.8" fill="#3a78c2" />
      <ellipse cx="46.5" cy="36.5" rx="2.4" ry="2.8" fill="#3a78c2" />
      <ellipse cx="35" cy="37" rx="1.4" ry="1.6" fill="#162a55" />
      <ellipse cx="47" cy="37" rx="1.4" ry="1.6" fill="#162a55" />
      <ellipse cx="35.7" cy="35.5" rx="0.7" ry="0.7" fill="white" />
      <ellipse cx="47.7" cy="35.5" rx="0.7" ry="0.7" fill="white" />
      {/* アイラインで大人感 */}
      <path d="M30.4 33.6 Q33 32.8 37.5 33.4" stroke="#222" strokeWidth="0.9" fill="none" strokeLinecap="round" />
      <path d="M42.5 33.4 Q47 32.8 49.6 33.6" stroke="#222" strokeWidth="0.9" fill="none" strokeLinecap="round" />

      {/* 鼻 */}
      <path d="M40 39 Q39.4 41 40.4 42" stroke="#e0a87f" strokeWidth="0.9" fill="none" strokeLinecap="round" />

      {/* 口（赤リップ・引き締まった微笑み） */}
      <path d="M36.5 45 Q40 47 43.5 45" stroke="#a02038" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M37 44.5 Q40 46 43 44.5" fill="#c4304f" opacity="0.6" />

      {/* ピアス */}
      <circle cx="27" cy="40" r="0.8" fill="#e6c970" />
      <circle cx="53" cy="40" r="0.8" fill="#e6c970" />

      {/* 拳銃を構える腕（右側）— ホルスター仕様 */}
      <path d="M58 60 L66 56 L70 58 L66 65 L60 64 Z" fill="url(#gunMetal)" />
      <rect x="63" y="59" width="3.5" height="2" fill="#1a1c20" />
      <circle cx="64.5" cy="60" r="0.5" fill="#888" />
      {/* 銃口の閃光（ほのかに） */}
      <ellipse cx="69.5" cy="58.5" rx="1.5" ry="0.6" fill="#fff5b8" opacity="0.7" />
    </svg>
  );
}
