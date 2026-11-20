import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClaimProfilePage } from './components/ClaimProfilePage';
import './index.css';
import './mobile.css';
import { registerSW } from 'virtual:pwa-register';

const App = React.lazy(() => import('./App'));
const CoverComparison = React.lazy(() => import('./components/CoverComparison'));
const path = window.location.pathname.replace(/\/+$/, '');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <React.Suspense fallback={<div role="status">Loading TMRW…</div>}>
      {path === '/claim' ? <ClaimProfilePage /> : path === '/concepts' ? <CoverComparison /> : <App />}
    </React.Suspense>
  </React.StrictMode>
);

registerSW({ immediate: true });
