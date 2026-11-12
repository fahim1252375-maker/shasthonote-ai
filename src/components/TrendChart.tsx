import React from 'react';
import { chartGeometry, computeDomain, type ChartPadding } from '../utils/vitals';

export interface TrendSeries {
  label: string;
  color: string;
  values: number[];
}

interface TrendChartProps {
  series: TrendSeries[];
  /** One label per x position (shared by every series). */
  xLabels: string[];
  /** Optional shaded reference band, in the same units as the values. */
  band?: { low?: number; high?: number };
  unit?: string;
  ariaLabel: string;
}

const WIDTH = 640;
const HEIGHT = 240;
const PADDING: ChartPadding = { top: 16, right: 16, bottom: 30, left: 44 };

const formatTick = (value: number) => (Math.abs(value) >= 100 ? String(Math.round(value)) : String(Math.round(value * 10) / 10));

/** Dependency-free SVG line chart. Several series share one y-domain so lines are comparable. */
export const TrendChart: React.FC<TrendChartProps> = ({ series, xLabels, band, unit, ariaLabel }) => {
  const populated = series.filter((item) => item.values.length > 0);
  if (populated.length === 0) return null;

  const all = populated.flatMap((item) => item.values);
  if (band?.low !== undefined) all.push(band.low);
  if (band?.high !== undefined) all.push(band.high);
  const domain = computeDomain(all);
  const innerBottom = HEIGHT - PADDING.bottom;
  const toY = (value: number) =>
    chartGeometry([value], WIDTH, HEIGHT, PADDING, domain).points[0].y;

  const ticks = [0, 1, 2, 3].map((index) => domain[0] + ((domain[1] - domain[0]) * index) / 3);
  const bandTop = band?.high !== undefined ? toY(band.high) : PADDING.top;
  const bandBottom = band?.low !== undefined ? toY(band.low) : innerBottom;

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={ariaLabel}
        className="h-auto w-full min-w-[420px]"
      >
        {band && (band.low !== undefined || band.high !== undefined) && (
          <rect
            x={PADDING.left}
            y={Math.min(bandTop, bandBottom)}
            width={WIDTH - PADDING.left - PADDING.right}
            height={Math.abs(bandBottom - bandTop)}
            fill="#14b8a6"
            opacity="0.12"
          />
        )}

        {ticks.map((tick) => {
          const y = toY(tick);
          return (
            <g key={tick}>
              <line x1={PADDING.left} x2={WIDTH - PADDING.right} y1={y} y2={y} stroke="#e2e8f0" strokeWidth="1" />
              <text x={PADDING.left - 6} y={y + 3} textAnchor="end" fontSize="10" fill="#64748b">
                {formatTick(tick)}
              </text>
            </g>
          );
        })}

        {unit && (
          <text x={4} y={12} fontSize="10" fill="#64748b">
            {unit}
          </text>
        )}

        {xLabels.length > 0 && (
          <>
            <text x={PADDING.left} y={HEIGHT - 8} fontSize="10" fill="#64748b">
              {xLabels[0]}
            </text>
            {xLabels.length > 1 && (
              <text x={WIDTH - PADDING.right} y={HEIGHT - 8} fontSize="10" fill="#64748b" textAnchor="end">
                {xLabels[xLabels.length - 1]}
              </text>
            )}
          </>
        )}

        {populated.map((item) => {
          const { points } = chartGeometry(item.values, WIDTH, HEIGHT, PADDING, domain);
          return (
            <g key={item.label}>
              {points.length > 1 && (
                <polyline
                  fill="none"
                  stroke={item.color}
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  points={points.map((point) => `${point.x},${point.y}`).join(' ')}
                />
              )}
              {points.map((point, index) => (
                <circle key={index} cx={point.x} cy={point.y} r="3.5" fill="#fff" stroke={item.color} strokeWidth="2">
                  <title>{`${item.label}: ${item.values[index]}${unit ? ` ${unit}` : ''}${xLabels[index] ? ` — ${xLabels[index]}` : ''}`}</title>
                </circle>
              ))}
            </g>
          );
        })}
      </svg>

      {populated.length > 1 && (
        <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-slate-600">
          {populated.map((item) => (
            <span key={item.label} className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
              {item.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
