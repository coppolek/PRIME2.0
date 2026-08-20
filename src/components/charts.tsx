import { useEffect, useState } from 'react';

export const PALETTE = {
  brand: '#0f8a7e',
  deep: '#10424c',
  blue: '#477fae',
  amber: '#d98f24',
  lime: '#7fa32c',
  red: '#d2525c',
  grey: '#9db4b7',
  plum: '#a05fb5',
  sky: '#6ba7c9',
  sand: '#c8a05a',
};
export const SERIES = [PALETTE.brand, PALETTE.blue, PALETTE.amber, PALETTE.lime, PALETTE.plum, PALETTE.sky, PALETTE.sand, PALETTE.red, PALETTE.grey, PALETTE.deep];

function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setM(true));
    return () => cancelAnimationFrame(t);
  }, []);
  return m;
}

/* ---------- andamento (area + linea) ---------- */
export function AreaChart({ data, labels, height = 190, color = PALETTE.brand, fmt }: {
  data: number[]; labels: string[]; height?: number; color?: string; fmt: (n: number) => string;
}) {
  const mounted = useMounted();
  const [hover, setHover] = useState<number | null>(null);
  const W = 640, H = height, padX = 8, padTop = 14, padBot = 22;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const x = (i: number) => padX + (i / (data.length - 1)) * (W - padX * 2);
  const y = (v: number) => padTop + (1 - (v - min) / (max - min || 1)) * (H - padTop - padBot);
  const path = data.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = `${path} L${x(data.length - 1).toFixed(1)},${H - padBot} L${x(0).toFixed(1)},${H - padBot} Z`;
  const gid = `ag-${color.replace('#', '')}`;
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={padX} x2={W - padX} y1={padTop + f * (H - padTop - padBot)} y2={padTop + f * (H - padTop - padBot)} stroke="#d9e3e4" strokeDasharray="3 5" strokeWidth="1" />
        ))}
        <path d={area} fill={`url(#${gid})`} style={{ opacity: mounted ? 1 : 0, transition: 'opacity .8s ease .3s' }} />
        <path d={path} fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" className="chart-line" />
        {data.map((v, i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(v)} r={hover === i ? 5 : i === data.length - 1 ? 4 : 2.6} fill={i === data.length - 1 ? color : '#fff'} stroke={color} strokeWidth="2" style={{ transition: 'all .15s ease' }} />
            <rect x={x(i) - 26} y={0} width={52} height={H - padBot} fill="transparent" onMouseEnter={() => setHover(i)} />
          </g>
        ))}
        {labels.map((l, i) => (i % Math.ceil(labels.length / 8) === 0 || i === labels.length - 1) && (
          <text key={i} x={x(i)} y={H - 6} textAnchor="middle" fontSize="10.5" fill="#64797f">{l}</text>
        ))}
      </svg>
      {hover !== null && (
        <div className="pointer-events-none absolute rounded-md bg-petrol-900 px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-pop anim-fade"
          style={{ left: `${(hover / (data.length - 1)) * 88 + 4}%`, top: 0, transform: 'translateX(-50%)' }}>
          <span className="opacity-70">{labels[hover]}</span> · {fmt(data[hover])}
        </div>
      )}
    </div>
  );
}

/* ---------- barre orizzontali ---------- */
export function HBars({ items, fmt, colorFor, suffix }: {
  items: { label: string; value: number; sub?: string }[];
  fmt: (n: number) => string;
  colorFor?: (v: number, i: number) => string;
  suffix?: (v: number) => string;
}) {
  const mounted = useMounted();
  const max = Math.max(...items.map((i) => Math.abs(i.value)), 1);
  return (
    <div className="space-y-2.5">
      {items.map((it, i) => (
        <div key={it.label + i} className="group">
          <div className="mb-1 flex items-baseline justify-between gap-2 text-[12px]">
            <span className="truncate font-semibold text-ink">{it.label}</span>
            <span className="num shrink-0 font-bold text-ink">{fmt(it.value)}
              {suffix && <span className={`ml-1.5 font-semibold ${it.value < 0 ? 'text-danger' : 'text-muted'}`}>{suffix(it.value)}</span>}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-paper">
            <div className="h-full rounded-full transition-all duration-700 ease-out group-hover:brightness-110"
              style={{ width: mounted ? `${Math.max(2, (Math.abs(it.value) / max) * 100)}%` : '0%', background: colorFor ? colorFor(it.value, i) : SERIES[i % SERIES.length], transitionDelay: `${i * 60}ms` }} />
          </div>
          {it.sub && <div className="mt-0.5 text-[11px] text-muted">{it.sub}</div>}
        </div>
      ))}
    </div>
  );
}

/* ---------- barre verticali ---------- */
export function VBars({ items, fmt, colorFor }: {
  items: { label: string; value: number }[];
  fmt: (n: number) => string;
  colorFor?: (v: number, i: number) => string;
}) {
  const mounted = useMounted();
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="flex h-44 items-end gap-2">
      {items.map((it, i) => (
        <div key={it.label + i} className="group relative flex h-full flex-1 flex-col justify-end">
          <div className="pointer-events-none absolute -top-1 left-1/2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md bg-petrol-900 px-2 py-1 text-[11px] font-bold text-white opacity-0 shadow-pop transition-opacity group-hover:opacity-100">
            {it.label}: {fmt(it.value)}
          </div>
          <div className="w-full rounded-t-[5px] transition-all duration-700 ease-out group-hover:brightness-110"
            style={{ height: mounted ? `${Math.max(3, (it.value / max) * 82)}%` : '0%', background: colorFor ? colorFor(it.value, i) : PALETTE.brand, transitionDelay: `${i * 50}ms` }} />
          <div className="mt-1.5 truncate text-center text-[10px] font-semibold text-muted" title={it.label}>{it.label}</div>
        </div>
      ))}
    </div>
  );
}

/* ---------- ciambella ---------- */
export function Donut({ items, size = 148, thickness = 20, centerLabel, centerValue, fmt }: {
  items: { label: string; value: number; color: string }[];
  size?: number; thickness?: number; centerLabel?: string; centerValue?: string; fmt: (n: number) => string;
}) {
  const mounted = useMounted();
  const [hover, setHover] = useState<number | null>(null);
  const total = items.reduce((s, i) => s + i.value, 0) || 1;
  const r = (size - thickness) / 2;
  const C = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="flex items-center gap-5">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0 -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eef3f3" strokeWidth={thickness} />
        {items.map((it, i) => {
          const frac = it.value / total;
          const dash = mounted ? frac * C : 0;
          const off = -acc * C;
          acc += frac;
          return (
            <circle key={it.label} cx={size / 2} cy={size / 2} r={r} fill="none"
              stroke={it.color} strokeWidth={hover === i ? thickness + 5 : thickness} strokeLinecap="butt"
              strokeDasharray={`${dash} ${C - dash}`} strokeDashoffset={off}
              style={{ transition: 'stroke-dasharray 1s cubic-bezier(.4,0,.2,1), stroke-width .15s ease', transitionDelay: `${i * 90}ms`, cursor: 'pointer' }}
              onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
          );
        })}
        <g className="rotate-90" style={{ transformOrigin: 'center' }}>
          <text x={size / 2} y={size / 2 - 4} textAnchor="middle" fontSize="17" fontWeight="800" fill="#14303a" className="font-display">
            {hover !== null ? fmt(items[hover].value) : (centerValue ?? '')}
          </text>
          <text x={size / 2} y={size / 2 + 13} textAnchor="middle" fontSize="9.5" fontWeight="600" fill="#64797f">
            {hover !== null ? items[hover].label : (centerLabel ?? '')}
          </text>
        </g>
      </svg>
      <div className="min-w-0 flex-1 space-y-1.5">
        {items.map((it, i) => (
          <div key={it.label} className={`flex cursor-default items-center gap-2 text-[12px] transition-opacity ${hover !== null && hover !== i ? 'opacity-40' : ''}`}
            onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: it.color }} />
            <span className="min-w-0 flex-1 truncate font-semibold text-soft">{it.label}</span>
            <span className="num font-bold text-ink">{Math.round((it.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- barre pipeline ---------- */
export function FunnelBars({ items, fmt }: { items: { label: string; value: number; color: string }[]; fmt: (n: number) => string }) {
  const mounted = useMounted();
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="space-y-1.5">
      {items.map((it, i) => (
        <div key={it.label} className="group flex items-center gap-2">
          <span className="w-28 shrink-0 truncate text-right text-[11px] font-semibold text-muted">{it.label}</span>
          <div className="relative h-6 flex-1 overflow-hidden rounded-[5px] bg-paper">
            <div className="h-full rounded-[5px] transition-all duration-700 ease-out group-hover:brightness-110"
              style={{ width: mounted ? `${Math.max(3, (it.value / max) * 100)}%` : '0%', background: it.color, transitionDelay: `${i * 60}ms` }} />
            <span className="num absolute inset-y-0 left-2 flex items-center text-[10.5px] font-bold text-white mix-blend-luminosity">{fmt(it.value)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
