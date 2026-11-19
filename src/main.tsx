import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

const App = React.lazy(() => import('./App'));
const ClaimProfilePage = React.lazy(() => import('./components/ClaimProfilePage').then(module => ({ default: module.ClaimProfilePage })));
const CoverConcepts = React.lazy(() => import('./components/CoverConcepts'));
const path = window.location.pathname.replace(/\/+$/, '');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <React.Suspense fallback={<div role="status">Loading TMRW…</div>}>
      {path === '/claim' ? <ClaimProfilePage /> : path === '/concepts' ? <CoverConcepts /> : <App />}
    </React.Suspense>
  </React.StrictMode>
);

registerSW({ immediate: true });
