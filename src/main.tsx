import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);

// Register the privacy-first static app-shell cache only for production builds.
// It never caches /api responses, Firebase data, or user-uploaded content.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((error) => {
      console.warn('Offline app-shell support could not be enabled:', error);
    });
  });
}
