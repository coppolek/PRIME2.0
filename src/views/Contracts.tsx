import { useMemo, useState } from 'react';
import {
  useApp, contractLastNotice, daysUntil, dueLabel, fmtDate, fmtEUR, fmtEURk, todayISO, uid,
} from '../store';
import type { Contract } from '../types';
import { Btn, Card, EmptyState, FormGrid, Icon, Modal, Pill, SearchBox, StatusPill, Td, Th } from '../components/ui';
import type { FieldDef } from '../components/ui';

export function ContractFormModal({ open, onClose, editId }: { open: boolean; onClose: () => void; editId?: string | null }) {
  const { db, save, users } = useApp();
  const [v, setV] = useState<Record<string, unknown>>({});
  const [ready, setReady] = useState(false);
  const editing = editId ? db.contracts.find((k) => k.id === editId) : null;

  if (open && !ready) {
    setV(editing ? { ...editing } : {
      numero: `CTR-${new Date().getFullYear()}-${String(db.contracts.length + 1).padStart(3, '0')}`,
      customerId: '', worksiteId: '', oggetto: '', firma: todayISO(), inizio: todayISO(), scadenza: todayISO(),
      rinnovoAutomatico: true, disdettaMesi: 6, importoMensile: 0, importoAnnuale: 0, fatturazione: 'mensile',
      indicizzazione: false, adeguamentoIstat: false, adeguamentoCcnl: true, responsabile: users[3]?.nome ?? '', note: '', stato: 'attivo',
    });
    setReady(true);
  }
  if (!open && ready) setReady(false);

  const worksites = db.worksites.filter((w) => !v.customerId || w.customerId === v.customerId);

  const fields: FieldDef[] = [
    { key: 'numero', label: 'Numero contratto', required: true },
    { key: 'customerId', label: 'Cliente', type: 'select', required: true, options: db.customers.map((c) => ({ value: c.id, label: c.ragioneSociale })) },
    { key: 'oggetto', label: 'Oggetto', required: true, span: 2 },
    { key: 'worksiteId', label: 'Cantiere collegato', type: 'select', options: worksites.map((w) => ({ value: w.id, label: `${w.codice} — ${w.denominazione}` })) },
    { key: 'stato', label: 'Stato', type: 'select', options: ['attivo', 'chiuso', 'disdetto'] },
    { key: 'firma', label: 'Data firma', type: 'date' },
    { key: 'inizio', label: 'Data inizio', type: 'date' },
    { key: 'scadenza', label: 'Data scadenza', type: 'date', required: true },
    { key: 'disdettaMesi', label: 'Preavviso disdetta (mesi)', type: 'number', min: 0, max: 24 },
    { key: 'rinnovoAutomatico', label: 'Rinnovo automatico (tacito)', type: 'checkbox', hint: 'Rinnovo tacito alla scadenza' },
    { key: 'importoMensile', label: 'Importo mensile', type: 'money' },
    { key: 'importoAnnuale', label: 'Importo annuale', type: 'money' },
    { key: 'fatturazione', label: 'Modalità fatturazione', type: 'select', options: ['mensile', 'trimestrale', 'su evento', 'milestone'] },
    { key: 'responsabile', label: 'Responsabile interno', type: 'select', options: users.map((u) => u.nome) },
    { key: 'indicizzazione', label: 'Indicizzazione', type: 'checkbox', hint: 'Canone indicizzato' },
    { key: 'adeguamentoIstat', label: 'Adeguamento ISTAT', type: 'checkbox', hint: 'Clausola ISTAT' },
    { key: 'adeguamentoCcnl', label: 'Adeguamento CCNL', type: 'checkbox', hint: 'Clausola CCNL' },
    { key: 'note', label: 'Note', type: 'textarea', span: 2 },
  ];

  const lastNotice = v.scadenza
    ? contractLastNotice(v.scadenza as string, Number(v.disdettaMesi) || 0) : '';
  const dLast = lastNotice ? daysUntil(lastNotice) : 0;

  const submit = () => {
    if (!v.customerId || !v.oggetto || !v.scadenza) return;
    const im = Number(v.importoMensile) || 0;
    const item: Contract = {
      id: editing?.id ?? uid(), numero: (v.numero as string) || 'CTR-NEW', customerId: v.customerId as string,
      worksiteId: (v.worksiteId as string) || null, oggetto: v.oggetto as string, firma: (v.firma as string) ?? todayISO(),
      inizio: (v.inizio as string) ?? todayISO(), scadenza: v.scadenza as string, rinnovoAutomatico: !!v.rinnovoAutomatico,
      disdettaMesi: Number(v.disdettaMesi) || 0, importoMensile: im, importoAnnuale: Number(v.importoAnnuale) || im * 12,
      fatturazione: (v.fatturazione as Contract['fatturazione']) ?? 'mensile', indicizzazione: !!v.indicizzazione,
      adeguamentoIstat: !!v.adeguamentoIstat, adeguamentoCcnl: !!v.adeguamentoCcnl, responsabile: (v.responsabile as string) ?? '',
      note: (v.note as string) ?? '', stato: (v.stato as Contract['stato']) ?? 'attivo',
    };
    save('contracts', item as never, `${editing ? 'Ha aggiornato' : 'Ha creato'}§Contratto ${item.numero}`);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? `Modifica ${editing.numero}` : 'Nuovo contratto'} size="xl"
      sub="Il sistema calcola automaticamente l’ultima data utile per la disdetta"
      footer={<>
        <div className="mr-auto text-[12px] font-bold text-muted">
          Ultima disdetta utile: <span className={`num font-extrabold ${dLast < 0 ? 'text-danger' : dLast <= 30 ? 'text-warn' : 'text-ok'}`}>{lastNotice ? `${fmtDate(lastNotice)} (${dueLabel(lastNotice)})` : '—'}</span>
        </div>
        <Btn variant="ghost" onClick={onClose}>Annulla</Btn>
        <Btn icon="check" disabled={!v.customerId || !v.oggetto || !v.scadenza} onClick={submit}>{editing ? 'Salva' : 'Crea contratto'}</Btn>
      </>}>
      <FormGrid fields={fields} values={v} onChange={(k, val) => setV((s) => ({ ...s, [k]: val }))} />
    </Modal>
  );
}

export function Contracts() {
  const { db, route, navigate, remove, alertDays, setAlertDays, toast } = useApp();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('tutti');
  const [create, setCreate] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const detail = route.id ? db.contracts.find((k) => k.id === route.id) : null;

  const enriched = useMemo(() => db.contracts.map((k) => {
    const dScad = daysUntil(k.scadenza);
    const lastN = contractLastNotice(k.scadenza, k.disdettaMesi);
    const dDisd = daysUntil(lastN);
    return { k, dScad, lastN, dDisd };
  }), [db.contracts]);

  const filtered = enriched.filter(({ k, dScad, dDisd }) => {
    if (filter === 'attivi' && k.stato !== 'attivo') return false;
    if (filter === 'scadenza' && !(k.stato === 'attivo' && dScad >= 0 && dScad <= alertDays)) return false;
    if (filter === 'disdetta' && !(k.stato === 'attivo' && dDisd <= 60)) return false;
    const s = q.trim().toLowerCase();
    if (s && ![k.numero, k.oggetto, db.customers.find((c) => c.id === k.customerId)?.nomeCommerciale ?? '', k.responsabile].some((f) => f.toLowerCase().includes(s))) return false;
    return true;
  }).sort((a, b) => a.k.scadenza.localeCompare(b.k.scadenza));

  const activeValue = enriched.filter((e) => e.k.stato === 'attivo').reduce((s, e) => s + e.k.importoAnnuale, 0);
  const expiring = enriched.filter((e) => e.k.stato === 'attivo' && e.dScad >= 0 && e.dScad <= alertDays).length;
  const noticeRisk = enriched.filter((e) => e.k.stato === 'attivo' && e.dDisd <= 60).length;

  return (
    <div className="mx-auto max-w-[1400px] space-y-4">
      <div className="anim-fade-up flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {([['tutti', 'Tutti'], ['attivi', 'Attivi'], ['scadenza', `In scadenza ${alertDays}g`], ['disdetta', 'Termine disdetta']] as const).map(([f, l]) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1.5 text-[12px] font-extrabold transition ${filter === f ? 'bg-petrol-900 text-white' : 'border border-line bg-surface text-muted hover:border-brand hover:text-brand'}`}>{l}</button>
          ))}
          <span className="mx-2 h-5 w-px bg-line" />
          <span className="text-[11px] font-extrabold uppercase tracking-wide text-muted">Soglia alert:</span>
          {[180, 120, 90, 60, 30].map((d) => (
            <button key={d} onClick={() => { setAlertDays(d); toast(`Alert contratti: ${d} giorni prima della scadenza`, 'info'); }}
              className={`num rounded-md px-2 py-1 text-[11.5px] font-extrabold transition ${alertDays === d ? 'bg-brand text-white' : 'bg-surface border border-line text-muted hover:border-brand hover:text-brand'}`}>{d}g</button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="w-56"><SearchBox value={q} onChange={setQ} placeholder="Cerca contratto…" /></div>
          <Btn icon="plus" onClick={() => setCreate(true)}>Nuovo contratto</Btn>
        </div>
      </div>

      <div className="anim-fade-up flex flex-wrap gap-2" style={{ animationDelay: '40ms' }}>
        <Pill tone="teal" dot={false}>{enriched.filter((e) => e.k.stato === 'attivo').length} attivi</Pill>
        <Pill tone="petrol" dot={false}>valore annuale {fmtEURk(activeValue)}</Pill>
        {expiring > 0 && <Pill tone="amber" dot={false}>{expiring} in scadenza entro {alertDays} gg</Pill>}
        {noticeRisk > 0 && <Pill tone="red" dot={false}>{noticeRisk} con termine disdetta critico</Pill>}
      </div>

      <Card pad={false} className="anim-fade-up" delay={80}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1150px]">
            <thead className="border-b border-line bg-paper/60">
              <tr><Th>Contratto</Th><Th>Cliente</Th><Th>Scadenza</Th><Th>Ultima disdetta</Th><Th>Rinnovo</Th><Th className="text-right">Canone /mese</Th><Th className="text-right">Valore /anno</Th><Th>Fatturazione</Th><Th>Stato</Th></tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {filtered.map(({ k, dScad, lastN, dDisd }) => {
                const cust = db.customers.find((c) => c.id === k.customerId);
                return (
                  <tr key={k.id} onClick={() => navigate('contratti', { id: k.id })} className="group cursor-pointer transition hover:bg-brand-soft/40">
                    <Td><p className="num font-extrabold text-brand">{k.numero}</p><p className="max-w-[220px] truncate text-[11px] text-muted">{k.oggetto}</p></Td>
                    <Td>{cust?.nomeCommerciale ?? '—'}</Td>
                    <Td>
                      <p className="num font-extrabold text-ink">{fmtDate(k.scadenza)}</p>
                      <Pill tone={k.stato !== 'attivo' ? 'gray' : dScad < 0 ? 'red' : dScad <= alertDays ? (dScad <= 45 ? 'red' : 'amber') : 'green'} dot={false}>
                        {dScad < 0 ? `scaduto da ${-dScad} gg` : dueLabel(k.scadenza)}
                      </Pill>
                    </Td>
                    <Td>
                      <p className="num font-bold text-ink">{fmtDate(lastN)}</p>
                      <Pill tone={dDisd < -30 ? 'gray' : dDisd < 0 ? 'red' : dDisd <= 30 ? 'amber' : 'gray'} dot={false}>
                        {dDisd < 0 ? (k.rinnovoAutomatico ? 'rinnovo tacito' : `superato di ${-dDisd} gg`) : dueLabel(lastN)}
                      </Pill>
                    </Td>
                    <Td>{k.rinnovoAutomatico ? <Pill tone="green" dot={false}>tacito</Pill> : <Pill tone="gray" dot={false}>manuale</Pill>}</Td>
                    <Td className="num text-right font-extrabold text-ink">{fmtEUR(k.importoMensile)}</Td>
                    <Td className="num text-right font-extrabold text-ink">{fmtEURk(k.importoAnnuale)}</Td>
                    <Td className="capitalize">{k.fatturazione}</Td>
                    <Td><StatusPill status={k.stato} /></Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <EmptyState icon="contratti" title="Nessun contratto" sub="I contratti nascono anche dalla conversione di preventivi accettati." action={<Btn icon="plus" onClick={() => setCreate(true)}>Nuovo contratto</Btn>} />}
      </Card>

      {/* dettaglio */}
      <Modal open={!!detail} onClose={() => navigate('contratti')} size="xl"
        title={detail ? `${detail.numero} — ${detail.oggetto}` : ''}
        sub={detail ? db.customers.find((c) => c.id === detail.customerId)?.ragioneSociale : undefined}
        footer={detail && <>
          <Btn variant="danger" size="sm" icon="trash" onClick={() => { remove('contracts', detail.id, `Ha eliminato§Contratto ${detail.numero}`); navigate('contratti'); }}>Elimina</Btn>
          <div className="flex-1" />
          <Btn variant="ghost" icon="printer" onClick={() => { toast('Stampa scheda contratto: usare Ctrl+P sulla vista', 'info'); }}>Stampa scheda</Btn>
          <Btn variant="ghost" onClick={() => navigate('contratti')}>Chiudi</Btn>
          <Btn icon="edit" onClick={() => { setEditId(detail.id); navigate('contratti'); }}>Modifica</Btn>
        </>}>
        {detail && (() => {
          const cust = db.customers.find((c) => c.id === detail.customerId);
          const ws = db.worksites.find((w) => w.id === detail.worksiteId);
          const lastN = contractLastNotice(detail.scadenza, detail.disdettaMesi);
          const dDisd = daysUntil(lastN);
          const dScad = daysUntil(detail.scadenza);
          const steps = [
            { l: 'Firma', d: detail.firma, done: true },
            { l: 'Inizio', d: detail.inizio, done: daysUntil(detail.inizio) <= 0 },
            { l: 'Ultima disdetta', d: lastN, done: dDisd < 0, danger: dDisd <= 60 },
            { l: 'Scadenza', d: detail.scadenza, done: dScad < 0, danger: dScad <= alertDays },
          ];
          return (
            <div className="space-y-4">
              {/* timeline */}
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {steps.map((s, i) => (
                  <div key={s.l} className={`relative rounded-2xl border p-3 ${s.danger && !s.done ? 'border-warn/50 bg-warn-soft/50' : s.done ? 'border-line bg-paper/60' : 'border-brand/40 bg-brand-soft/50'}`}>
                    {i < steps.length - 1 && <span className="absolute -right-2 top-1/2 z-10 hidden -translate-y-1/2 text-faint md:block"><Icon name="chevR" size={13} /></span>}
                    <p className="text-[9.5px] font-extrabold uppercase tracking-[0.12em] text-muted">{s.l}</p>
                    <p className="num mt-1 text-[13.5px] font-extrabold text-ink">{fmtDate(s.d)}</p>
                    <p className="text-[10.5px] font-bold text-muted">{s.done ? 'superata' : dueLabel(s.d)}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
                {[
                  ['Cliente', cust?.ragioneSociale ?? '—'],
                  ['Cantiere', ws ? `${ws.codice} — ${ws.denominazione}` : '—'],
                  ['Responsabile', detail.responsabile || '—'],
                  ['Fatturazione', detail.fatturazione],
                  ['Canone mensile', fmtEUR(detail.importoMensile)],
                  ['Valore annuale', fmtEUR(detail.importoAnnuale)],
                  ['Preavviso disdetta', `${detail.disdettaMesi} mesi`],
                  ['Stato', detail.stato],
                ].map(([l, val]) => (
                  <div key={l} className="rounded-lg bg-paper/70 p-2.5"><p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted">{l}</p><p className="mt-0.5 truncate text-[12.5px] font-bold capitalize text-ink" title={val}>{val}</p></div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <Pill tone={detail.rinnovoAutomatico ? 'green' : 'gray'} dot={false}>rinnovo {detail.rinnovoAutomatico ? 'automatico' : 'manuale'}</Pill>
                {detail.indicizzazione && <Pill tone="blue" dot={false}>indicizzato</Pill>}
                {detail.adeguamentoIstat && <Pill tone="blue" dot={false}>adeguamento ISTAT</Pill>}
                {detail.adeguamentoCcnl && <Pill tone="blue" dot={false}>adeguamento CCNL</Pill>}
              </div>

              <div className={`rounded-2xl border p-3.5 text-[12.5px] font-bold ${dDisd < 0 ? (detail.rinnovoAutomatico ? 'border-warn/50 bg-warn-soft/60 text-[#7a5a10]' : 'border-danger/50 bg-danger-soft/60 text-danger') : dDisd <= 60 ? 'border-warn/50 bg-warn-soft/60 text-[#7a5a10]' : 'border-line bg-paper/60 text-soft'}`}>
                <p className="flex items-center gap-2"><Icon name="alert" size={15} />
                  {dDisd < 0
                    ? detail.rinnovoAutomatico
                      ? `Termine di disdetta superato il ${fmtDate(lastN)}: il contratto si intenderà rinnovato tacitamente alla scadenza del ${fmtDate(detail.scadenza)}.`
                      : `Termine di disdetta superato: valutare subito il rinnovo con ${cust?.nomeCommerciale}.`
                    : `Ultima data utile per comunicare la disdetta: ${fmtDate(lastN)} (${dueLabel(lastN)}).`}
                </p>
              </div>

              {detail.note && <p className="text-[12.5px] font-semibold text-soft">{detail.note}</p>}

              {ws && (
                <button onClick={() => navigate('cantieri', { id: ws.id })} className="flex w-full items-center justify-between rounded-2xl border border-line p-3 text-left transition hover:border-brand/50 hover:bg-brand-soft/40">
                  <span><p className="num text-[12px] font-extrabold text-brand">{ws.codice}</p><p className="text-[12.5px] font-bold text-ink">{ws.denominazione}</p></span>
                  <span className="text-[11.5px] font-bold text-brand">vedi cantiere →</span>
                </button>
              )}
            </div>
          );
        })()}
      </Modal>

      <ContractFormModal open={create} onClose={() => setCreate(false)} />
      <ContractFormModal open={!!editId} editId={editId} onClose={() => { setEditId(null); if (route.id) navigate('contratti'); }} />
    </div>
  );
}
