import { describe, it, expect } from 'vitest';
import {
	detectInstallContext,
	isIOS,
	isStandalone,
	iosBrowser,
	needsSafariFirst,
	type InstallEnvironment
} from '../install-context';

/** Build the four fields detection reads. */
function env(options: {
	displayMode?: boolean;
	standalone?: boolean;
	platform?: string;
	userAgent?: string;
	maxTouchPoints?: number;
	noMatchMedia?: boolean;
}): InstallEnvironment {
	return {
		matchMedia: options.noMatchMedia
			? undefined
			: (query: string) => ({
					matches: query.includes('standalone') && options.displayMode === true
				}),
		navigator: {
			standalone: options.standalone,
			platform: options.platform ?? '',
			userAgent: options.userAgent ?? '',
			maxTouchPoints: options.maxTouchPoints ?? 0
		}
	};
}

const IPHONE_SAFARI =
	'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';
const IPHONE_CHROME =
	'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/122.0 Mobile/15E148 Safari/604.1';
const IPAD_DESKTOP_UA =
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15';
const MAC_SAFARI =
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15';
const DESKTOP_CHROME =
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36';
const ANDROID_CHROME =
	'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0 Mobile Safari/537.36';

describe('isStandalone', () => {
	it('is true for display-mode: standalone', () => {
		expect(isStandalone(env({ displayMode: true }))).toBe(true);
	});

	it('is true for the legacy navigator.standalone', () => {
		expect(isStandalone(env({ standalone: true, userAgent: IPHONE_SAFARI }))).toBe(true);
	});

	it('is false in a plain browser tab', () => {
		expect(isStandalone(env({ userAgent: DESKTOP_CHROME }))).toBe(false);
	});

	it('survives a browser with no matchMedia', () => {
		expect(isStandalone(env({ noMatchMedia: true }))).toBe(false);
	});
});

describe('isIOS', () => {
	it('detects an iPhone', () => {
		expect(isIOS(env({ platform: 'iPhone', userAgent: IPHONE_SAFARI, maxTouchPoints: 5 }))).toBe(
			true
		);
	});

	it('detects an iPad that reports itself as a Mac', () => {
		// The whole reason maxTouchPoints is in the rule: platform and user agent
		// are indistinguishable from a desktop Mac here.
		expect(
			isIOS(env({ platform: 'MacIntel', userAgent: IPAD_DESKTOP_UA, maxTouchPoints: 5 }))
		).toBe(true);
	});

	it('does not mistake a real Mac for an iPad', () => {
		expect(isIOS(env({ platform: 'MacIntel', userAgent: MAC_SAFARI, maxTouchPoints: 0 }))).toBe(
			false
		);
	});

	it('does not mistake a touchscreen Windows laptop for iOS', () => {
		expect(isIOS(env({ platform: 'Win32', userAgent: DESKTOP_CHROME, maxTouchPoints: 10 }))).toBe(
			false
		);
	});

	it('is false on Android', () => {
		expect(
			isIOS(env({ platform: 'Linux armv8l', userAgent: ANDROID_CHROME, maxTouchPoints: 5 }))
		).toBe(false);
	});
});

describe('iosBrowser', () => {
	it('names Safari', () => {
		expect(iosBrowser(env({ userAgent: IPHONE_SAFARI }))).toBe('safari');
	});

	it('names Chrome by its CriOS prefix, not the Safari token it also carries', () => {
		expect(iosBrowser(env({ userAgent: IPHONE_CHROME }))).toBe('chrome');
	});

	it('sends third-party browsers to Safari first', () => {
		expect(needsSafariFirst(env({ userAgent: IPHONE_CHROME }))).toBe(true);
		expect(needsSafariFirst(env({ userAgent: IPHONE_SAFARI }))).toBe(false);
	});
});

describe('detectInstallContext', () => {
	it('gives an uninstalled iOS tab the wall', () => {
		expect(
			detectInstallContext(env({ platform: 'iPhone', userAgent: IPHONE_SAFARI, maxTouchPoints: 5 }))
		).toBe('ios-browser');
	});

	it('gives an installed iOS icon the full app', () => {
		expect(
			detectInstallContext(
				env({ standalone: true, platform: 'iPhone', userAgent: IPHONE_SAFARI, maxTouchPoints: 5 })
			)
		).toBe('installed');
	});

	it('gives an installed desktop PWA the full app', () => {
		expect(detectInstallContext(env({ displayMode: true, userAgent: DESKTOP_CHROME }))).toBe(
			'installed'
		);
	});

	it('gives every other browser the full app', () => {
		expect(detectInstallContext(env({ userAgent: DESKTOP_CHROME }))).toBe('browser');
		expect(detectInstallContext(env({ userAgent: ANDROID_CHROME, maxTouchPoints: 5 }))).toBe(
			'browser'
		);
	});

	it('answers browser when there is no window at all (prerender)', () => {
		expect(detectInstallContext(null)).toBe('browser');
	});
});
