import { defineConfig, devices } from '@playwright/test';

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
			use: { browserName: 'chromium' },
			testIgnore: /mobile\.spec\.ts/
		},
		{
			// The desktop project cannot catch #76: every regression there is a
			// consequence of `(hover: none)` and a 390px viewport, neither of which a
			// default Chromium context has. `isMobile` + `hasTouch` is what flips the
			// pointer media queries, so the `touch:` branch of every component is only
			// ever exercised here.
			name: 'mobile',
			testMatch: /mobile\.spec\.ts/,
			use: { ...devices['iPhone 13'], browserName: 'chromium' }
		}
	]
});
