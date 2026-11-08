// Auto-update hook - forces app update on EVERY entry if new version available
import { useEffect, useRef } from 'react';
import { checkForUpdates, isNewerVersionAvailable, APP_VERSION } from '@/lib/versionCheck';

// Use sessionStorage to prevent infinite loops within same session only
const SESSION_UPDATE_KEY = 'session-update-done';

export function useAutoUpdate() {
  const isChecking = useRef(false);

  useEffect(() => {
    let disposed = false;
    const performAutoUpdate = async () => {
      if (isChecking.current || disposed) return;
      isChecking.current = true;
      try {
        console.log('[AutoUpdate] Checking for updates on app entry...');

        // Check server for new version
        const versionInfo = await checkForUpdates();
        if (disposed) return;

        if (versionInfo && isNewerVersionAvailable(APP_VERSION, versionInfo.latest)) {
          const attemptKey = `${APP_VERSION}:${versionInfo.latest}`;
          const previousAttempt = sessionStorage.getItem(SESSION_UPDATE_KEY);
          // Reload only once per current/target version pair, even if the bundle
          // cannot update yet. Keep the legacy flag effective during migration.
          if (previousAttempt === attemptKey || previousAttempt === 'true') return;
          console.log('[AutoUpdate] New version available:', versionInfo.latest, '(current:', APP_VERSION, ')');
          
          // Mark session so we don't loop infinitely
          sessionStorage.setItem(SESSION_UPDATE_KEY, attemptKey);

          // Clear all caches
          if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => caches.delete(name)));
            console.log('[AutoUpdate] Caches cleared');
          }

          // Unregister service workers
          if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            await Promise.all(registrations.map(reg => reg.unregister()));
            console.log('[AutoUpdate] Service workers unregistered');
          }

          // Force reload with cache bust
          console.log('[AutoUpdate] Forcing app reload...');
          const updateUrl = new URL(window.location.href);
          updateUrl.searchParams.set('v', String(Date.now()));
          window.location.href = updateUrl.toString();
        } else {
          console.log('[AutoUpdate] App is up to date (v' + APP_VERSION + ')');
        }
      } catch (error) {
        console.warn('[AutoUpdate] Error checking for updates:', error);
      } finally {
        isChecking.current = false;
      }
    };

    // Minimal delay to not block initial render
    const timer = setTimeout(performAutoUpdate, 500);

    // Re-check every time the user returns to the app (foreground)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        performAutoUpdate();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      disposed = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);
}
