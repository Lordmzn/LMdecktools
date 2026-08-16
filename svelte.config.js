import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		// `fallback` is what gives unknown URLs a branded page: Apache's
		// ErrorDocument serves 404.html, the client router fails to match the
		// path, and +error.svelte renders. It is the one page in the build that
		// is a client-rendered shell rather than prerendered HTML.
		adapter: adapter({ fallback: '404.html' }),

		paths: {
			// The app is served from a subfolder of the main site, because
			// Tophost issues TLS certificates for the registered domain only —
			// a subdomain gets the shared node's default certificate and fails
			// the name check. See docs/deployment.md.
			//
			// This is a BUILD-TIME constant: every internal link, asset URL and
			// prerendered path carries it, so a build made with this set cannot
			// be served from anywhere else. Keep in sync with BASE_PATH in
			// src/lib/site.ts (site.test.ts fails if they drift).
			base: '/decktools',

			// Absolute base and asset paths. SvelteKit defaults this to `true`,
			// which makes `base` a relative string like `../..` — and that
			// breaks Paraglide: it computes the depth from the *localised* URL
			// (/decktools/it-it/collection/) but resolves links against the
			// locale-stripped one (/decktools/collection/), which is a segment
			// shallower. The `../..` then overshoots the base, Paraglide reads
			// the target as external, and leaves it untranslated — every
			// Italian nav link landed on the English page.
			relative: false
		},

		prerender: {
			// Without this, `url.origin` during prerendering is the placeholder
			// `http://sveltekit-prerender`, and it does get rendered into content:
			// Paraglide's alternate-language links are absolute, so every page
			// shipped `<link rel="alternate" href="http://sveltekit-prerender/...">`.
			// Keep in sync with SITE_URL in src/lib/site.ts.
			origin: 'https://www.lordmzn.it'
		}
	}
};

export default config;
