import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/global.scss';
import App from './App.tsx';
import ErrorBoundary from './shared/components/ErrorBoundary.tsx';
import telemetry from './services/telemetry';

telemetry.initTelemetry();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
