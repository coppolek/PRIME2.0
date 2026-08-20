const fs = require('fs');
let code = fs.readFileSync('src/components/layout.tsx', 'utf8');

const oldNav = `  {
    group: 'Amministrazione', items: [
      { view: 'admin', label: 'Pannello di controllo', icon: 'amministrazione' },
    ],
  }`;

// wait, let's grep NAV in layout.tsx first
