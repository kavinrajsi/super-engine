// One AI-search lens (AEO / GEO / AIO / AGO) card. Server component.

export default function LensCard({ code, title, blurb, engines, color }) {
  return (
    <div className="flex flex-col rounded-xl border bg-card p-5">
      <div className="flex items-center gap-3">
        <span
          className="inline-flex h-9 items-center rounded-md px-2 font-mono text-sm font-bold"
          style={{ color, backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)` }}
        >
          {code}
        </span>
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <p className="mt-3 flex-1 text-sm text-muted-foreground">{blurb}</p>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {engines.map((e) => (
          <span
            key={e}
            className="rounded-full border px-2 py-0.5 font-mono text-[10px] text-muted-foreground"
          >
            {e}
          </span>
        ))}
      </div>
    </div>
  );
}
