import { useMemo, useState } from 'react';
import { useApp, daysSince, daysUntil, fmtDate, fmtEUR, fmtEURk, todayISO, uid } from '../store';
import type { Opportunity, Stage } from '../types';
import { Avatar, Btn, Card, EmptyState, FormGrid, Icon, Modal, Pill, STAGES, SearchBox, StatusPill, Td, Th, stageMeta } from '../components/ui';
import type { FieldDef } from '../components/ui';

const ORIGINI = ['Referenza', 'Cliente esistente', 'Gara privata', 'Gara pubblica', 'Web / LinkedIn', 'Passaparola', 'Fiera di settore', 'Altro'];

export function OpportunityFormModal({ open, onClose, editId }: { open: boolean; onClose: () => void; editId?: string | null }) {
  const { db, save, users } = useApp();
  const [v, setV] = useState<Record<string, unknown>>({});
  const [ready, setReady] = useState(false);
  const editing = editId ? db.opportunities.find((o) => o.id === editId) : null;

  if (open && !ready) {
    setV(editing ? { ...editing } : {
      customerId: '', contactId: '', titolo: '', servizio: db.services[0]?.categoria ?? '', valore: 0, probabilita: 20,
      chiusuraPrevista: todayISO(), commerciale: users[2]?.nome ?? '', origine: 'Cliente esistente', concorrenti: '',
      note: '', prossimaAzione: '', fase: 'lead',
    });
    setReady(true);
  }
  if (!open && ready) setReady(false);

  const contacts = db.contacts.filter((c) => !v.customerId || c.customerId === v.customerId);
  const weighted = ((Number(v.valore) || 0) * (Number(v.probabilita) || 0)) / 100;

  const fields: FieldDef[] = [
    { key: 'titolo', label: 'Titolo opportunità', required: true, span: 2, placeholder: 'Es. Global service logistica — hub Rimini' },
    { key: 'customerId', label: 'Cliente', type: 'select', required: true, options: db.customers.map((c) => ({ value: c.id, label: c.ragioneSociale })) },
    { key: 'contactId', label: 'Referente', type: 'select', options: contacts.map((c) => ({ value: c.id, label: `${c.nome} ${c.cognome}` })) },
    { key: 'servizio', label: 'Servizio richiesto', type: 'select', options: db.services.map((s) => s.categoria) },
    { key: 'valore', label: 'Valore stimato (annuo)', type: 'money', required: true },
    { key: 'probabilita', label: 'Probabilità %', type: 'number', min: 0, max: 100 },
    { key: 'chiusuraPrevista', label: 'Chiusura prevista', type: 'date' },
    { key: 'commerciale', label: 'Commerciale responsabile', type: 'select', options: users.map((u) => u.nome) },
    { key: 'origine', label: 'Origine', type: 'select', options: ORIGINI },
    { key: 'concorrenti', label: 'Concorrenti', placeholder: 'Es. Manutencoop' },
    { key: 'fase', label: 'Fase pipeline', type: 'select', options: STAGES.map((s) => ({ value: s.key, label: s.label })) },
    { key: 'prossimaAzione', label: 'Prossima azione', span: 2, placeholder: 'Es. Inviare comparativo entro venerdì' },
    { key: 'note', label: 'Note', type: 'textarea', span: 2 },
  ];

  const submit = () => {
    if (!v.customerId || !v.titolo) return;
    const item: Opportunity = {
      id: editing?.id ?? uid(), customerId: v.customerId as string, contactId: (v.contactId as string) || null,
      titolo: v.titolo as string, servizio: (v.servizio as string) ?? '', valore: Number(v.valore) || 0,
      probabilita: Math.min(100, Math.max(0, Number(v.probabilita) || 0)), chiusuraPrevista: (v.chiusuraPrevista as string) ?? todayISO(),
      commerciale: (v.commerciale as string) ?? '', origine: (v.origine as string) ?? '', concorrenti: (v.concorrenti as string) ?? '',
      note: (v.note as string) ?? '', prossimaAzione: (v.prossimaAzione as string) ?? '',
      fase: (v.fase as Stage) ?? 'lead', lastActivity: todayISO(), createdAt: editing?.createdAt ?? todayISO(),
    };
    save('opportunities', item as never, `${editing ? 'Ha aggiornato' : 'Ha creato'}§Opportunità “${item.titolo}”`);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Modifica opportunità' : 'Nuova opportunità'} size="xl"
      footer={<>
        <div className="mr-auto text-[12px] font-bold text-muted">Valore ponderato: <span className="num text-[14px] font-extrabold text-brand">{fmtEUR(weighted)}</span> <span className="opacity-60">(valore × probabilità)</span></div>
        <Btn variant="ghost" onClick={onClose}>Annulla</Btn>
        <Btn icon="check" disabled={!v.customerId || !v.titolo} onClick={submit}>{editing ? 'Salva' : 'Crea opportunità'}</Btn>
      </>}>
      <FormGrid fields={fields} values={v} onChange={(k, val) => setV((s) => ({ ...s, [k]: val }))} />
    </Modal>
  );
}

export function Opportunities() {
  const { db, route, navigate, save, remove, session } = useApp();
  const [view, setView] = useState<'kanban' | 'lista'>('kanban');
  const [q, setQ] = useState('');
  const [create, setCreate] = useState(false);
  const [editing, setEditing] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<Stage | null>(null);

  const detail = route.id ? db.opportunities.find((o) => o.id === route.id) : null;

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return db.opportunities.filter((o) =>
      !s || [o.titolo, o.servizio, o.commerciale, db.customers.find((c) => c.id === o.customerId)?.nomeCommerciale ?? ''].some((f) => f.toLowerCase().includes(s))
    );
  }, [db, q]);

  const openOpps = db.opportunities.filter((o) => !['acquisito', 'perso'].includes(o.fase));
  const weightedTotal = openOpps.reduce((s, o) => s + (o.valore * o.probabilita) / 100, 0);
  const closingSoon = openOpps.filter((o) => daysUntil(o.chiusuraPrevista) <= 30 && daysUntil(o.chiusuraPrevista) >= 0).length;

  const move = (id: string, fase: Stage) => {
    const o = db.opportunities.find((x) => x.id === id);
    if (!o || o.fase === fase) return;
    save('opportunities', { ...o, fase, lastActivity: todayISO() } as never, `Ha spostato§“${o.titolo}” → ${stageMeta(fase).label}`);
  };

  return (
    <div className="mx-auto max-w-[1500px] space-y-4">
      <div className="anim-fade-up flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone="teal" dot={false}>{openOpps.length} aperte</Pill>
          <Pill tone="petrol" dot={false}>ponderato {fmtEURk(weightedTotal)}</Pill>
          <Pill tone={closingSoon > 0 ? 'amber' : 'gray'} dot={false}>{closingSoon} in chiusura entro 30 gg</Pill>
          {session?.ruolo === 'commerciale' && <Pill tone="blue" dot={false}>vista: {session.nome}</Pill>}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded-lg border border-line bg-white">
            <button onClick={() => setView('kanban')} className={`flex items-center gap-1.5 px-3 py-2 text-[12px] font-extrabold transition ${view === 'kanban' ? 'bg-petrol-900 text-white' : 'text-muted hover:text-ink'}`}><Icon name="commerciale" size={14} />Kanban</button>
            <button onClick={() => setView('lista')} className={`flex items-center gap-1.5 px-3 py-2 text-[12px] font-extrabold transition ${view === 'lista' ? 'bg-petrol-900 text-white' : 'text-muted hover:text-ink'}`}><Icon name="menu" size={14} />Lista</button>
          </div>
          <div className="w-52"><SearchBox value={q} onChange={setQ} placeholder="Cerca opportunità…" /></div>
          <Btn icon="plus" onClick={() => setCreate(true)}>Nuova opportunità</Btn>
        </div>
      </div>

      {view === 'kanban' ? (
        <div className="dark-scroll anim-fade-up -mx-4 overflow-x-auto px-4 pb-4 lg:-mx-6 lg:px-6" style={{ animationDelay: '60ms' }}>
          <div className="flex gap-3" style={{ minWidth: 'max-content' }}>
            {STAGES.map((st) => {
              const items = filtered.filter((o) => o.fase === st.key);
              const tot = items.reduce((s, o) => s + (o.valore * o.probabilita) / 100, 0);
              return (
                <div key={st.key}
                  onDragOver={(e) => { e.preventDefault(); setOverCol(st.key); }}
                  onDragLeave={() => setOverCol((c) => (c === st.key ? null : c))}
                  onDrop={(e) => { e.preventDefault(); if (dragId) move(dragId, st.key); setDragId(null); setOverCol(null); }}
                  className={`flex w-[262px] shrink-0 flex-col rounded-2xl border border-line bg-paper/70 transition ${overCol === st.key ? 'drag-over' : ''}`}>
                  <header className="flex items-center gap-2 border-b border-line/70 px-3 py-2.5">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: st.color }} />
                    <span className="flex-1 text-[12px] font-extrabold text-ink">{st.label}</span>
                    <span className="num rounded-full bg-surface px-2 py-0.5 text-[10.5px] font-extrabold text-muted shadow-sm">{items.length}</span>
                  </header>
                  <p className="num px-3 pt-2 text-[10.5px] font-bold text-muted">pond. {fmtEURk(tot)}</p>
                  <div className="flex min-h-[120px] flex-1 flex-col gap-2 p-2.5">
                    {items.map((o) => {
                      const cust = db.customers.find((c) => c.id === o.customerId);
                      const frozen = daysSince(o.lastActivity) > 30 && !['acquisito', 'perso'].includes(o.fase);
                      const late = daysUntil(o.chiusuraPrevista) < 0 && !['acquisito', 'perso'].includes(o.fase);
                      return (
                        <article key={o.id} draggable
                          onDragStart={(e) => { setDragId(o.id); e.dataTransfer.effectAllowed = 'move'; }}
                          onDragEnd={() => { setDragId(null); setOverCol(null); }}
                          onClick={() => navigate('commerciale', { id: o.id })}
                          className={`group cursor-grab rounded-lg border border-line bg-surface p-3 shadow-card transition-all duration-150 hover:-translate-y-0.5 hover:border-brand/50 hover:shadow-pop active:cursor-grabbing ${dragId === o.id ? 'dragging' : ''}`}>
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-[12.5px] font-extrabold leading-snug text-ink group-hover:text-brand">{o.titolo}</p>
                            <span className="text-faint opacity-0 transition group-hover:opacity-100"><Icon name="grip" size={13} /></span>
                          </div>
                          <p className="mt-0.5 text-[11px] font-bold text-brand-deep">{cust?.nomeCommerciale}</p>
                          <p className="text-[10.5px] font-semibold text-muted">{o.servizio}</p>
                          <div className="mt-2 flex items-center justify-between">
                            <span className="num text-[13px] font-extrabold text-ink">{fmtEURk(o.valore)}</span>
                            <span className="num rounded-md px-1.5 py-0.5 text-[10.5px] font-extrabold" style={{ background: `${st.color}22`, color: st.color }}>{o.probabilita}%</span>
                          </div>
                          <div className="mt-2 flex items-center justify-between border-t border-line/60 pt-2">
                            <span className={`num text-[10.5px] font-bold ${late ? 'text-danger' : 'text-muted'}`}>{late ? '⚠ ' : ''}chiusura {fmtDate(o.chiusuraPrevista)}</span>
                            <Avatar name={o.commerciale} size={20} />
                          </div>
                          {frozen && <p className="mt-1.5 flex items-center gap-1 text-[10px] font-extrabold text-warn"><Icon name="clock" size={11} />ferma da {daysSince(o.lastActivity)} gg</p>}
                          {o.prossimaAzione && !['acquisito', 'perso'].includes(o.fase) && (
                            <p className="mt-1.5 line-clamp-1 text-[10.5px] font-semibold italic text-muted">→ {o.prossimaAzione}</p>
                          )}
                        </article>
                      );
                    })}
                    {items.length === 0 && (
                      <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-line py-6 text-[11px] font-bold text-faint">
                        trascina qui
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <Card pad={false} className="anim-fade-up" delay={60}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead className="border-b border-line bg-paper/60">
                <tr><Th>Opportunità</Th><Th>Cliente</Th><Th>Fase</Th><Th className="text-right">Valore</Th><Th className="text-right">Prob.</Th><Th className="text-right">Ponderato</Th><Th>Chiusura</Th><Th>Commerciale</Th></tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {filtered.map((o) => {
                  const cust = db.customers.find((c) => c.id === o.customerId);
                  const sm = stageMeta(o.fase);
                  return (
                    <tr key={o.id} onClick={() => navigate('commerciale', { id: o.id })} className="cursor-pointer transition hover:bg-brand-soft/40">
                      <Td><p className="font-extrabold text-ink">{o.titolo}</p><p className="text-[11px] text-muted">{o.servizio} · {o.origine}</p></Td>
                      <Td>{cust?.nomeCommerciale}</Td>
                      <Td><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: sm.color }} /><span className="text-[12px] font-bold">{sm.label}</span></span></Td>
                      <Td className="num text-right font-extrabold text-ink">{fmtEUR(o.valore)}</Td>
                      <Td className="num text-right">{o.probabilita}%</Td>
                      <Td className="num text-right font-extrabold text-brand">{fmtEUR((o.valore * o.probabilita) / 100)}</Td>
                      <Td><Pill tone={daysUntil(o.chiusuraPrevista) < 0 && !['acquisito', 'perso'].includes(o.fase) ? 'red' : 'gray'} dot={false}>{fmtDate(o.chiusuraPrevista)}</Pill></Td>
                      <Td>{o.commerciale}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && <EmptyState icon="commerciale" title="Nessuna opportunità" />}
        </Card>
      )}

      {/* dettaglio */}
      <Modal open={!!detail && !editing} onClose={() => navigate('commerciale')} size="lg"
        title={detail?.titolo ?? ''} sub={detail ? `${db.customers.find((c) => c.id === detail.customerId)?.ragioneSociale} · ${detail.origine}` : undefined}
        footer={detail && <>
          <Btn variant="danger" size="sm" icon="trash" onClick={() => { remove('opportunities', detail.id, `Ha eliminato§Opportunità “${detail.titolo}”`); navigate('commerciale'); }}>Elimina</Btn>
          <div className="flex-1" />
          <Btn variant="ghost" onClick={() => navigate('commerciale')}>Chiudi</Btn>
          <Btn icon="edit" onClick={() => setEditing(true)}>Modifica</Btn>
        </>}>
        {detail && (() => {
          const cust = db.customers.find((c) => c.id === detail.customerId);
          const contact = db.contacts.find((c) => c.id === detail.contactId);
          const sm = stageMeta(detail.fase);
          return (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full px-3 py-1 text-[11.5px] font-extrabold text-white" style={{ background: sm.color }}>{sm.label}</span>
                <span className="num text-[15px] font-extrabold text-ink">{fmtEUR(detail.valore)}</span>
                <span className="text-[12px] font-bold text-muted">× {detail.probabilita}% =</span>
                <span className="num rounded-lg bg-brand-soft px-2.5 py-1 text-[13px] font-extrabold text-brand-deep">{fmtEUR((detail.valore * detail.probabilita) / 100)} ponderati</span>
              </div>
              <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3">
                {[
                  ['Cliente', cust?.ragioneSociale ?? '—'], ['Referente', contact ? `${contact.nome} ${contact.cognome}` : '—'],
                  ['Servizio', detail.servizio], ['Commerciale', detail.commerciale], ['Origine', detail.origine],
                  ['Concorrenti', detail.concorrenti || '—'], ['Chiusura prevista', fmtDate(detail.chiusuraPrevista)],
                  ['Ultima attività', `${daysSince(detail.lastActivity)} gg fa`], ['Creata il', fmtDate(detail.createdAt)],
                ].map(([l, val]) => (
                  <div key={l} className="rounded-lg bg-paper/70 p-2.5"><p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted">{l}</p><p className="mt-0.5 text-[12.5px] font-bold text-ink">{val}</p></div>
                ))}
              </div>
              {detail.prossimaAzione && (
                <p className="rounded-lg border border-brand/30 bg-brand-soft p-3 text-[12.5px] font-bold text-brand-deep"><span className="font-extrabold uppercase tracking-wide">Prossima azione: </span>{detail.prossimaAzione}</p>
              )}
              {detail.note && <p className="text-[12.5px] font-semibold text-soft">{detail.note}</p>}
              <div className="flex flex-wrap gap-1.5 border-t border-line pt-3">
                <span className="mr-1 py-1.5 text-[11px] font-extrabold uppercase tracking-wide text-muted">Sposta in:</span>
                {STAGES.filter((s) => s.key !== detail.fase).map((s) => (
                  <button key={s.key} onClick={() => move(detail.id, s.key)}
                    className="rounded-full border border-line px-2.5 py-1 text-[11px] font-extrabold text-muted transition hover:border-brand hover:text-brand">
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })()}
      </Modal>

      <OpportunityFormModal open={create} onClose={() => setCreate(false)} />
      <OpportunityFormModal open={editing} editId={detail?.id} onClose={() => setEditing(false)} />
    </div>
  );
}
