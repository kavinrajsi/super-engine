"use client";

// Clean circular score ring (SVG, crisp at any size). Color tracks the score:
// green ≥75, orange ≥50, red below. Used large (site) and small (per page).

function ringColor(score) {
  if (score >= 75) return "var(--pass)";
  if (score >= 50) return "var(--warning)";
  return "var(--error)";
}

export default function ScoreRing({ score = 0, size = 120, label, grade, strokeWidth }) {
  const sw = strokeWidth ?? (size < 70 ? 6 : 10);
  const r = (size - sw) / 2;
  const circumference = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score)) / 100;
  const color = ringColor(score);

  return (
    <div className="inline-flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={sw} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - pct)}
            style={{ transition: "stroke-dashoffset 0.6s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-bold leading-none" style={{ fontSize: size * 0.3, color }}>
            {Math.round(score)}
          </span>
          {grade && size >= 90 && (
            <span className="mt-0.5 text-xs font-semibold" style={{ color }}>
              Grade {grade}
            </span>
          )}
        </div>
      </div>
      {label && <span className="text-xs text-muted-foreground">{label}</span>}
    </div>
  );
}
