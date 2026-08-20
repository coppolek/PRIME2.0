const fs = require('fs');
let code = fs.readFileSync('src/data/demo.ts', 'utf8');

const invoicesDemo = `
import { Invoice } from '../types';

const INVOICES: Invoice[] = [
  { id: 'inv1', numero: 'FPA 001/25', data: new Date(Date.now() - 86400000 * 5).toISOString().slice(0, 10), tipo: 'attiva', customerId: 'c1', importo: 2450.00, stato: 'pagata', scadenza: new Date(Date.now() + 86400000 * 25).toISOString().slice(0, 10), note: 'Fattura mensile' },
  { id: 'inv2', numero: 'FPA 002/25', data: new Date(Date.now() - 86400000 * 15).toISOString().slice(0, 10), tipo: 'attiva', customerId: 'c2', importo: 1800.50, stato: 'inviata', scadenza: new Date(Date.now() + 86400000 * 15).toISOString().slice(0, 10), note: 'Intervento straordinario' },
  { id: 'inv3', numero: 'FPA 003/25', data: new Date(Date.now() - 86400000 * 45).toISOString().slice(0, 10), tipo: 'attiva', customerId: 'c3', importo: 3200.00, stato: 'scaduta', scadenza: new Date(Date.now() - 86400000 * 15).toISOString().slice(0, 10), note: 'Fattura trimestre' },
  { id: 'inv4', numero: 'FPA 004/25', data: new Date().toISOString().slice(0, 10), tipo: 'attiva', customerId: 'c4', importo: 950.00, stato: 'bozza', scadenza: new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 10), note: 'Nuovo cliente' },
  
  { id: 'inv5', numero: 'FPA 212/A', data: new Date(Date.now() - 86400000 * 10).toISOString().slice(0, 10), tipo: 'passiva', customerId: 'none', supplierName: 'Detergenti Industriali S.p.A.', importo: 1450.20, stato: 'inviata', scadenza: new Date(Date.now() + 86400000 * 20).toISOString().slice(0, 10), note: 'Fornitura saponi' },
  { id: 'inv6', numero: 'FPA 104', data: new Date(Date.now() - 86400000 * 35).toISOString().slice(0, 10), tipo: 'passiva', customerId: 'none', supplierName: 'Manutenzioni Rossi SRL', importo: 680.00, stato: 'pagata', scadenza: new Date(Date.now() - 86400000 * 5).toISOString().slice(0, 10), note: 'Riparazione macchinario' },
];
`;

code = code.replace("import type { DB, User, Customer, Contact, Site, Worksite, Service, Opportunity, Quote, Contract, Activity, Deadline, Doc, LedgerEntry, AuditEntry } from '../types';", "import type { DB, User, Customer, Contact, Site, Worksite, Service, Opportunity, Quote, Contract, Activity, Deadline, Doc, LedgerEntry, AuditEntry, Invoice } from '../types';");

code = code.replace("export function buildDemoDB(): DB {", invoicesDemo + "\nexport function buildDemoDB(): DB {");
code = code.replace("version: 4,", "version: 5,");
code = code.replace("docs: DOCS,", "docs: DOCS,\n    invoices: INVOICES,");

fs.writeFileSync('src/data/demo.ts', code);
