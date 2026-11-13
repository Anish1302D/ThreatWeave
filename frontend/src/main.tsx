import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { LiveProvider } from './state/LiveStore';
import { ToastProvider } from './state/ToastStore';
import { App } from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <LiveProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </LiveProvider>
    </BrowserRouter>
  </StrictMode>,
);

