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

		prerender: {
			// Without this, `url.origin` during prerendering is the placeholder
			// `http://sveltekit-prerender`, and it does get rendered into content:
			// Paraglide's alternate-language links are absolute, so every page
			// shipped `<link rel="alternate" href="http://sveltekit-prerender/...">`.
			// Keep in sync with SITE_URL in src/lib/site.ts.
			origin: 'https://decktools.lordmzn.it'
		}
	}
};

export default config;
