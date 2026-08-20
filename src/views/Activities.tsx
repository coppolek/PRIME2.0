import { useMemo, useState } from 'react';
import { useApp, daysUntil, dueLabel, fmtDate, todayISO, uid } from '../store';
import type { Activity } from '../types';
import { Btn, Card, EmptyState, FormGrid, Icon, Modal, Pill, SearchBox, StatusPill } from '../components/ui';
import type { FieldDef } from '../components/ui';

export const TIPO_META: Record<Activity['tipo'], { label: string; icon: string }> = {
  telefonata: { label: 'Telefonata', icon: 'phone' },
  email: { label: 'Email', icon: 'mail' },
  riunione: { label: 'Riunione', icon: 'clienti' },
  sopralluogo: { label: 'Sopralluogo', icon: 'sopralluoghi' },
  attivita: { label: 'Attività', icon: 'attivita' },
  promemoria: { label: 'Promemoria', icon: 'clock' },
  followup: { label: 'Follow-up', icon: 'refresh' },
};

export function ActivityFormModal({ open, onClose, editId, presetCustomerId }: {
  open: boolean; onClose: () => void; editId?: string | null; presetCustomerId?: string;
}) {
  const { db, save, users } = useApp();
  const [v, setV] = useState<Record<string, unknown>>({});
  const [ready, setReady] = useState(false);
  const editing = editId ? db.activities.find((a) => a.id === editId) : null;

  if (open && !ready) {
    setV(editing ? { ...editing } : {
      tipo: 'telefonata', titolo: '', responsabile: users[2]?.nome ?? '', customerId: presetCustomerId ?? '',
      contactId: '', opportunityId: '', data: todayISO(), scadenza: todayISO(), priorita: 'media', stato: 'da_fare', note: '',
    });
    setReady(true);
  }
  if (!open && ready) setReady(false);

  const contacts = db.contacts.filter((c) => !v.customerId || c.customerId === v.customerId);
  const opps = db.opportunities.filter((o) => !v.customerId || o.customerId === v.customerId);

  const fields: FieldDef[] = [
    { key: 'titolo', label: 'Titolo attività', required: true, span: 2, placeholder: 'Es. Follow-up preventivo…' },
    { key: 'tipo', label: 'Tipo', type: 'select', options: Object.entries(TIPO_META).map(([value, m]) => ({ value, label: m.label })) },
    { key: 'responsabile', label: 'Responsabile', type: 'select', required: true, options: users.map((u) => u.nome) },
    { key: 'customerId', label: 'Cliente', type: 'select', options: db.customers.map((c) => ({ value: c.id, label: c.nomeCommerciale })) },
    { key: 'contactId', label: 'Referente', type: 'select', options: contacts.map((c) => ({ value: c.id, label: `${c.nome} ${c.cognome}` })) },
    { key: 'opportunityId', label: 'Opportunità collegata', type: 'select', options: opps.map((o) => ({ value: o.id, label: o.titolo })) },
    { key: 'scadenza', label: 'Scadenza', type: 'date', required: true },
    { key: 'priorita', label: 'Priorità', type: 'select', options: ['bassa', 'media', 'alta'] },
    { key: 'stato', label: 'Stato', type: 'select', options: [{ value: 'da_fare', label: 'Da fare' }, { value: 'in_corso', label: 'In corso' }, { value: 'completata', label: 'Completata' }] },
    { key: 'note', label: 'Note', type: 'textarea', span: 2 },
  ];

  const submit = () => {
    if (!v.titolo) return;
    const item: Activity = {
      id: editing?.id ?? uid(), tipo: (v.tipo as Activity['tipo']) ?? 'attivita', titolo: v.titolo as string,
      responsabile: (v.responsabile as string) ?? '', customerId: (v.customerId as string) || null,
      contactId: (v.contactId as string) || null, opportunityId: (v.opportunityId as string) || null,
      data: (v.data as string) ?? todayISO(), scadenza: (v.scadenza as string) ?? todayISO(),
      priorita: (v.priorita as Activity['priorita']) ?? 'media', stato: (v.stato as Activity['stato']) ?? 'da_fare', note: (v.note as string) ?? '',
    };
    save('activities', item as never, `${editing ? 'Ha aggiornato' : 'Ha creato'}§Attività “${item.titolo}”`);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Modifica attività' : 'Nuova attività'} size="lg"
      footer={<><Btn variant="ghost" onClick={onClose}>Annulla</Btn><Btn icon="check" disabled={!v.titolo} onClick={submit}>{editing ? 'Salva' : 'Crea attività'}</Btn></>}>
      <FormGrid fields={fields} values={v} onChange={(k, val) => setV((s) => ({ ...s, [k]: val }))} />
    </Modal>
  );
}

export function Activities() {
  const { db, route, navigate, save, remove } = useApp();
  const [q, setQ] = useState('');
  const [bucket, setBucket] = useState<'tutte' | 'in_ritardo' | 'prossime' | 'completate'>('tutte');
  const [tipo, setTipo] = useState('tutti');
  const [create, setCreate] = useState(false);
  const [editId, setEditId] = useState<string | null>(route.id ?? null);

  const buckets = useMemo(() => ({
    in_ritardo: db.activities.filter((a) => a.stato !== 'completata' && daysUntil(a.scadenza) < 0).length,
    prossime: db.activities.filter((a) => a.stato !== 'completata' && daysUntil(a.scadenza) >= 0).length,
    completate: db.activities.filter((a) => a.stato === 'completata').length,
  }), [db.activities]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return db.activities
      .filter((a) => {
        if (bucket === 'in_ritardo' && !(a.stato !== 'completata' && daysUntil(a.scadenza) < 0)) return false;
        if (bucket === 'prossime' && !(a.stato !== 'completata' && daysUntil(a.scadenza) >= 0)) return false;
        if (bucket === 'completate' && a.stato !== 'completata') return false;
        if (tipo !== 'tutti' && a.tipo !== tipo) return false;
        if (s && ![a.titolo, a.responsabile, a.note].some((f) => f.toLowerCase().includes(s))) return false;
        return true;
      })
      .sort((a, b) => (a.stato === 'completata' ? 1 : 0) - (b.stato === 'completata' ? 1 : 0) || a.scadenza.localeCompare(b.scadenza));
  }, [db.activities, q, bucket, tipo]);

  const prioTone = { alta: 'red', media: 'amber', bassa: 'gray' } as const;

  return (
    <div className="mx-auto max-w-[1200px] space-y-4">
      <div className="anim-fade-up flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {([['tutte', db.activities.length], ['in_ritardo', buckets.in_ritardo], ['prossime', buckets.prossime], ['completate', buckets.completate]] as const).map(([b, n]) => (
            <button key={b} onClick={() => setBucket(b)}
              className={`rounded-full px-3 py-1.5 text-[12px] font-extrabold capitalize transition ${bucket === b ? 'bg-petrol-900 text-white' : 'border border-line bg-surface text-muted hover:border-brand hover:text-brand'} ${b === 'in_ritardo' && n > 0 && bucket !== b ? 'border-danger/50 text-danger' : ''}`}>
              {b === 'in_ritardo' ? 'In ritardo' : b} <span className="num ml-1 opacity-60">{n}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="rounded-lg border border-line bg-white px-3 py-2 text-[12.5px] font-bold text-soft outline-none focus:border-brand">
            <option value="tutti">Tutti i tipi</option>
            {Object.entries(TIPO_META).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
          </select>
          <div className="w-52"><SearchBox value={q} onChange={setQ} placeholder="Cerca attività…" /></div>
          <Btn icon="plus" onClick={() => setCreate(true)}>Nuova attività</Btn>
        </div>
      </div>

      <Card pad={false} className="anim-fade-up" delay={60}>
        <div className="divide-y divide-line/60">
          {filtered.map((a) => {
            const late = a.stato !== 'completata' && daysUntil(a.scadenza) < 0;
            const cust = db.customers.find((c) => c.id === a.customerId);
            const contact = db.contacts.find((c) => c.id === a.contactId);
            const opp = db.opportunities.find((o) => o.id === a.opportunityId);
            return (
              <div key={a.id} className={`group flex items-center gap-3 px-4 py-3 transition hover:bg-brand-soft/40 ${a.stato === 'completata' ? 'opacity-60' : ''}`}>
                <button
                  onClick={() => save('activities', { ...a, stato: a.stato === 'completata' ? 'da_fare' : 'completata' } as never, `${a.stato === 'completata' ? 'Ha riaperto' : 'Ha completato'}§“${a.titolo}”`)}
                  title={a.stato === 'completata' ? 'Riapri' : 'Segna come completata'}
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition ${a.stato === 'completata' ? 'border-ok bg-ok text-white' : late ? 'border-danger text-transparent hover:bg-danger-soft' : 'border-line text-transparent hover:border-ok hover:bg-ok-soft hover:text-ok'}`}>
                  <Icon name="check" size={13} />
                </button>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-paper text-petrol-700" title={TIPO_META[a.tipo].label}><Icon name={TIPO_META[a.tipo].icon} size={16} /></span>
                <div className="min-w-0 flex-1 cursor-pointer" onClick={() => setEditId(a.id)}>
                  <p className={`truncate text-[13.5px] font-extrabold text-ink ${a.stato === 'completata' ? 'line-through' : ''}`}>{a.titolo}</p>
                  <p className="truncate text-[11.5px] font-semibold text-muted">
                    {a.responsabile}
                    {cust && <> · <button className="text-brand hover:underline" onClick={(e) => { e.stopPropagation(); navigate('cliente', { id: cust.id }); }}>{cust.nomeCommerciale}</button></>}
                    {contact && <> · {contact.nome} {contact.cognome}</>}
                    {opp && <> · <span className="text-brand">opp: {opp.titolo.slice(0, 34)}…</span></>}
                  </p>
                </div>
                <Pill tone={prioTone[a.priorita]} dot={false}>{a.priorita}</Pill>
                <div className="hidden w-28 text-right sm:block">
                  <p className={`num text-[12px] font-extrabold ${late ? 'text-danger' : 'text-ink'}`}>{fmtDate(a.scadenza)}</p>
                  <p className={`text-[10.5px] font-bold ${late ? 'text-danger' : 'text-muted'}`}>{a.stato === 'completata' ? 'evasa' : dueLabel(a.scadenza)}</p>
                </div>
                <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                  <StatusPill status={a.stato} />
                  <button className="rounded-lg p-1.5 text-muted transition hover:bg-paper hover:text-brand" onClick={() => setEditId(a.id)}><Icon name="edit" size={15} /></button>
                  <button className="rounded-lg p-1.5 text-muted transition hover:bg-danger-soft hover:text-danger" onClick={() => remove('activities', a.id, `Ha eliminato§Attività “${a.titolo}”`)}><Icon name="trash" size={15} /></button>
                </div>
              </div>
            );
          })}
        </div>
        {filtered.length === 0 && <EmptyState icon="attivita" title="Nessuna attività" sub="Crea telefonate, email, riunioni, sopralluoghi e follow-up." action={<Btn icon="plus" onClick={() => setCreate(true)}>Nuova attività</Btn>} />}
      </Card>

      <ActivityFormModal open={create} onClose={() => setCreate(false)} />
      <ActivityFormModal open={!!editId} editId={editId} onClose={() => { setEditId(null); if (route.id) navigate('attivita'); }} />
    </div>
  );
}
