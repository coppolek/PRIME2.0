import { useState } from 'react';
import { useApp, fmtEUR, uid } from '../store';
import type { Service } from '../types';
import { Btn, Card, FormGrid, Icon, Modal, Pill, Td, Th } from '../components/ui';
import type { FieldDef } from '../components/ui';

const FIELDS: FieldDef[] = [
  { key: 'categoria', label: 'Categoria servizio', required: true, span: 2, placeholder: 'Es. Pulizia industriale' },
  { key: 'descrizione', label: 'Descrizione', type: 'textarea', span: 2 },
  { key: 'tariffaOraria', label: 'Tariffa oraria', type: 'money' },
  { key: 'tariffaMq', label: 'Tariffa al mq', type: 'money' },
  { key: 'tariffaGiornaliera', label: 'Tariffa giornaliera', type: 'money' },
  { key: 'forfait', label: 'Forfait mensile', type: 'money' },
  { key: 'costoInterno', label: 'Costo interno indicativo (h)', type: 'money' },
];

export function Services() {
  const { db, save, remove } = useApp();
  const [modal, setModal] = useState<{ open: boolean; edit: Service | null }>({ open: false, edit: null });
  const [v, setV] = useState<Record<string, unknown>>({});

  const openNew = () => { setV({ categoria: '', descrizione: '' }); setModal({ open: true, edit: null }); };
  const openEdit = (s: Service) => { setV({ ...s }); setModal({ open: true, edit: s }); };

  const submit = () => {
    if (!v.categoria) return;
    const item: Service = {
      id: modal.edit?.id ?? uid(), categoria: v.categoria as string, descrizione: (v.descrizione as string) ?? '',
      tariffaOraria: v.tariffaOraria ? Number(v.tariffaOraria) : null, tariffaMq: v.tariffaMq ? Number(v.tariffaMq) : null,
      tariffaGiornaliera: v.tariffaGiornaliera ? Number(v.tariffaGiornaliera) : null, forfait: v.forfait ? Number(v.forfait) : null,
      costoInterno: v.costoInterno ? Number(v.costoInterno) : null,
    };
    save('services', item as never, `${modal.edit ? 'Ha aggiornato' : 'Ha creato'}§Servizio “${item.categoria}”`);
    setModal({ open: false, edit: null });
  };

  const money = (n: number | null, suffix = '') => (n ? <span className="num font-extrabold text-ink">{fmtEUR(n)}{suffix}</span> : <span className="text-faint">—</span>);

  return (
    <div className="mx-auto max-w-[1200px] space-y-4">
      <div className="anim-fade-up flex flex-wrap items-center justify-between gap-3">
        <p className="text-[12.5px] font-semibold text-muted">
          <span className="font-extrabold text-ink">{db.services.length} categorie</span> · le tariffe alimentano i preventivi e i costi interni la marginalità
        </p>
        <Btn icon="plus" onClick={openNew}>Nuovo servizio</Btn>
      </div>

      <Card pad={false} className="anim-fade-up" delay={60}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead className="border-b border-line bg-paper/60">
              <tr><Th>Categoria</Th><Th>Descrizione</Th><Th className="text-right">Oraria</Th><Th className="text-right">Al mq</Th><Th className="text-right">Giornaliera</Th><Th className="text-right">Forfait</Th><Th className="text-right">Costo int. h</Th><Th /></tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {db.services.map((s) => {
                const usedIn = db.worksites.filter((w) => w.servizio === s.categoria).length;
                return (
                  <tr key={s.id} className="group transition hover:bg-brand-soft/40">
                    <Td>
                      <p className="font-extrabold text-ink">{s.categoria}</p>
                      {usedIn > 0 && <Pill tone="teal" dot={false}>{usedIn} cantieri</Pill>}
                    </Td>
                    <Td className="max-w-[300px] text-[12px] font-medium text-muted">{s.descrizione}</Td>
                    <Td className="text-right">{money(s.tariffaOraria, '/h')}</Td>
                    <Td className="text-right">{money(s.tariffaMq, '/mq')}</Td>
                    <Td className="text-right">{money(s.tariffaGiornaliera, '/g')}</Td>
                    <Td className="text-right">{money(s.forfait, '/mese')}</Td>
                    <Td className="text-right">{money(s.costoInterno, '/h')}</Td>
                    <Td className="whitespace-nowrap text-right">
                      <button className="rounded-lg p-1.5 text-muted transition hover:bg-paper hover:text-brand" onClick={() => openEdit(s)}><Icon name="edit" size={15} /></button>
                      <button className="rounded-lg p-1.5 text-muted transition hover:bg-danger-soft hover:text-danger" onClick={() => remove('services', s.id, `Ha eliminato§Servizio “${s.categoria}”`)}><Icon name="trash" size={15} /></button>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal open={modal.open} onClose={() => setModal({ open: false, edit: null })} title={modal.edit ? 'Modifica servizio' : 'Nuovo servizio'} size="lg"
        footer={<><Btn variant="ghost" onClick={() => setModal({ open: false, edit: null })}>Annulla</Btn><Btn icon="check" disabled={!v.categoria} onClick={submit}>Salva</Btn></>}>
        <FormGrid fields={FIELDS} values={v} onChange={(k, val) => setV((s) => ({ ...s, [k]: val }))} />
      </Modal>
    </div>
  );
}
