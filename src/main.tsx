import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import ErrorBoundary from './components/ui/ErrorBoundary';
import { ProgressProvider } from './hooks/useProgress';
import './index.css';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <ErrorBoundary>
      <ProgressProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ProgressProvider>
    </ErrorBoundary>
  </StrictMode>,
);
