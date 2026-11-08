import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

// Only build-time public files enter the cache. No runtime response is stored.
export function serviceWorker(version, paths) {
  return `/* ELEVA static assets ${version} */
const CACHE = 'eleva-static-${version}';
const FILES = ${JSON.stringify(paths)};
const URLS = new Set(FILES.map(path => new URL(path, self.location.href).href));
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    // Fetch without credentials and reject redirects/HTML fallbacks before storing.
    const responses = await Promise.all(FILES.map(async path => {
      const response = await fetch(new Request(new URL(path, self.location.href), { credentials: 'omit', cache: 'reload' }));
      const type = response.headers.get('content-type') || '';
      const validType = path.endsWith('.js') ? /(?:javascript|ecmascript)/.test(type)
        : path.endsWith('.css') ? type.includes('text/css') : type.includes('image/png');
      if (!response.ok || response.redirected || !validType) throw new Error('Invalid static asset: ' + path);
      // Consume each body immediately so parallel responses cannot exhaust the
      // browser's connection slots while waiting for the remaining headers.
      return new Response(await response.arrayBuffer(), { status: response.status, headers: response.headers });
    }));
    const cache = await caches.open(CACHE);
    try { await Promise.all(FILES.map((path, index) => cache.put(path, responses[index]))); }
    catch (error) { await caches.delete(CACHE); throw error; }
  })());
});
self.addEventListener('message', event => {
  if (event.data?.type === 'ACTIVATE_UPDATE') self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    // Retain the previous bundle for tabs still displaying the prior version.
    const names = (await caches.keys()).filter(name => name.startsWith('eleva-static-'));
    const previous = names.filter(name => name !== CACHE).slice(-1);
    await Promise.all(names.filter(name => name !== CACHE && !previous.includes(name)).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  // Navigations, queries, APIs, backups, authentication, cross-origin resources,
  // and any file outside the exact build allowlist always use the network.
  if (request.method !== 'GET' || request.mode === 'navigate' || !URLS.has(request.url)) return;
  event.respondWith((async () => {
    const cached = await (await caches.open(CACHE)).match(request);
    return cached || fetch(request);
  })());
});
`;
}

export function elevaPwa() {
  return {
    name: "eleva-pwa",
    apply: "build",
    async writeBundle(options, bundle) {
      const publicFiles = ["icons/eleva-192.png", "icons/eleva-512.png", "icons/eleva-maskable-512.png", "icons/apple-touch-icon.png"];
      const assets = Object.keys(bundle).filter(name => /^assets\/.*\.(js|css)$/.test(name)).sort();
      const files = [...assets, ...publicFiles];
      const hash = createHash("sha256").update(serviceWorker("VERSION", files));
      for (const file of files) hash.update(await readFile(resolve(options.dir, file)));
      await writeFile(resolve(options.dir, "sw.js"), serviceWorker(hash.digest("hex").slice(0, 16), files));
    },
  };
}
