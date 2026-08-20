import { useMemo, useState } from 'react';
import { useApp, daysSince, daysUntil, fmtDate, todayISO, uid } from '../store';
import type { Contact } from '../types';
import { Btn, Card, EmptyState, FormGrid, Modal, Pill, SearchBox, Td, Th, Icon } from '../components/ui';
import type { FieldDef } from '../components/ui';

export function ContactFormModal({ open, onClose, editId, presetCustomerId }: {
  open: boolean; onClose: () => void; editId?: string | null; presetCustomerId?: string;
}) {
  const { db, save, users } = useApp();
  const [v, setV] = useState<Record<string, unknown>>({});
  const [ready, setReady] = useState(false);
  const editing = editId ? db.contacts.find((c) => c.id === editId) : null;

  if (open && !ready) {
    setV(editing ? { ...editing } : {
      customerId: presetCustomerId ?? '', nome: '', cognome: '', ruolo: '', sede: '', telefono: '', cellulare: '',
      email: '', preferenza: 'telefono', note: '', ultimoContatto: todayISO(), prossimoFollowUp: todayISO().slice(0, 10),
    });
    setReady(true);
  }
  if (!open && ready) setReady(false);

  const fields: FieldDef[] = [
    { key: 'customerId', label: 'Cliente', type: 'select', required: true, options: db.customers.map((c) => ({ value: c.id, label: c.ragioneSociale })), span: 2 },
    { key: 'nome', label: 'Nome', required: true }, { key: 'cognome', label: 'Cognome', required: true },
    { key: 'ruolo', label: 'Ruolo', placeholder: 'Es. Responsabile Acquisti' }, { key: 'sede', label: 'Sede di riferimento' },
    { key: 'telefono', label: 'Telefono' }, { key: 'cellulare', label: 'Cellulare' },
    { key: 'email', label: 'Email', span: 2 },
    { key: 'preferenza', label: 'Preferenza di contatto', type: 'select', options: ['telefono', 'email', 'whatsapp', 'incontro'] },
    { key: 'ultimoContatto', label: 'Ultimo contatto', type: 'date' },
    { key: 'prossimoFollowUp', label: 'Prossimo follow-up', type: 'date' },
    { key: 'note', label: 'Note', type: 'textarea', span: 2 },
  ];

  const submit = () => {
    if (!v.customerId || !v.nome) return;
    const item: Contact = {
      id: editing?.id ?? uid(), customerId: v.customerId as string, nome: v.nome as string, cognome: (v.cognome as string) ?? '',
      ruolo: (v.ruolo as string) ?? '', sede: (v.sede as string) ?? '', telefono: (v.telefono as string) ?? '',
      cellulare: (v.cellulare as string) ?? '', email: (v.email as string) ?? '',
      preferenza: (v.preferenza as Contact['preferenza']) ?? 'telefono', note: (v.note as string) ?? '',
      ultimoContatto: (v.ultimoContatto as string) ?? todayISO(), prossimoFollowUp: (v.prossimoFollowUp as string) ?? todayISO(),
    };
    save('contacts', item as never, `${editing ? 'Ha aggiornato' : 'Ha creato'}§Referente ${item.nome} ${item.cognome}`);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Modifica referente' : 'Nuovo referente'} size="lg"
      sub="Registra anche telefonate, email e incontri come attività collegate"
      footer={<><Btn variant="ghost" onClick={onClose}>Annulla</Btn><Btn icon="check" disabled={!v.customerId || !v.nome} onClick={submit}>{editing ? 'Salva' : 'Crea referente'}</Btn></>}>
      <FormGrid fields={fields} values={v} onChange={(k, val) => setV((s) => ({ ...s, [k]: val }))} />
    </Modal>
  );
}

export function Contacts() {
  const { db, remove } = useApp();
  const [q, setQ] = useState('');
  const [cust, setCust] = useState('tutti');
  const [modal, setModal] = useState<{ open: boolean; editId: string | null }>({ open: false, editId: null });

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return db.contacts.filter((r) =>
      (cust === 'tutti' || r.customerId === cust) &&
      (!s || [r.nome, r.cognome, r.ruolo, r.email, db.customers.find((c) => c.id === r.customerId)?.ragioneSociale ?? ''].some((f) => f.toLowerCase().includes(s)))
    );
  }, [db, q, cust]);

  const toRecall = db.contacts.filter((r) => daysSince(r.ultimoContatto) > 90).length;

  return (
    <div className="mx-auto max-w-[1400px] space-y-4">
      <div className="anim-fade-up flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-64"><SearchBox value={q} onChange={setQ} placeholder="Cerca referente…" /></div>
          <select value={cust} onChange={(e) => setCust(e.target.value)} className="rounded-lg border border-line bg-white px-3 py-2 text-[12.5px] font-bold text-soft outline-none focus:border-brand">
            <option value="tutti">Tutti i clienti</option>
            {db.customers.map((c) => <option key={c.id} value={c.id}>{c.nomeCommerciale}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          {toRecall > 0 && <Pill tone="amber">{toRecall} da ricontattare</Pill>}
          <Btn icon="plus" onClick={() => setModal({ open: true, editId: null })}>Nuovo referente</Btn>
        </div>
      </div>

      <Card pad={false} className="anim-fade-up" delay={60}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead className="border-b border-line bg-paper/60">
              <tr><Th>Referente</Th><Th>Cliente</Th><Th>Ruolo</Th><Th>Contatti</Th><Th>Preferenza</Th><Th>Ultimo contatto</Th><Th>Prossimo follow-up</Th><Th /></tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {filtered.map((r) => {
                const c = db.customers.find((x) => x.id === r.customerId);
                const silent = daysSince(r.ultimoContatto) > 90;
                const fuLate = daysUntil(r.prossimoFollowUp) < 0;
                return (
                  <tr key={r.id} className="group transition hover:bg-brand-soft/40">
                    <Td>
                      <p className="font-extrabold text-ink">{r.nome} {r.cognome}</p>
                      {r.note && <p className="max-w-[220px] truncate text-[11px] font-medium italic text-muted">{r.note}</p>}
                    </Td>
                    <Td>{c?.nomeCommerciale ?? '—'}</Td>
                    <Td>{r.ruolo || '—'}<p className="text-[11px] text-muted">{r.sede}</p></Td>
                    <Td>
                      <p className="flex items-center gap-1.5"><Icon name="phone" size={12} className="text-faint" />{r.cellulare || r.telefono || '—'}</p>
                      <p className="flex items-center gap-1.5 text-[11px] text-muted"><Icon name="mail" size={12} className="text-faint" />{r.email || '—'}</p>
                    </Td>
                    <Td><Pill tone="petrol" dot={false}>{r.preferenza}</Pill></Td>
                    <Td><Pill tone={silent ? 'amber' : 'green'} dot={false}>{silent ? `${daysSince(r.ultimoContatto)} gg fa` : fmtDate(r.ultimoContatto)}</Pill></Td>
                    <Td><Pill tone={fuLate ? 'red' : 'blue'} dot={false}>{fmtDate(r.prossimoFollowUp)}</Pill></Td>
                    <Td className="text-right whitespace-nowrap">
                      <button className="rounded-lg p-1.5 text-muted transition hover:bg-paper hover:text-brand" onClick={() => setModal({ open: true, editId: r.id })}><Icon name="edit" size={15} /></button>
                      <button className="rounded-lg p-1.5 text-muted transition hover:bg-danger-soft hover:text-danger" onClick={() => remove('contacts', r.id, `Ha eliminato§Referente ${r.nome} ${r.cognome}`)}><Icon name="trash" size={15} /></button>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <EmptyState icon="referenti" title="Nessun referente trovato" sub="Aggiungi una persona di contatto per un cliente." />}
      </Card>

      <ContactFormModal open={modal.open} editId={modal.editId} onClose={() => setModal({ open: false, editId: null })} />
    </div>
  );
}
