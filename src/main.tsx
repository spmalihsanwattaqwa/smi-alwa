import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import { realtimeSync } from './lib/realtimeSync';
import './index.css';

// Initialize real-time synchronization watcher for Google Spreadsheet & WebAppScript
realtimeSync.initWatcher();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

