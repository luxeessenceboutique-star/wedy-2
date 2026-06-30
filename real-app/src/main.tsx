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
  render() {
    if (this.state.error) {
      const err = this.state.error as Error;
      return (
        <div style={{ padding: 40, fontFamily: 'monospace', background: '#fff1f2', minHeight: '100vh' }}>
          <h2 style={{ color: '#dc2626' }}>Runtime Error</h2>
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
