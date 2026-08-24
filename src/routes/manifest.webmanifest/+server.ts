import { BASE_PATH } from '$lib/site';
import type { RequestHandler } from './$types';

export const prerender = true;

/**
 * The web app manifest (#89).
 *
 * **This is a storage feature, not app-store presence.** WebKit's tracking
 * prevention deletes every script-writable store — IndexedDB, Cache API,
 * LocalStorage — after 7 days without interaction, and 7 days between sessions
 * is an ordinary rhythm for a deck tool. A Home Screen web app sits outside
 * Safari with its own days-of-use counter, and Apple documents its first-party
 * data as not expected to be deleted. Installing is what converts that 7-day
 * timer into indefinite storage. See `docs/durability-convergence-transport.md`
 * D3.
 *
 * Generated rather than parked in `static/`, for the reason the sitemap is:
 * `start_url`, `scope` and every icon path carry the base path, and a
 * hand-written file drifts from `BASE_PATH` silently — the install prompt just
 * stops appearing, with nothing logged. `manifest.test.ts` fails instead.
 *
 * Two values are load-bearing beyond their own field:
 *
 * - **`display` must stay `standalone`.** `install-context.ts` detects the
 *   installed app with `matchMedia('(display-mode: standalone)')`, and that
 *   query is false under `minimal-ui` or `browser`. Weaken this and an
 *   installed Android app falls back to the browser context.
 * - **`id` is fixed and independent of `start_url`.** It is what the browser
 *   uses to decide whether an install is *this* app or a second one, and a
 *   second Home Screen icon is a third empty storage container — the failure
 *   `InstallSheet.svelte` warns about in prose. Changing `start_url` later must
 *   not orphan existing installs.
 *
 * The manifest is English-only, deliberately: it is one file for both locales,
 * and per-locale manifests would need distinct `id`s, which is precisely the
 * duplicate-install failure above. An Italian visitor installs and lands on the
 * English root; the footer switcher is one click from there.
 *
 * No `share_target` here — the manifest entry is trivial but the receiving half
 * (a POST intercept in the worker, a stash, the `.json` envelope and the
 * merge-vs-union import UI) belongs with the rest of the file transports in #91.
 */
const MANIFEST = {
	// Fixed for the lifetime of the app; see the note above.
	id: `${BASE_PATH}/`,
	name: 'LM Deck Tools',
	// Android truncates the launcher label around 12 characters.
	short_name: 'Deck Tools',
	description:
		'Manage your Magic: The Gathering card lists and collection. Every plank of data stays on your device — no accounts, no servers, no middlemen.',
	lang: 'en',
	dir: 'ltr',

	// Trailing slash because `+layout.ts` sets `trailingSlash = 'always'` — the
	// start URL must be the one that returns 200, not the one that redirects to
	// it. `scope` confines the installed app to the subfolder: the app shares a
	// document root with the main site, and a scope of `/` would swallow it.
	start_url: `${BASE_PATH}/`,
	scope: `${BASE_PATH}/`,

	display: 'standalone',
	orientation: 'any',

	// The app's own surface, so the splash screen and the launch background are
	// the colour the first paint lands on. Mirrors the `theme-color` meta in
	// `src/app.html`.
	background_color: '#0a0c10',
	theme_color: '#0a0c10',

	// `any` and `maskable` are separate images rather than one dual-purpose file:
	// a maskable icon has to keep its content inside a circle of 80% diameter, and
	// an icon drawn to that margin looks shrunken everywhere that does not crop.
	// Rendered from `docs/app-icon.html`; the command is in `docs/deployment.md`.
	icons: [
		{ src: `${BASE_PATH}/icon-192.png`, sizes: '192x192', type: 'image/png', purpose: 'any' },
		{ src: `${BASE_PATH}/icon-512.png`, sizes: '512x512', type: 'image/png', purpose: 'any' },
		{
			src: `${BASE_PATH}/icon-maskable-512.png`,
			sizes: '512x512',
			type: 'image/png',
			purpose: 'maskable'
		}
	],

	categories: ['games', 'productivity', 'utilities']
};

export const GET: RequestHandler = () => {
	return new Response(JSON.stringify(MANIFEST, null, '\t') + '\n', {
		// Apache needs `AddType application/manifest+json .webmanifest` to serve the
		// prerendered file with this type — it is in `static/.htaccess`. Without it
		// some browsers reject the manifest and the install prompt silently never
		// appears.
		headers: { 'Content-Type': 'application/manifest+json' }
	});
};
