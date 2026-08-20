import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  useApp, canEconomics, fmtDate, fmtEUR, fmtEURk, quoteCode, quoteEffectiveStatus, quoteExpiry,
  quoteTotals, todayISO, uid, daysUntil,
} from '../store';
import type { Quote, QuoteLine } from '../types';
import { Btn, Card, EmptyState, FormGrid, Icon, Modal, Pill, SearchBox, StatusPill, Td, Th } from '../components/ui';
import type { FieldDef } from '../components/ui';

const UM = ['ore', 'mq', 'giorni', 'intervento', 'interventi', 'mesi', 'cicli', 'forfait'];

function newLine(services: { categoria: string }[]): QuoteLine {
  return { id: uid(), servizio: services[0]?.categoria ?? 'Altri servizi', descrizione: '', quantita: 1, um: 'forfait', prezzoUnitario: 0, costoStimato: 0 };
}

/* ---------- form preventivo con righe ---------- */
export function QuoteFormModal({ open, onClose, editId }: { open: boolean; onClose: () => void; editId?: string | null }) {
  const { db, save, users } = useApp();
  const [v, setV] = useState<Record<string, unknown>>({});
  const [righe, setRighe] = useState<QuoteLine[]>([]);
  const [ready, setReady] = useState(false);
  const editing = editId ? db.quotes.find((q) => q.id === editId) : null;

  if (open && !ready) {
    setRighe(editing ? editing.righe.map((r) => ({ ...r })) : [newLine(db.services)]);
    setV(editing ? { ...editing } : {
      customerId: '', contactId: '', worksiteId: '', opportunityId: '', data: todayISO(), validitaGiorni: 30,
      commerciale: users[2]?.nome ?? '', oggetto: '', iva: 22, condizioni: 'Pagamento 30gg fine mese.', note: '', stato: 'bozza',
    });
    setReady(true);
  }
  if (!open && ready) setReady(false);

  const contacts = db.contacts.filter((c) => !v.customerId || c.customerId === v.customerId);
  const worksites = db.worksites.filter((w) => !v.customerId || w.customerId === v.customerId);
  const opps = db.opportunities.filter((o) => !v.customerId || o.customerId === v.customerId);

  const fields: FieldDef[] = [
    { key: 'oggetto', label: 'Oggetto', required: true, span: 2, placeholder: 'Es. Servizio pulizia completo Vinitaly 2026' },
    { key: 'customerId', label: 'Cliente', type: 'select', required: true, options: db.customers.map((c) => ({ value: c.id, label: c.ragioneSociale })) },
    { key: 'contactId', label: 'Referente', type: 'select', options: contacts.map((c) => ({ value: c.id, label: `${c.nome} ${c.cognome}` })) },
    { key: 'worksiteId', label: 'Sede / cantiere', type: 'select', options: worksites.map((w) => ({ value: w.id, label: `${w.codice} — ${w.denominazione}` })) },
    { key: 'opportunityId', label: 'Opportunità collegata', type: 'select', options: opps.map((o) => ({ value: o.id, label: o.titolo })) },
    { key: 'data', label: 'Data', type: 'date' },
    { key: 'validitaGiorni', label: 'Validità (giorni)', type: 'number', min: 1 },
    { key: 'commerciale', label: 'Commerciale', type: 'select', options: users.map((u) => u.nome) },
    { key: 'iva', label: 'IVA %', type: 'select', options: [{ value: '22', label: '22%' }, { value: '10', label: '10%' }, { value: '4', label: '4%' }, { value: '0', label: 'Esente' }] },
    { key: 'condizioni', label: 'Condizioni', type: 'textarea', span: 2 },
    { key: 'note', label: 'Note interne', type: 'textarea', span: 2 },
  ];

  const draft: Quote = {
    id: editing?.id ?? uid(), numero: editing?.numero ?? db.quotes.length + 1, anno: editing?.anno ?? new Date().getFullYear(),
    customerId: (v.customerId as string) ?? '', worksiteId: (v.worksiteId as string) || null, contactId: (v.contactId as string) || null,
    data: (v.data as string) ?? todayISO(), validitaGiorni: Number(v.validitaGiorni) || 30, commerciale: (v.commerciale as string) ?? '',
    oggetto: (v.oggetto as string) ?? '', righe, iva: Number(v.iva) || 22, condizioni: (v.condizioni as string) ?? '',
    note: (v.note as string) ?? '', stato: (v.stato as Quote['stato']) ?? 'bozza',
    opportunityId: (v.opportunityId as string) || null, convertedContractId: editing?.convertedContractId ?? null,
  };
  const t = quoteTotals(draft);

  const updLine = (id: string, key: keyof QuoteLine, val: string | number) =>
    setRighe((rs) => rs.map((r) => (r.id === id ? { ...r, [key]: val } : r)));

  const submit = () => {
    if (!v.customerId || !v.oggetto || righe.length === 0) return;
    save('quotes', draft as never, `${editing ? 'Ha aggiornato' : 'Ha creato'}§Preventivo ${quoteCode(draft)} “${draft.oggetto}”`);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? `Modifica ${quoteCode(draft)}` : 'Nuovo preventivo'} size="xl"
      sub="Le righe alimentano totale, margine e la conversione in contratto"
      footer={<>
        <div className="mr-auto flex items-center gap-3 text-[12px] font-bold text-muted">
          <span>Imponibile <b className="num text-ink">{fmtEUR(t.imponibile)}</b></span>
          <span>IVA <b className="num text-ink">{fmtEUR(t.iva)}</b></span>
          <span>Totale <b className="num text-[14px] text-brand">{fmtEUR(t.totale)}</b></span>
          <span className="hidden sm:inline">Margine <b className="num text-ok">{t.marginePct.toFixed(1)}%</b></span>
        </div>
        <Btn variant="ghost" onClick={onClose}>Annulla</Btn>
        <Btn icon="check" disabled={!v.customerId || !v.oggetto || righe.length === 0} onClick={submit}>{editing ? 'Salva' : 'Crea preventivo'}</Btn>
      </>}>
      <FormGrid fields={fields} values={v} onChange={(k, val) => setV((s) => ({ ...s, [k]: val }))} />

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-muted">Righe del preventivo</h4>
          <Btn size="sm" variant="subtle" icon="plus" onClick={() => setRighe((rs) => [...rs, newLine(db.services)])}>Aggiungi riga</Btn>
        </div>
        <div className="space-y-2">
          {righe.map((r) => (
            <div key={r.id} className="grid grid-cols-2 items-end gap-2 rounded-2xl border border-line bg-paper/40 p-2.5 md:grid-cols-[150px_1fr_76px_92px_100px_100px_34px]">
              <div>
                <label className="mb-1 block text-[9.5px] font-extrabold uppercase text-muted">Servizio</label>
                <select className="w-full rounded-lg border border-line bg-white px-2 py-1.5 text-[12px] font-bold outline-none focus:border-brand" value={r.servizio} onChange={(e) => updLine(r.id, 'servizio', e.target.value)}>
                  {db.services.map((s) => <option key={s.id}>{s.categoria}</option>)}
                </select>
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className="mb-1 block text-[9.5px] font-extrabold uppercase text-muted">Descrizione</label>
                <input className="w-full rounded-lg border border-line bg-white px-2 py-1.5 text-[12px] font-bold outline-none focus:border-brand" value={r.descrizione} placeholder="Dettaglio prestazione…" onChange={(e) => updLine(r.id, 'descrizione', e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-[9.5px] font-extrabold uppercase text-muted">Q.tà</label>
                <input type="number" min={0} className="num w-full rounded-lg border border-line bg-white px-2 py-1.5 text-[12px] font-bold outline-none focus:border-brand" value={r.quantita} onChange={(e) => updLine(r.id, 'quantita', Number(e.target.value) || 0)} />
              </div>
              <div>
                <label className="mb-1 block text-[9.5px] font-extrabold uppercase text-muted">U.M.</label>
                <select className="w-full rounded-lg border border-line bg-white px-2 py-1.5 text-[12px] font-bold outline-none focus:border-brand" value={r.um} onChange={(e) => updLine(r.id, 'um', e.target.value)}>
                  {UM.map((u) => <option key={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[9.5px] font-extrabold uppercase text-muted">Prezzo €</label>
                <input type="number" min={0} step="0.01" className="num w-full rounded-lg border border-line bg-white px-2 py-1.5 text-[12px] font-bold outline-none focus:border-brand" value={r.prezzoUnitario} onChange={(e) => updLine(r.id, 'prezzoUnitario', Number(e.target.value) || 0)} />
              </div>
              <div>
                <label className="mb-1 block text-[9.5px] font-extrabold uppercase text-muted">Costo €</label>
                <input type="number" min={0} step="0.01" className="num w-full rounded-lg border border-line bg-white px-2 py-1.5 text-[12px] font-bold outline-none focus:border-brand" value={r.costoStimato} onChange={(e) => updLine(r.id, 'costoStimato', Number(e.target.value) || 0)} />
              </div>
              <div className="flex items-end justify-center pb-1">
                <button className="rounded-lg p-1.5 text-muted transition hover:bg-danger-soft hover:text-danger" onClick={() => setRighe((rs) => rs.filter((x) => x.id !== r.id))}><Icon name="trash" size={15} /></button>
              </div>
              <p className="num col-span-2 text-right text-[12px] font-extrabold text-ink md:col-span-7 md:pr-10">Totale riga: {fmtEUR(r.quantita * r.prezzoUnitario)}</p>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}

/* ---------- stampa PDF ---------- */
function PrintSheet({ q }: { q: Quote }) {
  const { db } = useApp();
  const cust = db.customers.find((c) => c.id === q.customerId);
  const contact = db.contacts.find((c) => c.id === q.contactId);
  const t = quoteTotals(q);
  return (
    <div className="print-sheet mx-auto max-w-[760px] p-2">
      <div className="flex items-start justify-between border-b-4 border-[#0f8a7e] pb-5">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#bfe84e]">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#0b333c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2.7S5.5 10 5.5 14.5a6.5 6.5 0 0 0 13 0C18.5 10 12 2.7 12 2.7z" /><path d="M9.3 14.8a2.8 2.8 0 0 0 2 2.7" />
            </svg>
          </span>
          <div>
            <p className="font-display text-[22px] font-extrabold tracking-tight">PRIME CLEANING <span className="text-[#0f8a7e]">S.r.l.</span></p>
            <p className="text-[11px] font-semibold text-[#64797f]">Servizi di pulizia · facility management · servizi fieristici · Via dell’Artigianato 24, 40138 Bologna · P.IVA 03655121201</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-display text-[20px] font-extrabold text-[#0f8a7e]">{quoteCode(q)}</p>
          <p className="text-[11.5px] font-bold">Data: {fmtDate(q.data)}</p>
          <p className="text-[11.5px] font-bold">Validità: {q.validitaGiorni} giorni ({fmtDate(quoteExpiry(q))})</p>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-4">
        <div className="rounded-lg bg-[#eef3f3] p-3.5">
          <p className="text-[9.5px] font-extrabold uppercase tracking-[0.16em] text-[#64797f]">Spett.le cliente</p>
          <p className="mt-1 text-[14px] font-extrabold">{cust?.ragioneSociale}</p>
          <p className="text-[11.5px] font-semibold">{cust?.indirizzo}, {cust?.cap} {cust?.citta} ({cust?.provincia})</p>
          <p className="text-[11.5px] font-semibold">P.IVA {cust?.piva}{contact ? ` · Att.ne ${contact.nome} ${contact.cognome}` : ''}</p>
        </div>
        <div className="rounded-lg bg-[#eef3f3] p-3.5">
          <p className="text-[9.5px] font-extrabold uppercase tracking-[0.16em] text-[#64797f]">Commerciale di riferimento</p>
          <p className="mt-1 text-[14px] font-extrabold">{q.commerciale}</p>
          <p className="text-[11.5px] font-semibold">commerciale@primecleaning.it</p>
        </div>
      </div>
      <h2 className="mt-6 text-[17px] font-extrabold">Oggetto: {q.oggetto}</h2>
      <table className="mt-3 w-full border-collapse text-[12px]">
        <thead>
          <tr className="bg-[#0b333c] text-left text-white">
            <th className="p-2.5 font-extrabold">Descrizione</th><th className="p-2.5 text-right font-extrabold">Q.tà</th>
            <th className="p-2.5 font-extrabold">U.M.</th><th className="p-2.5 text-right font-extrabold">Prezzo unit.</th><th className="p-2.5 text-right font-extrabold">Totale</th>
          </tr>
        </thead>
        <tbody>
          {q.righe.map((r, i) => (
            <tr key={r.id} className={i % 2 ? 'bg-[#eef3f3]' : ''}>
              <td className="p-2.5"><b>{r.servizio}</b>{r.descrizione && <> — {r.descrizione}</>}</td>
              <td className="num p-2.5 text-right">{r.quantita}</td><td className="p-2.5">{r.um}</td>
              <td className="num p-2.5 text-right">{fmtEUR(r.prezzoUnitario)}</td>
              <td className="num p-2.5 text-right font-extrabold">{fmtEUR(r.quantita * r.prezzoUnitario)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-4 flex justify-end">
        <div className="w-64 space-y-1.5 text-[13px] font-bold">
          <div className="flex justify-between"><span>Imponibile</span><span className="num">{fmtEUR(t.imponibile)}</span></div>
          <div className="flex justify-between"><span>IVA {q.iva}%</span><span className="num">{fmtEUR(t.iva)}</span></div>
          <div className="flex justify-between rounded-lg bg-[#0f8a7e] px-3 py-2 text-white"><span>TOTALE</span><span className="num">{fmtEUR(t.totale)}</span></div>
        </div>
      </div>
      <div className="mt-6 rounded-lg border border-[#d9e3e4] p-3.5 text-[11.5px] font-semibold leading-relaxed">
        <p className="font-extrabold uppercase tracking-wide text-[#0f8a7e]">Condizioni</p>
        <p>{q.condizioni || '—'}</p>
        {q.note && <p className="mt-2"><b>Note:</b> {q.note}</p>}
      </div>
      <div className="mt-8 grid grid-cols-2 gap-10 text-[11.5px] font-semibold">
        <div><p>Timbro e firma Prime Cleaning S.r.l.</p><div className="mt-10 border-t border-[#14303a]" /></div>
        <div><p>Per accettazione (timbro e firma del cliente)</p><div className="mt-10 border-t border-[#14303a]" /></div>
      </div>
      <p className="mt-6 text-center text-[9.5px] font-semibold text-[#9db4b7]">Documento generato da Prime Cleaning CRM · ambiente dimostrativo con dati fittizi</p>
    </div>
  );
}

/* ---------- vista ---------- */
export function Quotes() {
  const { db, route, navigate, save, setQuoteStatus, convertQuote, remove, session } = useApp();
  const [q, setQ] = useState('');
  const [stato, setStato] = useState('tutti');
  const [create, setCreate] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [printing, setPrinting] = useState<Quote | null>(null);
  const econ = canEconomics(session);

  const detail = route.id ? db.quotes.find((x) => x.id === route.id) : null;

  useEffect(() => {
    if (!printing) return;
    document.body.classList.add('printing');
    const t = setTimeout(() => window.print(), 250);
    const after = () => { document.body.classList.remove('printing'); setPrinting(null); };
    window.addEventListener('afterprint', after);
    return () => { clearTimeout(t); window.removeEventListener('afterprint', after); document.body.classList.remove('printing'); };
  }, [printing]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return db.quotes
      .filter((x) => (stato === 'tutti' || quoteEffectiveStatus(x) === stato) &&
        (!s || [quoteCode(x), x.oggetto, db.customers.find((c) => c.id === x.customerId)?.nomeCommerciale ?? '', x.commerciale].some((f) => f.toLowerCase().includes(s))))
      .sort((a, b) => b.anno - a.anno || b.numero - a.numero);
  }, [db, q, stato]);

  const statiCount = (st: string) => db.quotes.filter((x) => st === 'tutti' || quoteEffectiveStatus(x) === st).length;
  const pendingValue = db.quotes.filter((x) => ['inviato', 'visualizzato', 'trattativa'].includes(quoteEffectiveStatus(x))).reduce((s, x) => s + quoteTotals(x).totale, 0);

  return (
    <div className="mx-auto max-w-[1400px] space-y-4">
      <div className="anim-fade-up flex flex-wrap items-center justify-between gap-3">
        <div className="dark-scroll flex gap-1.5 overflow-x-auto pb-1">
          {['tutti', 'bozza', 'inviato', 'visualizzato', 'trattativa', 'accettato', 'rifiutato', 'scaduto'].map((s) => (
            <button key={s} onClick={() => setStato(s)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-extrabold capitalize transition ${stato === s ? 'bg-petrol-900 text-white' : 'border border-line bg-surface text-muted hover:border-brand hover:text-brand'}`}>
              {s} <span className="num ml-1 opacity-60">{statiCount(s)}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Pill tone="teal" dot={false}>in attesa {fmtEURk(pendingValue)}</Pill>
          <div className="w-52"><SearchBox value={q} onChange={setQ} placeholder="Cerca preventivo…" /></div>
          <Btn icon="plus" onClick={() => setCreate(true)}>Nuovo preventivo</Btn>
        </div>
      </div>

      <Card pad={false} className="anim-fade-up" delay={60}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px]">
            <thead className="border-b border-line bg-paper/60">
              <tr><Th>Numero</Th><Th>Cliente</Th><Th>Oggetto</Th><Th>Data</Th><Th>Validità</Th><Th>Stato</Th><Th className="text-right">Totale</Th>{econ && <Th className="text-right">Margine</Th>}<Th>Commerciale</Th></tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {filtered.map((x) => {
                const cust = db.customers.find((c) => c.id === x.customerId);
                const es = quoteEffectiveStatus(x);
                const t = quoteTotals(x);
                const left = daysUntil(quoteExpiry(x));
                return (
                  <tr key={x.id} onClick={() => navigate('preventivi', { id: x.id })} className="group cursor-pointer transition hover:bg-brand-soft/40">
                    <Td><span className="num font-extrabold text-brand">{quoteCode(x)}</span></Td>
                    <Td>{cust?.nomeCommerciale ?? '—'}</Td>
                    <Td className="max-w-[300px] truncate font-bold text-ink">{x.oggetto}</Td>
                    <Td>{fmtDate(x.data)}</Td>
                    <Td><Pill tone={es === 'scaduto' ? 'red' : left <= 7 && ['inviato', 'visualizzato', 'trattativa'].includes(es) ? 'amber' : 'gray'} dot={false}>{es === 'scaduto' ? 'scaduto' : fmtDate(quoteExpiry(x))}</Pill></Td>
                    <Td><StatusPill status={es} /></Td>
                    <Td className="num text-right font-extrabold text-ink">{fmtEUR(t.totale)}</Td>
                    {econ && <Td className="num text-right"><span className={t.marginePct < 10 ? 'text-danger' : t.marginePct < 20 ? 'text-warn' : 'text-ok'}>{t.marginePct.toFixed(1)}%</span></Td>}
                    <Td>{x.commerciale}</Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <EmptyState icon="preventivi" title="Nessun preventivo" sub="Crea la prima offerta per un cliente." action={<Btn icon="plus" onClick={() => setCreate(true)}>Nuovo preventivo</Btn>} />}
      </Card>

      {/* dettaglio */}
      <Modal open={!!detail} onClose={() => navigate('preventivi')} size="xl"
        title={detail ? `${quoteCode(detail)} — ${detail.oggetto}` : ''}
        sub={detail ? `${db.customers.find((c) => c.id === detail.customerId)?.ragioneSociale} · ${detail.commerciale}` : undefined}
        footer={detail && (
          <div className="flex w-full flex-wrap items-center gap-2">
            <Btn variant="danger" size="sm" icon="trash" onClick={() => { remove('quotes', detail.id, `Ha eliminato§Preventivo ${quoteCode(detail)}`); navigate('preventivi'); }}>Elimina</Btn>
            <div className="flex-1" />
            <Btn variant="ghost" icon="printer" onClick={() => setPrinting(detail)}>Stampa / PDF</Btn>
            {['bozza', 'inviato', 'visualizzato', 'trattativa'].includes(detail.stato) && (
              <Btn variant="ghost" icon="edit" onClick={() => { setEditId(detail.id); navigate('preventivi'); }}>Modifica</Btn>
            )}
            {detail.stato === 'bozza' && <Btn icon="mail" onClick={() => setQuoteStatus(detail.id, 'inviato')}>Segna inviato</Btn>}
            {detail.stato === 'inviato' && <Btn variant="subtle" icon="eye" onClick={() => setQuoteStatus(detail.id, 'visualizzato')}>Visualizzato</Btn>}
            {['inviato', 'visualizzato'].includes(detail.stato) && <Btn variant="subtle" onClick={() => setQuoteStatus(detail.id, 'trattativa')}>In trattativa</Btn>}
            {['inviato', 'visualizzato', 'trattativa', 'scaduto'].includes(quoteEffectiveStatus(detail)) && (
              <>
                <Btn variant="ghost" onClick={() => setQuoteStatus(detail.id, 'rifiutato')}>Rifiutato</Btn>
                <Btn icon="check" onClick={() => setQuoteStatus(detail.id, 'accettato')}>Accettato</Btn>
              </>
            )}
            {detail.stato === 'accettato' && !detail.convertedContractId && (
              <Btn icon="contratti" variant="lime" onClick={() => { const cid = convertQuote(detail.id); if (cid) navigate('contratti', { id: cid }); }}>Converti in contratto / cantiere</Btn>
            )}
            {detail.convertedContractId && (() => {
              const ct = db.contracts.find((k) => k.id === detail.convertedContractId);
              return ct ? <Btn icon="contratti" variant="lime" onClick={() => navigate('contratti', { id: ct.id })}>Vedi contratto {ct.numero}</Btn> : null;
            })()}
          </div>
        )}>
        {detail && (() => {
          const t = quoteTotals(detail);
          const es = quoteEffectiveStatus(detail);
          const cust = db.customers.find((c) => c.id === detail.customerId);
          const contact = db.contacts.find((c) => c.id === detail.contactId);
          const ws = db.worksites.find((w) => w.id === detail.worksiteId);
          const opp = db.opportunities.find((o) => o.id === detail.opportunityId);
          return (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill status={es} />
                <Pill tone="gray" dot={false}>data {fmtDate(detail.data)}</Pill>
                <Pill tone={daysUntil(quoteExpiry(detail)) <= 7 && es !== 'accettato' ? 'amber' : 'gray'} dot={false}>validità fino al {fmtDate(quoteExpiry(detail))}</Pill>
                <Pill tone="petrol" dot={false}>IVA {detail.iva}%</Pill>
              </div>
              <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
                {[
                  ['Cliente', cust?.ragioneSociale ?? '—'], ['Referente', contact ? `${contact.nome} ${contact.cognome}` : '—'],
                  ['Cantiere', ws ? `${ws.codice} ${ws.denominazione}` : '—'], ['Opportunità', opp?.titolo ?? '—'],
                ].map(([l, val]) => (
                  <div key={l} className="rounded-lg bg-paper/70 p-2.5"><p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted">{l}</p><p className="mt-0.5 truncate text-[12.5px] font-bold text-ink" title={val}>{val}</p></div>
                ))}
              </div>
              <div className="overflow-hidden rounded-2xl border border-line">
                <table className="w-full">
                  <thead className="bg-petrol-900 text-left text-white">
                    <tr><Th className="!text-white">Servizio / descrizione</Th><Th className="!text-white text-right">Q.tà</Th><Th className="!text-white">U.M.</Th><Th className="!text-white text-right">Prezzo</Th><Th className="!text-white text-right">Totale</Th></tr>
                  </thead>
                  <tbody className="divide-y divide-line/60">
                    {detail.righe.map((r) => (
                      <tr key={r.id}>
                        <Td><b className="text-ink">{r.servizio}</b><span className="text-muted"> — {r.descrizione || 'prestazione a corpo'}</span></Td>
                        <Td className="num text-right">{r.quantita}</Td><Td>{r.um}</Td>
                        <Td className="num text-right">{fmtEUR(r.prezzoUnitario)}</Td>
                        <Td className="num text-right font-extrabold text-ink">{fmtEUR(r.quantita * r.prezzoUnitario)}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap justify-end gap-2.5">
                {econ && (
                  <div className="rounded-2xl border border-line px-4 py-2.5 text-right">
                    <p className="text-[10px] font-extrabold uppercase text-muted">Costo stimato · margine</p>
                    <p className="num text-[14px] font-extrabold text-ink">{fmtEUR(t.costo)} · <span className={t.marginePct < 10 ? 'text-danger' : 'text-ok'}>{t.marginePct.toFixed(1)}%</span></p>
                  </div>
                )}
                <div className="rounded-2xl border border-line px-4 py-2.5 text-right">
                  <p className="text-[10px] font-extrabold uppercase text-muted">Imponibile + IVA</p>
                  <p className="num text-[14px] font-extrabold text-ink">{fmtEUR(t.imponibile)} + {fmtEUR(t.iva)}</p>
                </div>
                <div className="rounded-2xl bg-brand px-4 py-2.5 text-right text-white">
                  <p className="text-[10px] font-extrabold uppercase opacity-70">Totale</p>
                  <p className="num text-[16px] font-extrabold">{fmtEUR(t.totale)}</p>
                </div>
              </div>
              {(detail.condizioni || detail.note) && (
                <div className="rounded-2xl bg-paper/70 p-3.5 text-[12.5px] font-semibold text-soft">
                  {detail.condizioni && <p><b className="text-ink">Condizioni: </b>{detail.condizioni}</p>}
                  {detail.note && <p className="mt-1"><b className="text-ink">Note: </b>{detail.note}</p>}
                </div>
              )}
            </div>
          );
        })()}
      </Modal>

      <QuoteFormModal open={create} onClose={() => setCreate(false)} />
      <QuoteFormModal open={!!editId} editId={editId} onClose={() => { setEditId(null); if (route.id) navigate('preventivi'); }} />
      {printing && createPortal(<div id="print-root"><PrintSheet q={printing} /></div>, document.body)}
    </div>
  );
}
