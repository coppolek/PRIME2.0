import { useMemo, useState } from 'react';
import {
  useApp, canEconomics, daysSince, daysUntil, fmtDate, fmtEUR, fmtEURk, quoteCode, quoteEffectiveStatus,
  quoteTotals, todayISO, uid, worksiteMarginPct,
} from '../store';
import type { Customer } from '../types';
import { Btn, Card, EmptyState, FormGrid, Icon, Modal, Pill, SearchBox, StatusPill, Td, Th, stageMeta } from '../components/ui';
import type { FieldDef } from '../components/ui';
import { PALETTE } from '../components/charts';
import { ContactFormModal } from './Contacts';
import { WorksiteFormModal } from './Cantieri';
import { ActivityFormModal } from './Activities';

const REGIONI = ['Emilia-Romagna', 'Veneto', 'Lombardia', 'Toscana', 'Marche', 'Piemonte', 'Liguria', 'Friuli-Venezia Giulia', 'Trentino-Alto Adige', 'Lazio'];
const SETTORI = ['Alimentare', 'Sanitario', 'Logistica', 'Fieristico', 'GDO / Retail', 'Metalmeccanico', 'Hotellerie', 'Bancario', 'Pubblico', 'Altro'];

export const customerFields = (commerciali: string[]): FieldDef[] => [
  { key: 'ragioneSociale', label: 'Ragione sociale', required: true, span: 2, placeholder: 'Es. Golfera S.p.A.' },
  { key: 'nomeCommerciale', label: 'Nome commerciale', required: true, placeholder: 'Es. Golfera' },
  { key: 'stato', label: 'Stato cliente', type: 'select', options: ['prospect', 'attivo', 'sospeso', 'cessato'], required: true },
  { key: 'piva', label: 'Partita IVA' }, { key: 'cf', label: 'Codice fiscale' },
  { key: 'sdi', label: 'Codice SDI' }, { key: 'pec', label: 'PEC' },
  { key: 'indirizzo', label: 'Indirizzo sede legale', span: 2 },
  { key: 'citta', label: 'Città' }, { key: 'provincia', label: 'Provincia', placeholder: 'RA' },
  { key: 'cap', label: 'CAP' }, { key: 'regione', label: 'Regione', type: 'select', options: REGIONI },
  { key: 'telefono', label: 'Telefono' }, { key: 'email', label: 'Email' },
  { key: 'sito', label: 'Sito web' }, { key: 'settore', label: 'Settore', type: 'select', options: SETTORI },
  { key: 'tipologia', label: 'Tipologia cliente', placeholder: 'Es. Industria' },
  { key: 'commerciale', label: 'Responsabile commerciale', type: 'select', options: commerciali },
  { key: 'acquisizione', label: 'Data acquisizione', type: 'date' },
  { key: 'creditExposure', label: 'Esposizione creditizia (campo ammin.)', type: 'money' },
  { key: 'note', label: 'Note', type: 'textarea', span: 2 },
];

export function CustomerFormModal({ open, onClose, initial }: { open: boolean; onClose: () => void; initial: Customer | null }) {
  const { save, users } = useApp();
  const [v, setV] = useState<Record<string, unknown>>({});
  const [ready, setReady] = useState(false);
  if (open && !ready) {
    setV(initial ? { ...initial } : { stato: 'prospect', acquisizione: todayISO(), commerciale: users[2]?.nome ?? '', regione: 'Emilia-Romagna', creditExposure: 0 });
    setReady(true);
  }
  if (!open && ready) setReady(false);
  const submit = () => {
    if (!v.ragioneSociale || !v.nomeCommerciale) return;
    const base = { ragioneSociale: '', nomeCommerciale: '', piva: '', cf: '', sdi: '', pec: '', indirizzo: '', citta: '', provincia: '', cap: '', telefono: '', email: '', sito: '', settore: '', tipologia: '', note: '', lastContact: todayISO(), createdAt: todayISO(), ...v } as unknown as Customer;
    save('customers', { ...base, id: initial?.id ?? uid(), updatedAt: todayISO() } as never, `${initial ? 'Ha aggiornato' : 'Ha creato'}§Cliente “${v.nomeCommerciale}”`);
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title={initial ? 'Modifica cliente' : 'Nuovo cliente'} sub="Anagrafica completa — campi fiscali pronti per fatturazione elettronica" size="xl"
      footer={<><Btn variant="ghost" onClick={onClose}>Annulla</Btn><Btn icon="check" onClick={submit} disabled={!v.ragioneSociale || !v.nomeCommerciale}>{initial ? 'Salva modifiche' : 'Crea cliente'}</Btn></>}>
      <FormGrid fields={customerFields(users.map((u) => u.nome))} values={v} onChange={(k, val) => setV((s) => ({ ...s, [k]: val }))} />
    </Modal>
  );
}

/* ================= lista ================= */

function CustomerList() {
  const { db, navigate } = useApp();
  const [q, setQ] = useState('');
  const [stato, setStato] = useState('tutti');
  const [modal, setModal] = useState<{ open: boolean; edit: Customer | null }>({ open: false, edit: null });

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return db.customers.filter((c) =>
      (stato === 'tutti' || c.stato === stato) &&
      (!s || [c.ragioneSociale, c.nomeCommerciale, c.citta, c.settore, c.piva].some((f) => f.toLowerCase().includes(s)))
    );
  }, [db.customers, q, stato]);

  const counts = (st: string) => db.customers.filter((c) => st === 'tutti' || c.stato === st).length;

  return (
    <div className="mx-auto max-w-[1400px] space-y-4">
      <div className="anim-fade-up flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {['tutti', 'prospect', 'attivo', 'sospeso', 'cessato'].map((s) => (
            <button key={s} onClick={() => setStato(s)}
              className={`rounded-full px-3 py-1.5 text-[12px] font-extrabold capitalize transition ${stato === s ? 'bg-petrol-900 text-white shadow-sm' : 'bg-surface text-muted border border-line hover:border-brand hover:text-brand'}`}>
              {s} <span className="num ml-1 opacity-60">{counts(s)}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="w-60"><SearchBox value={q} onChange={setQ} placeholder="Cerca cliente, città, P.IVA…" /></div>
          <Btn icon="plus" onClick={() => setModal({ open: true, edit: null })}>Nuovo cliente</Btn>
        </div>
      </div>

      <Card pad={false} className="anim-fade-up" delay={60}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse">
            <thead className="border-b border-line bg-paper/60">
              <tr><Th>Cliente</Th><Th>Città</Th><Th>Settore</Th><Th>Stato</Th><Th>Commerciale</Th><Th className="text-right">Cantieri</Th><Th className="text-right">Contratti /anno</Th><Th>Ultimo contatto</Th><Th /></tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {filtered.map((c) => {
                const ws = db.worksites.filter((w) => w.customerId === c.id && w.stato === 'attivo').length;
                const kv = db.contracts.filter((k) => k.customerId === c.id && k.stato === 'attivo').reduce((s, k) => s + k.importoAnnuale, 0);
                const silent = daysSince(c.lastContact) > 90;
                return (
                  <tr key={c.id} onClick={() => navigate('cliente', { id: c.id })} className="group cursor-pointer transition hover:bg-brand-soft/40">
                    <Td>
                      <p className="font-extrabold text-ink group-hover:text-brand">{c.ragioneSociale}</p>
                      <p className="text-[11px] font-semibold text-muted">{c.nomeCommerciale} · {c.piva}</p>
                    </Td>
                    <Td>{c.citta} <span className="text-muted">({c.provincia})</span></Td>
                    <Td>{c.settore || '—'}</Td>
                    <Td><StatusPill status={c.stato} /></Td>
                    <Td>{c.commerciale || '—'}</Td>
                    <Td className="num text-right font-extrabold text-ink">{ws}</Td>
                    <Td className="num text-right font-extrabold text-ink">{kv ? fmtEURk(kv) : '—'}</Td>
                    <Td>
                      <Pill tone={silent ? 'amber' : 'green'} dot={false}>{silent ? `${daysSince(c.lastContact)} gg fa` : fmtDate(c.lastContact)}</Pill>
                    </Td>
                    <Td><Icon name="chevR" size={15} className="text-faint transition group-hover:translate-x-0.5 group-hover:text-brand" /></Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <EmptyState icon="clienti" title="Nessun cliente trovato" sub="Modifica i filtri o crea un nuovo cliente." action={<Btn icon="plus" onClick={() => setModal({ open: true, edit: null })}>Nuovo cliente</Btn>} />}
      </Card>

      <CustomerFormModal open={modal.open} initial={modal.edit} onClose={() => setModal({ open: false, edit: null })} />
    </div>
  );
}

/* ================= scheda dettaglio ================= */

const TABS = [
  { key: 'overview', label: 'Overview', icon: 'info' },
  { key: 'referenti', label: 'Referenti', icon: 'referenti' },
  { key: 'sedi', label: 'Sedi', icon: 'building' },
  { key: 'cantieri', label: 'Cantieri', icon: 'cantieri' },
  { key: 'opportunita', label: 'Opportunità', icon: 'commerciale' },
  { key: 'preventivi', label: 'Preventivi', icon: 'preventivi' },
  { key: 'contratti', label: 'Contratti', icon: 'contratti' },
  { key: 'attivita', label: 'Attività', icon: 'attivita' },
  { key: 'documenti', label: 'Documenti', icon: 'documenti' },
  { key: 'economici', label: 'Dati economici', icon: 'euro' },
];

function CustomerDetail({ id }: { id: string }) {
  const { db, route, navigate, save, remove, session } = useApp();
  const tab = route.tab ?? 'overview';
  const c = db.customers.find((x) => x.id === id);
  const [editOpen, setEditOpen] = useState(false);
  const [contactModal, setContactModal] = useState<{ open: boolean; editId: string | null }>({ open: false, editId: null });
  const [wsModal, setWsModal] = useState(false);
  const [actModal, setActModal] = useState(false);
  const [siteModal, setSiteModal] = useState<{ open: boolean; v: Record<string, unknown> }>({ open: false, v: {} });

  if (!c) return <EmptyState icon="clienti" title="Cliente non trovato" action={<Btn onClick={() => navigate('clienti')}>Torna all’elenco</Btn>} />;

  const contacts = db.contacts.filter((r) => r.customerId === c.id);
  const sites = db.sites.filter((s) => s.customerId === c.id);
  const worksites = db.worksites.filter((w) => w.customerId === c.id);
  const opps = db.opportunities.filter((o) => o.customerId === c.id);
  const quotes = db.quotes.filter((q) => q.customerId === c.id);
  const contracts = db.contracts.filter((k) => k.customerId === c.id);
  const acts = db.activities.filter((a) => a.customerId === c.id);
  const docs = db.docs.filter((d) => d.customerId === c.id);
  const econ = canEconomics(session);
  const ledger = db.ledger.filter((l) => l.customerId === c.id);

  const Info = ({ icon, label, value }: { icon: string; label: string; value: string }) => (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 text-brand"><Icon name={icon} size={15} /></span>
      <div className="min-w-0"><p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted">{label}</p><p className="truncate text-[13px] font-bold text-ink">{value || '—'}</p></div>
    </div>
  );

  return (
    <div className="mx-auto max-w-[1400px] space-y-4">
      {/* header scheda */}
      <div className="anim-fade-up flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('clienti')} className="rounded-lg border border-line bg-surface p-2 text-muted transition hover:border-brand hover:text-brand"><Icon name="chevL" size={16} /></button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-[22px] font-extrabold tracking-tight text-ink">{c.ragioneSociale}</h2>
              <StatusPill status={c.stato} />
            </div>
            <p className="text-[12.5px] font-semibold text-muted">{c.nomeCommerciale} · {c.settore} · {c.citta} ({c.provincia}) · cliente dal {fmtDate(c.acquisizione)}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Btn variant="ghost" icon="edit" onClick={() => setEditOpen(true)}>Modifica</Btn>
          <Btn variant="ghost" icon="attivita" onClick={() => setActModal(true)}>Nuova attività</Btn>
          <Btn icon="preventivi" onClick={() => navigate('preventivi')}>Nuovo preventivo</Btn>
        </div>
      </div>

      {/* stats rapide */}
      <div className="anim-fade-up grid grid-cols-2 gap-3 lg:grid-cols-4" style={{ animationDelay: '60ms' }}>
        {[
          ['cantieri', 'Cantieri attivi', String(worksites.filter((w) => w.stato === 'attivo').length)],
          ['contratti', 'Valore contratti', fmtEURk(contracts.filter((k) => k.stato === 'attivo').reduce((s, k) => s + k.importoAnnuale, 0))],
          ['commerciale', 'Pipeline ponderata', fmtEURk(opps.filter((o) => !['acquisito', 'perso'].includes(o.fase)).reduce((s, o) => s + (o.valore * o.probabilita) / 100, 0))],
          ['clock', 'Ultimo contatto', `${daysSince(c.lastContact)} gg fa`],
        ].map(([ic, l, v]) => (
          <div key={l} className="rounded-2xl border border-line bg-surface p-3.5 shadow-card">
            <p className="flex items-center gap-1.5 text-[10.5px] font-extrabold uppercase tracking-[0.12em] text-muted"><Icon name={ic} size={13} />{l}</p>
            <p className="num mt-1.5 text-[19px] font-extrabold text-ink">{v}</p>
          </div>
        ))}
      </div>

      {/* tabs */}
      <div className="anim-fade-up sticky top-[61px] z-30 -mx-1 overflow-x-auto border-b border-line bg-paper/95 px-1 backdrop-blur" style={{ animationDelay: '100ms' }}>
        <div className="flex gap-1 pb-px">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => navigate('cliente', { id: c.id, tab: t.key })}
              className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-[12.5px] font-extrabold transition ${tab === t.key ? 'border-brand text-brand' : 'border-transparent text-muted hover:text-ink'}`}>
              <Icon name={t.icon} size={14} />{t.label}
            </button>
          ))}
        </div>
      </div>

      {/* contenuto tab */}
      {tab === 'overview' && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card title="Anagrafica e contatti" className="lg:col-span-2" delay={120}>
            <div className="grid grid-cols-1 gap-x-6 gap-y-3.5 sm:grid-cols-2">
              <Info icon="referenti" label="Partita IVA" value={c.piva} />
              <Info icon="referenti" label="Codice fiscale" value={c.cf} />
              <Info icon="preventivi" label="Codice SDI" value={c.sdi} />
              <Info icon="mail" label="PEC" value={c.pec} />
              <Info icon="pin" label="Sede legale" value={`${c.indirizzo}, ${c.cap} ${c.citta} (${c.provincia})`} />
              <Info icon="building" label="Regione" value={c.regione} />
              <Info icon="phone" label="Telefono" value={c.telefono} />
              <Info icon="mail" label="Email" value={c.email} />
              <Info icon="search" label="Sito web" value={c.sito} />
              <Info icon="clienti" label="Tipologia" value={c.tipologia} />
              <Info icon="user" label="Responsabile commerciale" value={c.commerciale} />
              <Info icon="euro" label="Esposizione creditizia" value={c.creditExposure ? fmtEUR(c.creditExposure) : '—'} />
            </div>
            {c.note && <p className="mt-4 rounded-lg bg-warn-soft/60 p-3 text-[12.5px] font-semibold text-[#7a5a10]"><span className="font-extrabold">Note: </span>{c.note}</p>}
          </Card>
          <div className="space-y-4">
            <Card title="Sedi" delay={160} action={<Btn size="sm" variant="subtle" icon="plus" onClick={() => setSiteModal({ open: true, v: { customerId: c.id } })}>Aggiungi</Btn>}>
              {sites.length === 0 && <p className="text-[12.5px] font-semibold text-muted">Nessuna sede registrata.</p>}
              <div className="space-y-2.5">
                {sites.map((s) => (
                  <div key={s.id} className="rounded-lg border border-line p-2.5 transition hover:border-brand/40">
                    <p className="text-[13px] font-extrabold text-ink">{s.denominazione}</p>
                    <p className="text-[11.5px] font-semibold text-muted">{s.indirizzo} · {s.citta} ({s.provincia})</p>
                  </div>
                ))}
              </div>
            </Card>
            <Card title="Ultimi movimenti" delay={200}>
              <div className="space-y-2">
                {db.audit.filter((a) => a.oggetto.includes(c.nomeCommerciale)).slice(0, 4).map((a) => (
                  <p key={a.id} className="text-[12px] font-semibold text-soft"><span className="font-extrabold text-brand">{a.utente}</span> {a.azione.toLowerCase()} {a.oggetto}</p>
                ))}
                {db.audit.filter((a) => a.oggetto.includes(c.nomeCommerciale)).length === 0 && <p className="text-[12.5px] font-semibold text-muted">Nessun movimento registrato.</p>}
              </div>
            </Card>
          </div>
        </div>
      )}

      {tab === 'referenti' && (
        <Card pad={false} delay={120} action={<Btn size="sm" icon="plus" onClick={() => setContactModal({ open: true, editId: null })}>Nuovo referente</Btn>} title="Referenti del cliente" sub={`${contacts.length} persone di contatto`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px]">
              <thead className="border-b border-line bg-paper/60"><tr><Th>Referente</Th><Th>Ruolo</Th><Th>Contatti</Th><Th>Preferenza</Th><Th>Ultimo contatto</Th><Th>Follow-up</Th><Th /></tr></thead>
              <tbody className="divide-y divide-line/60">
                {contacts.map((r) => (
                  <tr key={r.id} className="transition hover:bg-brand-soft/40">
                    <Td><p className="font-extrabold text-ink">{r.nome} {r.cognome}</p><p className="text-[11px] text-muted">{r.sede}</p></Td>
                    <Td>{r.ruolo}</Td>
                    <Td><p className="flex items-center gap-1"><Icon name="phone" size={12} className="text-faint" />{r.cellulare || r.telefono || '—'}</p><p className="flex items-center gap-1 text-[11px] text-muted"><Icon name="mail" size={12} className="text-faint" />{r.email || '—'}</p></Td>
                    <Td><Pill tone="petrol" dot={false} >{r.preferenza}</Pill></Td>
                    <Td><Pill tone={daysSince(r.ultimoContatto) > 90 ? 'amber' : 'green'} dot={false}>{fmtDate(r.ultimoContatto)}</Pill></Td>
                    <Td><Pill tone={daysUntil(r.prossimoFollowUp) < 0 ? 'red' : 'blue'} dot={false}>{fmtDate(r.prossimoFollowUp)}</Pill></Td>
                    <Td className="text-right">
                      <button className="rounded-lg p-1.5 text-muted transition hover:bg-paper hover:text-brand" onClick={() => setContactModal({ open: true, editId: r.id })}><Icon name="edit" size={15} /></button>
                      <button className="rounded-lg p-1.5 text-muted transition hover:bg-danger-soft hover:text-danger" onClick={() => remove('contacts', r.id, `Ha eliminato§Referente ${r.nome} ${r.cognome}`)}><Icon name="trash" size={15} /></button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {contacts.length === 0 && <EmptyState icon="referenti" title="Nessun referente" sub="Aggiungi la prima persona di contatto." />}
        </Card>
      )}

      {tab === 'sedi' && (
        <Card pad={false} delay={120} title="Sedi del cliente" action={<Btn size="sm" icon="plus" onClick={() => setSiteModal({ open: true, v: { customerId: c.id } })}>Nuova sede</Btn>}>
          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {sites.map((s) => (
              <div key={s.id} className="group rounded-2xl border border-line p-4 transition hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-card">
                <div className="flex items-start justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-petrol-100/70 text-petrol-700"><Icon name="building" size={17} /></span>
                  <button className="rounded-lg p-1.5 text-faint opacity-0 transition hover:bg-danger-soft hover:text-danger group-hover:opacity-100"
                    onClick={() => remove('sites', s.id, `Ha eliminato§Sede “${s.denominazione}”`)}><Icon name="trash" size={14} /></button>
                </div>
                <p className="mt-2.5 text-[14px] font-extrabold text-ink">{s.denominazione}</p>
                    <p className="mt-1 text-[12px] font-semibold text-muted">{s.indirizzo}<br />{s.citta} ({s.provincia}) · {s.telefono}</p>                {s.note && <p className="mt-2 text-[11.5px] font-medium italic text-muted">{s.note}</p>}
              </div>
            ))}
            {sites.length === 0 && <div className="sm:col-span-3"><EmptyState icon="building" title="Nessuna sede" sub="Le sedi sono i luoghi del cliente; i cantieri sono i presidi operativi." /></div>}
          </div>
        </Card>
      )}

      {tab === 'cantieri' && (
        <Card pad={false} delay={120} title="Cantieri operativi" sub={`${worksites.length} cantieri collegati`} action={<Btn size="sm" icon="plus" onClick={() => setWsModal(true)}>Nuovo cantiere</Btn>}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px]">
              <thead className="border-b border-line bg-paper/60"><tr><Th>Codice</Th><Th>Denominazione</Th><Th>Servizio</Th><Th>Stato</Th><Th className="text-right">Valore /mese</Th><Th className="text-right">Margine</Th><Th /></tr></thead>
              <tbody className="divide-y divide-line/60">
                {worksites.map((w) => (
                  <tr key={w.id} onClick={() => navigate('cantieri', { id: w.id })} className="group cursor-pointer transition hover:bg-brand-soft/40">
                    <Td><span className="num font-extrabold text-brand">{w.codice}</span></Td>
                    <Td><p className="font-extrabold text-ink">{w.denominazione}</p><p className="text-[11px] text-muted">{w.citta} · {w.frequenza} · {w.addetti} addetti</p></Td>
                    <Td>{w.servizio}</Td>
                    <Td><StatusPill status={w.stato} /></Td>
                    <Td className="num text-right font-extrabold text-ink">{fmtEUR(w.valoreMensile)}</Td>
                    <Td className="num text-right"><Pill tone={worksiteMarginPct(w) < 10 ? 'red' : worksiteMarginPct(w) < 20 ? 'amber' : 'green'} dot={false}>{worksiteMarginPct(w).toFixed(1)}%</Pill></Td>
                    <Td><Icon name="chevR" size={15} className="text-faint group-hover:text-brand" /></Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {worksites.length === 0 && <EmptyState icon="cantieri" title="Nessun cantiere" sub="I cantieri nascono anche dalla conversione di un preventivo accettato." />}
        </Card>
      )}

      {tab === 'opportunita' && (
        <Card pad={false} delay={120} title="Opportunità commerciali" action={<Btn size="sm" icon="plus" onClick={() => navigate('commerciale')}>Vai alla pipeline</Btn>}>
          <div className="divide-y divide-line/60">
            {opps.map((o) => {
              const sm = stageMeta(o.fase);
              return (
                <button key={o.id} onClick={() => navigate('commerciale', { id: o.id })} className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-brand-soft/40">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: sm.color }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-extrabold text-ink">{o.titolo}</p>
                    <p className="text-[11px] font-semibold text-muted">{o.servizio} · chiusura prevista {fmtDate(o.chiusuraPrevista)}</p>
                  </div>
                  <span className="num text-[13px] font-extrabold text-ink">{fmtEURk(o.valore)}</span>
                  <Pill tone="petrol" dot={false}>{o.probabilita}%</Pill>
                </button>
              );
            })}
            {opps.length === 0 && <EmptyState icon="commerciale" title="Nessuna opportunità" />}
          </div>
        </Card>
      )}

      {tab === 'preventivi' && (
        <Card pad={false} delay={120} title="Preventivi" action={<Btn size="sm" icon="plus" onClick={() => navigate('preventivi')}>Nuovo preventivo</Btn>}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead className="border-b border-line bg-paper/60"><tr><Th>Numero</Th><Th>Oggetto</Th><Th>Data</Th><Th>Stato</Th><Th className="text-right">Totale</Th><Th /></tr></thead>
              <tbody className="divide-y divide-line/60">
                {quotes.map((q) => (
                  <tr key={q.id} onClick={() => navigate('preventivi', { id: q.id })} className="group cursor-pointer transition hover:bg-brand-soft/40">
                    <Td><span className="num font-extrabold text-brand">{quoteCode(q)}</span></Td>
                    <Td className="max-w-[320px] truncate font-bold text-ink">{q.oggetto}</Td>
                    <Td>{fmtDate(q.data)}</Td>
                    <Td><StatusPill status={quoteEffectiveStatus(q)} /></Td>
                    <Td className="num text-right font-extrabold text-ink">{fmtEUR(quoteTotals(q).totale)}</Td>
                    <Td><Icon name="chevR" size={15} className="text-faint group-hover:text-brand" /></Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {quotes.length === 0 && <EmptyState icon="preventivi" title="Nessun preventivo" />}
        </Card>
      )}

      {tab === 'contratti' && (
        <Card pad={false} delay={120} title="Contratti" action={<Btn size="sm" icon="plus" onClick={() => navigate('contratti')}>Nuovo contratto</Btn>}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead className="border-b border-line bg-paper/60"><tr><Th>Numero</Th><Th>Oggetto</Th><Th>Scadenza</Th><Th>Disdetta entro</Th><Th className="text-right">Canone /mese</Th><Th /></tr></thead>
              <tbody className="divide-y divide-line/60">
                {contracts.map((ct) => (
                  <tr key={ct.id} onClick={() => navigate('contratti', { id: ct.id })} className="group cursor-pointer transition hover:bg-brand-soft/40">
                    <Td><span className="num font-extrabold text-brand">{ct.numero}</span></Td>
                    <Td className="max-w-[300px] truncate font-bold text-ink">{ct.oggetto}</Td>
                    <Td><Pill tone={daysUntil(ct.scadenza) <= 90 ? 'amber' : 'gray'} dot={false}>{fmtDate(ct.scadenza)}</Pill></Td>
                    <Td>{fmtDate((() => { const d = new Date(ct.scadenza + 'T00:00:00'); d.setMonth(d.getMonth() - ct.disdettaMesi); return d.toISOString().slice(0, 10); })())}</Td>
                    <Td className="num text-right font-extrabold text-ink">{fmtEUR(ct.importoMensile)}</Td>
                    <Td><Icon name="chevR" size={15} className="text-faint group-hover:text-brand" /></Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {contracts.length === 0 && <EmptyState icon="contratti" title="Nessun contratto" />}
        </Card>
      )}

      {tab === 'attivita' && (
        <Card pad={false} delay={120} title="Attività e follow-up" action={<Btn size="sm" icon="plus" onClick={() => setActModal(true)}>Nuova attività</Btn>}>
          <div className="divide-y divide-line/60">
            {acts.map((a) => (
              <div key={a.id} className="flex items-center gap-3 px-4 py-2.5">
                <StatusPill status={a.stato} />
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-[13px] font-extrabold ${a.stato === 'completata' ? 'text-muted line-through' : 'text-ink'}`}>{a.titolo}</p>
                  <p className="text-[11px] font-semibold text-muted">{a.tipo} · {a.responsabile} · scadenza {fmtDate(a.scadenza)}</p>
                </div>
                {a.stato !== 'completata' && (
                  <Btn size="sm" variant="subtle" icon="check" onClick={() => save('activities', { ...a, stato: 'completata' } as never, `Ha completato§“${a.titolo}”`)}>Fatto</Btn>
                )}
              </div>
            ))}
            {acts.length === 0 && <EmptyState icon="attivita" title="Nessuna attività" />}
          </div>
        </Card>
      )}

      {tab === 'documenti' && (
        <Card pad={false} delay={120} title="Documenti collegati" sub="Archivio completo con ricerca e upload: Fase 2">
          <div className="divide-y divide-line/60">
            {docs.map((d) => (
              <div key={d.id} className="flex items-center gap-3 px-4 py-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-paper text-petrol-700"><Icon name="documenti" size={16} /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-extrabold text-ink">{d.nome}</p>
                  <p className="text-[11px] font-semibold text-muted">{d.categoria} · {fmtDate(d.data)}{d.scadenza ? ` · scade ${fmtDate(d.scadenza)}` : ''}</p>
                </div>
                {d.scadenza && <Pill tone={daysUntil(d.scadenza) <= 30 ? 'red' : 'amber'} dot={false}>{daysUntil(d.scadenza)} gg</Pill>}
              </div>
            ))}
            {docs.length === 0 && <EmptyState icon="documenti" title="Nessun documento" sub="Contratti, capitolati, DUVRI e fotografie verranno collegati qui." />}
          </div>
        </Card>
      )}

      {tab === 'economici' && (
        econ ? (
          <EconomicPanel ledger={ledger} worksites={worksites} />
        ) : (
          <Card delay={120}>
            <div className="flex flex-col items-center gap-2 py-10 text-center">
              <Icon name="lock" size={26} className="text-faint" />
              <p className="font-display text-[15px] font-bold text-ink">Dati economici riservati</p>
              <p className="max-w-sm text-[12.5px] font-semibold text-muted">Il ruolo «{session?.ruolo}» non ha accesso a ricavi e marginalità. Contatta un amministratore per estendere i permessi.</p>
            </div>
          </Card>
        )
      )}

      <CustomerFormModal open={editOpen} initial={c} onClose={() => setEditOpen(false)} />
      <ContactFormModal open={contactModal.open} editId={contactModal.editId} presetCustomerId={c.id} onClose={() => setContactModal({ open: false, editId: null })} />
      <WorksiteFormModal open={wsModal} onClose={() => setWsModal(false)} presetCustomerId={c.id} />
      <ActivityFormModal open={actModal} onClose={() => setActModal(false)} presetCustomerId={c.id} />

      <Modal open={siteModal.open} onClose={() => setSiteModal({ open: false, v: {} })} title="Nuova sede" size="md"
        footer={<><Btn variant="ghost" onClick={() => setSiteModal({ open: false, v: {} })}>Annulla</Btn>
          <Btn icon="check" onClick={() => { if (!siteModal.v.denominazione) return; save('sites', { id: uid(), customerId: c.id, denominazione: siteModal.v.denominazione ?? '', indirizzo: siteModal.v.indirizzo ?? '', citta: siteModal.v.citta ?? '', provincia: siteModal.v.provincia ?? '', telefono: siteModal.v.telefono ?? '', note: siteModal.v.note ?? '' } as never, `Ha creato§Sede “${siteModal.v.denominazione}”`); setSiteModal({ open: false, v: {} }); }}>Salva</Btn></>}>
        <FormGrid
          fields={[
            { key: 'denominazione', label: 'Denominazione sede', required: true, span: 2 },
            { key: 'indirizzo', label: 'Indirizzo', span: 2 },
            { key: 'citta', label: 'Città' }, { key: 'provincia', label: 'Provincia' },
            { key: 'telefono', label: 'Telefono', span: 2 },
            { key: 'note', label: 'Note', type: 'textarea', span: 2 },
          ]}
          values={siteModal.v} onChange={(k, val) => setSiteModal((s) => ({ ...s, v: { ...s.v, [k]: val } }))}
        />
      </Modal>
    </div>
  );
}

function EconomicPanel({ ledger, worksites }: { ledger: { mese: string; ricavo: number; costo: number }[]; worksites: { codice: string; denominazione: string; valoreMensile: number; costoPrevisto: number; stato: string }[] }) {
  const years = [...new Set(ledger.map((l) => l.mese.slice(0, 4)))].sort().reverse();
  const perYear = years.map((y) => {
    const ls = ledger.filter((l) => l.mese.startsWith(y));
    const r = ls.reduce((s, l) => s + l.ricavo, 0);
    const co = ls.reduce((s, l) => s + l.costo, 0);
    return { label: y, value: +(((r - co) / (r || 1)) * 100).toFixed(1), rev: r, cost: co };
  });
  const totRev = ledger.reduce((s, l) => s + l.ricavo, 0);
  const totCost = ledger.reduce((s, l) => s + l.costo, 0);
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card title="Conto economico sintetico" delay={120}>
        <div className="space-y-2.5">
          {[['Ricavi', fmtEUR(totRev), 'text-ink'], ['Costi diretti', `− ${fmtEUR(totCost)}`, 'text-danger'], ['Margine lordo', fmtEUR(totRev - totCost), 'text-ok']].map(([l, v, cls]) => (
            <div key={l} className="flex items-center justify-between rounded-lg bg-paper/70 px-3 py-2.5">
              <span className="text-[12.5px] font-bold text-muted">{l}</span>
              <span className={`num text-[15px] font-extrabold ${cls}`}>{v}</span>
            </div>
          ))}
          <div className="flex items-center justify-between rounded-lg bg-brand-soft px-3 py-2.5">
            <span className="text-[12.5px] font-extrabold text-brand-deep">Margine %</span>
            <span className="num text-[15px] font-extrabold text-brand-deep">{totRev ? (((totRev - totCost) / totRev) * 100).toFixed(1) : '0'}%</span>
          </div>
        </div>
        <p className="mt-3 text-[11px] font-semibold text-muted">Margine = Ricavi − Costi · dati storici 12 mesi</p>
      </Card>
      <Card title="Margine per anno" delay={160}>
        <div className="space-y-2.5">
          {perYear.map((y) => (
            <div key={y.label}>
              <div className="mb-1 flex justify-between text-[12px] font-bold"><span>{y.label}</span><span className="num">{y.value}% · {fmtEURk(y.rev)}</span></div>
              <div className="h-2.5 overflow-hidden rounded-full bg-paper">
                <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(3, y.value * 2.5))}%`, background: y.value < 10 ? PALETTE.red : y.value < 20 ? PALETTE.amber : PALETTE.brand }} />
              </div>
            </div>
          ))}
        </div>
      </Card>
      <Card title="Cantieri — marginalità prevista" delay={200}>
        <div className="space-y-2">
          {worksites.filter((w) => w.valoreMensile > 0).map((w) => {
            const m = ((w.valoreMensile - w.costoPrevisto) / w.valoreMensile) * 100;
            return (
              <div key={w.codice} className="flex items-center justify-between rounded-lg border border-line px-3 py-2">
                <div className="min-w-0"><p className="num text-[12px] font-extrabold text-brand">{w.codice}</p><p className="truncate text-[11px] font-semibold text-muted">{w.denominazione}</p></div>
                <Pill tone={m < 10 ? 'red' : m < 20 ? 'amber' : 'green'} dot={false}>{m.toFixed(1)}%</Pill>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

export function Customers() {
  const { route } = useApp();
  return route.view === 'cliente' && route.id ? <CustomerDetail id={route.id} /> : <CustomerList />;
}
