const fs = require('fs');
let code = fs.readFileSync('src/views/Admin.tsx', 'utf8');

code = code.replace(
  "import { Icon, Avatar, Pill } from '../components/ui';",
  "import { Icon, Avatar, Pill } from '../components/ui';\nimport type { View, User } from '../types';"
);

const userRowOriginal = `{users.map(u => (
                <div key={u.id} className="flex items-center gap-4 px-5 py-4">
                  <Avatar name={u.nome} color={u.color} size={42} />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-900">{u.nome}</p>
                    <p className="text-xs font-medium text-slate-500">{u.email}</p>
                  </div>
                  <Pill tone={u.ruolo === 'admin' ? 'red' : u.ruolo === 'direzione' ? 'indigo' : 'slate'} dot={false}>
                    {u.ruolo}
                  </Pill>
                </div>
              ))}`;

const userRowNew = `              {users.map(u => (
                <UserPermsRow key={u.id} u={u} />
              ))}`;
              
code = code.replace(userRowOriginal, userRowNew);

code = `const TOGGLEABLE_MODULES: { id: View; label: string }[] = [
  { id: 'clienti', label: 'Clienti' },
  { id: 'referenti', label: 'Referenti' },
  { id: 'cantieri', label: 'Cantieri' },
  { id: 'commerciale', label: 'Commerciale' },
  { id: 'preventivi', label: 'Preventivi' },
  { id: 'contratti', label: 'Contratti' },
  { id: 'servizi', label: 'Servizi' },
  { id: 'scadenze', label: 'Scadenze' },
  { id: 'attivita', label: 'Attività' },
];

function UserPermsRow({ u }: { u: User }) {
  const { save } = useApp();
  const [open, setOpen] = useState(false);
  
  const toggle = (mod: View) => {
    const disabled = u.disabledModules || [];
    const next = disabled.includes(mod) ? disabled.filter(x => x !== mod) : [...disabled, mod];
    save('users', { ...u, disabledModules: next } as any, \`Ha modificato i permessi di § \${u.nome}\`);
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
        <Icon name={open ? 'chDown' : 'chevR'} size={18} className="text-slate-400 ml-2" />
      </div>
      {open && (
        <div className="bg-slate-50/50 px-5 py-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {TOGGLEABLE_MODULES.map(m => {
            const isOff = u.disabledModules?.includes(m.id);
            return (
              <label key={m.id} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={!isOff} onChange={() => toggle(m.id)} className="rounded text-indigo-600 focus:ring-indigo-500" />
                <span className={\`text-sm font-medium \${isOff ? 'text-slate-400' : 'text-slate-700'}\`}>{m.label}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

` + code;

fs.writeFileSync('src/views/Admin.tsx', code);
