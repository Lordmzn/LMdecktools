/**
 * @vitest-environment jsdom
 *
 * The image-cache indicator is measured on modal open, not once per page load
 * (#64). DBSelectionModal is mounted unconditionally by Header.svelte — only its
 * markup sits behind `{#if show}` — so an `onMount` measurement ran once per
 * hard reload and the indicator then sat frozen, permanently zero after a clear.
 *
 * Only `$lib/image-cache` is mocked: the point is how often the component asks
 * it, so it has to be the real component driving a fake cache.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, waitFor, fireEvent } from '@testing-library/svelte';
import DBSelectionModal from '../DBSelectionModal.svelte';
import { getImageCacheStats, clearImageCache } from '$lib/image-cache';

vi.mock('$lib/image-cache', () => ({
	getImageCacheStats: vi.fn(async () => ({ count: 0, bytes: 0 })),
	clearImageCache: vi.fn(async () => {}),
	formatBytes: (bytes: number) => `${bytes} B`
}));

const stats = vi.mocked(getImageCacheStats);

/**
 * The Cache tab is not the default section, so open it to read the indicator.
 * `onMount` picks the default section asynchronously (it waits on
 * `checkLocalDatabase`), so let that settle first or it overwrites the click.
 */
async function openCacheTab(queries: {
	getByRole: (role: string, opts: object) => HTMLElement;
	findByTestId: (id: string) => Promise<HTMLElement>;
}) {
	await waitFor(() => expect(stats).toHaveBeenCalled());
	await fireEvent.click(queries.getByRole('button', { name: 'Cache' }));
	await queries.findByTestId('image-cache-stats');
}

beforeEach(() => {
	stats.mockClear();
	vi.mocked(clearImageCache).mockClear();
	stats.mockResolvedValue({ count: 0, bytes: 0 });
});

afterEach(() => {
	cleanup();
});

describe('image cache indicator', () => {
	it('does not measure the cache while the modal is closed', async () => {
		render(DBSelectionModal, { props: { show: false } });

		// Mounting the header must not pay for a cache sizing pass
		await waitFor(() => expect(stats).not.toHaveBeenCalled());
	});

	it('measures the cache when the modal opens', async () => {
		stats.mockResolvedValue({ count: 12, bytes: 3400 });
		const { getByRole, getByTestId, findByTestId } = render(DBSelectionModal, {
			props: { show: true }
		});

		await waitFor(() => expect(stats).toHaveBeenCalledTimes(1));
		await openCacheTab({ getByRole, findByTestId });
		expect(getByTestId('image-cache-stats')).toHaveTextContent('12 images');
	});

	it('re-measures on every open, so a refilled cache is picked up', async () => {
		const { rerender, getByRole, getByTestId, findByTestId } = render(DBSelectionModal, {
			props: { show: true }
		});
		await waitFor(() => expect(stats).toHaveBeenCalledTimes(1));

		// Close, browse around (the cache refills), reopen
		await rerender({ show: false });
		stats.mockResolvedValue({ count: 7, bytes: 900 });
		await rerender({ show: true });

		// Before #64 this stayed at the page-load reading until a hard refresh
		await waitFor(() => expect(stats).toHaveBeenCalledTimes(2));
		await openCacheTab({ getByRole, findByTestId });
		await waitFor(() => expect(getByTestId('image-cache-stats')).toHaveTextContent('7 images'));
	});

	it('reads the cache back after clearing instead of assuming zero', async () => {
		stats.mockResolvedValue({ count: 5, bytes: 500 });
		const { getByRole, getByText, getByTestId, findByTestId } = render(DBSelectionModal, {
			props: { show: true }
		});
		await openCacheTab({ getByRole, findByTestId });
		await waitFor(() => expect(getByTestId('image-cache-stats')).toHaveTextContent('5 images'));

		stats.mockResolvedValue({ count: 0, bytes: 0 });
		await fireEvent.click(getByText('Clear Image Cache'));

		await waitFor(() => expect(clearImageCache).toHaveBeenCalledTimes(1));
		// Re-read rather than hard-coded to zero
		await waitFor(() => expect(stats).toHaveBeenCalledTimes(2));
		await waitFor(() => expect(getByTestId('image-cache-stats')).toHaveTextContent('0 images'));
	});
});
