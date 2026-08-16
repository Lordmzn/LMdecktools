import { defineConfig } from '@playwright/test';

export default defineConfig({
	testDir: './tests/e2e',
	webServer: {
		command: 'pnpm dev --port 4173',
		port: 4173,
		reuseExistingServer: !process.env.CI
	},
	use: {
		// Includes kit.paths.base — the dev server serves the app under it too,
		// so a test navigating to the origin root gets a 404. Specs use relative
		// targets (`./`, `./collection`) so they resolve against this.
		baseURL: 'http://localhost:4173/decktools/'
	},
	projects: [
		{
			name: 'chromium',
			use: { browserName: 'chromium' }
		}
	]
});
