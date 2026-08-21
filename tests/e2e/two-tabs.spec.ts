/**
 * M1's exit condition: two tabs converge live (#47, C2/C3).
 *
 * Two pages in one browser context are one origin, one IndexedDB and **two**
 * `Y.Doc`s — genuinely two replicas, and the same sync path #11 will use over a
 * peer connection. Which is the point: multi-tab exercises it on day one, and
 * multi-tab is free to test.
 *
 * Before this, the two tabs forked silently and reconverged only on reload.
 */
import { test, expect, type Page } from '@playwright/test';
import { appHref, persistedDocument } from './base';

const MOCK_BOLT = {
	id: 'bolt-id-001',
	name: 'Lightning Bolt',
	mana_cost: '{R}',
	type_line: 'Instant',
	set: 'lea',
	set_name: 'Limited Edition Alpha'
};

async function mockScryfall(page: Page) {
	await page.route('**/api.scryfall.com/cards/search**', (route) =>
		route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({ object: 'list', total_cards: 1, has_more: false, data: [MOCK_BOLT] })
		})
	);
	await page.route('**/cards.scryfall.io/**', (route) =>
		route.fulfill({
			status: 200,
			contentType: 'image/svg+xml',
			body: '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>'
		})
	);
}

/** Wipe both databases and land on a page with nothing stored. */
async function reset(page: Page) {
	await page.goto('./');
	await page.evaluate(async () => {
		const drop = (name: string) =>
			new Promise<void>((resolve) => {
				const request = indexedDB.deleteDatabase(name);
				request.onsuccess = () => resolve();
				request.onerror = () => resolve();
				request.onblocked = () => resolve();
			});
		await drop('LMdecktools');
		await drop('lmdecktools-doc');
	});
	await page.goto('./');
	await page.waitForLoadState('networkidle');
}

async function createDatabase(page: Page) {
	await page.getByTestId('db-modal-toggle').evaluate((btn) => (btn as HTMLElement).click());
	await expect(page.getByText('Start from scratch')).toBeVisible({ timeout: 5000 });
	await page.getByRole('button', { name: 'Create New Database', exact: true }).click();
	await page.getByRole('button', { name: 'Delete and Create New' }).click();
	await expect(page.getByRole('button', { name: 'Database', exact: true })).toBeVisible();
}

/** Client-side navigation, so the tab's document survives the route change. */
async function spaGoto(page: Page, route: string) {
	await page
		.locator(`a[href="${appHref(route === '/' ? '' : route)}"]`)
		.first()
		.click();
}

async function addBoltToCollection(page: Page) {
	await spaGoto(page, '/collection');
	await page.getByRole('button', { name: 'Add Cards' }).click();
	await page.locator('input[placeholder="Search for cards..."]').fill('Lightning Bolt');
	await page.getByRole('button', { name: 'Search' }).click();
	await page.locator('[data-testid="card-add-btn"]').first().click();
	await expect(page.locator('.animate-slide-in').filter({ hasText: /added/i })).toBeVisible({
		timeout: 5000
	});
	await page.locator('button[title="Close"]').click();
}

test.describe('two tabs', () => {
	test('an edit in one tab appears in the other without a reload', async ({ context }) => {
		const first = await context.newPage();
		await mockScryfall(first);
		await reset(first);
		await createDatabase(first);

		const second = await context.newPage();
		await mockScryfall(second);
		await second.goto('./collection');
		await second.waitForLoadState('networkidle');

		await addBoltToCollection(first);

		// No reload, no navigation: the second tab is simply correct.
		await expect(second.getByText('Lightning Bolt').first()).toBeVisible({ timeout: 5000 });

		await first.close();
		await second.close();
	});

	test('a list created in one tab is editable from the other', async ({ context }) => {
		const first = await context.newPage();
		await mockScryfall(first);
		await reset(first);
		await createDatabase(first);

		const second = await context.newPage();
		await mockScryfall(second);
		await second.goto('./card-lists');
		await second.waitForLoadState('networkidle');

		await spaGoto(first, '/card-lists');
		await first.getByRole('button', { name: 'New List' }).click();

		// The list arrives in the second tab, keyed by the UUID it was born with —
		// so the tab that did not create it can select and edit the same deck.
		await expect(second.locator('option', { hasText: 'A list' })).toHaveCount(1, {
			timeout: 5000
		});

		await first.close();
		await second.close();
	});

	test('the tabs converge on one value, and it is the later edit', async ({ context }) => {
		const first = await context.newPage();
		await mockScryfall(first);
		await reset(first);
		await createDatabase(first);
		await addBoltToCollection(first);

		const second = await context.newPage();
		await mockScryfall(second);
		await second.goto('./collection');
		await second.waitForLoadState('networkidle');
		await expect(second.getByText('Lightning Bolt').first()).toBeVisible({ timeout: 5000 });

		// Two edits to the same card from two tabs. With a live channel they are
		// causally ordered, so the later one wins — without it the winner would be
		// the higher clientID, which is arbitrary and not what anyone expects.
		await first.getByRole('button', { name: 'Add one' }).first().click();
		await expect(second.getByRole('button', { name: 'Edit quantity' }).first()).toHaveText('2×', {
			timeout: 5000
		});

		await second.getByRole('button', { name: 'Add one' }).first().click();
		await expect(first.getByRole('button', { name: 'Edit quantity' }).first()).toHaveText('3×', {
			timeout: 5000
		});

		// And what is on disk agrees with both of them.
		expect((await persistedDocument(first)).collection).toEqual([
			{ id: MOCK_BOLT.id, quantity_owned: 3 }
		]);

		await first.close();
		await second.close();
	});

	test('a removal propagates, which a reload could never show', async ({ context }) => {
		const first = await context.newPage();
		await mockScryfall(first);
		await reset(first);
		await createDatabase(first);
		await addBoltToCollection(first);

		const second = await context.newPage();
		await mockScryfall(second);
		await second.goto('./collection');
		await second.waitForLoadState('networkidle');
		await expect(second.getByText('Lightning Bolt').first()).toBeVisible({ timeout: 5000 });

		await first.getByRole('button', { name: 'Remove one' }).first().click();

		// The card is gone in both, and stays gone: a tombstone, not an absence
		// that the next merge would helpfully undo.
		await expect(second.getByText('Lightning Bolt')).toHaveCount(0, { timeout: 5000 });
		expect((await persistedDocument(second)).collection).toEqual([]);

		await first.close();
		await second.close();
	});

	test('exactly one tab holds the leader lock', async ({ context }) => {
		const first = await context.newPage();
		await reset(first);
		await createDatabase(first);

		const second = await context.newPage();
		await second.goto('./');
		await second.waitForLoadState('networkidle');

		// `navigator.locks.query()` is the browser's own answer, not the app's
		// opinion of itself: one exclusive holder, one waiting.
		const state = await first.evaluate(async () => {
			const snapshot = await navigator.locks.query();
			const held = (snapshot.held ?? []).filter((lock) => lock.name === 'lmdt-leader');
			const pending = (snapshot.pending ?? []).filter((lock) => lock.name === 'lmdt-leader');
			return { held: held.length, pending: pending.length };
		});

		expect(state.held).toBe(1);
		expect(state.pending).toBe(1);

		await first.close();
		await second.close();
	});
});
