/* FulfillOS network-only service worker.
 * Critical warehouse writes are never queued or reported as complete offline.
 */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {
  // Intentionally use the browser's normal network path. A future offline layer
  // must implement durable idempotent synchronization before caching mutations.
});
