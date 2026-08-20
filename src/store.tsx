import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { DB, ID, Quote, Route, Toast, User, Worksite, Contract } from './types';
import { buildDemoDB, DEMO_USERS } from './data/demo';

/* ===================== helpers ===================== */

export const uid = () => Math.random().toString(36).slice(2, 10);
export const todayISO = () => new Date().toISOString().slice(0, 10);

export function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
export function addMonths(isoDate: string, months: number): string {
  const d = new Date(isoDate + 'T00:00:00');
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}
export function daysUntil(isoDate: string): number {
  const today = new Date(todayISO() + 'T00:00:00').getTime();
  const target = new Date(isoDate + 'T00:00:00').getTime();
  return Math.round((target - today) / 86400000);
}
export function daysSince(isoDate: string): number {
  return -daysUntil(isoDate);
}

const EUR = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
export const fmtEUR = (n: number) => EUR.format(Math.round(n));
export function fmtEURk(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toLocaleString('it-IT', { maximumFractionDigits: 2 })} M€`;
  if (abs >= 1000) return `${(n / 1000).toLocaleString('it-IT', { maximumFractionDigits: 1 })} k€`;
  return `${Math.round(n).toLocaleString('it-IT')} €`;
}
const DATEF = new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
const DATES = new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit' });
export const fmtDate = (isoDate: string) => (isoDate ? DATEF.format(new Date(isoDate + 'T00:00:00')) : '—');
export const fmtDateS = (isoDate: string) => (isoDate ? DATES.format(new Date(isoDate + 'T00:00:00')) : '—');

/** "oggi" | "domani" | "tra Ng" | "scaduta da Ng" */
export function dueLabel(isoDate: string): string {
  const d = daysUntil(isoDate);
  if (d === 0) return 'oggi';
  if (d === 1) return 'domani';
  if (d > 1) return `tra ${d} gg`;
  return `in ritardo di ${-d} gg`;
}

/* ===================== calcoli di business ===================== */

export function quoteTotals(q: Quote) {
  const imponibile = q.righe.reduce((s, r) => s + r.quantita * r.prezzoUnitario, 0);
  const costo = q.righe.reduce((s, r) => s + (r.costoStimato || 0), 0);
  const iva = (imponibile * q.iva) / 100;
  const margine = imponibile - costo;
  return { imponibile, costo, iva, totale: imponibile + iva, margine, marginePct: imponibile ? (margine / imponibile) * 100 : 0 };
}
export const quoteCode = (q: Quote) => `PRV-${q.anno}-${String(q.numero).padStart(3, '0')}`;
export function quoteExpiry(q: Quote): string {
  return addDays(q.data, q.validitaGiorni);
}
/** stato effettivo: un preventivo inviato/visualizzato/trattativa oltre la validità risulta scaduto */
export function quoteEffectiveStatus(q: Quote): Quote['stato'] {
  if (['inviato', 'visualizzato', 'trattativa'].includes(q.stato) && daysUntil(quoteExpiry(q)) < 0) return 'scaduto';
  return q.stato;
}
export const contractLastNotice = (scadenza: string, disdettaMesi: number) => addMonths(scadenza, -disdettaMesi);
export const worksiteMarginPct = (w: Worksite) => (w.valoreMensile ? ((w.valoreMensile - w.costoPrevisto) / w.valoreMensile) * 100 : 0);

/* ===================== "Richiede attenzione" ===================== */

export interface AttentionItem {
  id: string;
  severity: 'danger' | 'warn' | 'info';
  kind: string;
  text: string;
  view: Route['view'];
  params?: { id?: ID; tab?: string };
}

export function attentionItems(db: DB): AttentionItem[] {
  const out: AttentionItem[] = [];
  db.contracts.filter((k) => k.stato === 'attivo').forEach((k) => {
    const cust = db.customers.find((c) => c.id === k.customerId);
    const name = cust?.nomeCommerciale ?? '';
    const dScad = daysUntil(k.scadenza);
    const dDisd = daysUntil(contractLastNotice(k.scadenza, k.disdettaMesi));
    if (dDisd <= 30 && dDisd >= -30)
      out.push({ id: `kd-${k.id}`, severity: dDisd < 0 ? 'danger' : 'warn', kind: 'Disdetta', text: `${k.numero} ${name}: termine disdetta ${dDisd < 0 ? `superato da ${-dDisd} gg` : dueLabel(k.scadenza).replace('tra', 'tra')}`, view: 'contratti', params: { id: k.id } });
    if (dScad >= 0 && dScad <= 90)
      out.push({ id: `ks-${k.id}`, severity: dScad <= 45 ? 'danger' : 'warn', kind: 'Contratto', text: `${k.numero} ${name} scade ${dueLabel(k.scadenza)} (${fmtEUR(k.importoAnnuale)}/anno)`, view: 'contratti', params: { id: k.id } });
  });
  db.quotes.forEach((q) => {
    const es = quoteEffectiveStatus(q);
    const cust = db.customers.find((c) => c.id === q.customerId);
    if (es === 'inviato' || es === 'visualizzato' || es === 'trattativa') {
      const left = daysUntil(quoteExpiry(q));
      out.push({ id: `qw-${q.id}`, severity: left <= 7 ? 'warn' : 'info', kind: 'Preventivo', text: `${quoteCode(q)} ${cust?.nomeCommerciale}: senza risposta, validità ${left >= 0 ? dueLabel(quoteExpiry(q)) : 'scaduta'} · ${fmtEUR(quoteTotals(q).totale)}`, view: 'preventivi', params: { id: q.id } });
    } else if (es === 'scaduto') {
      out.push({ id: `qe-${q.id}`, severity: 'warn', kind: 'Preventivo', text: `${quoteCode(q)} ${cust?.nomeCommerciale} scaduto senza riscontro · ${fmtEUR(quoteTotals(q).totale)}`, view: 'preventivi', params: { id: q.id } });
    }
  });
  const ACTIVE_STAGES = ['lead', 'primo_contatto', 'sopralluogo', 'elaborazione', 'inviato', 'negoziazione', 'attesa'];
  db.opportunities.filter((o) => ACTIVE_STAGES.includes(o.fase) && daysSince(o.lastActivity) > 30).forEach((o) => {
    const cust = db.customers.find((c) => c.id === o.customerId);
    out.push({ id: `of-${o.id}`, severity: daysSince(o.lastActivity) > 40 ? 'warn' : 'info', kind: 'Opportunità ferma', text: `“${o.titolo}” ${cust?.nomeCommerciale}: ferma da ${daysSince(o.lastActivity)} gg · ${fmtEUR(o.valore)}`, view: 'commerciale', params: { id: o.id } });
  });
  db.customers.filter((c) => c.stato === 'attivo' && daysSince(c.lastContact) > 90).forEach((c) => {
    out.push({ id: `cc-${c.id}`, severity: daysSince(c.lastContact) > 120 ? 'warn' : 'info', kind: 'Cliente silente', text: `${c.nomeCommerciale}: nessun contatto da ${daysSince(c.lastContact)} giorni`, view: 'cliente', params: { id: c.id } });
  });
  db.activities.filter((a) => a.stato !== 'completata' && daysUntil(a.scadenza) < 0).forEach((a) => {
    out.push({ id: `aa-${a.id}`, severity: 'danger', kind: 'Attività scaduta', text: `${a.titolo} (${a.responsabile}) — ${dueLabel(a.scadenza)}`, view: 'attivita', params: { id: a.id } });
  });
  db.docs.filter((d) => d.scadenza && daysUntil(d.scadenza) <= 60).forEach((d) => {
    out.push({ id: `dd-${d.id}`, severity: daysUntil(d.scadenza as string) <= 30 ? 'warn' : 'info', kind: 'Documento', text: `${d.nome} ${dueLabel(d.scadenza as string)}`, view: 'clienti' });
  });
  db.worksites.filter((w) => w.stato === 'attivo' && worksiteMarginPct(w) < 10).forEach((w) => {
    const cust = db.customers.find((c) => c.id === w.customerId);
    out.push({ id: `wm-${w.id}`, severity: 'danger', kind: 'Marginalità', text: `${w.codice} ${cust?.nomeCommerciale}: margine previsto ${worksiteMarginPct(w).toFixed(1)}% sotto soglia (10%)`, view: 'cantieri', params: { id: w.id } });
  });
  const rank = { danger: 0, warn: 1, info: 2 } as const;
  return out.sort((a, b) => rank[a.severity] - rank[b.severity]);
}

export const canEconomics = (u: User | null) => !!u && ['admin', 'direzione', 'amministrazione'].includes(u.ruolo);

/* ===================== store ===================== */

type CollKey = 'customers' | 'contacts' | 'sites' | 'worksites' | 'services' | 'opportunities' | 'quotes' | 'contracts' | 'activities' | 'deadlines' | 'docs' | 'users' | 'invoices';

interface AppState {
  db: DB;
  session: User | null;
  route: Route;
  toasts: Toast[];
  alertDays: number;
}
interface AppApi extends AppState {
  users: User[];
  login: (userId: ID) => void;
  logout: () => void;
  navigate: (view: Route['view'], params?: { id?: ID; tab?: string }) => void;
  toast: (msg: string, kind?: Toast['kind']) => void;
  save: (coll: CollKey, item: { id: ID } & Record<string, unknown>, auditMsg: string) => void;
  remove: (coll: CollKey, id: ID, auditMsg: string) => void;
  setQuoteStatus: (id: ID, stato: Quote['stato']) => void;
  convertQuote: (id: ID) => ID | null;
  setAlertDays: (n: number) => void;
  resetDemo: () => void;
}

const LS_KEY = 'prime-crm-mvp-v3';
const Ctx = createContext<AppApi | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DB>(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { db: DB; session: string | null };
        if (parsed.db) {
          if (parsed.db.version === 5) return parsed.db;
          if (parsed.db.version === 4) return { ...parsed.db, version: 5, invoices: [] };
          if (parsed.db.version === 3) return { ...parsed.db, version: 5, users: DEMO_USERS, invoices: [] };
        }
      }
    } catch { /* dati demo */ }
    return buildDemoDB();
  });
  const [session, setSession] = useState<User | null>(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { session: string | null, db?: DB };
        const users = parsed.db?.users ?? DEMO_USERS;
        return users.find((u) => u.id === parsed.session) ?? null;
      }
    } catch { /* nessuna sessione */ }
    return null;
  });
  const [route, setRoute] = useState<Route>({ view: 'dashboard' });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [alertDays, setAlertDays] = useState(90);
  const sessionRef = useRef(session);
  sessionRef.current = session;

  useEffect(() => {
    const t = setTimeout(() => {
      try { localStorage.setItem(LS_KEY, JSON.stringify({ db, session: session?.id ?? null })); } catch { /* storage pieno */ }
    }, 250);
    return () => clearTimeout(t);
  }, [db, session]);

  const toast = useCallback((msg: string, kind: Toast['kind'] = 'ok') => {
    const id = uid();
    setToasts((ts) => [...ts, { id, msg, kind }]);
    setTimeout(() => setToasts((ts) => ts.filter((t) => t.id !== id)), 4200);
  }, []);

  const pushAudit = useCallback((azione: string, oggetto: string) => {
    setDb((d) => ({ ...d, audit: [{ id: uid(), at: new Date().toISOString(), utente: sessionRef.current?.nome ?? 'Sistema', azione, oggetto }, ...d.audit].slice(0, 60) }));
  }, []);

  const navigate = useCallback((view: Route['view'], params?: { id?: ID; tab?: string }) => {
    setRoute({ view, ...params });
    window.scrollTo({ top: 0 });
  }, []);

  const save = useCallback((coll: CollKey, item: { id: ID } & Record<string, unknown>, auditMsg: string) => {
    setDb((d) => {
      const list = d[coll] as unknown as Array<{ id: ID } & Record<string, unknown>>;
      const exists = list.some((x) => x.id === item.id);
      const next = exists ? list.map((x) => (x.id === item.id ? { ...x, ...item } : x)) : [item, ...list];
      return { ...d, [coll]: next };
    });
    pushAudit(...(auditMsg.split('§') as [string, string] ?? ['Ha salvato', 'record']));
    toast('Salvato con successo');
  }, [pushAudit, toast]);

  const remove = useCallback((coll: CollKey, id: ID, auditMsg: string) => {
    setDb((d) => ({ ...d, [coll]: (d[coll] as Array<{ id: ID }>).filter((x) => x.id !== id) }));
    pushAudit(...(auditMsg.split('§') as [string, string]));
    toast('Record eliminato', 'info');
  }, [pushAudit, toast]);

  const setQuoteStatus = useCallback((id: ID, stato: Quote['stato']) => {
    setDb((d) => ({ ...d, quotes: d.quotes.map((q) => (q.id === id ? { ...q, stato } : q)) }));
    const q = db.quotes.find((x) => x.id === id);
    if (q) pushAudit('Ha aggiornato', `Stato ${quoteCode(q)} → ${stato}`);
    toast(`Preventivo ${q ? quoteCode(q) : ''} → ${stato}`);
  }, [db.quotes, pushAudit, toast]);

  const convertQuote = useCallback((id: ID): ID | null => {
    const q = db.quotes.find((x) => x.id === id);
    if (!q) return null;
    const t = quoteTotals(q);
    const cust = db.customers.find((c) => c.id === q.customerId);
    const year = new Date().getFullYear();
    // eventuale nuovo cantiere derivato dal preventivo
    let worksiteId = q.worksiteId;
    let newWorksite: Worksite | null = null;
    if (!worksiteId) {
      const maxN = db.worksites.reduce((m, w) => Math.max(m, parseInt(w.codice.split('-')[2] ?? '0', 10) || 0), 0);
      const monthly = q.righe.some((r) => r.um === 'mesi') ? Math.round(t.imponibile / Math.max(1, q.righe.find((r) => r.um === 'mesi')?.quantita ?? 12)) : Math.round(t.imponibile / 12);
      newWorksite = {
        id: uid(), codice: `CT-${year}-${String(maxN + 1).padStart(3, '0')}`, customerId: q.customerId,
        denominazione: q.oggetto, indirizzo: cust ? `${cust.indirizzo}, ${cust.citta} (${cust.provincia})` : '', citta: cust?.citta ?? '', provincia: cust?.provincia ?? '',
        coordinate: '', referente: '', responsabile: sessionRef.current?.nome ?? 'Giulia Conti', apertura: todayISO(), chiusuraPrevista: '',
        stato: 'pianificato', servizio: q.righe[0]?.servizio ?? 'Altri servizi', frequenza: 'Da pianificare', orePreviste: 0, addetti: 0,
        valoreMensile: monthly, valoreAnnuale: monthly * 12, costoPrevisto: Math.round((t.costo / 12) || monthly * 0.7), note: `Generato dal preventivo ${quoteCode(q)}.`,
      };
      worksiteId = newWorksite.id;
    }
    const maxK = db.contracts.reduce((m, k) => Math.max(m, parseInt(k.numero.split('-')[2] ?? '0', 10) || 0), 0);
    const contract: Contract = {
      id: uid(), numero: `CTR-${year}-${String(maxK + 1).padStart(3, '0')}`, customerId: q.customerId, worksiteId,
      oggetto: q.oggetto, firma: todayISO(), inizio: todayISO(), scadenza: addMonths(todayISO(), 12), rinnovoAutomatico: true, disdettaMesi: 3,
      importoMensile: Math.round(t.imponibile / 12), importoAnnuale: Math.round(t.imponibile), fatturazione: 'mensile',
      indicizzazione: true, adeguamentoIstat: true, adeguamentoCcnl: true, responsabile: sessionRef.current?.nome ?? 'Giulia Conti',
      note: `Generato dal preventivo ${quoteCode(q)} (${cust?.nomeCommerciale ?? ''}).`, stato: 'attivo',
    };
    setDb((d) => ({
      ...d,
      worksites: newWorksite ? [newWorksite, ...d.worksites] : d.worksites,
      contracts: [contract, ...d.contracts],
      quotes: d.quotes.map((x) => (x.id === id ? { ...x, stato: 'accettato' as const, convertedContractId: contract.id } : x)),
    }));
    pushAudit('Ha convertito', `Preventivo ${quoteCode(q)} → Contratto ${contract.numero}`);
    toast(`Contratto ${contract.numero} creato dal preventivo`);
    return contract.id;
  }, [db, pushAudit, toast]);

  const login = useCallback((userId: ID) => {
    const u = db.users.find((x) => x.id === userId) ?? null;
    setSession(u);
    setRoute({ view: 'dashboard' });
    if (u) pushAudit('Accesso effettuato', `${u.nome} (${u.ruolo})`);
  }, [db.users, pushAudit]);

  const logout = useCallback(() => {
    if (sessionRef.current) pushAudit('Sessione terminata', sessionRef.current.nome);
    setSession(null);
  }, [pushAudit]);

  const resetDemo = useCallback(() => {
    localStorage.removeItem(LS_KEY);
    setDb(buildDemoDB());
    setRoute({ view: 'dashboard' });
    toast('Dati DEMO ripristinati', 'info');
  }, [toast]);

  const api = useMemo<AppApi>(() => ({
    db, session, route, toasts, alertDays, users: db.users,
    login, logout, navigate, toast, save, remove, setQuoteStatus, convertQuote, setAlertDays, resetDemo,
  }), [db, session, route, toasts, alertDays, login, logout, navigate, toast, save, remove, setQuoteStatus, convertQuote, resetDemo]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useApp(): AppApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp fuori dal provider');
  return ctx;
}
