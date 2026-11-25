import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);

// Register the PWA worker and actively check for fresh production assets.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        updateViaCache: 'none',
      });

      // Ask the browser to check the worker script whenever the app starts.
      await registration.update().catch(() => undefined);

      // Check again whenever the installed app returns to the foreground.
      const checkForUpdate = () => {
        if (document.visibilityState === 'visible') {
          registration.update().catch(() => undefined);
        }
      };
      window.addEventListener('focus', checkForUpdate);
      document.addEventListener('visibilitychange', checkForUpdate);

      // A newly activated worker means new app files are ready; reload once
      // so the current view immediately uses the newly deployed version.
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });
    } catch (error) {
      console.error('Tolip service worker registration failed:', error);
    }
  });
}
