"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  value: number;
  /** カウント時間 ms */
  duration?: number;
  className?: string;
}

/**
 * 0→value までゆっくりカウントアップする数値表示。
 * 値が変わるたびに前回値→新値のアニメ。
 */
export default function CountUp({ value, duration = 900, className }: Props) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const startedAtRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    fromRef.current = display;
    startedAtRef.current = performance.now();
    const target = value;

    const tick = (now: number) => {
      const t = Math.min(1, (now - startedAtRef.current) / duration);
      // ease-out
      const eased = 1 - Math.pow(1 - t, 3);
      const cur = Math.round(fromRef.current + (target - fromRef.current) * eased);
      setDisplay(cur);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return <span className={className}>{display}</span>;
}
