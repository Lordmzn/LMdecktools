/**
 * Which app the visitor is actually running (#87).
 *
 * Storage on iOS is isolated three ways — Safari has one container, *each* Home
 * Screen icon has its own, and IndexedDB crosses none of them. A visitor who
 * types a collection into the Safari tab and then installs the app finds it
 * empty, which is indistinguishable from data loss. Prompt timing cannot fix
 * that: any window in which the tab can write is a window in which data gets
 * stranded.
 *
 * So the context decides what the app *is*. An uninstalled iOS browser tab gets
 * preview mode — the whole UI over an in-memory store that never touches the
 * browser's container — plus the install wall. See
 * `docs/durability-convergence-transport.md` D4.
 *
 * Everything here is a pure function over an injected environment, so the rules
 * are testable without a browser.
 */

export type InstallContext = 'installed' | 'ios-browser' | 'browser';

/** The iOS browser doing the asking — Q6: only Safari is known to install. */
export type IosBrowser = 'safari' | 'chrome' | 'firefox' | 'edge' | 'opera' | 'other';

/**
 * The parts of `window` detection reads. A structural type rather than `Window`
 * so a test can hand over four fields instead of a DOM.
 */
export interface InstallEnvironment {
	matchMedia?: (query: string) => { matches: boolean };
	navigator: {
		standalone?: boolean;
		platform?: string;
		userAgent?: string;
		maxTouchPoints?: number;
	};
}

function currentEnvironment(): InstallEnvironment | null {
	if (typeof window === 'undefined') return null;
	return window as unknown as InstallEnvironment;
}

/**
 * Running from a Home Screen icon or an installed window, on any platform.
 *
 * `display-mode: standalone` is the standard; `navigator.standalone` is the
 * non-standard iOS predecessor, still the only signal older iOS versions give.
 */
export function isStandalone(env: InstallEnvironment | null = currentEnvironment()): boolean {
	if (!env) return false;
	if (env.navigator.standalone === true) return true;
	try {
		return env.matchMedia?.('(display-mode: standalone)').matches === true;
	} catch {
		return false;
	}
}

/**
 * iOS or iPadOS.
 *
 * iPadOS reports itself as a Mac — same `platform`, same desktop user agent —
 * so the platform check alone misses every iPad. `maxTouchPoints > 1` is what
 * separates it from a real Mac; trackpads report 0, and the `> 1` rather than
 * `> 0` guards against a touchscreen-equipped desktop.
 */
export function isIOS(env: InstallEnvironment | null = currentEnvironment()): boolean {
	if (!env) return false;
	const platform = env.navigator.platform ?? '';
	const ua = env.navigator.userAgent ?? '';
	const touchPoints = env.navigator.maxTouchPoints ?? 0;

	if (/iPhone|iPad|iPod/.test(platform) || /iPhone|iPad|iPod/.test(ua)) return true;

	// iPadOS in its default "desktop site" guise.
	return (platform === 'MacIntel' || /Macintosh/.test(ua)) && touchPoints > 1;
}

/**
 * Which browser, on iOS. Every one of them renders in WebKit, so the engine
 * says nothing; the vendor prefix in the user agent is the only signal.
 *
 * This decides whether the install wall says "add to Home Screen" or "open this
 * in Safari first" — third-party iOS browsers are not known to offer the Share
 * sheet's Add to Home Screen at all (Q6, tracked in #94).
 */
export function iosBrowser(env: InstallEnvironment | null = currentEnvironment()): IosBrowser {
	const ua = env?.navigator.userAgent ?? '';
	if (/CriOS/.test(ua)) return 'chrome';
	if (/FxiOS/.test(ua)) return 'firefox';
	if (/EdgiOS/.test(ua)) return 'edge';
	if (/OPiOS|OPT\//.test(ua)) return 'opera';
	if (/Safari/.test(ua)) return 'safari';
	return 'other';
}

/** True when the wall must send the visitor to Safari before installing (Q6). */
export function needsSafariFirst(env: InstallEnvironment | null = currentEnvironment()): boolean {
	return iosBrowser(env) !== 'safari';
}

/**
 * The one call the app makes on startup.
 *
 * | Context | Detection | App shows |
 * | --- | --- | --- |
 * | Installed, any platform | `display-mode` or `navigator.standalone` | full app |
 * | iOS browser tab | neither, and iOS | install wall + preview mode |
 * | Other browsers | neither | full app |
 *
 * Server-side (prerendering) there is no window and nothing to detect, so it
 * answers `browser` — the full app, which is also what the prerendered HTML has
 * to contain.
 */
export function detectInstallContext(
	env: InstallEnvironment | null = currentEnvironment()
): InstallContext {
	if (!env) return 'browser';
	if (isStandalone(env)) return 'installed';
	if (isIOS(env)) return 'ios-browser';
	return 'browser';
}
