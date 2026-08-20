const fs = require('fs');
let code = fs.readFileSync('src/store.tsx', 'utf8');

code = code.replace(
  "| 'deadlines' | 'docs' | 'users';",
  "| 'deadlines' | 'docs' | 'users' | 'invoices';"
);

// We need to properly migrate db versions in store.tsx.
const oldVersionLogic = `        if (parsed.db) {
          if (parsed.db.version === 4) return parsed.db;
          if (parsed.db.version === 3) return { ...parsed.db, version: 4, users: DEMO_USERS };
        }`;

const newVersionLogic = `        if (parsed.db) {
          if (parsed.db.version === 5) return parsed.db;
          if (parsed.db.version === 4) return { ...parsed.db, version: 5, invoices: [] };
          if (parsed.db.version === 3) return { ...parsed.db, version: 5, users: DEMO_USERS, invoices: [] };
        }`;
code = code.replace(oldVersionLogic, newVersionLogic);

fs.writeFileSync('src/store.tsx', code);
