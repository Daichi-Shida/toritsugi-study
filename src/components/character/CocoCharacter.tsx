// ココちゃん — グレーのもふもふトイプードル。顔をメインにした最上位アイコン。
// ステージ10（ねこさんの次）。キラキラ演出は CharacterDisplay 側で重ねる。
export default function CocoCharacter({ size = 72 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 72 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id="cocoFur" cx="40%" cy="28%" r="78%">
          <stop offset="0%" stopColor="#f0f3f8" />
          <stop offset="52%" stopColor="#ccd3de" />
          <stop offset="100%" stopColor="#a5adbd" />
        </radialGradient>
        <radialGradient id="cocoEar" cx="45%" cy="22%" r="80%">
          <stop offset="0%" stopColor="#aeb6c5" />
          <stop offset="55%" stopColor="#929bad" />
          <stop offset="100%" stopColor="#6f788c" />
        </radialGradient>
        <radialGradient id="cocoMuzzle" cx="50%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#eef1f6" />
        </radialGradient>
      </defs>

      {/* やわらかい後光 */}
      <ellipse cx="36" cy="38" rx="30" ry="29" fill="#eef1f7" opacity="0.6" />

      {/* 耳（トイプードルらしく、頭より濃いグレーで長めに垂れる） */}
      <g fill="url(#cocoEar)" stroke="#6b7488" strokeWidth="0.8">
        <ellipse cx="13.2" cy="34.5" rx="7.4" ry="8.2" />
        <ellipse cx="11.2" cy="43.5" rx="7.8" ry="8.6" />
        <ellipse cx="13.8" cy="52.4" rx="7" ry="7.6" />
        <ellipse cx="58.8" cy="34.5" rx="7.4" ry="8.2" />
        <ellipse cx="60.8" cy="43.5" rx="7.8" ry="8.6" />
        <ellipse cx="58.2" cy="52.4" rx="7" ry="7.6" />
      </g>

      {/* 頭のもふもふ（トップノット＋顔まわり） */}
      <g fill="url(#cocoFur)" stroke="#a2aaba" strokeWidth="0.7">
        <circle cx="36" cy="12.5" r="7.4" />
        <circle cx="28.5" cy="16" r="6.4" />
        <circle cx="43.5" cy="16" r="6.4" />
        <circle cx="24" cy="25" r="7.6" />
        <circle cx="48" cy="25" r="7.6" />
        <circle cx="22.5" cy="35.5" r="7.8" />
        <circle cx="49.5" cy="35.5" r="7.8" />
        <circle cx="27" cy="45.5" r="8" />
        <circle cx="45" cy="45.5" r="8" />
        <circle cx="36" cy="48" r="8.4" />
        <ellipse cx="36" cy="33" rx="17" ry="16.5" />
      </g>

      {/* 内側のふんわり影を消すハイライト */}
      <ellipse cx="31" cy="27" rx="9" ry="6" fill="#ffffff" opacity="0.45" />

      {/* マズル（口まわり） */}
      <ellipse cx="36" cy="43.5" rx="11" ry="8.4" fill="url(#cocoMuzzle)" stroke="#c8cedb" strokeWidth="0.6" />

      {/* 目（ぱっちり・つやつや） */}
      <ellipse cx="28.5" cy="33.5" rx="3.5" ry="4.2" fill="#3c3b46" />
      <ellipse cx="43.5" cy="33.5" rx="3.5" ry="4.2" fill="#3c3b46" />
      <ellipse cx="29.8" cy="31.8" rx="1.2" ry="1.4" fill="#ffffff" />
      <ellipse cx="44.8" cy="31.8" rx="1.2" ry="1.4" fill="#ffffff" />
      <ellipse cx="27.6" cy="35.2" rx="0.7" ry="0.8" fill="#ffffff" opacity="0.85" />
      <ellipse cx="42.6" cy="35.2" rx="0.7" ry="0.8" fill="#ffffff" opacity="0.85" />

      {/* 鼻（丸っこい） */}
      <path
        d="M32.4 40.2 Q36 38.4 39.6 40.2 Q39.6 43.4 36 44.4 Q32.4 43.4 32.4 40.2 Z"
        fill="#4a4954"
      />
      <ellipse cx="34.2" cy="40.6" rx="1.1" ry="0.7" fill="#ffffff" opacity="0.55" />

      {/* 口（にこっ） */}
      <path d="M36 44.6 L36 46.2" stroke="#8d94a3" strokeWidth="1" strokeLinecap="round" />
      <path d="M36 46.2 Q33.2 48.6 31 46.6" stroke="#8d94a3" strokeWidth="1.1" fill="none" strokeLinecap="round" />
      <path d="M36 46.2 Q38.8 48.6 41 46.6" stroke="#8d94a3" strokeWidth="1.1" fill="none" strokeLinecap="round" />

      {/* ほっぺ */}
      <ellipse cx="24.5" cy="41.5" rx="3.4" ry="2.3" fill="#ffb6c1" opacity="0.55" />
      <ellipse cx="47.5" cy="41.5" rx="3.4" ry="2.3" fill="#ffb6c1" opacity="0.55" />

      {/* 頭のリボン（最上位の証） */}
      <g transform="translate(50 11) rotate(12)">
        <path d="M0 0 L-6.5 -3.6 L-6.5 3.6 Z" fill="#f8a5b8" />
        <path d="M0 0 L6.5 -3.6 L6.5 3.6 Z" fill="#f8a5b8" />
        <circle cx="0" cy="0" r="1.9" fill="#ef8ba3" />
      </g>
    </svg>
  );
}
