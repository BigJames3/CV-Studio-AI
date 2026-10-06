'use client';

import { useState } from 'react';

type Point = { date: string; views: number };

const HEIGHT = 160;
const GAP = 2;

function formatDay(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}

/** Daily views as bars: one series, so no legend; hover or focus a bar for its value. */
export function ViewsChart({ series }: { series: Point[] }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...series.map((p) => p.views));
  const width = 100 / series.length;
  const shown = active === null ? null : series[active];
  // Label a handful of days on the axis, not every one.
  const labelEvery = Math.ceil(series.length / 6);

  return (
    <figure className="relative" data-testid="views-chart">
      <div className="h-6 text-sm text-content-secondary" aria-live="polite">
        {shown ? (
          <span>
            <span className="font-semibold text-content-primary">{shown.views}</span> vue
            {shown.views > 1 ? 's' : ''} · {formatDay(shown.date)}
          </span>
        ) : (
          <span className="text-content-muted">Survolez une barre pour le détail</span>
        )}
      </div>
      <svg
        viewBox={`0 0 100 ${HEIGHT}`}
        preserveAspectRatio="none"
        className="h-40 w-full"
        role="img"
        aria-label={`Vues par jour sur ${series.length} jours, maximum ${max}`}
        onMouseLeave={() => setActive(null)}
      >
        <line
          x1="0"
          x2="100"
          y1={HEIGHT - 0.5}
          y2={HEIGHT - 0.5}
          className="stroke-border"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
        {series.map((p, i) => {
          const h = p.views === 0 ? 0 : Math.max(2, (p.views / max) * (HEIGHT - 8));
          return (
            <g key={p.date}>
              {/* Full-height hit target, larger than the bar itself. */}
              <rect
                x={i * width}
                y={0}
                width={width}
                height={HEIGHT}
                fill="transparent"
                tabIndex={0}
                aria-label={`${formatDay(p.date)} : ${p.views} vue${p.views > 1 ? 's' : ''}`}
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
              />
              {h > 0 ? (
                <rect
                  x={i * width + GAP / 4}
                  y={HEIGHT - h}
                  width={Math.max(0.2, width - GAP / 2)}
                  height={h}
                  rx="0.6"
                  className={active === i ? 'fill-primary-hover' : 'fill-primary'}
                  pointerEvents="none"
                />
              ) : null}
            </g>
          );
        })}
      </svg>
      <div className="mt-1 flex justify-between text-xs text-content-muted" aria-hidden>
        {series
          .filter((_, i) => i % labelEvery === 0 || i === series.length - 1)
          .map((p) => (
            <span key={p.date}>{formatDay(p.date)}</span>
          ))}
      </div>
    </figure>
  );
}
