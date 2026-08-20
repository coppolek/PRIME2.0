import { useMemo, useState, useEffect } from 'react';
import {
  useApp, attentionItems, canEconomics, daysUntil, dueLabel,
  fmtDate, fmtEUR, fmtEURk, quoteEffectiveStatus, quoteTotals,
} from '../store';
import { AreaChart, Donut, FunnelBars, HBars, PALETTE, SERIES, VBars } from '../components/charts';
import { Btn, Icon, Pill, useCountUp } from '../components/ui';
import { STAGES } from '../components/ui';

const monthShort = (mk: string) => new Intl.DateTimeFormat('it-IT', { month: 'short' }).format(new Date(mk + '-02T00:00:00')).replace('.', '');
const timeAgo = (isoDt: string) => {
  const mins = Math.max(1, Math.round((Date.now() - new Date(isoDt).getTime()) / 60000));
  if (mins < 60) return `${mins} min fa`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h} h fa`;
  return `${Math.round(h / 24)} g fa`;
};

export function Dashboard() {
  const { db, session, navigate, save, alertDays } = useApp();
  const econ = canEconomics(session);

  const [timeFilter, setTimeFilter] = useState<'mese' | 'trimestre' | 'anno'>('anno');

  const [personalNotes, setPersonalNotes] = useState(() => {
    try {
      return localStorage.getItem('prime-crm-notes') || '';
    } catch {
      return '';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('prime-crm-notes', personalNotes);
    } catch {}
  }, [personalNotes]);

  const tf = useMemo(() => {
    const now = new Date();
    const y = String(now.getFullYear());
    const mIndex = now.getMonth();
    const m = y + '-' + String(mIndex + 1).padStart(2, '0');
    const q = Math.floor(mIndex / 3);

    const checkMatch = (isoDt: string, yearStr: string) => {
      if (!isoDt) return false;
      if (timeFilter === 'anno') return isoDt.startsWith(yearStr);
      if (timeFilter === 'mese') return isoDt.startsWith(yearStr + '-' + String(mIndex + 1).padStart(2, '0'));
      if (timeFilter === 'trimestre') {
        if (!isoDt.startsWith(yearStr)) return false;
        const mm = parseInt(isoDt.substring(5, 7), 10) - 1;
        return Math.floor(mm / 3) === q;
      }
      return true;
    };

    return {
      isMatch: (isoDt: string) => checkMatch(isoDt, y),
      isPrevMatch: (isoDt: string) => checkMatch(isoDt, String(now.getFullYear() - 1))
    };
  }, [timeFilter]);

  const k = useMemo(() => {
    const year = String(new Date().getFullYear());
    const month = year + '-' + String(new Date().getMonth() + 1).padStart(2, '0');
    
    const ledger = db.ledger;
    const revTotal = ledger.reduce((s, l) => s + l.ricavo, 0);
    const revMonth = ledger.filter((l) => l.mese === month).reduce((s, l) => s + l.ricavo, 0);
    
    const ledgerPeriod = ledger.filter((l) => tf.isMatch(l.mese));
    const revPeriod = ledgerPeriod.reduce((s, l) => s + l.ricavo, 0);
    const costPeriod = ledgerPeriod.reduce((s, l) => s + l.costo, 0);
    const avgMargin = revPeriod ? ((revPeriod - costPeriod) / revPeriod) * 100 : 0;
    const revPrevPeriod = ledger.filter((l) => tf.isPrevMatch(l.mese)).reduce((s, l) => s + l.ricavo, 0);

    const contractsActive = db.contracts.filter((c) => c.stato === 'attivo');
    const contractValue = contractsActive.reduce((s, c) => s + c.importoAnnuale, 0);
    const contractsExpiring = contractsActive.filter((c) => { const d = daysUntil(c.scadenza); return d >= 0 && d <= alertDays; });

    const openOpps = db.opportunities.filter((o) => !['acquisito', 'perso'].includes(o.fase));
    const oppWeighted = openOpps.reduce((s, o) => s + (o.valore * o.probabilita) / 100, 0);

    const pendingQuotes = db.quotes.filter((q) => ['inviato', 'visualizzato', 'trattativa'].includes(quoteEffectiveStatus(q)));
    const wonQuotes = db.quotes.filter((q) => q.stato === 'accettato');
    const lostQuotes = db.quotes.filter((q) => ['rifiutato', 'scaduto'].includes(quoteEffectiveStatus(q)));
    const wonValue = wonQuotes.reduce((s, q) => s + quoteTotals(q).totale, 0);
    const lostValue = lostQuotes.reduce((s, q) => s + quoteTotals(q).totale, 0);

    const openActs = db.activities.filter((a) => a.stato !== 'completata');
    const credit = db.customers.filter((c) => c.stato === 'attivo').reduce((s, c) => s + c.creditExposure, 0);

    return {
      revTotal, revPeriod, revMonth, revPrevPeriod,
      customersActive: db.customers.filter((c) => c.stato === 'attivo').length,
      worksitesActive: db.worksites.filter((w) => w.stato === 'attivo').length,
      contractValue, contractsExpiring: contractsExpiring.length,
      oppCount: openOpps.length, oppWeighted,
      pendingQuotes: pendingQuotes.length, wonValue, lostValue,
      openActs: openActs.length, avgMargin, credit,
    };
  }, [db, alertDays, tf]);

  const heroValue = useCountUp(k.revPeriod);

  const charts = useMemo(() => {
    const year = new Date().getFullYear();
    const months: string[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(year, new Date().getMonth() - i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    const monthly = months.map((m) => db.ledger.filter((l) => l.mese === m).reduce((s, l) => s + l.ricavo, 0));

    const ledgerF = db.ledger.filter(l => tf.isMatch(l.mese));

    const byCustomer = db.customers
      .map((c) => ({ label: c.nomeCommerciale, value: ledgerF.filter((l) => l.customerId === c.id).reduce((s, l) => s + l.ricavo, 0) }))
      .filter((x) => x.value > 0).sort((a, b) => b.value - a.value).slice(0, 6);

    const byServiceRaw = new Map<string, number>();
    ledgerF.forEach((l) => byServiceRaw.set(l.servizio, (byServiceRaw.get(l.servizio) ?? 0) + l.ricavo));
    const byService = [...byServiceRaw.entries()].sort((a, b) => b[1] - a[1]);
    const topServices = byService.slice(0, 5).map(([label, value], i) => ({ label, value, color: SERIES[i] }));
    const otherVal = byService.slice(5).reduce((s, [, v]) => s + v, 0);
    if (otherVal > 0) topServices.push({ label: 'Altro', value: otherVal, color: '#9db4b7' });

    const byRegionRaw = new Map<string, number>();
    ledgerF.forEach((l) => byRegionRaw.set(l.regione, (byRegionRaw.get(l.regione) ?? 0) + l.ricavo));
    const byRegion = [...byRegionRaw.entries()].sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }));

    const byStage = STAGES.map((s) => {
      const opps = db.opportunities.filter((o) => o.fase === s.key);
      return { label: s.label, value: opps.reduce((sum, o) => sum + (o.valore * o.probabilita) / 100, 0), color: s.color, count: opps.length };
    }).filter((s) => s.count > 0);

    const qAcc = db.quotes.filter((q) => q.stato === 'accettato' && tf.isMatch(q.data));
    const qLost = db.quotes.filter((q) => (['rifiutato'].includes(q.stato) || quoteEffectiveStatus(q) === 'scaduto') && tf.isMatch(q.data));
    const qOpen = db.quotes.filter((q) => ['inviato', 'visualizzato', 'trattativa', 'bozza'].includes(quoteEffectiveStatus(q)) && tf.isMatch(q.data));
    const qv = (list: typeof db.quotes) => list.reduce((s, q) => s + quoteTotals(q).totale, 0);
    const quoteMix = [
      { label: 'Accettati', value: qv(qAcc), color: PALETTE.lime },
      { label: 'Aperti', value: qv(qOpen), color: PALETTE.blue },
      { label: 'Persi / scaduti', value: qv(qLost), color: PALETTE.red },
    ];

    const marginByCustomer = db.customers
      .map((c) => {
        const ls = ledgerF.filter((l) => l.customerId === c.id);
        const r = ls.reduce((s, l) => s + l.ricavo, 0);
        const co = ls.reduce((s, l) => s + l.costo, 0);
        return { label: c.nomeCommerciale, value: r ? +(((r - co) / r) * 100).toFixed(1) : 0, rev: r };
      })
      .filter((x) => x.rev > 0).sort((a, b) => b.value - a.value);

    const marginBySite = db.worksites
      .filter((w) => ['attivo', 'pianificato'].includes(w.stato) && w.valoreMensile > 0)
      .map((w) => ({ label: w.codice.replace('CT-', ''), value: +(((w.valoreMensile - w.costoPrevisto) / w.valoreMensile) * 100).toFixed(1) }));

    return { months, monthly, byCustomer, topServices, byRegion, byStage, quoteMix, marginByCustomer, marginBySite };
  }, [db, tf]);

  const attention = useMemo(() => attentionItems(db), [db]);
  const nextActions = useMemo(
    () => db.activities.filter((a) => a.stato !== 'completata').sort((a, b) => a.scadenza.localeCompare(b.scadenza)).slice(0, 6),
    [db.activities],
  );

  const sevStyle = {
    danger: { dot: 'bg-danger', cls: 'border-danger/25 bg-danger-soft/60 hover:border-danger/50' },
    warn: { dot: 'bg-warn', cls: 'border-warn/25 bg-warn-soft/60 hover:border-warn/50' },
    info: { dot: 'bg-info', cls: 'border-info/25 bg-info-soft/60 hover:border-info/50' },
  } as const;

  const hour = new Date().getHours();
  const greet = hour < 13 ? 'Buongiorno' : hour < 18 ? 'Buon pomeriggio' : 'Buonasera';
  const today = new Intl.DateTimeFormat('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());

  const miniKpis = [
    { icon: 'euro', label: 'Fatturato totale', value: fmtEURk(k.revTotal), to: null },
    { icon: 'trend', label: 'Fatturato mese', value: fmtEURk(k.revMonth), to: null },
    { icon: 'clienti', label: 'Clienti attivi', value: String(k.customersActive), to: 'clienti' as const },
    { icon: 'cantieri', label: 'Cantieri attivi', value: String(k.worksitesActive), to: 'cantieri' as const },
    { icon: 'commerciale', label: 'Opportunità aperte', value: `${k.oppCount} · ${fmtEURk(k.oppWeighted)} pond.`, to: 'commerciale' as const },
    { icon: 'preventivi', label: 'Preventivi in attesa', value: String(k.pendingQuotes), to: 'preventivi' as const },
    { icon: 'check', label: 'Prev. acquisiti', value: fmtEURk(k.wonValue), to: 'preventivi' as const },
    { icon: 'x', label: 'Prev. persi / scaduti', value: fmtEURk(k.lostValue), to: 'preventivi' as const },
    { icon: 'contratti', label: `Contratti in scadenza (${alertDays}g)`, value: String(k.contractsExpiring), to: 'contratti' as const },
    { icon: 'attivita', label: 'Attività da completare', value: String(k.openActs), to: 'attivita' as const },
    { icon: 'alert', label: 'Crediti da attenzionare', value: fmtEURk(k.credit), to: null, hint: 'Integrazione amministrativa — Fase 2' },
  ];

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      {/* intestazione e filtri */}
      <div className="anim-fade-up flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11.5px] font-extrabold uppercase tracking-[0.16em] text-brand">{today}</p>
            <h2 className="mt-1 font-display text-[26px] font-extrabold tracking-tight text-ink">
              {greet}, {session?.nome.split(' ')[0]} <span className="text-muted">· {session && (session.ruolo === 'commerciale' ? 'area commerciale' : 'visione direzionale')}</span>
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <Btn variant="ghost" icon="commerciale" onClick={() => navigate('commerciale')}>Pipeline</Btn>
            <Btn variant="ghost" icon="preventivi" onClick={() => navigate('preventivi')}>Preventivi</Btn>
            <Btn icon="plus" onClick={() => navigate('clienti')}>Nuovo cliente</Btn>
          </div>
        </div>

        {/* Filtro Temporale */}
        <div className="flex bg-slate-100 p-1 rounded-lg w-fit shadow-sm border border-slate-200">
          <button 
            className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${timeFilter === 'mese' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`} 
            onClick={() => setTimeFilter('mese')}
          >
            Mese attuale
          </button>
          <button 
            className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${timeFilter === 'trimestre' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`} 
            onClick={() => setTimeFilter('trimestre')}
          >
            Trimestre
          </button>
          <button 
            className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${timeFilter === 'anno' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-500 hover:text-slate-700'}`} 
            onClick={() => setTimeFilter('anno')}
          >
            Anno
          </button>
        </div>
      </div>

      {/* KPI hero */}
      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr_1fr]">
        <section className="anim-fade-up relative overflow-hidden rounded-2xl bg-indigo-600 p-5 text-white shadow-lg shadow-indigo-100" style={{ animationDelay: '40ms' }}>
          <p className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-white/70">
            {timeFilter === 'mese' ? 'Fatturato mese corrente' : timeFilter === 'trimestre' ? 'Fatturato trimestre corrente' : 'Fatturato anno corrente'}
          </p>
          <p className="num mt-2 font-display text-[42px] font-extrabold leading-none tracking-tight">{fmtEUR(heroValue)}</p>
          <div className="mt-3 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold text-white backdrop-blur-sm">
              <Icon name="trend" size={12} /> {k.revPrevPeriod > 0 ? `${(((k.revPeriod - k.revPrevPeriod) / k.revPrevPeriod) * 100).toFixed(1)}% vs prec.` : 'nuovo storico'}
            </span>
            <span className="text-[11.5px] font-semibold text-white/70">storico ultimi 12 mesi nel grafico</span>
          </div>
          <div className="pointer-events-none absolute -right-8 -top-10 opacity-20"><Icon name="sparkle" size={120} className="text-white" /></div>
        </section>

        <section className="anim-fade-up rounded-2xl border border-line bg-surface p-5 shadow-card" style={{ animationDelay: '90ms' }}>
          <p className="text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-muted">Valore contratti attivi</p>
          <p className="num mt-2 font-display text-[34px] font-extrabold leading-none tracking-tight text-ink">{fmtEURk(k.contractValue)}<span className="text-[15px] text-muted"> /anno</span></p>
          <div className="mt-3 flex items-center gap-2">
            <Pill tone={k.contractsExpiring > 0 ? 'amber' : 'green'}>{k.contractsExpiring} in scadenza</Pill>
            <button onClick={() => navigate('contratti')} className="text-[11.5px] font-bold text-brand underline-offset-2 hover:underline">gestisci →</button>
          </div>
        </section>

        <section className="anim-fade-up rounded-2xl border border-line bg-surface p-5 shadow-card" style={{ animationDelay: '140ms' }}>
          <p className="flex items-center justify-between text-[10.5px] font-extrabold uppercase tracking-[0.18em] text-muted">
            Margine medio anno {econ ? <Pill tone={k.avgMargin >= 25 ? 'green' : 'amber'} dot={false}>{k.avgMargin.toFixed(1)}%</Pill> : <Icon name="lock" size={14} className="text-faint" />}
          </p>
          {econ ? (
            <>
              <p className="num mt-2 font-display text-[34px] font-extrabold leading-none tracking-tight text-ink">{k.avgMargin.toFixed(1)}%</p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-paper">
                <div className="h-full rounded-full bg-brand transition-all duration-1000" style={{ width: `${Math.min(100, k.avgMargin * 2)}%` }} />
              </div>
              <p className="mt-2 text-[11.5px] font-semibold text-muted">target di gruppo ≥ 25%</p>
            </>
          ) : (
            <p className="mt-3 flex items-center gap-2 text-[12.5px] font-semibold text-muted"><Icon name="lock" size={15} />Dato riservato a direzione e amministrazione</p>
          )}
        </section>
      </div>

      {/* KPI secondari */}
      <div className="anim-fade-up grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6" style={{ animationDelay: '180ms' }}>
        {miniKpis.map((m) => (
          <button key={m.label} onClick={() => m.to && navigate(m.to)} title={m.hint}
            className={`group rounded-2xl border border-line bg-surface p-3 text-left shadow-card transition-all duration-150 hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-pop ${m.to ? 'cursor-pointer' : 'cursor-default'}`}>
            <span className="flex items-center justify-between text-faint transition group-hover:text-brand">
              <Icon name={m.icon} size={16} />
              {m.to && <Icon name="arrowUR" size={13} className="opacity-0 transition group-hover:opacity-100" />}
            </span>
            <p className="num mt-2 truncate text-[15px] font-extrabold text-ink">{m.value}</p>
            <p className="truncate text-[10.5px] font-bold text-muted">{m.label}</p>
          </button>
        ))}
      </div>

      {/* grafici + attenzione */}
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <section className="anim-fade-up rounded-2xl border border-line bg-surface p-4 shadow-card" style={{ animationDelay: '220ms' }}>
            <header className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="font-display text-[15px] font-bold tracking-tight text-ink">Andamento fatturato mensile</h3>
                <p className="text-[11.5px] font-medium text-muted">ultimi 12 mesi · tutte le linee di servizio</p>
              </div>
              <Pill tone="teal" dot={false}>{fmtEURk(charts.monthly.reduce((a, b) => a + b, 0))}</Pill>
            </header>
            <AreaChart data={charts.monthly} labels={charts.months.map(monthShort)} fmt={fmtEURk} />
          </section>

          <div className="grid gap-4 md:grid-cols-2">
            <section className="anim-fade-up rounded-2xl border border-line bg-surface p-4 shadow-card" style={{ animationDelay: '260ms' }}>
              <h3 className="font-display text-[15px] font-bold tracking-tight text-ink">Fatturato per cliente</h3>
              <p className="mb-3 text-[11.5px] font-medium text-muted">storico 12 mesi · top 6</p>
              <HBars items={charts.byCustomer} fmt={fmtEURk} />
            </section>

            <section className="anim-fade-up rounded-2xl border border-line bg-surface p-4 shadow-card" style={{ animationDelay: '300ms' }}>
              <h3 className="font-display text-[15px] font-bold tracking-tight text-ink">Fatturato per tipologia di servizio</h3>
              <p className="mb-3 text-[11.5px] font-medium text-muted">composizione del portafoglio</p>
              <Donut items={charts.topServices} fmt={fmtEURk} centerLabel="totale" centerValue={fmtEURk(charts.topServices.reduce((s, i) => s + i.value, 0))} />
            </section>

            <section className="anim-fade-up rounded-2xl border border-line bg-surface p-4 shadow-card" style={{ animationDelay: '340ms' }}>
              <h3 className="font-display text-[15px] font-bold tracking-tight text-ink">Fatturato per area geografica</h3>
              <p className="mb-3 text-[11.5px] font-medium text-muted">presidio territoriale</p>
              <VBars items={charts.byRegion} fmt={fmtEURk} colorFor={(_, i) => SERIES[i % SERIES.length]} />
            </section>

            <section className="anim-fade-up rounded-2xl border border-line bg-surface p-4 shadow-card" style={{ animationDelay: '380ms' }}>
              <h3 className="font-display text-[15px] font-bold tracking-tight text-ink">Opportunità per fase</h3>
              <p className="mb-3 text-[11.5px] font-medium text-muted">valore ponderato (valore × probabilità)</p>
              <FunnelBars items={charts.byStage} fmt={fmtEURk} />
            </section>

            <section className="anim-fade-up rounded-2xl border border-line bg-surface p-4 shadow-card" style={{ animationDelay: '420ms' }}>
              <h3 className="font-display text-[15px] font-bold tracking-tight text-ink">Preventivi — esito</h3>
              <p className="mb-3 text-[11.5px] font-medium text-muted">valore complessivo per stato</p>
              <Donut items={charts.quoteMix} fmt={fmtEURk} centerLabel="in attesa" centerValue={String(k.pendingQuotes)} />
            </section>

            {econ ? (
              <>
                <section className="anim-fade-up rounded-2xl border border-line bg-surface p-4 shadow-card" style={{ animationDelay: '460ms' }}>
                  <h3 className="font-display text-[15px] font-bold tracking-tight text-ink">Marginalità per cliente</h3>
                  <p className="mb-3 text-[11.5px] font-medium text-muted">margine % su storico 12 mesi</p>
                  <HBars items={charts.marginByCustomer.map((m) => ({ label: m.label, value: m.value }))} fmt={(v) => `${v.toFixed(1)}%`}
                    colorFor={(v) => (v < 10 ? PALETTE.red : v < 20 ? PALETTE.amber : PALETTE.brand)} />
                </section>
                <section className="anim-fade-up rounded-2xl border border-line bg-surface p-4 shadow-card" style={{ animationDelay: '500ms' }}>
                  <h3 className="font-display text-[15px] font-bold tracking-tight text-ink">Marginalità per cantiere</h3>
                  <p className="mb-2 text-[11.5px] font-medium text-muted">previsione mensile · soglia minima 10%</p>
                  <VBars items={charts.marginBySite} fmt={(v) => `${v.toFixed(1)}%`} colorFor={(v) => (v < 10 ? PALETTE.red : v < 20 ? PALETTE.amber : PALETTE.brand)} />
                </section>
              </>
            ) : (
              <section className="anim-fade-up flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line bg-surface/60 p-8 text-center" style={{ animationDelay: '460ms' }}>
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-paper text-faint"><Icon name="lock" size={20} /></span>
                <p className="font-display text-[14px] font-bold text-ink">Analisi di marginalità riservata</p>
                <p className="max-w-xs text-[12px] font-semibold text-muted">L’accesso ai dati economici è limitato ai ruoli Direzione, Amministrazione e Amministratore (permessi configurabili).</p>
              </section>
            )}
          </div>
        </div>

        {/* colonna destra */}
        <div className="space-y-4">
          <section className="anim-fade-up rounded-2xl border border-line bg-surface shadow-card" style={{ animationDelay: '260ms' }}>
            <header className="flex items-center justify-between border-b border-line/70 px-4 py-3">
              <h3 className="flex items-center gap-2 font-display text-[15px] font-bold tracking-tight text-ink">
                <span className="text-danger"><Icon name="alert" size={16} /></span>Richiede attenzione
              </h3>
              <Pill tone="red">{attention.length}</Pill>
            </header>
            <div className="max-h-[430px] space-y-2 overflow-y-auto p-3">
              {attention.length === 0 && <p className="py-6 text-center text-[12.5px] font-semibold text-muted">Nessuna criticità rilevata</p>}
              {attention.map((it) => (
                <button key={it.id} onClick={() => navigate(it.view, it.params)}
                  className={`flex w-full items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-all duration-150 hover:-translate-y-px ${sevStyle[it.severity].cls}`}>
                  <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${sevStyle[it.severity].dot} ${it.severity === 'danger' ? 'animate-pulse' : ''}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[9.5px] font-extrabold uppercase tracking-[0.14em] text-muted">{it.kind}</span>
                    <span className="mt-0.5 block text-[12px] font-bold leading-snug text-ink">{it.text}</span>
                  </span>
                  <Icon name="chevR" size={14} className="mt-2 shrink-0 text-faint" />
                </button>
              ))}
            </div>
          </section>

          <section className="anim-fade-up rounded-2xl border border-line bg-surface shadow-card" style={{ animationDelay: '320ms' }}>
            <header className="flex items-center justify-between border-b border-line/70 px-4 py-3">
              <h3 className="font-display text-[15px] font-bold tracking-tight text-ink">Prossime azioni</h3>
              <button onClick={() => navigate('attivita')} className="text-[11.5px] font-bold text-brand hover:underline">tutte →</button>
            </header>
            <div className="divide-y divide-line/60">
              {nextActions.map((a) => {
                const late = daysUntil(a.scadenza) < 0;
                return (
                  <div key={a.id} className="flex items-center gap-3 px-4 py-2.5 transition hover:bg-paper/60">
                    <button
                      onClick={() => save('activities', { ...a, stato: 'completata' } as never, `Ha completato§Attività “${a.titolo}”`)}
                      title="Segna come completata"
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 border-line text-transparent transition hover:border-ok hover:bg-ok-soft hover:text-ok">
                      <Icon name="check" size={12} />
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-bold text-ink">{a.titolo}</p>
                      <p className="text-[10.5px] font-semibold text-muted">{a.responsabile} · {db.customers.find((c) => c.id === a.customerId)?.nomeCommerciale ?? 'interno'}</p>
                    </div>
                    <Pill tone={late ? 'red' : daysUntil(a.scadenza) <= 3 ? 'amber' : 'gray'} dot={false}>{dueLabel(a.scadenza)}</Pill>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="anim-fade-up rounded-2xl border border-line bg-surface shadow-card" style={{ animationDelay: '350ms' }}>
            <header className="flex items-center gap-2 border-b border-line/70 px-4 py-3">
              <span className="text-amber-500"><Icon name="documenti" size={16} /></span>
              <h3 className="font-display text-[15px] font-bold tracking-tight text-ink">Note personali</h3>
            </header>
            <div className="p-3">
              <textarea
                value={personalNotes}
                onChange={(e) => setPersonalNotes(e.target.value)}
                placeholder="Scrivi qui i tuoi appunti veloci..."
                className="w-full resize-y rounded-xl border border-line bg-paper/50 p-3 text-[13px] text-ink placeholder-muted transition-colors focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/30 min-h-[120px]"
              />
            </div>
          </section>

          <section className="anim-fade-up rounded-2xl border border-line bg-surface shadow-card" style={{ animationDelay: '380ms' }}>
            <header className="flex items-center justify-between border-b border-line/70 px-4 py-3">
              <h3 className="flex items-center gap-2 font-display text-[15px] font-bold tracking-tight text-ink">
                <span className="text-petrol-700"><Icon name="history" size={15} /></span>Registro attività
              </h3>
              <Pill tone="petrol" dot={false}>audit</Pill>
            </header>
            <div className="divide-y divide-line/60">
              {db.audit.slice(0, 6).map((e) => (
                <div key={e.id} className="px-4 py-2.5">
                  <p className="text-[12px] font-bold text-ink"><span className="text-brand">{e.utente}</span> {e.azione.toLowerCase()} <span className="text-soft">{e.oggetto}</span></p>
                  <p className="text-[10.5px] font-semibold text-muted">{timeAgo(e.at)}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* scadenze rapide */}
      <section className="anim-fade-up rounded-2xl border border-line bg-surface shadow-card" style={{ animationDelay: '520ms' }}>
        <header className="flex items-center justify-between border-b border-line/70 px-4 py-3">
          <h3 className="font-display text-[15px] font-bold tracking-tight text-ink">
            {timeFilter === 'mese' ? 'Scadenze mese corrente' : timeFilter === 'trimestre' ? 'Scadenze trimestre corrente' : 'Scadenze anno corrente'}
          </h3>
          <button onClick={() => navigate('scadenze')} className="text-[11.5px] font-bold text-brand hover:underline">scadenzario →</button>
        </header>
        <div className="grid gap-2 p-3 sm:grid-cols-2 xl:grid-cols-4">
          {db.deadlines
            .filter((d) => d.stato === 'aperta' && tf.isMatch(d.data))
            .sort((a, b) => a.data.localeCompare(b.data))
            .map((d) => (
              <button key={d.id} onClick={() => navigate('scadenze')} className="rounded-lg border border-line bg-paper/50 p-3 text-left transition hover:-translate-y-0.5 hover:border-brand/40 hover:bg-white hover:shadow-card">
                <div className="flex items-center justify-between">
                  <Pill tone={d.priorita === 'alta' ? 'red' : d.priorita === 'media' ? 'amber' : 'gray'} dot={false}>{d.categoria}</Pill>
                  <span className="num text-[11px] font-extrabold text-brand">{fmtDate(d.data)}</span>
                </div>
                <p className="mt-2 line-clamp-2 text-[12px] font-bold leading-snug text-ink">{d.titolo}</p>
                <p className="mt-1 text-[10.5px] font-semibold text-muted">{dueLabel(d.data)} · {db.customers.find((c) => c.id === d.customerId)?.nomeCommerciale ?? 'azienda'}</p>
              </button>
            ))}
        </div>
      </section>

      {/* nota predisposizioni */}
      <div className="anim-fade-up grid gap-3 sm:grid-cols-3" style={{ animationDelay: '560ms' }}>
        {[
          ['sparkle', 'Assistente AI', 'Predisposto: query in linguaggio naturale su contratti, preventivi e marginalità (Fase 3).'],
          ['mail', 'Notifiche email', 'Predisposto: invio automatico per scadenze, follow-up e disdette (Fase 3).'],
          ['download', 'Export & stampa', 'Preventivi e contratti stampabili in PDF; export Excel/CSV in Fase 2.'],
        ].map(([ic, t, s]) => (
          <div key={t} className="flex items-start gap-3 rounded-2xl border border-dashed border-line bg-surface/70 p-3.5">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-petrol-100/70 text-petrol-700"><Icon name={ic} size={16} /></span>
            <div>
              <p className="text-[12.5px] font-extrabold text-ink">{t}</p>
              <p className="text-[11.5px] font-medium leading-snug text-muted">{s}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
