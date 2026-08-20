import { useMemo, useState } from 'react';
import { useApp, daysUntil, dueLabel, fmtDate, todayISO, uid } from '../store';
import type { Deadline } from '../types';
import { Btn, Card, EmptyState, FormGrid, Icon, Modal, Pill, SearchBox, Td, Th } from '../components/ui';
import type { FieldDef } from '../components/ui';

const CATEGORIE = ['contratti', 'disdette', 'rinnovi', 'preventivi', 'gare', 'sopralluoghi', 'documenti', 'certificazioni', 'assicurazioni', 'autorizzazioni', 'manutenzioni', 'altro'] as const;
const CAT_TONE: Record<string, string> = {
  contratti: 'bg-brand', disdette: 'bg-danger', rinnovi: 'bg-[#477fae]', preventivi: 'bg-[#0f8a7e]',
  gare: 'bg-[#a05fb5]', sopralluoghi: 'bg-[#6ba7c9]', documenti: 'bg-[#c8a05a]', certificazioni: 'bg-[#7fa32c]',
  assicurazioni: 'bg-danger', autorizzazioni: 'bg-[#477fae]', manutenzioni: 'bg-[#9db4b7]', altro: 'bg-[#9db4b7]',
};

export function DeadlineFormModal({ open, onClose, editId }: { open: boolean; onClose: () => void; editId?: string | null }) {
  const { db, save } = useApp();
  const [v, setV] = useState<Record<string, unknown>>({});
  const [ready, setReady] = useState(false);
  const editing = editId ? db.deadlines.find((d) => d.id === editId) : null;

  if (open && !ready) {
    setV(editing ? { ...editing } : { titolo: '', categoria: 'documenti', data: todayISO(), priorita: 'media', customerId: '', stato: 'aperta', note: '' });
    setReady(true);
  }
  if (!open && ready) setReady(false);

  const fields: FieldDef[] = [
    { key: 'titolo', label: 'Titolo scadenza', required: true, span: 2, placeholder: 'Es. Rinnovo polizza RC' },
    { key: 'categoria', label: 'Categoria', type: 'select', required: true, options: [...CATEGORIE] },
    { key: 'data', label: 'Data', type: 'date', required: true },
    { key: 'priorita', label: 'Priorità', type: 'select', options: ['bassa', 'media', 'alta'] },
    { key: 'customerId', label: 'Cliente collegato', type: 'select', options: db.customers.map((c) => ({ value: c.id, label: c.nomeCommerciale })) },
    { key: 'stato', label: 'Stato', type: 'select', options: [{ value: 'aperta', label: 'Aperta' }, { value: 'evasa', label: 'Evasa' }] },
    { key: 'note', label: 'Note', type: 'textarea', span: 2 },
  ];

  const submit = () => {
    if (!v.titolo || !v.data) return;
    const item: Deadline = {
      id: editing?.id ?? uid(), titolo: v.titolo as string, categoria: v.categoria as Deadline['categoria'],
      data: v.data as string, priorita: (v.priorita as Deadline['priorita']) ?? 'media',
      customerId: (v.customerId as string) || null, stato: (v.stato as Deadline['stato']) ?? 'aperta', note: (v.note as string) ?? '',
    };
    save('deadlines', item as never, `${editing ? 'Ha aggiornato' : 'Ha creato'}§Scadenza “${item.titolo}”`);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Modifica scadenza' : 'Nuova scadenza'} size="lg"
      footer={<><Btn variant="ghost" onClick={onClose}>Annulla</Btn><Btn icon="check" disabled={!v.titolo || !v.data} onClick={submit}>Salva</Btn></>}>
      <FormGrid fields={fields} values={v} onChange={(k, val) => setV((s) => ({ ...s, [k]: val }))} />
    </Modal>
  );
}

export function Deadlines() {
  const { db, save, remove } = useApp();
  const [view, setView] = useState<'lista' | 'calendario'>('lista');
  const [cat, setCat] = useState('tutte');
  const [q, setQ] = useState('');
  const [monthCursor, setMonthCursor] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [modal, setModal] = useState<{ open: boolean; editId: string | null }>({ open: false, editId: null });

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return db.deadlines
      .filter((d) => (cat === 'tutte' || d.categoria === cat) && (!s || [d.titolo, d.note, db.customers.find((c) => c.id === d.customerId)?.nomeCommerciale ?? ''].some((f) => f.toLowerCase().includes(s))))
      .sort((a, b) => (a.stato === 'evasa' ? 1 : 0) - (b.stato === 'evasa' ? 1 : 0) || a.data.localeCompare(b.data));
  }, [db, cat, q]);

  const overdue = db.deadlines.filter((d) => d.stato === 'aperta' && daysUntil(d.data) < 0).length;
  const week = db.deadlines.filter((d) => d.stato === 'aperta' && daysUntil(d.data) >= 0 && daysUntil(d.data) <= 7).length;

  const prioTone = { alta: 'red', media: 'amber', bassa: 'gray' } as const;

  /* calendario */
  const calDays = useMemo(() => {
    const first = new Date(monthCursor.y, monthCursor.m, 1);
    const startDow = (first.getDay() + 6) % 7; // lunedì = 0
    const daysInMonth = new Date(monthCursor.y, monthCursor.m + 1, 0).getDate();
    const cells: { date: string; inMonth: boolean }[] = [];
    for (let i = 0; i < startDow; i++) {
      const d = new Date(monthCursor.y, monthCursor.m, i - startDow + 1);
      cells.push({ date: d.toISOString().slice(0, 10), inMonth: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ date: new Date(monthCursor.y, monthCursor.m, d).toISOString().slice(0, 10), inMonth: true });
    }
    while (cells.length % 7 !== 0) {
      const d = new Date(monthCursor.y, monthCursor.m + 1, cells.length - startDow - daysInMonth + 1);
      cells.push({ date: d.toISOString().slice(0, 10), inMonth: false });
    }
    return cells;
  }, [monthCursor]);

  const monthLabel = new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' }).format(new Date(monthCursor.y, monthCursor.m, 1));
  const today = todayISO();

  return (
    <div className="mx-auto max-w-[1400px] space-y-4">
      <div className="anim-fade-up flex flex-wrap items-center justify-between gap-3">
        <div className="dark-scroll flex gap-1.5 overflow-x-auto pb-1">
          {['tutte', ...CATEGORIE].map((c) => (
            <button key={c} onClick={() => setCat(c)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-extrabold capitalize transition ${cat === c ? 'bg-petrol-900 text-white' : 'border border-line bg-surface text-muted hover:border-brand hover:text-brand'}`}>
              <span className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle" style={{ background: c === 'tutte' ? '#10424c' : CAT_TONE[c] }} />
              {c} <span className="num ml-0.5 opacity-60">{db.deadlines.filter((d) => c === 'tutte' || d.categoria === c).length}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded-lg border border-line bg-white">
            <button onClick={() => setView('lista')} className={`flex items-center gap-1.5 px-3 py-2 text-[12px] font-extrabold transition ${view === 'lista' ? 'bg-petrol-900 text-white' : 'text-muted'}`}><Icon name="menu" size={14} />Lista</button>
            <button onClick={() => setView('calendario')} className={`flex items-center gap-1.5 px-3 py-2 text-[12px] font-extrabold transition ${view === 'calendario' ? 'bg-petrol-900 text-white' : 'text-muted'}`}><Icon name="calendar" size={14} />Calendario</button>
          </div>
          <div className="w-48"><SearchBox value={q} onChange={setQ} placeholder="Cerca scadenza…" /></div>
          <Btn icon="plus" onClick={() => setModal({ open: true, editId: null })}>Nuova scadenza</Btn>
        </div>
      </div>

      <div className="anim-fade-up flex flex-wrap gap-2" style={{ animationDelay: '40ms' }}>
        {overdue > 0 && <Pill tone="red" dot={false}>{overdue} scadute non evase</Pill>}
        <Pill tone={week > 0 ? 'amber' : 'green'} dot={false}>{week} nei prossimi 7 giorni</Pill>
        <Pill tone="gray" dot={false}>giornaliera · settimanale · mensile · calendario</Pill>
      </div>

      {view === 'lista' ? (
        <Card pad={false} className="anim-fade-up" delay={80}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px]">
              <thead className="border-b border-line bg-paper/60">
                <tr><Th className="w-24">Data</Th><Th>Scadenza</Th><Th>Categoria</Th><Th>Cliente</Th><Th>Priorità</Th><Th>Stato</Th><Th /></tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {filtered.map((d) => {
                  const du = daysUntil(d.data);
                  const cust = db.customers.find((c) => c.id === d.customerId);
                  return (
                    <tr key={d.id} className={`group transition hover:bg-brand-soft/40 ${d.stato === 'evasa' ? 'opacity-55' : ''}`}>
                      <Td>
                        <div className={`inline-flex w-16 flex-col items-center rounded-lg py-1.5 ${du < 0 && d.stato === 'aperta' ? 'bg-danger-soft' : du <= 7 && d.stato === 'aperta' ? 'bg-warn-soft' : 'bg-paper'}`}>
                          <span className={`num text-[15px] font-extrabold ${du < 0 && d.stato === 'aperta' ? 'text-danger' : 'text-ink'}`}>{new Date(d.data + 'T00:00:00').getDate()}</span>
                          <span className="text-[9px] font-extrabold uppercase text-muted">{new Intl.DateTimeFormat('it-IT', { month: 'short' }).format(new Date(d.data + 'T00:00:00'))}</span>
                        </div>
                      </Td>
                      <Td>
                        <p className={`font-extrabold text-ink ${d.stato === 'evasa' ? 'line-through' : ''}`}>{d.titolo}</p>
                        {d.note && <p className="text-[11px] font-medium text-muted">{d.note}</p>}
                      </Td>
                      <Td><Pill tone="petrol" dot={false}>{d.categoria}</Pill></Td>
                      <Td>{cust?.nomeCommerciale ?? '—'}</Td>
                      <Td><Pill tone={prioTone[d.priorita]} dot={false}>{d.priorita}</Pill></Td>
                      <Td>
                        {d.stato === 'evasa' ? <Pill tone="green">evasa</Pill> : (
                          <Pill tone={du < 0 ? 'red' : du === 0 ? 'amber' : du <= 7 ? 'amber' : 'gray'} dot={false}>
                            {du < 0 ? `scaduta (${dueLabel(d.data)})` : dueLabel(d.data)}
                          </Pill>
                        )}
                      </Td>
                      <Td className="whitespace-nowrap text-right">
                        {d.stato === 'aperta' && <Btn size="sm" variant="subtle" icon="check" onClick={() => save('deadlines', { ...d, stato: 'evasa' } as never, `Ha evaso§Scadenza “${d.titolo}”`)}>Evasa</Btn>}
                        <button className="ml-1 rounded-lg p-1.5 text-muted transition hover:bg-paper hover:text-brand" onClick={() => setModal({ open: true, editId: d.id })}><Icon name="edit" size={15} /></button>
                        <button className="rounded-lg p-1.5 text-muted transition hover:bg-danger-soft hover:text-danger" onClick={() => remove('deadlines', d.id, `Ha eliminato§Scadenza “${d.titolo}”`)}><Icon name="trash" size={15} /></button>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && <EmptyState icon="scadenze" title="Nessuna scadenza" sub="Contratti, disdette, gare, certificazioni e documenti in un unico scadenzario." />}
        </Card>
      ) : (
        <Card className="anim-fade-up" delay={80} pad={false}
          title={<span className="capitalize">{monthLabel}</span>}
          action={
            <div className="flex items-center gap-1.5">
              <button className="rounded-lg border border-line p-1.5 text-muted transition hover:border-brand hover:text-brand" onClick={() => setMonthCursor((c) => ({ y: c.m === 0 ? c.y - 1 : c.y, m: c.m === 0 ? 11 : c.m - 1 }))}><Icon name="chevL" size={15} /></button>
              <Btn size="sm" variant="ghost" onClick={() => { const d = new Date(); setMonthCursor({ y: d.getFullYear(), m: d.getMonth() }); }}>Oggi</Btn>
              <button className="rounded-lg border border-line p-1.5 text-muted transition hover:border-brand hover:text-brand" onClick={() => setMonthCursor((c) => ({ y: c.m === 11 ? c.y + 1 : c.y, m: c.m === 11 ? 0 : c.m + 1 }))}><Icon name="chevR" size={15} /></button>
            </div>
          }>
          <div className="grid grid-cols-7 border-b border-line bg-paper/60 text-center text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted">
            {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map((g) => <div key={g} className="py-2">{g}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {calDays.map((cell, i) => {
              const items = db.deadlines.filter((d) => d.data === cell.date && (cat === 'tutte' || d.categoria === cat));
              const isToday = cell.date === today;
              return (
                <div key={i} className={`min-h-[92px] border-b border-r border-line/60 p-1.5 transition ${cell.inMonth ? '' : 'bg-paper/40 opacity-50'} ${isToday ? 'bg-brand-soft/50' : 'hover:bg-paper/60'}`}>
                  <p className={`num mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-extrabold ${isToday ? 'bg-brand text-white' : 'text-muted'}`}>{new Date(cell.date + 'T00:00:00').getDate()}</p>
                  <div className="space-y-1">
                    {items.slice(0, 3).map((d) => (
                      <button key={d.id} onClick={() => setModal({ open: true, editId: d.id })}
                        className={`flex w-full items-center gap-1 truncate rounded-md px-1.5 py-1 text-left text-[10px] font-bold text-white transition hover:brightness-110 ${d.stato === 'evasa' ? 'opacity-50' : ''}`}
                        style={{ background: d.priorita === 'alta' ? '#d2525c' : d.priorita === 'media' ? '#d98f24' : '#477fae' }}
                        title={`${d.titolo} · ${d.categoria}`}>
                        <span className="truncate">{d.titolo}</span>
                      </button>
                    ))}
                    {items.length > 3 && <p className="text-[9.5px] font-extrabold text-muted">+{items.length - 3} altre</p>}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-4 border-t border-line px-4 py-2.5 text-[10.5px] font-bold text-muted">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-danger" />priorità alta</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-warn" />priorità media</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-info" />priorità bassa</span>
            <span className="ml-auto">clic su una scadenza per modificarla · oggi: {fmtDate(today)}</span>
          </div>
        </Card>
      )}

      <DeadlineFormModal open={modal.open} editId={modal.editId} onClose={() => setModal({ open: false, editId: null })} />
    </div>
  );
}
