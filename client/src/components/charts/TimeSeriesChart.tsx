import { useState, type KeyboardEvent, type PointerEvent } from "react";
import { useElementWidth } from "../../hooks/useElementWidth";

export interface TimePoint {
  date: string; // AAAA-MM-JJ
  value: number;
}

interface TimeSeriesChartProps {
  points: TimePoint[];
  kind: "column" | "line";
  /** Nom lu par les lecteurs d'écran */
  label: string;
  formatValue: (value: number) => string;
  /** Affiché au centre quand toutes les valeurs sont nulles */
  emptyLabel?: string;
}

const HEIGHT = 240;
const M = { top: 24, right: 40, bottom: 30, left: 36 };
const BAR_MAX = 24;
const GAP = 2;

const toDate = (key: string) => new Date(`${key}T00:00:00`);
const shortDate = (key: string) => toDate(key).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
const longDate = (key: string) => toDate(key).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
const fmt = (n: number) => n.toLocaleString("fr-FR");
const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

/** Garde l'infobulle dans le cadre, y compris quand celui-ci fait moins de 180 px */
export const tooltipLeft = (x: number, width: number) => {
  const half = Math.min(90, width / 2);
  return clamp(x, half, width - half);
};

/** Graduations entières « rondes » : 0, 1, 2… ou 0, 5, 10… */
function niceScale(max: number) {
  const raw = Math.max(max, 1) / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = Math.max(1, [1, 2, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag);
  const top = Math.max(step, Math.ceil(max / step) * step);
  const ticks: number[] = [];
  for (let t = 0; t <= top; t += step) ticks.push(t);
  return { top, ticks };
}

/** Colonne au sommet arrondi (4px), base carrée posée sur l'axe */
function columnPath(x: number, y: number, w: number, h: number) {
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

/** Série journalière en colonnes ou en courbe, avec survol, clavier et infobulle */
export default function TimeSeriesChart({ points, kind, label, formatValue, emptyLabel }: TimeSeriesChartProps) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);

  const n = points.length;
  const innerW = Math.max(0, width - M.left - M.right);
  const innerH = HEIGHT - M.top - M.bottom;
  const band = n ? innerW / n : 0;
  const max = Math.max(0, ...points.map((p) => p.value));
  const { top, ticks } = niceScale(max);
  const x = (i: number) => M.left + band * (i + 0.5);
  const y = (v: number) => M.top + innerH - (v / top) * innerH;
  const baseline = y(0);

  // Dates en bas : une sur 7 (ou 15), en partant d'aujourd'hui
  const labelStep = n <= 7 ? 1 : n <= 31 ? 7 : 15;
  const xLabels = points.map((_, i) => i).filter((i) => (n - 1 - i) % labelStep === 0);
  // Seul le pic est étiqueté ; le reste passe par l'axe, l'infobulle et le tableau
  const peak = kind === "column" && max > 0 ? points.findIndex((p) => p.value === max) : -1;
  const barW = Math.max(1, Math.min(BAR_MAX, band - GAP));

  const pick = (e: PointerEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setActive(clamp(Math.floor(((e.clientX - rect.left) / rect.width) * n), 0, n - 1));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const current = active ?? n - 1;
    const next = { ArrowLeft: current - 1, ArrowRight: current + 1, Home: 0, End: n - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    setActive(clamp(next, 0, n - 1));
  };

  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.value)}`).join("");
  const area = `${line}L${x(n - 1)},${baseline}L${x(0)},${baseline}Z`;

  return (
    <div
      ref={ref}
      className="ts-chart"
      style={{ height: HEIGHT }}
      tabIndex={0}
      role="group"
      aria-label={`${label}. Flèches gauche et droite pour parcourir les jours.`}
      onKeyDown={onKeyDown}
      onFocus={() => setActive((a) => a ?? n - 1)}
      onBlur={() => setActive(null)}
    >
      {width > 0 && n > 0 && (
        <svg width={width} height={HEIGHT} aria-hidden="true">
          {ticks.map((t) => (
            <g key={t}>
              <line className="ts-chart__grid" x1={M.left} x2={width - M.right} y1={y(t)} y2={y(t)} />
              <text className="ts-chart__tick" x={M.left - 8} y={y(t)} dy="0.32em" textAnchor="end">{fmt(t)}</text>
            </g>
          ))}
          {xLabels.map((i) => (
            <text key={i} className="ts-chart__tick" x={x(i)} y={HEIGHT - 8} textAnchor="middle">{shortDate(points[i].date)}</text>
          ))}

          {kind === "column" &&
            points.map((p, i) =>
              p.value > 0 ? (
                <path
                  key={p.date}
                  className={`ts-chart__bar${i === active ? " is-active" : ""}`}
                  d={columnPath(x(i) - barW / 2, y(p.value), barW, baseline - y(p.value))}
                />
              ) : null,
            )}
          {peak >= 0 && (
            <text className="ts-chart__value" x={x(peak)} y={y(max) - 6} textAnchor="middle">{fmt(max)}</text>
          )}

          {kind === "line" && (
            <>
              <path className="ts-chart__area" d={area} />
              <path className="ts-chart__line" d={line} />
              {active !== null && <line className="ts-chart__crosshair" x1={x(active)} x2={x(active)} y1={M.top} y2={baseline} />}
              {active !== null && active !== n - 1 && (
                <circle className="ts-chart__dot" cx={x(active)} cy={y(points[active].value)} r={4} />
              )}
              <circle className="ts-chart__dot" cx={x(n - 1)} cy={y(points[n - 1].value)} r={4} />
              <text className="ts-chart__value" x={x(n - 1) + 9} y={y(points[n - 1].value)} dy="0.32em">{fmt(points[n - 1].value)}</text>
            </>
          )}

          {max === 0 && emptyLabel && (
            <text className="ts-chart__empty" x={M.left + innerW / 2} y={M.top + innerH / 2} textAnchor="middle">{emptyLabel}</text>
          )}

          {/* Zone de survol : toute la largeur du jour, pas seulement la marque */}
          <rect
            className="ts-chart__hit"
            x={M.left}
            y={M.top}
            width={innerW}
            height={innerH}
            onPointerMove={pick}
            onPointerDown={pick}
            onPointerLeave={() => setActive(null)}
          />
        </svg>
      )}

      {active !== null && width > 0 && (
        // Sur un écran très étroit, la demi-largeur de l'infobulle dépasse le graphique :
        // on la réduit pour que les bornes du clamp restent cohérentes.
        <div className="ts-chart__tooltip" style={{ left: tooltipLeft(x(active), width) }} role="status">
          <span className="ts-chart__key" />
          <strong>{formatValue(points[active].value)}</strong>
          <span className="ts-chart__date">{longDate(points[active].date)}</span>
        </div>
      )}
    </div>
  );
}
