// メアリー風 白髪外人女の子 SVGキャラクター
export default function MaryCharacter({ size = 80 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* 後ろ髪（白・ロング） */}
      <ellipse cx="40" cy="52" rx="18" ry="28" fill="#f0f0f0" />
      <rect x="22" y="38" width="7" height="34" rx="3.5" fill="#e8e8e8" />
      <rect x="51" y="38" width="7" height="34" rx="3.5" fill="#e8e8e8" />

      {/* 首 */}
      <rect x="36" y="46" width="8" height="10" rx="3" fill="#fddbb8" />

      {/* 胴体（白いシャツ・黒ジャケット風） */}
      <rect x="26" y="55" width="28" height="20" rx="5" fill="#2a2a2a" />
      <rect x="32" y="56" width="16" height="18" rx="3" fill="#f5f5f5" />
      {/* 胸元リボン */}
      <path d="M38 60 L40 63 L42 60 L40 62 Z" fill="#c0392b" />

      {/* 顔 */}
      <ellipse cx="40" cy="36" rx="14" ry="15" fill="#fddbb8" />

      {/* 前髪（白） */}
      <ellipse cx="40" cy="24" rx="15" ry="10" fill="#f0f0f0" />
      <path d="M26 28 Q28 18 35 22" stroke="#f0f0f0" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M54 28 Q52 18 45 22" stroke="#f0f0f0" strokeWidth="4" fill="none" strokeLinecap="round" />
      {/* 前髪の毛先 */}
      <path d="M28 30 Q25 38 27 42" stroke="#e8e8e8" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M52 30 Q55 38 53 42" stroke="#e8e8e8" strokeWidth="3" fill="none" strokeLinecap="round" />

      {/* 目（青・大きめ） */}
      <ellipse cx="34" cy="36" rx="4" ry="4.5" fill="white" />
      <ellipse cx="46" cy="36" rx="4" ry="4.5" fill="white" />
      <ellipse cx="34.5" cy="36.5" rx="2.5" ry="3" fill="#4a90d9" />
      <ellipse cx="46.5" cy="36.5" rx="2.5" ry="3" fill="#4a90d9" />
      <ellipse cx="35" cy="37" rx="1.5" ry="1.8" fill="#1a3a6e" />
      <ellipse cx="47" cy="37" rx="1.5" ry="1.8" fill="#1a3a6e" />
      {/* 瞳のハイライト */}
      <ellipse cx="35.8" cy="35.5" rx="0.8" ry="0.8" fill="white" />
      <ellipse cx="47.8" cy="35.5" rx="0.8" ry="0.8" fill="white" />
      {/* まつ毛 */}
      <path d="M30 33 Q31 31 34 32" stroke="#333" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <path d="M42 33 Q44 31 48 32" stroke="#333" strokeWidth="1.2" fill="none" strokeLinecap="round" />

      {/* 眉（細め・白っぽい） */}
      <path d="M30.5 30.5 Q34 29 37 30" stroke="#ccc" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M43 30 Q46 29 49.5 30.5" stroke="#ccc" strokeWidth="1.5" fill="none" strokeLinecap="round" />

      {/* 鼻（小さく） */}
      <ellipse cx="40" cy="41" rx="1.2" ry="0.8" fill="#f0b89a" />

      {/* 口（ほほえみ） */}
      <path d="M36 44.5 Q40 47 44 44.5" stroke="#e07070" strokeWidth="1.5" fill="none" strokeLinecap="round" />

      {/* ほっぺ（うっすらピンク） */}
      <ellipse cx="30" cy="41" rx="3.5" ry="2" fill="#ffb3b3" opacity="0.4" />
      <ellipse cx="50" cy="41" rx="3.5" ry="2" fill="#ffb3b3" opacity="0.4" />
    </svg>
  );
}
