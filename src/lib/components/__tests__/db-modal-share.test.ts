/**
 * @vitest-environment jsdom
 *
 * The Share button in the Copies tab (#91, T2): gated on `canShare({files})`,
 * which runs synchronously with no prompt — the button must not render at all
 * where the API is absent, and must hand `navigator.share` the `.json`
 * envelope for a real document rather than the raw update bytes.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, waitFor, fireEvent } from '@testing-library/svelte';
import DBSelectionModal from '../DBSelectionModal.svelte';
import { resetDatabases } from '$lib/__tests__/reset';

const { initDB, closeDB, store } = await import('$lib/store.svelte');

let sharedFiles: File[] | null = null;

function stubNavigator(withShareSupport: boolean) {
	vi.stubGlobal('navigator', {
		...globalThis.navigator,
		...(withShareSupport
			? {
					canShare: vi.fn(() => true),
					share: vi.fn(async (data: { files: File[] }) => {
						sharedFiles = data.files;
					})
				}
			: {})
	});
}

async function openCopiesTab() {
	const view = render(DBSelectionModal, { props: { show: true } });
	await waitFor(() => view.getByRole('button', { name: 'Copies' }));
	await fireEvent.click(view.getByRole('button', { name: 'Copies' }));
	await view.findByTestId('copies-count');
	return view;
}

beforeEach(() => {
	sharedFiles = null;
});

afterEach(async () => {
	cleanup();
	await closeDB();
	store.dbMode = 'none';
	vi.unstubAllGlobals();
	await resetDatabases();
});

describe('Share button', () => {
	it('does not render where navigator.canShare is unavailable', async () => {
		stubNavigator(false);
		await initDB();
		const { queryByTestId } = await openCopiesTab();

		expect(queryByTestId('share-button')).toBeNull();
	});

	it('shares a .json envelope carrying the document guid', async () => {
		stubNavigator(true);
		await initDB();
		const { getByTestId } = await openCopiesTab();

		await fireEvent.click(getByTestId('share-button'));

		await waitFor(() => expect(sharedFiles).not.toBeNull());
		expect(sharedFiles).toHaveLength(1);

		const file = sharedFiles![0];
		expect(file.name).toMatch(/^lm-decktools-share-.*\.json$/);
		expect(file.type).toBe('application/json');

		const envelope = JSON.parse(await file.text());
		expect(envelope.app).toBe('LM Deck Tools');
		expect(typeof envelope.update).toBe('string');
	});
});
