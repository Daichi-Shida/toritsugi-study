// 緑のそら豆SVGキャラクター（丸っこい横向き）
export default function BeanCharacter({ size = 72 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 72 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* メインのそら豆（丸いたまご形） */}
      <ellipse cx="36" cy="40" rx="22" ry="26" fill="#5a9e32" />
      <ellipse cx="36" cy="40" rx="19" ry="23" fill="#7dc44a" />

      {/* ハイライト */}
      <ellipse cx="29" cy="30" rx="7" ry="10" fill="#a8e066" opacity="0.55" />

      {/* おへそ（そら豆の特徴的な黒い線） */}
      <path
        d="M36 54 Q42 56 44 52 Q46 48 44 44 Q42 40 36 40"
        stroke="#3a6e1a"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />

      {/* 顔 */}
      {/* 目 */}
      <ellipse cx="30" cy="36" rx="2.5" ry="2.5" fill="#2a5010" />
      <ellipse cx="42" cy="36" rx="2.5" ry="2.5" fill="#2a5010" />
      {/* 目のハイライト */}
      <ellipse cx="31" cy="35" rx="1" ry="1" fill="white" />
      <ellipse cx="43" cy="35" rx="1" ry="1" fill="white" />
      {/* 笑顔 */}
      <path
        d="M29 43 Q36 48 43 43"
        stroke="#2a5010"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      {/* ほっぺ */}
      <ellipse cx="25" cy="41" rx="3" ry="2" fill="#a8e066" opacity="0.6" />
      <ellipse cx="47" cy="41" rx="3" ry="2" fill="#a8e066" opacity="0.6" />
    </svg>
  );
}
