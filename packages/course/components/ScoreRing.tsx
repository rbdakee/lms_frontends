"use client";

import { useLang } from "@lms/ui/lang";

/** Круг с процентом — результат теста. */
export function ScoreRing({ pct, passed }: { pct: number; passed: boolean }) {
  const { t } = useLang();
  const size = 132;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const color = passed ? "var(--success)" : "var(--danger)";

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--track)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * pct) / 100}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.03em", color }}>
          {pct}%
        </span>
        <span className="caption" style={{ color }}>
          {passed ? t.qzRingPassed : t.qzRingFailed}
        </span>
      </div>
    </div>
  );
}
