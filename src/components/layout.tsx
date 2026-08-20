import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useApp, attentionItems, quoteCode, fmtEURk, quoteTotals, dueLabel, daysSince } from '../store';
import type { View } from '../types';
import { Avatar, Icon, Kbd, Pill } from './ui';

export const ROLE_LABEL: Record<string, string> = {
  admin: 'Amministratore', direzione: 'Direzione', commerciale: 'Commerciale',
  operativo: 'Responsabile operativo', amministrazione: 'Amministrazione',
};

interface NavItem { view: View | null; label: string; icon: string; phase?: string }
const NAV: { group: string; items: NavItem[] }[] = [
  { group: 'Principale', items: [{ view: 'dashboard', label: 'Dashboard', icon: 'dashboard' }] },
  {
    group: 'Anagrafiche', items: [
      { view: 'clienti', label: 'Clienti', icon: 'clienti' },
      { view: 'referenti', label: 'Referenti', icon: 'referenti' },
      { view: 'cantieri', label: 'Cantieri', icon: 'cantieri' },
    ],
  },
  {
    group: 'CRM', items: [
      { view: 'commerciale', label: 'Commerciale', icon: 'commerciale' },
      { view: 'preventivi', label: 'Preventivi', icon: 'preventivi' },
      { view: 'contratti', label: 'Contratti', icon: 'contratti' },
      { view: 'servizi', label: 'Servizi', icon: 'servizi' },
    ],
  },
  {
    group: 'Operatività', items: [
      { view: 'scadenze', label: 'Scadenze', icon: 'scadenze' },
      { view: 'attivita', label: 'Attività', icon: 'attivita' },
    ],
  },
  {
    group: 'Amministrazione', items: [
      { view: 'fatture', label: 'Fatturazione', icon: 'documenti' },
    ],
  },
  {
    group: 'Roadmap', items: [
      { view: null, label: 'Sopralluoghi', icon: 'sopralluoghi', phase: 'F2' },
      { view: null, label: 'Documenti', icon: 'documenti', phase: 'F2' },
      { view: null, label: 'Analisi', icon: 'analisi', phase: 'F2' },
    ],
  },
  {
    group: 'Sistema', items: [
      { view: 'admin', label: 'Amministrazione', icon: 'amministrazione' },
    ],
  }
];

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      </div>
      {!compact && (
        <span className="font-bold text-xl tracking-tight text-slate-900">
          Prime CRM
        </span>
      )}
    </div>
  );
}

/* ================= ricerca globale ================= */

function GlobalSearch() {
  const { db, navigate, toast } = useApp();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); ref.current?.focus(); }
      if (e.key === 'Escape') setOpen(false);
    };
    const click = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); };
    window.addEventListener('keydown', h);
    window.addEventListener('mousedown', click);
    return () => { window.removeEventListener('keydown', h); window.removeEventListener('mousedown', click); };
  }, []);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (s.length < 2) return null;
    const has = (...fields: (string | null | undefined)[]) => fields.some((f) => f?.toLowerCase().includes(s));
    const cust = (id: string | null) => db.customers.find((c) => c.id === id)?.nomeCommerciale ?? '';
    return {
      clienti: db.customers.filter((c) => has(c.ragioneSociale, c.nomeCommerciale, c.piva, c.citta)).slice(0, 5),
      referenti: db.contacts.filter((r) => has(`${r.nome} ${r.cognome}`, r.ruolo, r.email)).slice(0, 5),
      cantieri: db.worksites.filter((w) => has(w.denominazione, w.codice, w.citta)).slice(0, 5),
      contratti: db.contracts.filter((k) => has(k.numero, k.oggetto, cust(k.customerId))).slice(0, 5),
      preventivi: db.quotes.filter((p) => has(quoteCode(p), p.oggetto, cust(p.customerId))).slice(0, 5),
      opportunita: db.opportunities.filter((o) => has(o.titolo, o.servizio, cust(o.customerId))).slice(0, 5),
      attivita: db.activities.filter((a) => has(a.titolo, a.responsabile)).slice(0, 5),
      documenti: db.docs.filter((d) => has(d.nome, d.categoria)).slice(0, 5),
    };
  }, [q, db]);

  const total = results ? Object.values(results).reduce((s, l) => s + l.length, 0) : 0;

  const go = (view: View, params?: { id?: string; tab?: string }) => { navigate(view, params); setOpen(false); setQ(''); };

  const Group = ({ label, icon, items, render }: { label: string; icon: string; items: unknown[]; render: (it: never) => ReactNode }) => {
    if (!items.length) return null;
    return (
      <div>
        <div className="px-3 pb-1 pt-2.5 text-[9.5px] font-extrabold uppercase tracking-[0.16em] text-muted">{label}</div>
        {(items as never[]).map((it, i) => render(it as never) && (
          <div key={i}>{render(it as never)}</div>
        ))}
      </div>
    );
  };

  const Row = ({ icon, title, sub, onClick }: { icon: string; title: string; sub?: string; onClick: () => void }) => (
    <button onClick={onClick} className="flex w-full items-center gap-2.5 px-3 py-1.5 text-left transition hover:bg-brand-soft/60">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-paper text-petrol-700"><Icon name={icon} size={14} /></span>
      <span className="min-w-0">
        <span className="block truncate text-[12.5px] font-bold text-ink">{title}</span>
        {sub && <span className="block truncate text-[11px] font-medium text-muted">{sub}</span>}
      </span>
    </button>
  );

  return (
    <div ref={boxRef} className="relative w-full max-w-xl">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-faint"><Icon name="search" size={15} /></span>
      <input ref={ref} value={q} placeholder="Cerca clienti, cantieri, contratti, preventivi…"
        onFocus={() => setOpen(true)} onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        className="w-full rounded-2xl border border-line bg-white py-2 pl-9 pr-16 text-[13px] font-semibold text-ink shadow-sm outline-none transition placeholder:font-medium placeholder:text-faint focus:border-brand focus:ring-2 focus:ring-brand/15" />
      <span className="absolute right-3 top-1/2 hidden -translate-y-1/2 sm:block"><Kbd>Ctrl K</Kbd></span>

      {open && results && (
        <div className="anim-scale-in absolute left-0 right-0 top-full z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-2xl border border-line bg-surface py-1 shadow-pop">
          {total === 0 && <p className="px-4 py-5 text-center text-[12.5px] font-semibold text-muted">Nessun risultato per «{q}»</p>}
          <Group label="Clienti" icon="clienti" items={results.clienti} render={(c: never) => {
            const cc = c as (typeof results.clienti)[number];
            return <Row icon="clienti" title={cc.ragioneSociale} sub={`${cc.citta} · ${cc.settore}`} onClick={() => go('cliente', { id: cc.id })} />;
          }} />
          <Group label="Referenti" icon="referenti" items={results.referenti} render={(r: never) => {
            const rr = r as (typeof results.referenti)[number];
            return <Row icon="referenti" title={`${rr.nome} ${rr.cognome}`} sub={`${rr.ruolo} · ${db.customers.find((c) => c.id === rr.customerId)?.nomeCommerciale}`} onClick={() => go('cliente', { id: rr.customerId, tab: 'referenti' })} />;
          }} />
          <Group label="Cantieri" icon="cantieri" items={results.cantieri} render={(w: never) => {
            const ww = w as (typeof results.cantieri)[number];
            return <Row icon="cantieri" title={`${ww.codice} · ${ww.denominazione}`} sub={ww.citta} onClick={() => go('cantieri', { id: ww.id })} />;
          }} />
          <Group label="Contratti" icon="contratti" items={results.contratti} render={(k: never) => {
            const kk = k as (typeof results.contratti)[number];
            return <Row icon="contratti" title={kk.numero} sub={kk.oggetto} onClick={() => go('contratti', { id: kk.id })} />;
          }} />
          <Group label="Preventivi" icon="preventivi" items={results.preventivi} render={(p: never) => {
            const pp = p as (typeof results.preventivi)[number];
            return <Row icon="preventivi" title={quoteCode(pp)} sub={pp.oggetto} onClick={() => go('preventivi', { id: pp.id })} />;
          }} />
          <Group label="Opportunità" icon="commerciale" items={results.opportunita} render={(o: never) => {
            const oo = o as (typeof results.opportunita)[number];
            return <Row icon="commerciale" title={oo.titolo} sub={`${db.customers.find((c) => c.id === oo.customerId)?.nomeCommerciale} · ${fmtEURk(oo.valore)}`} onClick={() => go('commerciale', { id: oo.id })} />;
          }} />
          <Group label="Attività" icon="attivita" items={results.attivita} render={(a: never) => {
            const aa = a as (typeof results.attivita)[number];
            return <Row icon="attivita" title={aa.titolo} sub={aa.responsabile} onClick={() => go('attivita', { id: aa.id })} />;
          }} />
          <Group label="Documenti" icon="documenti" items={results.documenti} render={(d: never) => {
            const dd = d as (typeof results.documenti)[number];
            return <Row icon="documenti" title={dd.nome} sub={`${dd.categoria}${dd.scadenza ? ` · scade ${dueLabel(dd.scadenza)}` : ''}`} onClick={() => { toast(`Documento: ${dd.nome} (archivio completo nella Fase 2)`, 'info'); setOpen(false); setQ(''); }} />;
          }} />
        </div>
      )}
    </div>
  );
}

/* ================= notifiche ================= */

function Bell() {
  const { db, navigate } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const items = useMemo(() => attentionItems(db), [db]);
  const critical = items.filter((i) => i.severity !== 'info').length;

  useEffect(() => {
    const click = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    window.addEventListener('mousedown', click);
    return () => window.removeEventListener('mousedown', click);
  }, []);

  const sevDot = { danger: 'bg-danger', warn: 'bg-warn', info: 'bg-info' } as const;

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} className="relative rounded-2xl border border-line bg-white p-2.5 text-soft shadow-sm transition hover:border-brand hover:text-brand" aria-label="Notifiche">
        <Icon name="bell" size={17} />
        {critical > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-extrabold text-white">{critical}</span>
        )}
      </button>
      {open && (
        <div className="anim-scale-in absolute right-0 top-full z-50 mt-2 w-[380px] max-w-[calc(100vw-2rem)] rounded-2xl border border-line bg-surface shadow-pop">
          <header className="flex items-center justify-between border-b border-line px-4 py-3">
            <h4 className="font-display text-[14px] font-bold text-ink">Notifiche interne</h4>
            <Pill tone="red">{critical} critiche</Pill>
          </header>
          <div className="max-h-[60vh] overflow-y-auto py-1">
            {items.length === 0 && <p className="px-4 py-6 text-center text-[12.5px] font-semibold text-muted">Tutto sotto controllo ✓</p>}
            {items.slice(0, 12).map((it) => (
              <button key={it.id} onClick={() => { navigate(it.view, it.params); setOpen(false); }}
                className="flex w-full items-start gap-2.5 px-4 py-2.5 text-left transition hover:bg-brand-soft/50">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${sevDot[it.severity]} ${it.severity === 'danger' ? 'animate-pulse' : ''}`} />
                <span className="min-w-0">
                  <span className="block text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted">{it.kind}</span>
                  <span className="block truncate text-[12.5px] font-bold text-ink">{it.text}</span>
                </span>
                <span className="ml-auto mt-1 text-faint"><Icon name="chevR" size={14} /></span>
              </button>
            ))}
          </div>
          <footer className="border-t border-line px-4 py-2 text-[10.5px] font-semibold text-muted">
            Canale email e push: predisposto — Fase 3
          </footer>
        </div>
      )}
    </div>
  );
}

/* ================= layout ================= */

const TITLES: Record<View, { title: string; sub: string }> = {
  dashboard: { title: 'Dashboard direzionale', sub: 'Visione d’insieme di vendite, contratti e operatività' },
  clienti: { title: 'Anagrafica clienti', sub: 'Prospect, clienti attivi, sospesi e cessati' },
  cliente: { title: 'Scheda cliente', sub: 'Referenti, sedi, cantieri, contratti e dati economici' },
  referenti: { title: 'Referenti', sub: 'Persone di contatto presso i clienti' },
  cantieri: { title: 'Sedi e cantieri', sub: 'Cantieri operativi, valori e marginalità' },
  commerciale: { title: 'Pipeline commerciale', sub: 'Opportunità per fase — vista Kanban' },
  preventivi: { title: 'Preventivi', sub: 'Offerte, stati e conversione in contratto' },
  contratti: { title: 'Contratti', sub: 'Scadenze, rinnovi e termini di disdetta' },
  servizi: { title: 'Catalogo servizi', sub: 'Tariffe e costi interni configurabili' },
  scadenze: { title: 'Scadenzario', sub: 'Tutte le scadenze in un unico calendario' },
  attivita: { title: 'Attività e follow-up', sub: 'Telefonate, email, riunioni e promemoria' },
  admin: { title: 'Pannello di controllo', sub: 'Impostazioni globali, log di sicurezza e utenti' },
  fatture: { title: 'Fatturazione', sub: 'Gestione fatture attive e passive' },
};

export function Layout({ children }: { children: ReactNode }) {
  const { route, navigate, session, logout, toast, resetDemo } = useApp();
  const [mobileNav, setMobileNav] = useState(false);

  useEffect(() => { setMobileNav(false); }, [route]);

  const SidebarContent = (
    <>
      <div className="px-6 pb-4 pt-6"><Logo /></div>
      <nav className="dark-scroll flex-1 overflow-y-auto px-4 pb-4 mt-4">
        {NAV.map((g) => {
          if (g.group === 'Sistema' && session?.ruolo !== 'admin') return null;
          const visibleItems = g.items.filter(it => !(it.view && session?.disabledModules?.includes(it.view as View)));
          if (visibleItems.length === 0) return null;
          return (
          <div key={g.group} className="mb-6 space-y-1">
            <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">{g.group}</div>
            {visibleItems.map((it) => {
              const active = it.view !== null && (route.view === it.view || (it.view === 'clienti' && route.view === 'cliente'));
              if (it.view === null) {
                return (
                  <button key={it.label} onClick={() => toast(`«${it.label}» è pianificato nella ${it.phase === 'F2' ? 'Fase 2' : 'Fase 3'} della roadmap`, 'info')}
                    className="group flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium text-slate-400 transition hover:bg-slate-50">
                    <Icon name={it.icon} size={18} />
                    <span className="flex-1">{it.label}</span>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-extrabold tracking-wide text-slate-400">{it.phase}</span>
                  </button>
                );
              }
              return (
                <button key={it.label} onClick={() => navigate(it.view as View)}
                  className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm transition-all ${active ? 'bg-indigo-50 font-semibold text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}>
                  {active ? <div className="h-1.5 w-1.5 rounded-full bg-indigo-600" /> : null}
                  <Icon name={it.icon} size={18} />
                  {it.label}
                </button>
              );
            })}
          </div>
        )})}
      </nav>
      <div className="border-t border-slate-100 p-6">
        <button onClick={resetDemo} className="mb-4 flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold text-slate-400 transition hover:bg-slate-50 hover:text-slate-600">
          <Icon name="refresh" size={14} /> Ripristina dati demo
        </button>
        {session && (
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 overflow-hidden rounded-full border-2 border-white bg-slate-200">
              <div className="h-full w-full bg-gradient-to-tr from-slate-400 to-slate-200"></div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-800">{session.nome}</p>
              <p className="truncate text-xs font-medium text-slate-500">{ROLE_LABEL[session.ruolo]}</p>
            </div>
            <button onClick={logout} title="Esci" className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"><Icon name="logout" size={16} /></button>
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen font-sans text-slate-800 bg-[#F1F5F9] overflow-hidden w-full">
      {/* sidebar desktop */}
      <aside className="hidden h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">{SidebarContent}</aside>

      {/* sidebar mobile */}
      {mobileNav && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div className="anim-fade absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setMobileNav(false)} />
          <aside className="anim-fade absolute left-0 top-0 flex h-full w-64 flex-col bg-white border-r border-slate-200 shadow-xl">{SidebarContent}</aside>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white/80 px-8 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <button className="rounded-lg border border-slate-200 p-2 text-slate-500 lg:hidden" onClick={() => setMobileNav(true)} aria-label="Menu"><Icon name="menu" size={18} /></button>
            <div className="hidden min-w-0 md:block">
              <h2 className="font-bold text-lg text-slate-800">{TITLES[route.view].title}</h2>
              <p className="truncate text-[11px] font-medium text-slate-500">{TITLES[route.view].sub}</p>
            </div>
          </div>
          
          <div className="flex flex-1 justify-end px-4 max-w-sm"><GlobalSearch /></div>
          
          <div className="flex items-center gap-4">
             <Bell />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
