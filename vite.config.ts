import { paraglide } from '@inlang/paraglide-sveltekit/vite';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [
		sveltekit(),
		tailwindcss(),
		paraglide({
			project: './project.inlang',
			outdir: './src/lib/paraglide'
		})
	],
	// Component tests mount real components, which needs Svelte's client build —
	// without the browser condition Vitest resolves the server build and `mount()`
	// throws `lifecycle_function_unavailable`. Scoped to test runs so the dev
	// server and production build resolve exactly as before.
	resolve: process.env.VITEST ? { conditions: ['browser'] } : undefined,
	test: {
		// Default for lib tests; component tests opt into jsdom with a
		// `@vitest-environment jsdom` docblock.
		environment: 'node',
		globals: true,
		setupFiles: ['./src/tests/setup.ts'],
		include: ['src/**/*.test.ts']
	}
});
