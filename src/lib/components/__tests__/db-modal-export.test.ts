/**
 * @vitest-environment jsdom
 *
 * The export preview box renders only its first rows (#63), so the thing worth
 * pinning is that truncation never reaches a file: Download and Copy must still
 * produce every card.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, waitFor, fireEvent } from '@testing-library/svelte';
import DBSelectionModal from '../DBSelectionModal.svelte';
import { PREVIEW_ROWS } from '$lib/export-format';
import { store } from '$lib/store.svelte';

vi.mock('$lib/image-cache', () => ({
	getImageCacheStats: vi.fn(async () => ({ count: 0, bytes: 0 })),
	clearImageCache: vi.fn(async () => {}),
	formatBytes: () => '0 B'
}));

const CARD_COUNT = 120;

/** Enough cards that the preview has to truncate. */
function seedCollection(count: number) {
	store.collection = Array.from({ length: count }, (_, i) => ({
		id: `id-${i}`,
		name: `Card ${String(i).padStart(4, '0')}`,
		quantity_owned: 1,
		set: 'neo'
	})) as never;
}

let clipboardText: string | null = null;

beforeEach(() => {
	clipboardText = null;
	seedCollection(CARD_COUNT);
	vi.stubGlobal('navigator', {
		...globalThis.navigator,
		clipboard: {
			writeText: vi.fn(async (text: string) => {
				clipboardText = text;
			})
		}
	});
});

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
	store.collection = [];
});

async function openExportTab() {
	const view = render(DBSelectionModal, { props: { show: true } });
	await waitFor(() => view.getByRole('button', { name: 'Export' }));
	await fireEvent.click(view.getByRole('button', { name: 'Export' }));
	await view.findByTestId('export-preview-note');
	return view;
}

describe('collection export', () => {
	it('renders only the first rows in the preview box', async () => {
		const { container } = await openExportTab();

		const preview = container.querySelector('textarea') as HTMLTextAreaElement;
		// Header row plus PREVIEW_ROWS data rows. A textarea's value normalises the
		// CSV's CRLF endings to LF, so match either.
		expect(preview.value.trimEnd().split(/\r?\n/)).toHaveLength(PREVIEW_ROWS + 1);
		expect(preview.value).toContain('Card 0000');
		expect(preview.value).not.toContain('Card 0119');
	});

	it('says how much of the collection the box is showing', async () => {
		const { getByTestId } = await openExportTab();

		expect(getByTestId('export-preview-note')).toHaveTextContent(
			`first ${PREVIEW_ROWS} of ${CARD_COUNT} cards`
		);
	});

	it('copies the whole collection, not the preview', async () => {
		const { getByText } = await openExportTab();

		await fireEvent.click(getByText('Copy to Clipboard'));

		await waitFor(() => expect(clipboardText).not.toBeNull());
		// Every card, including the ones the preview left out
		expect(clipboardText).toContain('Card 0000');
		expect(clipboardText).toContain('Card 0119');
		expect(clipboardText!.trimEnd().split('\r\n')).toHaveLength(CARD_COUNT + 1);
	});

	it('keeps the preview capped when the format switches', async () => {
		const { container, getByRole } = await openExportTab();
		const preview = () => container.querySelector('textarea') as HTMLTextAreaElement;

		expect(preview().value).toContain('Count,Name');

		await fireEvent.click(getByRole('button', { name: 'Text' }));

		await waitFor(() => expect(preview().value).toContain('# My Collection'));
		// Still capped after the switch — this is the path that used to stall
		expect(preview().value.trimEnd().split('\n')).toHaveLength(PREVIEW_ROWS + 2);
	});

	it('reports an empty collection rather than showing an empty box', async () => {
		store.collection = [];
		const { getByTestId } = await openExportTab();

		expect(getByTestId('export-preview-note')).toHaveTextContent('your collection is empty');
	});
});
