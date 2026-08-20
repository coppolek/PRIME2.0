const fs = require('fs');
let code = fs.readFileSync('src/components/layout.tsx', 'utf8');

const target = `        {NAV.map((g) => {
          if (g.group === 'Sistema' && session?.ruolo !== 'admin') return null;
          return (
          <div key={g.group} className="mb-6 space-y-1">
            <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">{g.group}</div>
            {g.items.map((it) => {
              if (it.view && session?.disabledModules?.includes(it.view as View)) return null;`;

const replacement = `        {NAV.map((g) => {
          if (g.group === 'Sistema' && session?.ruolo !== 'admin') return null;
          const visibleItems = g.items.filter(it => !(it.view && session?.disabledModules?.includes(it.view as View)));
          if (visibleItems.length === 0) return null;
          return (
          <div key={g.group} className="mb-6 space-y-1">
            <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">{g.group}</div>
            {visibleItems.map((it) => {`;

code = code.replace(target, replacement);

fs.writeFileSync('src/components/layout.tsx', code);
