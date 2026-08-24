/**
 * The page's half of the app shell worker (#89).
 *
 * SvelteKit registers `src/service-worker.ts` automatically, and this module
 * exists because `kit.serviceWorker.register` is turned **off** in
 * `svelte.config.js`. Two reasons:
 *
 * - **The automatic registration also runs in dev**, as a module worker over the
 *   Vite dev server, where `$service-worker` reports an empty `build` and
 *   `prerendered`. That is a worker with a live `fetch` handler, a
 *   `clients.claim()` and nothing cached — pure variance in a Playwright suite
 *   that runs against `pnpm dev`. Nothing in E2E should have to reason about it.
 * - **Re-caching on launch needs a message anyway.** Registration and that
 *   message are one story; splitting them across SvelteKit's generated snippet
 *   and this file would leave neither readable.
 *
 * Everything here is best-effort. A browser with no `serviceWorker`, a private
 * window that rejects registration, an iOS tab that has not been installed — all
 * of them get the app, unchanged, with no worker. This module never throws and
 * never blocks startup.
 */

import { base } from '$app/paths';

/**
 * Must match `RECACHE_MESSAGE` in `src/service-worker.ts`, which cannot import
 * from `$lib` — a service worker may only import `$service-worker` and
 * `$env/static/public`.
 */
const RECACHE_MESSAGE = 'lm-decktools:recache';

/**
 * Register the worker and ask it to refresh the app shell.
 *
 * **Re-caching on launch is the point, not housekeeping.** WebKit's tracking
 * prevention deletes script-writable storage after 7 idle days — the Cache API
 * included — while leaving the registration itself in place. The worker would
 * then be alive with an empty cache, and nothing would refill it until a deploy
 * changed `version` and triggered a fresh `install`. Asking on every launch is
 * what closes that window.
 *
 * Called from `+layout.svelte`'s `onMount`, so it never runs during
 * prerendering.
 */
export async function startServiceWorker(): Promise<void> {
	if (!('serviceWorker' in navigator)) return;

	// The dev server has no built worker to register, and `import.meta.env.DEV`
	// is what keeps the Playwright suite deterministic. See the header note.
	if (import.meta.env.DEV) return;

	try {
		// Scope is the base path, not the origin: the app shares a document root
		// with the main site, and a worker at `/` would claim all of it. SvelteKit
		// emits the script inside the app directory, so the default scope is
		// already right — it is named here so the constraint is visible.
		const registration = await navigator.serviceWorker.register(`${base}/service-worker.js`, {
			scope: `${base}/`
		});

		// The controller is null on the very first visit — the worker is installing
		// and has claimed nothing yet. Its own `install` fills the cache, so there
		// is nothing to ask for.
		navigator.serviceWorker.controller?.postMessage({ type: RECACHE_MESSAGE });

		// A launch is also the moment to notice a new deploy. `must-revalidate` on
		// the script (see `static/.htaccess`) means this check is one conditional
		// request, and the new worker then waits for the last old tab to close.
		await registration.update();
	} catch {
		// Registration is refused in some private-browsing modes and wherever the
		// context is insecure. The app works without it; only installability and
		// the offline shell are lost.
	}
}
