const fs = require('fs');
let code = fs.readFileSync('src/components/layout.tsx', 'utf8');

const target = `  {
    group: 'Operatività', items: [
      { view: 'scadenze', label: 'Scadenze', icon: 'scadenze' },
      { view: 'attivita', label: 'Attività', icon: 'attivita' },
    ],
  },`;

const replacement = `  {
    group: 'Operatività', items: [
      { view: 'scadenze', label: 'Scadenze', icon: 'scadenze' },
      { view: 'attivita', label: 'Attività', icon: 'attivita' },
    ],
  },
  {
    group: 'Amministrazione', items: [
      { view: 'fatture', label: 'Fatturazione', icon: 'documenti' },
    ],
  },`;

code = code.replace(target, replacement);

const targetTitle = `  admin: { title: 'Amministrazione', sub: 'Impostazioni globali, log di sicurezza e utenti' },`;
const replacementTitle = `  admin: { title: 'Pannello di controllo', sub: 'Impostazioni globali, log di sicurezza e utenti' },
  fatture: { title: 'Fatturazione', sub: 'Gestione fatture attive e passive' },`;

code = code.replace(targetTitle, replacementTitle);

fs.writeFileSync('src/components/layout.tsx', code);
