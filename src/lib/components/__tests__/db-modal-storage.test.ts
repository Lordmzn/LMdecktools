/**
 * @vitest-environment jsdom
 *
 * What the DB modal says about persistent storage (#88).
 *
 * The grant defends against eviction under disk pressure and nothing else, so
 * the three states have to stay distinguishable — granted, not granted, and a
 * browser that will not say, which is *not* the same as not granted. The panel
 * is read back on every open because the grant can arrive after startup
 * (Firefox's prompt) and lapse between sessions (WebKit drops it on restart).
 *
 * Only `$lib/storage-persistence` is mocked: the real component has to be the
 * thing deciding what to render.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, waitFor } from '@testing-library/svelte';
import DBSelectionModal from '../DBSelectionModal.svelte';
import { readStorageReport } from '$lib/storage-persistence';
import { store } from '$lib/store.svelte';

vi.mock('$lib/storage-persistence', () => ({
	readStorageReport: vi.fn(async () => ({
		supported: true,
		persisted: false,
		usage: null,
		quota: null
	}))
}));

const report = vi.mocked(readStorageReport);

beforeEach(() => {
	// An open database, as every path to this panel implies — with none there is
	// nothing stored to report on and the panel is deliberately absent.
	store.dbMode = 'active';
	report.mockClear();
});

afterEach(() => {
	cleanup();
	store.dbMode = 'none';
	store.installContext = 'browser';
});

describe('storage persistence panel', () => {
	it('reports the grant and the usage against quota', async () => {
		report.mockResolvedValue({
			supported: true,
			persisted: true,
			usage: 12_400_000,
			quota: 2_100_000_000
		});
		const { getByTestId } = render(DBSelectionModal, { props: { show: true } });

		await waitFor(() => expect(getByTestId('storage-persistence')).toHaveTextContent('Granted'));
		expect(getByTestId('storage-usage')).toHaveTextContent('12.4 MB of 2.1 GB');
	});

	// Never "your data is safe": the modal has to name what the grant does not
	// cover in the same breath as the grant itself.
	it('says what a granted origin can still lose', async () => {
		report.mockResolvedValue({ supported: true, persisted: true, usage: 1, quota: 2 });
		const { getByText } = render(DBSelectionModal, { props: { show: true } });

		await waitFor(() => getByText(/clearing browsing data removes it/i));
		expect(() => getByText(/your data is safe/i)).toThrow();
	});

	it('warns when the browser has not granted it', async () => {
		report.mockResolvedValue({ supported: true, persisted: false, usage: 500, quota: 1000 });
		const { getByTestId, getByText } = render(DBSelectionModal, { props: { show: true } });

		await waitFor(() =>
			expect(getByTestId('storage-persistence')).toHaveTextContent('Not granted')
		);
		getByText(/may delete your data to reclaim space/i);
	});

	// A browser that answers neither call is unknown, not unprotected.
	it('says unknown where the API is missing, rather than not granted', async () => {
		report.mockResolvedValue({ supported: false, persisted: false, usage: null, quota: null });
		const { getByTestId } = render(DBSelectionModal, { props: { show: true } });

		await waitFor(() => expect(getByTestId('storage-persistence')).toHaveTextContent('Unknown'));
		expect(getByTestId('storage-usage')).toHaveTextContent('Not reported');
	});

	// `estimate()` may omit either field, and a quota-less reading must not print
	// "12.4 MB of NaN".
	it('shows the usage alone when the browser withholds the quota', async () => {
		report.mockResolvedValue({ supported: true, persisted: true, usage: 5000, quota: null });
		const { getByTestId } = render(DBSelectionModal, { props: { show: true } });

		await waitFor(() => expect(getByTestId('storage-usage')).toHaveTextContent('5.0 kB'));
		expect(getByTestId('storage-usage')).not.toHaveTextContent('of');
	});

	it('re-reads on every open, so a grant made since is picked up', async () => {
		const { rerender, getByTestId } = render(DBSelectionModal, { props: { show: true } });
		await waitFor(() => expect(report).toHaveBeenCalledTimes(1));

		await rerender({ show: false });
		report.mockResolvedValue({ supported: true, persisted: true, usage: 10, quota: 20 });
		await rerender({ show: true });

		await waitFor(() => expect(report).toHaveBeenCalledTimes(2));
		await waitFor(() => expect(getByTestId('storage-persistence')).toHaveTextContent('Granted'));
	});

	it('does not ask while the modal is closed', async () => {
		render(DBSelectionModal, { props: { show: false } });
		await waitFor(() => expect(report).not.toHaveBeenCalled());
	});

	// Preview mode writes to no container at all (#87), so a quota reading there
	// would describe storage the app refuses to touch.
	it('is absent in preview mode', async () => {
		store.installContext = 'ios-browser';
		const { queryByTestId } = render(DBSelectionModal, { props: { show: true } });

		await waitFor(() => expect(report).toHaveBeenCalled());
		expect(queryByTestId('storage-persistence')).toBeNull();
	});
});
