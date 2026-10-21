import React from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import App from './App.tsx'

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error) {
    // "insertBefore / removeChild" = something outside React (browser translation, an extension) changed the page.
    // The page is fine after a reload: do it once automatically, then show the message with a button.
    if (/insertBefore|removeChild/.test(error.message)) {
      try {
        if (!sessionStorage.getItem('wedy_dom_reload')) {
          sessionStorage.setItem('wedy_dom_reload', '1');
          window.location.reload();
        }
      } catch { /* storage blocked: the button below still works */ }
    }
  }
  render() {
    if (this.state.error) {
      const err = this.state.error as Error;
      return (
        <div style={{ padding: 40, fontFamily: 'monospace', background: '#fff1f2', minHeight: '100vh' }}>
          <h2 style={{ color: '#dc2626' }}>Runtime Error</h2>
          {/insertBefore|removeChild/.test(err.message) && (
            <p style={{ fontFamily: 'system-ui, sans-serif', fontSize: 14, color: '#7f1d1d' }}>
              La page a été modifiée par le navigateur (traduction automatique ou extension). Désactivez la traduction pour ce site, puis{' '}
              <button onClick={() => { try { sessionStorage.removeItem('wedy_dom_reload'); } catch { /* ignore */ } window.location.reload(); }}
                style={{ padding: '4px 12px', cursor: 'pointer' }}>recharger la page</button>.
            </p>
          )}
          <pre style={{ background: 'var(--danger-soft)', padding: 20, borderRadius: 8, overflow: 'auto', fontSize: 13 }}>
            {err.message}
            {'\n\n'}
            {err.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
)
