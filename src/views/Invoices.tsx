import { useMemo, useState } from 'react';
import { useApp, fmtEUR, uid } from '../store';
import type { Invoice } from '../types';
import { Btn, Card, EmptyState, FormGrid, Modal, Pill, SearchBox, Td, Th } from '../components/ui';
import type { FieldDef } from '../components/ui';

export function InvoiceFormModal({ open, onClose, editId, defaultType }: { open: boolean; onClose: () => void; editId?: string | null; defaultType: 'attiva' | 'passiva' }) {
  const { db, save } = useApp();
  const [v, setV] = useState<Record<string, unknown>>({});
  const [ready, setReady] = useState(false);

  const editing = editId ? db.invoices.find((k) => k.id === editId) : null;

  if (open && !ready) {
    setV(editing ? { ...editing } : {
      numero: '',
      data: new Date().toISOString().slice(0, 10),
      tipo: defaultType,
      customerId: '',
      supplierName: '',
      importo: 0,
      stato: 'bozza',
      scadenza: new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 10),
      note: '',
    });
    setReady(true);
  }
  if (!open && ready) setReady(false);

  const fields: FieldDef[] = [
    { key: 'tipo', label: 'Tipo fattura', type: 'select', options: ['attiva', 'passiva'], required: true },
    { key: 'numero', label: 'Numero documento', required: true },
    { key: 'data', label: 'Data documento', type: 'date', required: true },
    { key: 'stato', label: 'Stato', type: 'select', options: ['bozza', 'inviata', 'pagata', 'scaduta'] },
    ...(v.tipo === 'attiva' ? [
      { key: 'customerId', label: 'Cliente', type: 'select', required: true, options: db.customers.map((c) => ({ value: c.id, label: c.ragioneSociale })) },
    ] : [
      { key: 'supplierName', label: 'Fornitore', required: true },
    ] as FieldDef[]),
    { key: 'importo', label: 'Importo totale (€)', type: 'money', required: true },
    { key: 'scadenza', label: 'Scadenza pagamento', type: 'date', required: true },
    { key: 'note', label: 'Note o Descrizione', type: 'textarea', span: 2 },
  ];

  const submit = () => {
    if (!v.numero || !v.data || !v.importo) return;
    if (v.tipo === 'attiva' && !v.customerId) return;
    if (v.tipo === 'passiva' && !v.supplierName) return;

    const item: Invoice = {
      id: editing?.id ?? uid(),
      numero: v.numero as string,
      data: v.data as string,
      tipo: v.tipo as Invoice['tipo'],
      customerId: (v.customerId as string) || 'none',
      supplierName: (v.supplierName as string) || '',
      importo: Number(v.importo) || 0,
      stato: v.stato as Invoice['stato'],
      scadenza: v.scadenza as string,
      note: (v.note as string) || '',
    };
    save('invoices', item as never, `${editing ? 'Ha aggiornato' : 'Ha inserito'}§Fattura ${item.numero}`);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={editing ? `Modifica Fattura ${editing.numero}` : 'Nuova fattura'}
      footer={<>
        <Btn variant="ghost" onClick={onClose}>Annulla</Btn>
        <Btn icon="check" onClick={submit}>{editing ? 'Salva' : 'Aggiungi fattura'}</Btn>
      </>}>
      <FormGrid fields={fields} values={v} onChange={(k, val) => setV((s) => ({ ...s, [k]: val }))} />
    </Modal>
  );
}

export function Invoices() {
  const { db, remove } = useApp();
  const [q, setQ] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState<'attiva' | 'passiva'>('attiva');
  const [create, setCreate] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (db.invoices || []).filter((i) => {
      if (i.tipo !== tipoFiltro) return false;
      if (s) {
        const clientName = i.tipo === 'attiva' ? (db.customers.find(c => c.id === i.customerId)?.nomeCommerciale ?? '') : i.supplierName;
        if (![i.numero, i.note, clientName].some(f => f && f.toLowerCase().includes(s))) return false;
      }
      return true;
    }).sort((a, b) => b.data.localeCompare(a.data));
  }, [db.invoices, db.customers, q, tipoFiltro]);

  const stats = useMemo(() => {
    const list = (db.invoices || []).filter(i => i.tipo === tipoFiltro);
    const tot = list.reduce((a, b) => a + b.importo, 0);
    const inc = list.filter(i => i.stato === 'pagata').reduce((a, b) => a + b.importo, 0);
    const pend = list.filter(i => i.stato === 'inviata').reduce((a, b) => a + b.importo, 0);
    const scad = list.filter(i => i.stato === 'scaduta').reduce((a, b) => a + b.importo, 0);
    return { tot, inc, pend, scad };
  }, [db.invoices, tipoFiltro]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-4">
      <div className="anim-fade-up flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {([['attiva', 'Fatture in Uscita (Attive)'], ['passiva', 'Fatture in Ingresso (Passive)']] as const).map(([f, l]) => (
            <button key={f} onClick={() => setTipoFiltro(f)}
              className={`rounded-full px-3 py-1.5 text-[12px] font-extrabold transition ${tipoFiltro === f ? 'bg-petrol-900 text-white' : 'border border-line bg-surface text-muted hover:border-brand hover:text-brand'}`}>
              {l}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <SearchBox value={q} onChange={setQ} placeholder="Cerca fattura..." />
          <Btn icon="plus" onClick={() => { setEditId(null); setCreate(true); }}>Nuova Fattura</Btn>
        </div>
      </div>

      <div className="anim-fade-up grid gap-3 sm:grid-cols-4" style={{ animationDelay: '100ms' }}>
        {[
          { l: 'Totale Fatturato', v: stats.tot, c: 'text-ink' },
          { l: tipoFiltro === 'attiva' ? 'Incassato' : 'Pagato', v: stats.inc, c: 'text-ok' },
          { l: tipoFiltro === 'attiva' ? 'Da Incassare' : 'Da Pagare', v: stats.pend, c: 'text-warn' },
          { l: 'Scadute', v: stats.scad, c: 'text-danger' },
        ].map((s) => (
          <div key={s.l} className="rounded-2xl border border-line bg-surface p-4 text-center shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted">{s.l}</p>
            <p className={`mt-1 font-display text-xl font-extrabold tracking-tight ${s.c}`}>{fmtEUR(s.v)}</p>
          </div>
        ))}
      </div>

      <Card className="anim-fade-up p-0" style={{ animationDelay: '150ms' }}>
        {filtered.length === 0 ? (
          <EmptyState icon="documenti" title="Nessuna fattura" sub="Non ci sono fatture corrispondenti ai criteri di ricerca." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead className="bg-paper/50 text-[11px] uppercase tracking-wider text-muted">
                <tr>
                  <Th>Numero & Data</Th>
                  <Th>{tipoFiltro === 'attiva' ? 'Cliente' : 'Fornitore'}</Th>
                  <Th>Importo</Th>
                  <Th>Scadenza</Th>
                  <Th>Stato</Th>
                  <Th className="w-10"></Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {filtered.map((i) => {
                  const clientName = i.tipo === 'attiva' ? (db.customers.find(c => c.id === i.customerId)?.nomeCommerciale ?? 'Sconosciuto') : i.supplierName;
                  const stTones = { bozza: 'gray', inviata: 'blue', pagata: 'green', scaduta: 'red' } as const;
                  
                  return (
                    <tr key={i.id} className="transition-colors hover:bg-paper/40">
                      <Td>
                        <button onClick={() => { setEditId(i.id); setCreate(true); }} className="font-bold text-brand hover:underline">{i.numero}</button>
                        <div className="text-[11px] font-medium text-muted mt-0.5">{i.data}</div>
                      </Td>
                      <Td className="font-bold text-ink">{clientName}</Td>
                      <Td className="num font-extrabold text-ink">{fmtEUR(i.importo)}</Td>
                      <Td className="num font-semibold text-muted">{i.scadenza}</Td>
                      <Td>
                        <Pill tone={stTones[i.stato]}>{i.stato.toUpperCase()}</Pill>
                      </Td>
                      <Td>
                        <button onClick={() => {
                          if (window.confirm('Eliminare questa fattura?')) remove('invoices', i.id);
                        }} className="p-2 text-faint hover:text-danger transition">
                          <Icon name="x" size={16} />
                        </button>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <InvoiceFormModal open={create} onClose={() => setCreate(false)} editId={editId} defaultType={tipoFiltro} />
    </div>
  );
}
