import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { TierProvider } from './providers/TierProvider';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TierProvider>
      <App />
    </TierProvider>
  </React.StrictMode>,
);
