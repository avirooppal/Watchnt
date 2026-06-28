/// <reference types="@sveltejs/kit" />
import { build, files, version } from '$service-worker';

// Placeholder service worker for offline support
// Full PWA caching will be implemented in a later phase

self.addEventListener('install', (event) => {
	console.log('[ServiceWorker] Install', version);
	// @ts-expect-error - self has skipWaiting
	self.skipWaiting();
});

self.addEventListener('activate', (event) => {
	console.log('[ServiceWorker] Activate', version);
});

self.addEventListener('fetch', (event) => {
	// Fallback fetch handler
});
