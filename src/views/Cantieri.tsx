import { useMemo, useState } from 'react';
import { useApp, canEconomics, fmtDate, fmtEUR, fmtEURk, todayISO, uid, worksiteMarginPct, daysUntil } from '../store';
import type { Worksite } from '../types';
import { Btn, Card, EmptyState, FormGrid, Icon, Modal, Pill, SearchBox, StatusPill, Td, Th } from '../components/ui';
import type { FieldDef } from '../components/ui';

const FREQUENZE = ['Giornaliera (7g)', 'Giornaliera (6g)', '5x settimana', '3x settimana', '2x settimana', 'Settimanale', 'Quindicinale', 'Mensile', 'Su evento', 'Da pianificare'];

export function WorksiteFormModal({ open, onClose, editId, presetCustomerId }: {
  open: boolean; onClose: () => void; editId?: string | null; presetCustomerId?: string;
}) {
  const { db, save, users, navigate } = useApp();
  const [v, setV] = useState<Record<string, unknown>>({});
  const [ready, setReady] = useState(false);
  const editing = editId ? db.worksites.find((w) => w.id === editId) : null;

  if (open && !ready) {
    setV(editing ? { ...editing } : {
      codice: `CT-${new Date().getFullYear()}-${String(db.worksites.length + 1).padStart(3, '0')}`,
      customerId: presetCustomerId ?? '', denominazione: '', indirizzo: '', citta: '', provincia: '', coordinate: '',
      referente: '', responsabile: users.find((u) => u.ruolo === 'operativo')?.nome ?? '', apertura: todayISO(),
      chiusuraPrevista: '', stato: 'pianificato', servizio: db.services[0]?.categoria ?? '', frequenza: 'Da pianificare',
      orePreviste: 0, addetti: 0, valoreMensile: 0, valoreAnnuale: 0, costoPrevisto: 0, note: '',
    });
    setReady(true);
  }
  if (!open && ready) setReady(false);

  const fields: FieldDef[] = [
    { key: 'codice', label: 'Codice cantiere', required: true },
    { key: 'customerId', label: 'Cliente', type: 'select', required: true, options: db.customers.map((c) => ({ value: c.id, label: c.ragioneSociale })) },
    { key: 'denominazione', label: 'Denominazione', required: true, span: 2, placeholder: 'Es. Stabilimento Lavezzola — reparti produzione' },
    { key: 'indirizzo', label: 'Indirizzo', span: 2 },
    { key: 'citta', label: 'Città' }, { key: 'provincia', label: 'Provincia' },
    { key: 'coordinate', label: 'Coordinate / localizzazione', placeholder: '44.6501, 11.8260' },
    { key: 'referente', label: 'Referente cliente', type: 'select', options: db.contacts.filter((c) => !v.customerId || c.customerId === v.customerId).map((c) => `${c.nome} ${c.cognome}`) },
    { key: 'responsabile', label: 'Responsabile interno Prime', type: 'select', options: users.map((u) => u.nome) },
    { key: 'apertura', label: 'Data apertura', type: 'date' },
    { key: 'chiusuraPrevista', label: 'Chiusura prevista', type: 'date' },
    { key: 'stato', label: 'Stato', type: 'select', options: ['attivo', 'pianificato', 'sospeso', 'chiuso'] },
    { key: 'servizio', label: 'Tipologia servizio', type: 'select', options: db.services.map((s) => s.categoria) },
    { key: 'frequenza', label: 'Frequenza servizio', type: 'select', options: FREQUENZE },
    { key: 'orePreviste', label: 'Ore previste /mese', type: 'number', min: 0 },
    { key: 'addetti', label: 'Numero addetti', type: 'number', min: 0 },
    { key: 'valoreMensile', label: 'Valore mensile', type: 'money' },
    { key: 'valoreAnnuale', label: 'Valore annuale', type: 'money', hint: 'se 0 = mensile × 12' },
    { key: 'costoPrevisto', label: 'Costo previsto /mese', type: 'money' },
    { key: 'note', label: 'Note operative', type: 'textarea', span: 2 },
  ];

  const submit = () => {
    if (!v.customerId || !v.denominazione) return;
    const vm = Number(v.valoreMensile) || 0;
    const item: Worksite = {
      id: editing?.id ?? uid(), codice: (v.codice as string) || 'CT-NEW', customerId: v.customerId as string,
      denominazione: v.denominazione as string, indirizzo: (v.indirizzo as string) ?? '', citta: (v.citta as string) ?? '',
      provincia: (v.provincia as string) ?? '', coordinate: (v.coordinate as string) ?? '', referente: (v.referente as string) ?? '',
      responsabile: (v.responsabile as string) ?? '', apertura: (v.apertura as string) ?? todayISO(),
      chiusuraPrevista: (v.chiusuraPrevista as string) ?? '', stato: (v.stato as Worksite['stato']) ?? 'pianificato',
      servizio: (v.servizio as string) ?? '', frequenza: (v.frequenza as string) ?? '', orePreviste: Number(v.orePreviste) || 0,
      addetti: Number(v.addetti) || 0, valoreMensile: vm, valoreAnnuale: Number(v.valoreAnnuale) || vm * 12,
      costoPrevisto: Number(v.costoPrevisto) || 0, note: (v.note as string) ?? '',
    };
    save('worksites', item as never, `${editing ? 'Ha aggiornato' : 'Ha creato'}§Cantiere ${item.codice} “${item.denominazione}”`);
    onClose();
  };

  const vm = Number(v.valoreMensile) || 0;
  const cp = Number(v.costoPrevisto) || 0;
  const margine = vm ? ((vm - cp) / vm) * 100 : 0;

  return (
    <Modal open={open} onClose={onClose} title={editing ? `Modifica cantiere ${editing.codice}` : 'Nuovo cantiere'} size="xl"
      sub="Il cantiere è il presidio operativo presso il cliente"
      footer={<>
        <div className="mr-auto flex items-center gap-2 text-[12px] font-bold text-muted">
          Margine previsto:
          <Pill tone={margine < 10 ? 'red' : margine < 20 ? 'amber' : 'green'} dot={false}>{margine.toFixed(1)}%</Pill>
        </div>
        <Btn variant="ghost" onClick={onClose}>Annulla</Btn>
        <Btn icon="check" disabled={!v.customerId || !v.denominazione} onClick={submit}>{editing ? 'Salva' : 'Crea cantiere'}</Btn>
      </>}>
      <FormGrid fields={fields} values={v} onChange={(k, val) => setV((s) => ({ ...s, [k]: val }))} />
      <button className="mt-3 text-[11.5px] font-bold text-brand hover:underline" onClick={() => { onClose(); navigate('servizi'); }}>→ Consulta il catalogo servizi per le tariffe</button>
    </Modal>
  );
}

export function Cantieri() {
  const { db, route, navigate, remove, session } = useApp();
  const [q, setQ] = useState('');
  const [stato, setStato] = useState('tutti');
  const [create, setCreate] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const econ = canEconomics(session);

  const detail = route.id ? db.worksites.find((w) => w.id === route.id) : null;

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return db.worksites.filter((w) =>
      (stato === 'tutti' || w.stato === stato) &&
      (!s || [w.denominazione, w.codice, w.citta, w.servizio, db.customers.find((c) => c.id === w.customerId)?.nomeCommerciale ?? ''].some((f) => f.toLowerCase().includes(s)))
    );
  }, [db, q, stato]);

  const activeValue = db.worksites.filter((w) => w.stato === 'attivo').reduce((s, w) => s + w.valoreMensile, 0);
  const lowMargin = db.worksites.filter((w) => w.stato === 'attivo' && worksiteMarginPct(w) < 10).length;

  return (
    <div className="mx-auto max-w-[1400px] space-y-4">
      <div className="anim-fade-up flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {['tutti', 'attivo', 'pianificato', 'sospeso', 'chiuso'].map((s) => (
            <button key={s} onClick={() => setStato(s)}
              className={`rounded-full px-3 py-1.5 text-[12px] font-extrabold capitalize transition ${stato === s ? 'bg-petrol-900 text-white' : 'border border-line bg-surface text-muted hover:border-brand hover:text-brand'}`}>
              {s} <span className="num ml-1 opacity-60">{db.worksites.filter((w) => s === 'tutti' || w.stato === s).length}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="w-60"><SearchBox value={q} onChange={setQ} placeholder="Cerca cantiere, cliente…" /></div>
          <Btn icon="plus" onClick={() => setCreate(true)}>Nuovo cantiere</Btn>
        </div>
      </div>

      <div className="anim-fade-up flex flex-wrap gap-2" style={{ animationDelay: '40ms' }}>
        <Pill tone="teal" dot={false}>{db.worksites.filter((w) => w.stato === 'attivo').length} cantieri attivi</Pill>
        <Pill tone="petrol" dot={false}>valore mensile {fmtEURk(activeValue)}</Pill>
        {lowMargin > 0 && <Pill tone="red" dot={false}>{lowMargin} sotto soglia margine (10%)</Pill>}
      </div>

      <Card pad={false} className="anim-fade-up" delay={80}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1020px]">
            <thead className="border-b border-line bg-paper/60">
              <tr><Th>Codice</Th><Th>Cantiere</Th><Th>Cliente</Th><Th>Servizio</Th><Th>Frequenza</Th><Th className="text-right">Addetti</Th><Th className="text-right">Valore /mese</Th><Th className="text-right">Margine</Th><Th>Stato</Th></tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {filtered.map((w) => {
                const cust = db.customers.find((c) => c.id === w.customerId);
                const m = worksiteMarginPct(w);
                return (
                  <tr key={w.id} onClick={() => navigate('cantieri', { id: w.id })} className="group cursor-pointer transition hover:bg-brand-soft/40">
                    <Td><span className="num font-extrabold text-brand">{w.codice}</span></Td>
                    <Td><p className="font-extrabold text-ink">{w.denominazione}</p><p className="text-[11px] text-muted">{w.citta} ({w.provincia}) · resp. {w.responsabile}</p></Td>
                    <Td>{cust?.nomeCommerciale ?? '—'}</Td>
                    <Td>{w.servizio}</Td>
                    <Td className="text-[12px]">{w.frequenza}</Td>
                    <Td className="num text-right">{w.addetti}</Td>
                    <Td className="num text-right font-extrabold text-ink">{fmtEUR(w.valoreMensile)}</Td>
                    <Td className="num text-right">
                      {econ ? <Pill tone={m < 10 ? 'red' : m < 20 ? 'amber' : 'green'} dot={false}>{m.toFixed(1)}%</Pill> : <Icon name="lock" size={13} className="text-faint" />}
                    </Td>
                    <Td><StatusPill status={w.stato} /></Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <EmptyState icon="cantieri" title="Nessun cantiere" sub="Crea un cantiere o converti un preventivo accettato." action={<Btn icon="plus" onClick={() => setCreate(true)}>Nuovo cantiere</Btn>} />}
      </Card>

      {/* dettaglio cantiere */}
      <Modal open={!!detail} onClose={() => navigate('cantieri')} size="xl"
        title={detail ? `${detail.codice} — ${detail.denominazione}` : ''} sub={detail ? `${db.customers.find((c) => c.id === detail.customerId)?.ragioneSociale} · ${detail.citta}` : undefined}
        footer={detail && <>
          <Btn variant="danger" size="sm" icon="trash" onClick={() => { remove('worksites', detail.id, `Ha eliminato§Cantiere ${detail.codice}`); navigate('cantieri'); }}>Elimina</Btn>
          <div className="flex-1" />
          <Btn variant="ghost" onClick={() => navigate('cantieri')}>Chiudi</Btn>
          <Btn icon="edit" onClick={() => { setEditId(detail.id); navigate('cantieri'); }}>Modifica</Btn>
        </>}>
        {detail && (() => {
          const m = worksiteMarginPct(detail);
          const contract = db.contracts.find((k) => k.worksiteId === detail.id);
          const acts = db.activities.filter((a) => a.customerId === detail.customerId).slice(0, 4);
          const docs = db.docs.filter((d) => d.worksiteId === detail.id);
          const D = ({ icon, l, val }: { icon: string; l: string; val: string }) => (
            <div className="rounded-lg bg-paper/70 p-2.5"><p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted"><Icon name={icon} size={12} />{l}</p><p className="mt-1 truncate text-[13px] font-bold text-ink">{val || '—'}</p></div>
          );
          return (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <StatusPill status={detail.stato} />
                <Pill tone="petrol" dot={false}>{detail.servizio}</Pill>
                <Pill tone="gray" dot={false}>{detail.frequenza}</Pill>
                {econ && <Pill tone={m < 10 ? 'red' : m < 20 ? 'amber' : 'green'} dot={false}>margine {m.toFixed(1)}%</Pill>}
              </div>
              <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3">
                <D icon="pin" l="Indirizzo" val={detail.indirizzo} />
                <D icon="search" l="Coordinate" val={detail.coordinate} />
                <D icon="referenti" l="Referente cliente" val={detail.referente} />
                <D icon="user" l="Responsabile interno" val={detail.responsabile} />
                <D icon="calendar" l="Apertura" val={fmtDate(detail.apertura)} />
                <D icon="calendar" l="Chiusura prevista" val={detail.chiusuraPrevista ? fmtDate(detail.chiusuraPrevista) : '—'} />
                <D icon="clock" l="Ore previste /mese" val={String(detail.orePreviste)} />
                <D icon="clienti" l="Addetti" val={String(detail.addetti)} />
                <D icon="euro" l="Valore mensile" val={fmtEUR(detail.valoreMensile)} />
                {econ && <D icon="euro" l="Costo previsto /mese" val={fmtEUR(detail.costoPrevisto)} />}
                {econ && <D icon="trend" l="Valore annuale" val={fmtEUR(detail.valoreAnnuale)} />}
                {econ && <D icon="analisi" l="Margine previsto /mese" val={fmtEUR(detail.valoreMensile - detail.costoPrevisto)} />}
              </div>
              {detail.note && <p className="rounded-lg bg-warn-soft/60 p-3 text-[12.5px] font-semibold text-[#7a5a10]">{detail.note}</p>}
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-line p-3">
                  <p className="mb-2 text-[10.5px] font-extrabold uppercase tracking-[0.12em] text-muted">Contratto collegato</p>
                  {contract ? (
                    <button onClick={() => navigate('contratti', { id: contract.id })} className="text-left">
                      <p className="num text-[13px] font-extrabold text-brand">{contract.numero}</p>
                      <p className="text-[11.5px] font-semibold text-muted">scadenza {fmtDate(contract.scadenza)} · {daysUntil(contract.scadenza)} gg</p>
                    </button>
                  ) : <p className="text-[12px] font-semibold text-muted">Nessun contratto diretto</p>}
                </div>
                <div className="rounded-2xl border border-line p-3">
                  <p className="mb-2 text-[10.5px] font-extrabold uppercase tracking-[0.12em] text-muted">Documenti</p>
                  {docs.length ? docs.map((d) => <p key={d.id} className="truncate text-[12px] font-bold text-soft">{d.nome}</p>) : <p className="text-[12px] font-semibold text-muted">Nessun documento</p>}
                </div>
                <div className="rounded-2xl border border-line p-3">
                  <p className="mb-2 text-[10.5px] font-extrabold uppercase tracking-[0.12em] text-muted">Attività recenti cliente</p>
                  {acts.length ? acts.map((a) => <p key={a.id} className="truncate text-[12px] font-bold text-soft">• {a.titolo}</p>) : <p className="text-[12px] font-semibold text-muted">Nessuna attività</p>}
                </div>
              </div>
            </div>
          );
        })()}
      </Modal>

      <WorksiteFormModal open={create} onClose={() => setCreate(false)} />
      <WorksiteFormModal open={!!editId} editId={editId} onClose={() => setEditId(null)} />
    </div>
  );
}
