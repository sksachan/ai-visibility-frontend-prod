import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

/*
 * Suppress browser-extension "message channel closed" errors.
 * These originate from Chrome extensions (e.g. React DevTools, ad blockers)
 * that open a message port and close it before the page responds.
 * They are harmless and unrelated to application logic.
 */
window.addEventListener('unhandledrejection', (event) => {
  const msg = String(event.reason?.message || event.reason || '');
  if (msg.includes('message channel closed') || msg.includes('message port closed')) {
    event.preventDefault();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
