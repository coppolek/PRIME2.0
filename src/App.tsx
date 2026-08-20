import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AppProvider, useApp } from './store';
import { Layout } from './components/layout';
import { Toasts } from './components/ui';
import { Login } from './views/Login';
import { Dashboard } from './views/Dashboard';
import { Customers } from './views/Customers';
import { Contacts } from './views/Contacts';
import { Cantieri } from './views/Cantieri';
import { Opportunities } from './views/Opportunities';
import { Quotes } from './views/Quotes';
import { Contracts } from './views/Contracts';
import { Services } from './views/Services';
import { Deadlines } from './views/Deadlines';
import { Activities } from './views/Activities';
import { Admin } from './views/Admin';
import { Invoices } from './views/Invoices';

/** Schermata di emergenza: nessun errore deve mai mostrare una pagina bianca */
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('Prime Cleaning CRM — errore runtime:', error, info); }
  render() {
    if (this.state.error) {
      return (
        <div className="app-canvas flex min-h-screen items-center justify-center p-6">
          <div className="anim-scale-in w-full max-w-lg rounded-2xl border border-line bg-surface p-8 text-center shadow-pop">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-danger-soft text-danger">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3.5L2.5 20h19z" /><path d="M12 9.5v5M12 17.2v.3" />
              </svg>
            </span>
            <h1 className="font-display mt-4 text-xl font-extrabold tracking-tight text-ink">Si è verificato un errore imprevisto</h1>
            <p className="mt-2 text-[13px] font-semibold leading-relaxed text-muted">
              L’applicazione ha intercettato un problema e lo ha registrato in console.
              Prova a ricaricare la pagina oppure ripristina i dati dimostrativi.
            </p>
            <p className="mt-3 break-all rounded-lg bg-paper px-3 py-2 text-left text-[11px] font-bold text-danger">{this.state.error.message}</p>
            <div className="mt-5 flex justify-center gap-2">
              <button onClick={() => window.location.reload()}
                className="rounded-lg bg-brand px-4 py-2 text-[13px] font-bold text-white transition hover:bg-brand-deep">Ricarica l’app</button>
              <button onClick={() => { try { localStorage.clear(); } catch { /* ignore */ } window.location.reload(); }}
                className="rounded-lg border border-line bg-white px-4 py-2 text-[13px] font-bold text-soft transition hover:border-brand hover:text-brand">Ripristina dati demo</button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function Router() {
  const { route, session, toasts } = useApp();

  if (!session) {
    return (
      <>
        <Login />
        <Toasts items={toasts} />
      </>
    );
  }

  if (session?.disabledModules?.includes(route.view) && route.view !== 'dashboard') {
    return (
      <Layout>
        <div className="flex min-h-[60vh] items-center justify-center p-6">
          <div className="max-w-md text-center">
            <h2 className="mt-4 font-display text-2xl font-bold tracking-tight text-slate-900">Accesso negato</h2>
            <p className="mt-2 text-slate-500">Non hai i permessi necessari per accedere a questo modulo.</p>
          </div>
        </div>
      </Layout>
    );
  }

  const view = (() => {
    switch (route.view) {
      case 'dashboard': return <Dashboard />;
      case 'clienti':
      case 'cliente': return <Customers />;
      case 'referenti': return <Contacts />;
      case 'cantieri': return <Cantieri />;
      case 'commerciale': return <Opportunities />;
      case 'preventivi': return <Quotes />;
      case 'contratti': return <Contracts />;
      case 'servizi': return <Services />;
      case 'scadenze': return <Deadlines />;
      case 'attivita': return <Activities />;
      case 'fatture': return <Invoices />;
      case 'admin': return <Admin />;
      default: return <Dashboard />;
    }
  })();

  return (
    <>
      <Layout>{view}</Layout>
      <Toasts items={toasts} />
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <Router />
      </AppProvider>
    </ErrorBoundary>
  );
}
