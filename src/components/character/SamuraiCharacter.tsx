// 侍メアリー — 白髪青目を継承、紺の着物に袴・刀を構える女武者
// レアキャラ：キラキラ演出はCharacterDisplay側で重ねる
export default function SamuraiCharacter({ size = 80 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* 着物：紺〜藍のグラデ */}
        <linearGradient id="kimonoGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1f3060" />
          <stop offset="100%" stopColor="#0e1a3a" />
        </linearGradient>
        {/* 袴：赤紫 */}
        <linearGradient id="hakamaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a02244" />
          <stop offset="100%" stopColor="#6a142b" />
        </linearGradient>
        {/* 刀身：銀光沢 */}
        <linearGradient id="bladeGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f5f7fa" />
          <stop offset="50%" stopColor="#cfd6df" />
          <stop offset="100%" stopColor="#8d96a3" />
        </linearGradient>
      </defs>

      {/* 後ろ髪（白・ポニーテール） */}
      <path d="M30 22 Q24 30 26 50 L32 52 L33 28 Z" fill="#ececec" />
      <path d="M50 22 Q56 30 54 50 L48 52 L47 28 Z" fill="#ececec" />
      {/* ポニーテール本体 */}
      <path d="M52 22 Q66 26 64 38 Q62 50 56 52 Q55 40 52 32 Z" fill="#f0f0f0" />
      <path d="M58 30 Q66 36 60 48" stroke="#dcdcdc" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* リボン（赤・髪結び） */}
      <path d="M50 26 L56 24 L56 30 L50 28 Z" fill="#c4243f" />
      <circle cx="53" cy="27" r="1.3" fill="#ec5e7d" />

      {/* 着物（袖広め） */}
      <path d="M19 60 L22 58 L26 56 Q33 53 40 53 Q47 53 54 56 L58 58 L61 60 L60 75 L20 75 Z" fill="url(#kimonoGrad)" />
      {/* 袖の広がり */}
      <path d="M19 60 L18 70 L26 68 L25 58 Z" fill="url(#kimonoGrad)" />
      <path d="M61 60 L62 70 L54 68 L55 58 Z" fill="url(#kimonoGrad)" />
      {/* 着物の合わせ */}
      <path d="M40 53 L34 60 L40 75 Z" fill="#fafafa" />
      <path d="M40 53 L46 60 L40 65 Z" fill="url(#kimonoGrad)" opacity="0.95" />
      {/* 袴（腰下の赤紫） */}
      <path d="M22 70 L58 70 L60 75 L20 75 Z" fill="url(#hakamaGrad)" />
      {/* 帯（黄金） */}
      <rect x="22" y="68" width="36" height="3" fill="#d4af37" />
      <rect x="22" y="69" width="36" height="0.8" fill="#9b7f24" />

      {/* 首 */}
      <rect x="36" y="46" width="8" height="9" rx="3" fill="#fbd4b0" />

      {/* 顔 */}
      <ellipse cx="40" cy="36" rx="13" ry="14.5" fill="#fbd4b0" />

      {/* 前髪（白・凛々しい斜め） */}
      <path d="M27 26 Q30 17 42 18 Q52 19 53 30 Q49 23 42 23 Q35 23 30 30 Z" fill="#f0f0f0" />
      <path d="M27 28 Q31 32 28 42" stroke="#dcdcdc" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M53 28 Q49 32 52 42" stroke="#dcdcdc" strokeWidth="2.5" fill="none" strokeLinecap="round" />

      {/* 額当て（鉢金）— 金色の細い帯 */}
      <rect x="27" y="24.5" width="26" height="2.4" rx="1.2" fill="#d4af37" />
      <rect x="27" y="25.4" width="26" height="0.6" fill="#9b7f24" />
      <circle cx="40" cy="25.7" r="1.4" fill="#fff2c0" stroke="#9b7f24" strokeWidth="0.4" />

      {/* 眉（凛々しい・きりっと） */}
      <path d="M30 30 Q34 28.5 37.5 30.5" stroke="#777" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M42.5 30.5 Q46 28.5 50 30" stroke="#777" strokeWidth="1.5" fill="none" strokeLinecap="round" />

      {/* 目（青・大人&鋭め） */}
      <ellipse cx="34" cy="36" rx="3.6" ry="3.8" fill="white" />
      <ellipse cx="46" cy="36" rx="3.6" ry="3.8" fill="white" />
      <ellipse cx="34.5" cy="36.5" rx="2.3" ry="2.7" fill="#2c5fa8" />
      <ellipse cx="46.5" cy="36.5" rx="2.3" ry="2.7" fill="#2c5fa8" />
      <ellipse cx="35" cy="37" rx="1.3" ry="1.5" fill="#0d1f44" />
      <ellipse cx="47" cy="37" rx="1.3" ry="1.5" fill="#0d1f44" />
      <ellipse cx="35.6" cy="35.5" rx="0.65" ry="0.65" fill="white" />
      <ellipse cx="47.6" cy="35.5" rx="0.65" ry="0.65" fill="white" />
      <path d="M30.4 33.6 Q33 32.6 37.5 33.4" stroke="#222" strokeWidth="0.9" fill="none" strokeLinecap="round" />
      <path d="M42.5 33.4 Q47 32.6 49.6 33.6" stroke="#222" strokeWidth="0.9" fill="none" strokeLinecap="round" />

      {/* 鼻 */}
      <path d="M40 39 Q39.4 41.2 40.4 42" stroke="#d49b75" strokeWidth="0.9" fill="none" strokeLinecap="round" />

      {/* 口（淡い紅） */}
      <path d="M37 44.5 Q40 46.5 43 44.5" stroke="#a02038" strokeWidth="1.4" fill="none" strokeLinecap="round" />

      {/* ほっぺ */}
      <ellipse cx="30.5" cy="41.5" rx="2.4" ry="1.4" fill="#ffa3a3" opacity="0.45" />
      <ellipse cx="49.5" cy="41.5" rx="2.4" ry="1.4" fill="#ffa3a3" opacity="0.45" />

      {/* 刀（右手で構える・斜め上向き） */}
      {/* 鞘 */}
      <path d="M62 72 L66 56 L69 56.5 L65 72.5 Z" fill="#1c1c1c" />
      <path d="M65 56 L67 56.4 L67.4 53 L64.6 53 Z" fill="#d4af37" />
      {/* 刀身（一部抜いた状態） */}
      <path d="M52 50 L67 35 L69 36.5 L54 51.5 Z" fill="url(#bladeGrad)" stroke="#7c8593" strokeWidth="0.4" />
      {/* 鍔 */}
      <ellipse cx="51" cy="51" rx="2.6" ry="1.6" fill="#d4af37" stroke="#7a5f1a" strokeWidth="0.4" />
      {/* 柄（黒×菱模様） */}
      <path d="M48 54 L52 50 L54 52 L50 56 Z" fill="#1a1a1a" />
      <path d="M48.6 54 L50.5 52" stroke="#9b7f24" strokeWidth="0.5" />
      <path d="M50 55 L52 53" stroke="#9b7f24" strokeWidth="0.5" />
      <path d="M51 56 L53 54" stroke="#9b7f24" strokeWidth="0.5" />
      {/* 刀身の煌めき */}
      <line x1="58" y1="44" x2="62" y2="40" stroke="white" strokeWidth="0.6" opacity="0.9" />
    </svg>
  );
}
