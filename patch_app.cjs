const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

if (!code.includes('import { Invoices }')) {
  code = code.replace("import { Admin } from './views/Admin';", "import { Admin } from './views/Admin';\nimport { Invoices } from './views/Invoices';");
}

const target = `      case 'attivita': return <Activities />;`;
const replacement = `      case 'attivita': return <Activities />;\n      case 'fatture': return <Invoices />;`;
code = code.replace(target, replacement);

fs.writeFileSync('src/App.tsx', code);
