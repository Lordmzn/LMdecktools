/**
 * @vitest-environment jsdom
 *
 * "Read other devices' files" (#91, T3) — the sibling-import card in the
 * In-browser DB tab. Unlike the other `db-modal-*` tests, this one needs a
 * real document: the whole point is that selecting files actually merges (or
 * unions) their contents in, one `MergePreviewModal` confirmation at a time,
 * and records each as a copy (#90).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, waitFor, fireEvent } from '@testing-library/svelte';
import DBSelectionModal from '../DBSelectionModal.svelte';
import { resetDatabases } from '$lib/__tests__/reset';
import type { CardList } from '$lib/db';

const { initDB, closeDB, documentGuid, store } = await import('$lib/store.svelte');
const { createDocument, seedDocument, updateFor } = await import('$lib/ydoc');

function makeCardList(overrides: Partial<CardList> = {}): CardList {
	return {
		name: 'Deck A',
		cards: [],
		cardMatching: 'generic',
		languageMatching: 'any',
		created_at: 1000,
		updated_at: 2000,
		...overrides
	};
}

/** A sibling replica of the local lineage — same guid, so this is the merge path. */
function siblingFile(name: string, listName: string): File {
	const sibling = createDocument(documentGuid() ?? undefined);
	seedDocument(sibling, { cardLists: [makeCardList({ name: listName })] });
	return new File([new Uint8Array(updateFor(sibling))], name);
}

/** A file from a different database entirely — the union path. */
function foreignFile(name: string, listName: string): File {
	const foreign = createDocument();
	seedDocument(foreign, { cardLists: [makeCardList({ name: listName })] });
	return new File([new Uint8Array(updateFor(foreign))], name);
}

afterEach(async () => {
	cleanup();
	await closeDB();
	store.dbMode = 'none';
	store.savedCardLists = [];
	store.collection = [];
	store.copyRegistryEntries = [];
	await resetDatabases();
});

describe('sibling import', () => {
	it('previews and merges a same-guid sibling, then a foreign-guid one, sequentially', async () => {
		await initDB();
		const view = render(DBSelectionModal, { props: { show: true } });

		const input = await view.findByTestId('sibling-file-input');
		Object.defineProperty(input, 'files', {
			value: [
				siblingFile('MacBook.ydelta', 'From MacBook'),
				foreignFile('friend.ydelta', "Friend's Deck")
			],
			configurable: true
		});
		await fireEvent.change(input);

		// First file: same guid, the merge path.
		await waitFor(() => expect(view.getByTestId('merge-preview-operation')).toBeInTheDocument());
		expect(view.getByTestId('merge-preview-operation').textContent).toMatch(
			/copy of this database/i
		);
		await fireEvent.click(view.getByTestId('merge-preview-confirm'));

		// Second file: foreign guid, the union path — the modal re-opens for it.
		await waitFor(() =>
			expect(view.getByTestId('merge-preview-operation').textContent).toMatch(/different database/i)
		);
		await fireEvent.click(view.getByTestId('merge-preview-confirm'));

		await waitFor(() => expect(view.getByTestId('sibling-summary')).toBeInTheDocument());
		expect(view.getByTestId('sibling-summary').textContent).toContain('2');

		expect(store.savedCardLists.map((l) => l.name)).toEqual(
			expect.arrayContaining(['From MacBook', "Friend's Deck"])
		);
		expect(store.copyRegistryEntries.map((e) => e.id)).toEqual(
			expect.arrayContaining(['sibling:MacBook.ydelta', 'sibling:friend.ydelta'])
		);
	});
});
