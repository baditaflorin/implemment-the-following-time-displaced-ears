// Service-worker registration. Only runs in production builds — in dev, the
// SW cache makes Vite HMR confusing and can serve stale chunks.

export function registerServiceWorker(): void {
  if (!import.meta.env.PROD) return;
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => {
      console.warn('sw registration failed', err);
    });
  });
}
