import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClaimProfilePage } from './components/ClaimProfilePage';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

const App = React.lazy(() => import('./App'));
const isClaim = window.location.pathname.replace(/\/+$/, '') === '/claim';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <React.Suspense fallback={<div role="status">Loading TMRW…</div>}>
      {isClaim ? <ClaimProfilePage /> : <App />}
    </React.Suspense>
  </React.StrictMode>
);

registerSW({ immediate: true });
