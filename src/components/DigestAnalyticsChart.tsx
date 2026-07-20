"use client";
import { useState } from "react";

export type DigestRunPoint = {
  id: string;
  mode: string;
  createdAt: string | Date;
  totalEligible: number;
  sent: number;
  skipped: number;
  failed: number;
};

const COLORS = {
  sent: "#0ca30c",
  failed: "#d03b3b",
  skipped: "#c3c2b7",
  grid: "#e1e0d9",
  axis: "#c3c2b7",
  muted: "#898781",
  ink: "#0b0b0b",
};

const BAR_W = 20;
const GAP = 10;
const CHART_H = 180;
const PAD_L = 36;
const PAD_B = 22;
const PAD_T = 10;

export default function DigestAnalyticsChart({ runs }: { runs: DigestRunPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);

  if (runs.length === 0) {
    return (
      <p className="text-gray-400 text-sm p-4 border rounded-lg bg-white">
        No completed sends yet — the chart will fill in once the digest has run a few times.
      </p>
    );
  }

  const maxTotal = Math.max(...runs.map((r) => r.totalEligible), 1);
  // Round the axis ceiling up to a clean step so ticks read as 0 / step / 2*step.
  const step = Math.max(1, Math.ceil(maxTotal / 4 / 5) * 5);
  const axisMax = step * 4;
  const scale = CHART_H / axisMax;

  const width = PAD_L + runs.length * (BAR_W + GAP);
  const height = CHART_H + PAD_T + PAD_B;

  return (
    <div className="relative">
      <div className="flex items-center gap-4 mb-2 text-xs text-gray-600">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: COLORS.sent }} />
          Sent
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: COLORS.skipped }} />
          Skipped
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: COLORS.failed }} />
          Failed
        </span>
      </div>

      <div className="overflow-x-auto">
        <svg width={width} height={height} className="block" role="img" aria-label="Digest send results over time">
          {[0, 1, 2, 3, 4].map((i) => {
            const y = PAD_T + CHART_H - i * step * scale;
            return (
              <g key={i}>
                <line x1={PAD_L} x2={width} y1={y} y2={y} stroke={COLORS.grid} strokeWidth={1} />
                <text x={PAD_L - 6} y={y + 3} fontSize={10} fill={COLORS.muted} textAnchor="end">
                  {i * step}
                </text>
              </g>
            );
          })}

          {runs.map((r, i) => {
            const x = PAD_L + i * (BAR_W + GAP);
            const baseline = PAD_T + CHART_H;

            const sentH = r.sent * scale;
            const skippedH = r.skipped * scale;
            const failedH = r.failed * scale;

            const GAP_PX = 2;
            let cursor = baseline;
            const segments: { h: number; color: string; key: string }[] = [
              { h: failedH, color: COLORS.failed, key: "failed" },
              { h: skippedH, color: COLORS.skipped, key: "skipped" },
              { h: sentH, color: COLORS.sent, key: "sent" },
            ].filter((s) => s.h > 0);

            const rects = segments.map((seg, si) => {
              const isTop = si === segments.length - 1;
              const h = Math.max(seg.h - (si > 0 ? GAP_PX : 0), 1);
              cursor -= h + (si > 0 ? GAP_PX : 0);
              const y = cursor;
              return (
                <rect
                  key={seg.key}
                  x={x}
                  y={y}
                  width={BAR_W}
                  height={h}
                  fill={seg.color}
                  rx={isTop ? 4 : 0}
                  ry={isTop ? 4 : 0}
                />
              );
            });

            const date = new Date(r.createdAt);
            const label = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });

            return (
              <g
                key={r.id}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover((h) => (h === i ? null : h))}
                style={{ cursor: "pointer" }}
              >
                <rect x={x - GAP / 2} y={PAD_T} width={BAR_W + GAP} height={CHART_H} fill="transparent" />
                {rects}
                <text
                  x={x + BAR_W / 2}
                  y={baseline + 14}
                  fontSize={9}
                  fill={COLORS.muted}
                  textAnchor="middle"
                >
                  {label}
                </text>
                {hover === i && (
                  <rect
                    x={x - 1}
                    y={PAD_T}
                    width={BAR_W + 2}
                    height={CHART_H}
                    fill="none"
                    stroke={COLORS.ink}
                    strokeOpacity={0.15}
                    strokeWidth={1}
                  />
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {hover !== null && (
        <div className="absolute top-0 right-0 bg-gray-900 text-white text-xs rounded px-3 py-2 shadow-lg pointer-events-none">
          <p className="font-medium capitalize">
            {runs[hover].mode} · {new Date(runs[hover].createdAt).toLocaleDateString()}
          </p>
          <p>Sent: {runs[hover].sent}</p>
          <p>Skipped: {runs[hover].skipped}</p>
          <p>Failed: {runs[hover].failed}</p>
        </div>
      )}
    </div>
  );
}
