const fs = require('fs');
let code = fs.readFileSync('src/types.ts', 'utf8');

const invoiceInterface = `
export type InvoiceType = 'attiva' | 'passiva';
export type InvoiceStatus = 'bozza' | 'inviata' | 'pagata' | 'scaduta';

export interface Invoice {
  id: ID;
  numero: string;
  data: string;
  tipo: InvoiceType;
  customerId: ID; // For active it's customer, for passive it's supplier (but we use customer table for simplicity or just a string if it's a generic supplier)
  supplierName?: string; // If passive and not a customer
  importo: number;
  stato: InvoiceStatus;
  scadenza: string;
  note: string;
}
`;

code = code.replace('export interface DB {', invoiceInterface + '\nexport interface DB {');
code = code.replace('docs: Doc[];', 'docs: Doc[];\n  invoices: Invoice[];');
code = code.replace("| 'preventivi' | 'contratti' | 'servizi' | 'scadenze' | 'attivita' | 'admin';", "| 'preventivi' | 'contratti' | 'servizi' | 'scadenze' | 'attivita' | 'admin' | 'fatture';");

fs.writeFileSync('src/types.ts', code);
