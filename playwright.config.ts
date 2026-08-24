import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: './tests/e2e',
	webServer: [
		{
			command: 'pnpm dev --port 4173',
			port: 4173,
			reuseExistingServer: !process.env.CI
		},
		{
			// The production build, for `pwa.spec.ts` only (#89). A service worker
			// does not exist on the dev server — registration is skipped under
			// `import.meta.env.DEV`, and `$service-worker`'s `build` and
			// `prerendered` lists are empty until something is built — so that spec
			// would otherwise assert on a worker caching nothing.
			//
			// Builds as part of the command rather than assuming `build/` is already
			// there: a stale directory would test the previous commit and pass, which
			// is the worst outcome available. Costs a few seconds; `pwa.spec.ts` is
			// the only spec that cannot be written any other way.
			command: 'pnpm run build && pnpm run preview --port 4174',
			port: 4174,
			reuseExistingServer: !process.env.CI,
			timeout: 120_000
		}
	],
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
			testIgnore: /(mobile|install-wall|pwa)\.spec\.ts/
		},
		{
			// The only project pointed at the production build — see the second
			// webServer above. Installability is a storage feature (#89), and none of
			// it exists in a dev server: no worker, no precache, no manifest install
			// path.
			name: 'pwa',
			testMatch: /pwa\.spec\.ts/,
			use: { browserName: 'chromium', baseURL: 'http://localhost:4174/decktools/' }
		},
		{
			// The desktop project cannot catch #76: every regression there is a
			// consequence of `(hover: none)` and a phone-width viewport, neither of
			// which a default Chromium context has. `isMobile` + `hasTouch` is what
			// flips the pointer media queries, so the `touch:` branch of every
			// component is only ever exercised here.
			//
			// An Android descriptor rather than an iPhone one, deliberately: since
			// #87 an iOS user agent puts the app in preview mode, and this project is
			// about pointers and pixel widths, not storage. The iOS context has its
			// own project below.
			name: 'mobile',
			testMatch: /mobile\.spec\.ts/,
			use: { ...devices['Pixel 5'], browserName: 'chromium' }
		},
		{
			// The only project that sees the install wall (#87): an uninstalled iOS
			// browser tab is detected by user agent, so nothing else can reach it.
			name: 'ios-browser',
			testMatch: /install-wall\.spec\.ts/,
			use: { ...devices['iPhone 13'], browserName: 'chromium' }
		}
	]
});
