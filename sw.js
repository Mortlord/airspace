// Abschalt-Service-Worker: Ersetzt den Service Worker der bisherigen öffentlichen App unter
// adsb-radar.de. Browser, die ihn noch installiert haben, holen beim nächsten Besuch diese Datei,
// löschen damit alle alten Caches, melden den Service Worker ab und laden die Seite neu.
// Kann entfernt werden, sobald die öffentliche App zurückkehrt (die bringt ihren eigenen mit).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));
    await self.registration.unregister();
    const clients = await self.clients.matchAll({ type: 'window' });
    for (const c of clients) c.navigate(c.url);
  })());
});
