/* ============================================================
   PRIME CLEANING CRM — Modello dati relazionale (Fase 1 MVP)
   Entità collegate tramite ID univoci + timestamp + audit trail
   ============================================================ */

export type ID = string;

export type Role = 'admin' | 'direzione' | 'commerciale' | 'operativo' | 'amministrazione';

export interface User {
  id: ID;
  nome: string;
  email: string;
  ruolo: Role;
  initials: string;
  color: string;
  disabledModules?: View[];
}

export type CustomerStatus = 'prospect' | 'attivo' | 'sospeso' | 'cessato';

export interface Customer {
  id: ID;
  ragioneSociale: string;
  nomeCommerciale: string;
  piva: string;
  cf: string;
  sdi: string;
  pec: string;
  indirizzo: string;
  citta: string;
  provincia: string;
  cap: string;
  regione: string;
  telefono: string;
  email: string;
  sito: string;
  settore: string;
  tipologia: string;
  stato: CustomerStatus;
  acquisizione: string; // ISO
  commerciale: string;  // nome utente
  note: string;
  lastContact: string;  // ISO — ultimo contatto registrato
  creditExposure: number; // campo predisposto per integrazione amministrativa
  createdAt: string;
  updatedAt: string;
}

export interface Contact {
  id: ID;
  customerId: ID;
  nome: string;
  cognome: string;
  ruolo: string;
  sede: string;
  telefono: string;
  cellulare: string;
  email: string;
  preferenza: 'telefono' | 'email' | 'whatsapp' | 'incontro';
  note: string;
  ultimoContatto: string; // ISO
  prossimoFollowUp: string; // ISO
}

export interface Site {
  id: ID;
  customerId: ID;
  denominazione: string;
  indirizzo: string;
  citta: string;
  provincia: string;
  telefono: string;
  note: string;
}

export type WorksiteStatus = 'attivo' | 'pianificato' | 'sospeso' | 'chiuso';

export interface Worksite {
  id: ID;
  codice: string;
  customerId: ID;
  denominazione: string;
  indirizzo: string;
  citta: string;
  provincia: string;
  coordinate: string;
  referente: string; // nome referente cliente
  responsabile: string; // responsabile interno Prime Cleaning
  apertura: string;
  chiusuraPrevista: string;
  stato: WorksiteStatus;
  servizio: string; // categoria servizio
  frequenza: string;
  orePreviste: number; // mese
  addetti: number;
  valoreMensile: number;
  valoreAnnuale: number;
  costoPrevisto: number; // mese
  note: string;
}

export interface Service {
  id: ID;
  categoria: string;
  descrizione: string;
  tariffaOraria: number | null;
  tariffaMq: number | null;
  tariffaGiornaliera: number | null;
  forfait: number | null;
  costoInterno: number | null;
}

export type Stage =
  | 'lead' | 'primo_contatto' | 'sopralluogo' | 'elaborazione'
  | 'inviato' | 'negoziazione' | 'attesa' | 'acquisito' | 'perso';

export interface Opportunity {
  id: ID;
  customerId: ID;
  contactId: ID | null;
  titolo: string;
  servizio: string;
  valore: number; // stimato annuo
  probabilita: number; // %
  chiusuraPrevista: string;
  commerciale: string;
  origine: string;
  concorrenti: string;
  note: string;
  prossimaAzione: string;
  fase: Stage;
  lastActivity: string; // ISO — per rilevare opportunità ferme
  createdAt: string;
}

export type QuoteStatus = 'bozza' | 'inviato' | 'visualizzato' | 'trattativa' | 'accettato' | 'rifiutato' | 'scaduto';

export interface QuoteLine {
  id: ID;
  servizio: string;
  descrizione: string;
  quantita: number;
  um: string;
  prezzoUnitario: number;
  costoStimato: number;
}

export interface Quote {
  id: ID;
  numero: number;
  anno: number;
  customerId: ID;
  worksiteId: ID | null;
  contactId: ID | null;
  data: string;
  validitaGiorni: number;
  commerciale: string;
  oggetto: string;
  righe: QuoteLine[];
  iva: number; // %
  condizioni: string;
  note: string;
  stato: QuoteStatus;
  opportunityId: ID | null;
  convertedContractId: ID | null;
}

export interface Contract {
  id: ID;
  numero: string;
  customerId: ID;
  worksiteId: ID | null;
  oggetto: string;
  firma: string;
  inizio: string;
  scadenza: string;
  rinnovoAutomatico: boolean;
  disdettaMesi: number; // preavviso richiesto
  importoMensile: number;
  importoAnnuale: number;
  fatturazione: 'mensile' | 'trimestrale' | 'su evento' | 'milestone';
  indicizzazione: boolean;
  adeguamentoIstat: boolean;
  adeguamentoCcnl: boolean;
  responsabile: string;
  note: string;
  stato: 'attivo' | 'chiuso' | 'disdetto';
}

export type ActivityType = 'telefonata' | 'email' | 'riunione' | 'sopralluogo' | 'attivita' | 'promemoria' | 'followup';
export type ActivityStatus = 'da_fare' | 'in_corso' | 'completata';
export type Priority = 'bassa' | 'media' | 'alta';

export interface Activity {
  id: ID;
  tipo: ActivityType;
  titolo: string;
  responsabile: string;
  customerId: ID | null;
  contactId: ID | null;
  opportunityId: ID | null;
  data: string; // creazione
  scadenza: string;
  priorita: Priority;
  stato: ActivityStatus;
  note: string;
}

export type DeadlineCategory =
  | 'contratti' | 'disdette' | 'rinnovi' | 'preventivi' | 'gare' | 'sopralluoghi'
  | 'documenti' | 'certificazioni' | 'assicurazioni' | 'autorizzazioni' | 'manutenzioni' | 'altro';

export interface Deadline {
  id: ID;
  titolo: string;
  categoria: DeadlineCategory;
  data: string;
  priorita: Priority;
  customerId: ID | null;
  stato: 'aperta' | 'evasa';
  note: string;
}

export type DocCategory =
  | 'contratti' | 'preventivi' | 'capitolati' | 'offerte' | 'fotografie' | 'verbali'
  | 'duvri' | 'sicurezza' | 'certificazioni' | 'corrispondenza' | 'amministrazione' | 'altro';

export interface Doc {
  id: ID;
  nome: string;
  categoria: DocCategory;
  data: string;
  scadenza: string | null;
  customerId: ID | null;
  worksiteId: ID | null;
  contractId: ID | null;
  note: string;
}

/** Movimento economico mensile (base per controllo di gestione — Fase 2) */
export interface LedgerEntry {
  id: ID;
  mese: string; // YYYY-MM
  customerId: ID;
  worksiteId: ID | null;
  servizio: string;
  regione: string;
  ricavo: number;
  costo: number;
}

export interface AuditEntry {
  id: ID;
  at: string; // ISO datetime
  utente: string;
  azione: string;
  oggetto: string;
}


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

export interface DB {
  version: number;
  users: User[];
  customers: Customer[];
  contacts: Contact[];
  sites: Site[];
  worksites: Worksite[];
  services: Service[];
  opportunities: Opportunity[];
  quotes: Quote[];
  contracts: Contract[];
  activities: Activity[];
  deadlines: Deadline[];
  docs: Doc[];
  invoices: Invoice[];
  ledger: LedgerEntry[];
  audit: AuditEntry[];
}

export type View =
  | 'dashboard' | 'clienti' | 'cliente' | 'referenti' | 'cantieri' | 'commerciale'
  | 'preventivi' | 'contratti' | 'servizi' | 'scadenze' | 'attivita' | 'admin' | 'fatture';

export interface Route {
  view: View;
  id?: ID;
  tab?: string;
}

export interface Toast {
  id: ID;
  msg: string;
  kind: 'ok' | 'warn' | 'danger' | 'info';
}
