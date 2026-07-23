import { defineConfig } from 'vite';
import { readFileSync, writeFileSync } from 'fs';

// Read version from package.json to inject into service worker
const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

// Auto-generate service worker with correct cache version on each build
const swPlugin = {
  name: 'generate-sw',
  writeBundle() {
    const swContent = `// AUTO-GENERATED — do not edit manually. Version is injected from package.json at build time.
const CACHE_NAME = 'pilates-routine-v${pkg.version}';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
];

// Install — cache essential assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate — clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch — network first, fall back to cache
self.addEventListener('fetch', (event) => {
  // Skip caching for non-GET requests and external API calls (e.g., Firebase)
  if (event.request.method !== 'GET' || event.request.url.includes('googleapis.com') || event.request.url.includes('firebaseio.com')) {
    return; // Bypass service worker completely
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
`;
    writeFileSync('dist/sw.js', swContent);
    console.log(`\\n✅ Service Worker generated with CACHE_NAME: pilates-routine-v${pkg.version}\\n`);
  }
};

export default defineConfig({
  define: {
    '__APP_VERSION__': JSON.stringify(pkg.version),
  },
  plugins: [swPlugin],
});
