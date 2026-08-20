const fs = require('fs');
let code = fs.readFileSync('src/views/Admin.tsx', 'utf8');

const target = `  { id: 'attivita', label: 'Attività' },
];`;
const replacement = `  { id: 'attivita', label: 'Attività' },
  { id: 'fatture', label: 'Fatturazione' },
];`;

code = code.replace(target, replacement);

fs.writeFileSync('src/views/Admin.tsx', code);
