// 豆侍 — 金色に光るそら豆の侍。鉢金・刀・凛々しい眉でレア感。
// レアキラキラ演出は CharacterDisplay 側で重ねる
export default function GoldenBeanSamuraiCharacter({ size = 72 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 72 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* 黄金の豆グラデ */}
        <radialGradient id="goldBeanGrad" cx="40%" cy="32%" r="75%">
          <stop offset="0%" stopColor="#fff6c2" />
          <stop offset="45%" stopColor="#ffd84a" />
          <stop offset="100%" stopColor="#d39a16" />
        </radialGradient>
        {/* 刀身 */}
        <linearGradient id="beanBladeGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="55%" stopColor="#d2d8e0" />
          <stop offset="100%" stopColor="#8d96a3" />
        </linearGradient>
      </defs>

      {/* 後光（金のにじみ） */}
      <ellipse cx="36" cy="40" rx="27" ry="30" fill="#ffe680" opacity="0.25" />

      {/* メインの黄金豆 */}
      <ellipse cx="36" cy="40" rx="22" ry="26" fill="#c98a10" />
      <ellipse cx="36" cy="40" rx="19.5" ry="23.5" fill="url(#goldBeanGrad)" />

      {/* ハイライト */}
      <ellipse cx="28" cy="29" rx="6.5" ry="9.5" fill="#fff7d0" opacity="0.7" />

      {/* おへそ（そら豆の線） */}
      <path
        d="M36 54 Q42 56 44 52 Q46 48 44 44 Q42 40 36 40"
        stroke="#a3740c"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />

      {/* 鉢金（額当て・金の細帯＋赤結び） */}
      <path d="M19 28 Q36 20 53 28" stroke="#ffe9a0" strokeWidth="0.6" fill="none" />
      <rect x="20" y="26.5" width="32" height="3.2" rx="1.6" fill="#b8860b" />
      <rect x="20" y="27" width="32" height="1.2" fill="#7a5a08" />
      <circle cx="36" cy="28.1" r="1.7" fill="#fff2c0" stroke="#7a5a08" strokeWidth="0.4" />
      {/* 鉢金のなびく結び（横） */}
      <path d="M51 27 L58 24 L57 30 L51 30 Z" fill="#c4243f" />
      <circle cx="54" cy="27.5" r="1.2" fill="#ec5e7d" />

      {/* 凛々しい眉 */}
      <path d="M27 34 Q30.5 32.6 33.5 34.2" stroke="#8a5e08" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M38.5 34.2 Q41.5 32.6 45 34" stroke="#8a5e08" strokeWidth="1.5" fill="none" strokeLinecap="round" />

      {/* 目（きりっと） */}
      <ellipse cx="30" cy="38" rx="2.6" ry="2.8" fill="#3a2a06" />
      <ellipse cx="42" cy="38" rx="2.6" ry="2.8" fill="#3a2a06" />
      <ellipse cx="31" cy="37" rx="1" ry="1" fill="white" />
      <ellipse cx="43" cy="37" rx="1" ry="1" fill="white" />

      {/* 真一文字の口（侍） */}
      <path d="M31 45 Q36 47 41 45" stroke="#8a5e08" strokeWidth="2" fill="none" strokeLinecap="round" />

      {/* ほっぺ */}
      <ellipse cx="25" cy="43" rx="2.8" ry="1.8" fill="#ffb14a" opacity="0.55" />
      <ellipse cx="47" cy="43" rx="2.8" ry="1.8" fill="#ffb14a" opacity="0.55" />

      {/* 刀（右上に構える） */}
      <path d="M48 52 L64 33 L66 34.6 L50 53.6 Z" fill="url(#beanBladeGrad)" stroke="#7c8593" strokeWidth="0.4" />
      <ellipse cx="47.5" cy="53" rx="2.4" ry="1.5" fill="#b8860b" stroke="#7a5a08" strokeWidth="0.4" />
      <path d="M44 56 L48 52 L50 54 L46 58 Z" fill="#3a2a06" />
      <line x1="56" y1="43" x2="60" y2="39" stroke="white" strokeWidth="0.7" opacity="0.9" />
    </svg>
  );
}
