const TOGGLEABLE_MODULES: { id: View; label: string }[] = [
  { id: 'clienti', label: 'Clienti' },
  { id: 'referenti', label: 'Referenti' },
  { id: 'cantieri', label: 'Cantieri' },
  { id: 'commerciale', label: 'Commerciale' },
  { id: 'preventivi', label: 'Preventivi' },
  { id: 'contratti', label: 'Contratti' },
  { id: 'servizi', label: 'Servizi' },
  { id: 'scadenze', label: 'Scadenze' },
  { id: 'attivita', label: 'Attività' },
  { id: 'fatture', label: 'Fatturazione' },
];

function UserPermsRow({ u }: { u: User }) {
  const { save } = useApp();
  const [open, setOpen] = useState(false);
  
  const toggle = (mod: View) => {
    const disabled = u.disabledModules || [];
    const next = disabled.includes(mod) ? disabled.filter(x => x !== mod) : [...disabled, mod];
    save('users', { ...u, disabledModules: next } as any, `Ha modificato i permessi di § ${u.nome}`);
  };

  return (
    <div className="flex flex-col border-b border-slate-100 last:border-0">
      <div className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-slate-50" onClick={() => setOpen(!open)}>
        <Avatar name={u.nome} color={u.color} size={42} />
        <div className="flex-1">
          <p className="text-sm font-bold text-slate-900">{u.nome}</p>
          <p className="text-xs font-medium text-slate-500">{u.email}</p>
        </div>
        <Pill tone={u.ruolo === 'admin' ? 'red' : u.ruolo === 'direzione' ? 'indigo' : 'slate'} dot={false}>
          {u.ruolo}
        </Pill>
        <Icon name={open ? 'chevD' : 'chevR'} size={18} className="text-slate-400 ml-2" />
      </div>
      {open && (
        <div className="bg-slate-50/50 px-5 py-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {TOGGLEABLE_MODULES.map(m => {
            const isOff = u.disabledModules?.includes(m.id);
            return (
              <label key={m.id} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={!isOff} onChange={() => toggle(m.id)} className="rounded text-indigo-600 focus:ring-indigo-500" />
                <span className={`text-sm font-medium ${isOff ? 'text-slate-400' : 'text-slate-700'}`}>{m.label}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { useApp } from '../store';
import { Icon, Avatar, Pill } from '../components/ui';
import type { View, User } from '../types';

export function Admin() {
  const { session, users, alertDays, setAlertDays, resetDemo, db } = useApp();
  const [localAlertDays, setLocalAlertDays] = useState(alertDays);

  if (session?.ruolo !== 'admin') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="max-w-md text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <Icon name="lock" size={24} />
          </span>
          <h2 className="mt-4 font-display text-2xl font-bold tracking-tight text-slate-900">Accesso negato</h2>
          <p className="mt-2 text-slate-500">Non hai i permessi necessari per visualizzare il pannello di amministrazione. L'accesso è riservato al ruolo Admin.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1000px] space-y-6">
      <header className="anim-fade-up flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-slate-900">Pannello Amministrazione</h1>
          <p className="mt-1 text-sm font-semibold text-slate-500">Gestisci gli utenti, le impostazioni globali e monitora l'audit trail</p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-6">
          <section className="anim-fade-up rounded-2xl border border-slate-200 bg-white shadow-sm" style={{ animationDelay: '50ms' }}>
            <header className="border-b border-slate-100 px-5 py-4">
              <h2 className="font-display text-lg font-bold tracking-tight text-slate-900">Utenti di Sistema</h2>
            </header>
            <div className="divide-y divide-slate-100">
                            {users.map(u => (
                <UserPermsRow key={u.id} u={u} />
              ))}
            </div>
          </section>

          <section className="anim-fade-up rounded-2xl border border-slate-200 bg-white shadow-sm" style={{ animationDelay: '100ms' }}>
            <header className="border-b border-slate-100 px-5 py-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold tracking-tight text-slate-900">Log Eventi (Audit Trail)</h2>
              <span className="text-xs font-semibold text-slate-400">Ultimi 20 eventi</span>
            </header>
            <div className="divide-y divide-slate-100">
              {db.audit.slice(0, 20).map(entry => {
                const date = new Date(entry.at);
                const timeStr = new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(date);
                const dateStr = new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: 'short' }).format(date);
                return (
                  <div key={entry.id} className="flex gap-4 px-5 py-3">
                    <div className="w-24 text-right pt-0.5">
                      <p className="text-xs font-bold text-slate-700">{timeStr}</p>
                      <p className="text-[10px] font-semibold text-slate-400 uppercase">{dateStr}</p>
                    </div>
                    <div className="w-[1px] bg-slate-200 relative">
                      <div className="absolute top-1.5 -left-1 w-2 h-2 rounded-full bg-slate-300"></div>
                    </div>
                    <div className="flex-1 pb-2">
                      <p className="text-sm font-bold text-slate-900">{entry.utente} <span className="font-medium text-slate-500">{entry.azione.toLowerCase()}</span></p>
                      <p className="text-sm font-semibold text-indigo-600 mt-0.5">{entry.oggetto}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="anim-fade-up rounded-2xl border border-slate-200 bg-white shadow-sm" style={{ animationDelay: '150ms' }}>
            <header className="border-b border-slate-100 px-5 py-4">
              <h2 className="font-display text-lg font-bold tracking-tight text-slate-900">Impostazioni Globali</h2>
            </header>
            <div className="p-5 space-y-5">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Soglia avviso scadenze (giorni)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900 transition-colors focus:border-indigo-500 focus:bg-white focus:outline-none"
                    value={localAlertDays}
                    onChange={(e) => setLocalAlertDays(parseInt(e.target.value, 10) || 0)}
                  />
                  <button 
                    onClick={() => setAlertDays(localAlertDays)}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-indigo-700"
                  >
                    Salva
                  </button>
                </div>
                <p className="mt-2 text-xs font-medium text-slate-500">I contratti in scadenza entro questa soglia verranno evidenziati come urgenti.</p>
              </div>
            </div>
          </section>
          
          <section className="anim-fade-up rounded-2xl border border-danger/30 bg-red-50 p-5 shadow-sm" style={{ animationDelay: '200ms' }}>
            <h2 className="font-display text-lg font-bold tracking-tight text-danger">Area Pericolosa</h2>
            <p className="mt-2 text-sm font-medium text-danger/80">Queste azioni sono irreversibili e influiscono su tutti gli utenti del sistema.</p>
            <button 
              onClick={() => {
                if(window.confirm('Sei sicuro di voler cancellare tutti i dati attuali e ripristinare il set di prova?')) {
                  resetDemo();
                }
              }} 
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-danger shadow-sm border border-danger/20 transition hover:bg-danger hover:text-white"
            >
              <Icon name="refresh" size={16} /> Ripristina Database
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
