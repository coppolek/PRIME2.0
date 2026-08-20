import { useState } from 'react';
import { useApp } from '../store';
import { Avatar, Btn, Icon } from '../components/ui';
import { ROLE_LABEL } from '../components/layout';

export function Login() {
  const { users, login, toast } = useApp();
  const [userId, setUserId] = useState<string | null>(null);
  const [pwd, setPwd] = useState('demo');
  const [err, setErr] = useState('');

  const submit = () => {
    if (!userId) { setErr('Seleziona un utente demo per accedere'); return; }
    if (!pwd.trim()) { setErr('Inserisci la password (per la demo: qualsiasi)'); return; }
    login(userId);
    toast('Benvenuto in Prime Cleaning CRM');
  };

  return (
    <div className="flex min-h-screen">
      {/* pannello brand */}
      <div className="sidebar-texture relative hidden flex-1 flex-col justify-between overflow-hidden bg-petrol-900 p-10 lg:flex">
        <div className="spin-slow pointer-events-none absolute -right-40 -top-40 h-[480px] w-[480px] rounded-full border-[28px] border-lime/10" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full border-[20px] border-white/5" />
        <div className="relative flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-lime text-petrol-900">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2.7S5.5 10 5.5 14.5a6.5 6.5 0 0 0 13 0C18.5 10 12 2.7 12 2.7z" /><path d="M9.3 14.8a2.8 2.8 0 0 0 2 2.7" />
            </svg>
          </span>
          <div>
            <div className="font-display text-xl font-extrabold tracking-tight text-white">PRIME<span className="text-lime"> CLEANING</span></div>
            <div className="text-[9.5px] font-extrabold uppercase tracking-[0.3em] text-white/40">CRM gestionale</div>
          </div>
        </div>

        <div className="relative max-w-md">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/8 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.18em] text-lime">
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-lime" /> Fase 1 · MVP operativo
          </p>
          <h1 className="font-display text-[42px] font-extrabold leading-[1.05] tracking-tight text-white">
            Un unico ambiente per clienti, contratti e cantieri.
          </h1>
          <p className="mt-4 text-[14.5px] font-medium leading-relaxed text-white/60">
            Dalla pipeline commerciale allo scadenzario: pulizie, facility management, servizi fieristici,
            facchinaggio e manutenzione del verde sotto controllo.
          </p>
          <div className="mt-7 grid grid-cols-2 gap-2.5">
            {[
              ['commerciale', 'Pipeline e preventivi'],
              ['contratti', 'Rinnovi e disdette'],
              ['cantieri', 'Cantieri e marginalità'],
              ['scadenze', 'Scadenzario centrale'],
            ].map(([ic, t]) => (
              <div key={t} className="flex items-center gap-2.5 rounded-2xl bg-white/5 px-3 py-2.5 text-[12.5px] font-bold text-white/80 transition hover:bg-white/10">
                <span className="text-lime"><Icon name={ic} size={16} /></span>{t}
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-[11px] font-semibold text-white/35">
          Progettato GDPR e security-by-design · audit trail · ruoli e permessi configurabili
        </p>
      </div>

      {/* form */}
      <div className="app-canvas flex w-full flex-col items-center justify-center px-5 py-10 lg:max-w-[520px]">
        <div className="anim-fade-up w-full max-w-md">
          <div className="mb-6 lg:hidden">
            <div className="font-display text-2xl font-extrabold tracking-tight text-ink">PRIME<span className="text-brand"> CLEANING</span> <span className="text-muted">CRM</span></div>
          </div>
          <h2 className="font-display text-[26px] font-extrabold tracking-tight text-ink">Accesso</h2>
          <p className="mt-1 text-[13px] font-semibold text-muted">Seleziona un profilo demo — i permessi cambiano in base al ruolo.</p>

          <div className="mt-6 space-y-2">
            {users.map((u) => (
              <button key={u.id} onClick={() => { setUserId(u.id); setErr(''); }}
                className={`flex w-full items-center gap-3 rounded-2xl border-2 bg-surface p-3 text-left transition-all duration-150 hover:shadow-card ${userId === u.id ? 'border-brand shadow-card' : 'border-line hover:border-faint'}`}>
                <Avatar name={u.nome} color={u.color} size={38} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-extrabold text-ink">{u.nome}</span>
                  <span className="block truncate text-[11.5px] font-semibold text-muted">{u.email}</span>
                </span>
                <span className={`rounded-full px-2.5 py-1 text-[10.5px] font-extrabold ${userId === u.id ? 'bg-brand text-white' : 'bg-paper text-muted'}`}>
                  {ROLE_LABEL[u.ruolo]}
                </span>
              </button>
            ))}
          </div>

          <div className="mt-5">
            <label className="mb-1 block text-[10.5px] font-extrabold uppercase tracking-[0.12em] text-muted">Password</label>
            <input type="password" value={pwd} onChange={(e) => { setPwd(e.target.value); setErr(''); }}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              className="w-full rounded-2xl border border-line bg-surface px-3.5 py-2.5 text-[13.5px] font-semibold text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15" />
            <p className="mt-1.5 text-[11px] font-semibold text-muted">Ambiente demo: è sufficiente una password qualsiasi. MFA pianificata (Fase 3).</p>
          </div>

          {err && <p className="anim-fade mt-3 flex items-center gap-1.5 text-[12.5px] font-bold text-danger"><Icon name="alert" size={14} />{err}</p>}

          <Btn onClick={submit} icon="logout" variant="primary" size="md">
            <span className="px-6 py-0.5">Entra nel CRM</span>
          </Btn>

          <p className="mt-6 text-[10.5px] font-semibold leading-relaxed text-muted">
            I dati presenti sono dimostrativi e generati localmente nel browser. Nessuna informazione reale viene trasmessa.
          </p>
        </div>
      </div>
    </div>
  );
}
