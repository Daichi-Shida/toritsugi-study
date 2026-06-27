// ねこさん — 可愛い白×クリームの子猫。ほっぺ・ひげ・ぱっちり目。
// 最上位レア：キラキラ演出は CharacterDisplay 側で重ねる
export default function CatCharacter({ size = 72 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 72 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id="catBodyGrad" cx="42%" cy="34%" r="72%">
          <stop offset="0%" stopColor="#fffdf8" />
          <stop offset="60%" stopColor="#fdf3e0" />
          <stop offset="100%" stopColor="#f3dcb8" />
        </radialGradient>
      </defs>

      {/* やわらかい後光 */}
      <ellipse cx="36" cy="40" rx="28" ry="27" fill="#ffe9c9" opacity="0.3" />

      {/* しっぽ */}
      <path
        d="M55 52 Q66 50 64 40 Q63 34 58 35 Q61 40 58 44 Q55 48 52 47 Z"
        fill="url(#catBodyGrad)"
        stroke="#e9cfa3"
        strokeWidth="0.8"
      />

      {/* からだ（おすわり） */}
      <ellipse cx="36" cy="52" rx="17" ry="15" fill="url(#catBodyGrad)" stroke="#e9cfa3" strokeWidth="0.8" />

      {/* 前足 */}
      <ellipse cx="29" cy="62" rx="4.5" ry="3.5" fill="#fffdf8" stroke="#e9cfa3" strokeWidth="0.6" />
      <ellipse cx="43" cy="62" rx="4.5" ry="3.5" fill="#fffdf8" stroke="#e9cfa3" strokeWidth="0.6" />

      {/* 耳 */}
      <path d="M20 24 L24 38 L32 31 Z" fill="url(#catBodyGrad)" stroke="#e9cfa3" strokeWidth="0.8" />
      <path d="M52 24 L48 38 L40 31 Z" fill="url(#catBodyGrad)" stroke="#e9cfa3" strokeWidth="0.8" />
      <path d="M22 27 L24.5 35 L29 31 Z" fill="#ffc2c2" opacity="0.8" />
      <path d="M50 27 L47.5 35 L43 31 Z" fill="#ffc2c2" opacity="0.8" />

      {/* あたま */}
      <ellipse cx="36" cy="36" rx="18" ry="16" fill="url(#catBodyGrad)" stroke="#e9cfa3" strokeWidth="0.8" />

      {/* 目（ぱっちり） */}
      <ellipse cx="29" cy="35" rx="3.2" ry="4" fill="#5b4636" />
      <ellipse cx="43" cy="35" rx="3.2" ry="4" fill="#5b4636" />
      <ellipse cx="30.2" cy="33.4" rx="1.1" ry="1.3" fill="white" />
      <ellipse cx="44.2" cy="33.4" rx="1.1" ry="1.3" fill="white" />
      <ellipse cx="28.2" cy="36.5" rx="0.6" ry="0.7" fill="white" opacity="0.8" />
      <ellipse cx="42.2" cy="36.5" rx="0.6" ry="0.7" fill="white" opacity="0.8" />

      {/* 鼻と口（ω） */}
      <path d="M34.5 40 L37.5 40 L36 41.8 Z" fill="#ff9eb0" />
      <path d="M36 41.8 Q33.5 44 31.5 42" stroke="#a8835a" strokeWidth="1" fill="none" strokeLinecap="round" />
      <path d="M36 41.8 Q38.5 44 40.5 42" stroke="#a8835a" strokeWidth="1" fill="none" strokeLinecap="round" />

      {/* ほっぺ */}
      <ellipse cx="24" cy="40" rx="3.2" ry="2.2" fill="#ffb6c1" opacity="0.6" />
      <ellipse cx="48" cy="40" rx="3.2" ry="2.2" fill="#ffb6c1" opacity="0.6" />

      {/* ひげ */}
      <path d="M22 38 L13 36.5" stroke="#cbb89a" strokeWidth="0.9" strokeLinecap="round" />
      <path d="M22 40.5 L13 41.5" stroke="#cbb89a" strokeWidth="0.9" strokeLinecap="round" />
      <path d="M50 38 L59 36.5" stroke="#cbb89a" strokeWidth="0.9" strokeLinecap="round" />
      <path d="M50 40.5 L59 41.5" stroke="#cbb89a" strokeWidth="0.9" strokeLinecap="round" />

      {/* 額のハート模様（レアの証） */}
      <path d="M36 25 Q34.4 22.6 32.8 24 Q31.4 25.4 36 28.6 Q40.6 25.4 39.2 24 Q37.6 22.6 36 25 Z" fill="#ffb6c1" opacity="0.75" />
    </svg>
  );
}
