import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Stage } from '../types';

/* ================= icone (SVG inline, tratteggiate a mano) ================= */

const PATHS: Record<string, ReactNode> = {
  dashboard: <><rect x="3" y="3" width="7.5" height="9" rx="1.5" /><rect x="13.5" y="3" width="7.5" height="5.5" rx="1.5" /><rect x="13.5" y="12" width="7.5" height="9" rx="1.5" /><rect x="3" y="15.5" width="7.5" height="5.5" rx="1.5" /></>,
  clienti: <><circle cx="9" cy="8" r="3.4" /><path d="M2.8 20c.6-3.5 3.1-5.4 6.2-5.4s5.6 1.9 6.2 5.4" /><path d="M15.5 5.2a3.4 3.4 0 0 1 0 5.9M17.8 14.9c2 .8 3.2 2.5 3.6 5.1" /></>,
  referenti: <><rect x="3" y="4.5" width="18" height="15" rx="2" /><circle cx="8.6" cy="10.4" r="1.9" /><path d="M5.6 16c.4-1.9 1.7-2.9 3-2.9s2.6 1 3 2.9M14 9.5h4.5M14 13h4.5" /></>,
  cantieri: <><path d="M4 17.5h16M5.5 17.5v-3.2A6.5 6.5 0 0 1 12 7.8a6.5 6.5 0 0 1 6.5 6.5v3.2" /><path d="M12 7.8V5.2M9.2 8.5l-1-1.7M14.8 8.5l1-1.7" /><path d="M3 20.5h18" /></>,
  commerciale: <><rect x="3" y="4" width="5.2" height="16" rx="1.4" /><rect x="9.4" y="4" width="5.2" height="11" rx="1.4" /><rect x="15.8" y="4" width="5.2" height="7.5" rx="1.4" /></>,
  sopralluoghi: <><circle cx="10.5" cy="10.5" r="6" /><path d="M15 15l5.5 5.5M8 10.5h5M10.5 8v5" /></>,
  preventivi: <><path d="M6 3h9l3.5 3.5V21H6z" /><path d="M15 3v4h4M9 12h6M9 15.5h6M9 8.5h2.5" /></>,
  contratti: <><path d="M6 3h9l3.5 3.5V21H6z" /><path d="M15 3v4h4M9 16.5l1.8 1.8L15 14" /></>,
  servizi: <><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" /><path d="M12 12l8-4.5M12 12L4 7.5M12 12v9" /></>,
  scadenze: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9.5h18M8 3v4M16 3v4M12 13.5v3M10.5 15h3" /></>,
  attivita: <><circle cx="12" cy="12" r="8.5" /><path d="M8.2 12.3l2.6 2.6 5-5.5" /></>,
  documenti: <><path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h5L12 7.5h7.5A1.5 1.5 0 0 1 21 9v9.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z" /><path d="M7 13h10" /></>,
  analisi: <><path d="M4 20V4" /><path d="M4 20h16" /><rect x="7.5" y="11" width="3.2" height="6" rx="0.8" /><rect x="12.5" y="7" width="3.2" height="10" rx="0.8" /><rect x="17.5" y="13" width="3.2" height="4" rx="0.8" /></>,
  amministrazione: <><path d="M12 3l7.5 3v5.5c0 4.6-3 8-7.5 9.5-4.5-1.5-7.5-4.9-7.5-9.5V6z" /><path d="M9 11.5l2.2 2.2L15.5 9" /></>,
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5L21 21" /></>,
  bell: <><path d="M6 9.5a6 6 0 0 1 12 0c0 4 1.5 5.5 2 6.5H4c.5-1 2-2.5 2-6.5z" /><path d="M10 19.5a2.2 2.2 0 0 0 4 0" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  chevD: <path d="M6 9.5l6 6 6-6" />,
  chevR: <path d="M9.5 6l6 6-6 6" />,
  chevL: <path d="M14.5 6l-6 6 6 6" />,
  phone: <><path d="M5.5 4h3.6l1.5 4-2.2 1.7a12.8 12.8 0 0 0 5.9 5.9L16 13.4l4 1.5v3.6a1.6 1.6 0 0 1-1.7 1.6A16.5 16.5 0 0 1 3.9 5.7 1.6 1.6 0 0 1 5.5 4z" /></>,
  mail: <><rect x="3" y="5.5" width="18" height="13" rx="2" /><path d="M4 7.5l8 6 8-6" /></>,
  pin: <><path d="M12 21s7-6.1 7-11.5A7 7 0 0 0 5 9.5C5 14.9 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></>,
  alert: <><path d="M12 3.5L2.5 20h19z" /><path d="M12 9.5v5M12 17.2v.3" /></>,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5.2l3.5 2" /></>,
  lock: <><rect x="5" y="10.5" width="14" height="10" rx="2" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></>,
  printer: <><path d="M7 8V3.5h10V8" /><rect x="3.5" y="8" width="17" height="8.5" rx="1.5" /><path d="M7 13.5h10v7H7z" /></>,
  sparkle: <><path d="M12 3l1.9 5.6L19.5 10.5l-5.6 1.9L12 18l-1.9-5.6L4.5 10.5l5.6-1.9z" /><path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z" /></>,
  logout: <><path d="M14 4H6.5A1.5 1.5 0 0 0 5 5.5v13A1.5 1.5 0 0 0 6.5 20H14" /><path d="M10 12h10.5M17 8.5l3.5 3.5-3.5 3.5" /></>,
  edit: <><path d="M4 20h4.5L20 8.5a2.1 2.1 0 0 0-3-3L5.5 17z" /><path d="M14.5 7l2.5 2.5" /></>,
  trash: <><path d="M4.5 6.5h15M9.5 6.5V4.5h5v2M6.5 6.5l1 13.5h9l1-13.5" /><path d="M10 10.5v6M14 10.5v6" /></>,
  filter: <><path d="M4 5h16l-6.2 7.2v5.3L10.2 19v-6.8z" /></>,
  euro: <><path d="M17.5 6.5A6.5 6.5 0 0 0 7 8.5m10.5 9A6.5 6.5 0 0 1 7 15.5M4.5 10.5h9M4.5 13.5h8" /></>,
  trend: <><path d="M3.5 17.5l5.5-5.5 3.5 3.5 7-8" /><path d="M15 7.5h4.5V12" /></>,
  building: <><rect x="4" y="3.5" width="16" height="17" rx="1.5" /><path d="M8 7.5h2M14 7.5h2M8 11.5h2M14 11.5h2M10 20.5v-4h4v4" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9.5h18M8 3v4M16 3v4" /></>,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  info: <><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5M12 7.6v.3" /></>,
  download: <><path d="M12 4v11M7.5 11l4.5 4.5L16.5 11" /><path d="M4.5 19.5h15" /></>,
  eye: <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" /></>,
  refresh: <><path d="M4.5 8A8.5 8.5 0 0 1 19 6.5M19.5 16A8.5 8.5 0 0 1 5 17.5" /><path d="M19 2.5v4h-4M5 21.5v-4h4" /></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  arrowUR: <><path d="M7 17L17 7M9 7h8v8" /></>,
  grip: <><circle cx="9" cy="6" r="1.1" /><circle cx="15" cy="6" r="1.1" /><circle cx="9" cy="12" r="1.1" /><circle cx="15" cy="12" r="1.1" /><circle cx="9" cy="18" r="1.1" /><circle cx="15" cy="18" r="1.1" /></>,
  user: <><circle cx="12" cy="8" r="3.6" /><path d="M5 20c.7-3.8 3.4-5.8 7-5.8s6.3 2 7 5.8" /></>,
  history: <><path d="M4.5 8A8.5 8.5 0 1 1 3.5 12" /><path d="M4.5 3.5V8H9M12 7.5v5l3.4 2" /></>,
};

export function Icon({ name, size = 18, className = '' }: { name: string; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 ${className}`} aria-hidden="true">
      {PATHS[name] ?? <circle cx="12" cy="12" r="8" />}
    </svg>
  );
}

/* ================= tone & badge ================= */

export type Tone = 'teal' | 'green' | 'amber' | 'red' | 'blue' | 'gray' | 'lime' | 'petrol' | 'plum';
const TONES: Record<Tone, string> = {
  teal: 'bg-brand-soft text-brand-deep',
  green: 'bg-ok-soft text-ok',
  amber: 'bg-warn-soft text-[#a4660d]',
  red: 'bg-danger-soft text-danger',
  blue: 'bg-info-soft text-info',
  gray: 'bg-paper text-muted',
  lime: 'bg-lime/30 text-lime-deep',
  petrol: 'bg-petrol-100 text-petrol-800',
  plum: 'bg-[#f1e7f5] text-plum',
};

export function Pill({ tone, children, dot = true }: { tone: Tone; children: ReactNode; dot?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-[3px] text-[11px] font-bold ${TONES[tone]}`}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />}
      {children}
    </span>
  );
}

export const STATUS_META: Record<string, { label: string; tone: Tone }> = {
  prospect: { label: 'Prospect', tone: 'blue' },
  attivo: { label: 'Attivo', tone: 'green' },
  sospeso: { label: 'Sospeso', tone: 'amber' },
  cessato: { label: 'Cessato', tone: 'gray' },
  pianificato: { label: 'Pianificato', tone: 'blue' },
  chiuso: { label: 'Chiuso', tone: 'gray' },
  disdetto: { label: 'Disdetto', tone: 'red' },
  bozza: { label: 'Bozza', tone: 'gray' },
  inviato: { label: 'Inviato', tone: 'blue' },
  visualizzato: { label: 'Visualizzato', tone: 'petrol' },
  trattativa: { label: 'In trattativa', tone: 'amber' },
  accettato: { label: 'Accettato', tone: 'green' },
  rifiutato: { label: 'Rifiutato', tone: 'red' },
  scaduto: { label: 'Scaduto', tone: 'red' },
  da_fare: { label: 'Da fare', tone: 'amber' },
  in_corso: { label: 'In corso', tone: 'blue' },
  completata: { label: 'Completata', tone: 'green' },
  aperta: { label: 'Aperta', tone: 'amber' },
  evasa: { label: 'Evasa', tone: 'green' },
};

export function StatusPill({ status }: { status: string }) {
  const m = STATUS_META[status] ?? { label: status, tone: 'gray' as Tone };
  return <Pill tone={m.tone}>{m.label}</Pill>;
}

/* fasi pipeline */
export const STAGES: { key: Stage; label: string; color: string }[] = [
  { key: 'lead', label: 'Lead', color: '#9db4b7' },
  { key: 'primo_contatto', label: 'Primo contatto', color: '#6ba7c9' },
  { key: 'sopralluogo', label: 'Sopralluogo', color: '#477fae' },
  { key: 'elaborazione', label: 'Elaborazione', color: '#a05fb5' },
  { key: 'inviato', label: 'Prev. inviato', color: '#0f8a7e' },
  { key: 'negoziazione', label: 'Negoziazione', color: '#d98f24' },
  { key: 'attesa', label: 'In attesa', color: '#c8a05a' },
  { key: 'acquisito', label: 'Acquisito', color: '#2e9c6b' },
  { key: 'perso', label: 'Perso', color: '#d2525c' },
];
export const stageMeta = (s: Stage) => STAGES.find((x) => x.key === s) ?? STAGES[0];

/* ================= bottoni ================= */

export function Btn({ children, onClick, variant = 'primary', size = 'md', icon, disabled, type = 'button', title }: {
  children?: ReactNode; onClick?: () => void; variant?: 'primary' | 'ghost' | 'subtle' | 'danger' | 'lime';
  size?: 'sm' | 'md'; icon?: string; disabled?: boolean; type?: 'button' | 'submit'; title?: string;
}) {
  const base = 'inline-flex items-center justify-center gap-1.5 rounded-lg font-bold transition-all duration-150 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40';
  const sizes = { sm: 'px-2.5 py-1.5 text-[12px]', md: 'px-3.5 py-2 text-[13px]' };
  const variants = {
    primary: 'bg-brand text-white shadow-sm hover:bg-brand-deep hover:shadow-md',
    lime: 'bg-lime text-petrol-900 hover:brightness-95 shadow-sm',
    ghost: 'border border-line bg-white text-soft hover:border-brand hover:text-brand',
    subtle: 'bg-petrol-100/60 text-petrol-800 hover:bg-petrol-100',
    danger: 'bg-danger-soft text-danger hover:bg-danger hover:text-white',
  };
  return (
    <button type={type} title={title} disabled={disabled} onClick={onClick} className={`${base} ${sizes[size]} ${variants[variant]}`}>
      {icon && <Icon name={icon} size={size === 'sm' ? 14 : 16} />}
      {children}
    </button>
  );
}

/* ================= card & titoli ================= */

export function Card({ children, className = '', title, sub, action, pad = true, delay = 0 }: {
  children: ReactNode; className?: string; title?: ReactNode; sub?: string; action?: ReactNode; pad?: boolean; delay?: number;
}) {
  return (
    <section className={`anim-fade-up rounded-2xl border border-line bg-surface shadow-card transition-shadow duration-200 hover:shadow-pop/10 ${className}`} style={{ animationDelay: `${delay}ms` }}>
      {(title || action) && (
        <header className="flex items-start justify-between gap-3 border-b border-line/70 px-4 py-3">
          <div>
            <h3 className="font-display text-[15px] font-bold tracking-tight text-ink">{title}</h3>
            {sub && <p className="mt-0.5 text-[11.5px] font-medium text-muted">{sub}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={pad ? 'p-4' : ''}>{children}</div>
    </section>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <div className="mb-2.5 text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-muted">{children}</div>;
}

/* ================= form generico ================= */

export interface FieldDef {
  key: string; label: string;
  type?: 'text' | 'textarea' | 'select' | 'date' | 'number' | 'money' | 'checkbox';
  options?: string[] | { value: string; label: string }[];
  span?: 1 | 2; required?: boolean; placeholder?: string; min?: number; max?: number; step?: number; hint?: string;
}

const inputCls = 'w-full rounded-lg border border-line bg-white px-3 py-2 text-[13px] font-semibold text-ink outline-none transition placeholder:font-medium placeholder:text-faint focus:border-brand focus:ring-2 focus:ring-brand/15';

export function FormGrid({ fields, values, onChange }: {
  fields: FieldDef[]; values: Record<string, unknown>; onChange: (key: string, v: unknown) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-x-3 gap-y-3.5 sm:grid-cols-2">
      {fields.map((f) => (
        <div key={f.key} className={f.span === 2 ? 'sm:col-span-2' : ''}>
          <label className="mb-1 block text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-muted">
            {f.label} {f.required && <span className="text-danger">*</span>}
          </label>
          {f.type === 'textarea' ? (
            <textarea rows={3} className={inputCls} value={(values[f.key] as string) ?? ''} placeholder={f.placeholder}
              onChange={(e) => onChange(f.key, e.target.value)} />
          ) : f.type === 'select' ? (
            <select className={inputCls} value={(values[f.key] as string) ?? ''} onChange={(e) => onChange(f.key, e.target.value)}>
              <option value="">—</option>
              {(f.options ?? []).map((o) => {
                const opt = typeof o === 'string' ? { value: o, label: o } : o;
                return <option key={opt.value} value={opt.value}>{opt.label}</option>;
              })}
            </select>
          ) : f.type === 'checkbox' ? (
            <button type="button" onClick={() => onChange(f.key, !values[f.key])}
              className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-[13px] font-bold transition ${values[f.key] ? 'border-brand bg-brand-soft text-brand-deep' : 'border-line bg-white text-muted'}`}>
              <span className={`flex h-4 w-4 items-center justify-center rounded ${values[f.key] ? 'bg-brand text-white' : 'bg-paper text-transparent'}`}><Icon name="check" size={11} /></span>
              {f.hint ?? 'Sì'}
            </button>
          ) : f.type === 'money' ? (
            <div className="relative">
              <input type="number" className={`${inputCls} pr-7`} value={(values[f.key] as number | string) ?? ''} min={f.min} step={f.step ?? 1}
                onChange={(e) => onChange(f.key, e.target.value === '' ? 0 : Number(e.target.value))} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-bold text-faint">€</span>
            </div>
          ) : (
            <input type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'} className={inputCls}
              value={(values[f.key] as string | number) ?? ''} placeholder={f.placeholder} min={f.min} max={f.max} step={f.step}
              onChange={(e) => onChange(f.key, f.type === 'number' ? (e.target.value === '' ? 0 : Number(e.target.value)) : e.target.value)} />
          )}
        </div>
      ))}
    </div>
  );
}

/* ================= modale ================= */

export function Modal({ open, onClose, title, sub, children, footer, size = 'lg' }: {
  open: boolean; onClose: () => void; title: ReactNode; sub?: string; children: ReactNode; footer?: ReactNode; size?: 'md' | 'lg' | 'xl';
}) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  const widths = { md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' };
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-6">
      <div className="anim-fade absolute inset-0 bg-petrol-950/55 backdrop-blur-[2px]" onClick={onClose} />
      <div className={`anim-scale-in relative flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-surface shadow-pop sm:rounded-2xl ${widths[size]}`}>
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <h2 className="font-display text-lg font-bold tracking-tight text-ink">{title}</h2>
            {sub && <p className="mt-0.5 text-[12px] font-medium text-muted">{sub}</p>}
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted transition hover:bg-paper hover:text-ink" aria-label="Chiudi"><Icon name="x" /></button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <footer className="flex items-center justify-end gap-2 border-t border-line px-5 py-3.5">{footer}</footer>}
      </div>
    </div>
  );
}

/* ================= vario ================= */

export function Avatar({ name, color, size = 34 }: { name: string; color?: string; size?: number }) {
  const initials = name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  return (
    <span className="flex shrink-0 items-center justify-center rounded-full font-display font-bold text-white"
      style={{ width: size, height: size, fontSize: size * 0.36, background: color ?? '#10424c' }}>
      {initials}
    </span>
  );
}

export function SearchBox({ value, onChange, placeholder, autoFocus }: { value: string; onChange: (v: string) => void; placeholder?: string; autoFocus?: boolean }) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-faint"><Icon name="search" size={15} /></span>
      <input value={value} autoFocus={autoFocus} onChange={(e) => onChange(e.target.value)} placeholder={placeholder ?? 'Cerca…'}
        className="w-full rounded-lg border border-line bg-white py-2 pl-9 pr-8 text-[13px] font-semibold text-ink outline-none transition placeholder:font-medium placeholder:text-faint focus:border-brand focus:ring-2 focus:ring-brand/15" />
      {value && (
        <button onClick={() => onChange('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-faint hover:text-ink"><Icon name="x" size={14} /></button>
      )}
    </div>
  );
}

export function EmptyState({ icon = 'documenti', title, sub, action }: { icon?: string; title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="anim-fade flex flex-col items-center justify-center gap-2 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-petrol-100/70 text-petrol-700"><Icon name={icon} size={22} /></span>
      <p className="font-display text-[15px] font-bold text-ink">{title}</p>
      {sub && <p className="max-w-sm text-[12.5px] font-medium text-muted">{sub}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Toasts({ items }: { items: { id: string; msg: string; kind: string }[] }) {
  const kindCls = { ok: 'border-ok/30 text-ok', warn: 'border-warn/40 text-[#a4660d]', danger: 'border-danger/40 text-danger', info: 'border-info/40 text-info' } as Record<string, string>;
  const kindIcon = { ok: 'check', warn: 'alert', danger: 'alert', info: 'info' } as Record<string, string>;
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[90] flex w-80 flex-col gap-2">
      {items.map((t) => (
        <div key={t.id} className={`anim-slide-left pointer-events-auto flex items-center gap-2.5 rounded-2xl border bg-surface px-3.5 py-2.5 shadow-pop ${kindCls[t.kind]}`}>
          <Icon name={kindIcon[t.kind]} size={16} />
          <p className="flex-1 text-[12.5px] font-bold text-ink">{t.msg}</p>
        </div>
      ))}
    </div>
  );
}

export function useCountUp(target: number, duration = 1000): number {
  const [v, setV] = useState(0);
  const raf = useRef(0);
  useEffect(() => {
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      setV(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);
  return v;
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded border border-line bg-paper px-1.5 py-0.5 text-[10px] font-bold text-muted">{children}</kbd>;
}

export function Th({ children, className = '' }: { children?: ReactNode; className?: string }) {
  return <th className={`whitespace-nowrap px-3 py-2.5 text-left text-[10.5px] font-extrabold uppercase tracking-[0.1em] text-muted ${className}`}>{children}</th>;
}
export function Td({ children, className = '' }: { children?: ReactNode; className?: string }) {
  return <td className={`px-3 py-2.5 align-middle text-[13px] font-semibold text-soft ${className}`}>{children}</td>;
}
