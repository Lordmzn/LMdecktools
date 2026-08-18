import { test, expect } from '@playwright/test';
import { appHref } from './base';

// Scryfall API fixture data
const MOCK_SEARCH_RESPONSE = {
	object: 'list',
	total_cards: 2,
	has_more: false,
	data: [
		{
			id: 'bolt-id-001',
			name: 'Lightning Bolt',
			mana_cost: '{R}',
			type_line: 'Instant',
			set: 'lea',
			set_name: 'Limited Edition Alpha',
			image_uris: {
				small: 'https://cards.scryfall.io/small/front/bolt.jpg',
				normal: 'https://cards.scryfall.io/normal/front/bolt.jpg'
			}
		},
		{
			id: 'guide-id-002',
			name: 'Goblin Guide',
			mana_cost: '{R}',
			type_line: 'Creature — Goblin Scout',
			set: 'zen',
			set_name: 'Zendikar',
			image_uris: {
				small: 'https://cards.scryfall.io/small/front/guide.jpg',
				normal: 'https://cards.scryfall.io/normal/front/guide.jpg'
			}
		}
	]
};

const MOCK_NAMED_BOLT = {
	id: 'bolt-id-001',
	name: 'Lightning Bolt',
	mana_cost: '{R}',
	type_line: 'Instant',
	set: 'lea',
	set_name: 'Limited Edition Alpha',
	image_uris: {
		small: 'https://cards.scryfall.io/small/front/bolt.jpg',
		normal: 'https://cards.scryfall.io/normal/front/bolt.jpg'
	}
};

// Helper: intercept Scryfall API and return fixtures
async function mockScryfallAPI(page: import('@playwright/test').Page) {
	await page.route('**/api.scryfall.com/cards/search**', (route) => {
		route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify(MOCK_SEARCH_RESPONSE)
		});
	});
	await page.route('**/api.scryfall.com/cards/named**', (route) => {
		route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify(MOCK_NAMED_BOLT)
		});
	});
	// Import flow uses POST /cards/collection to batch-resolve card names
	await page.route('**/api.scryfall.com/cards/collection', (route) => {
		route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({
				object: 'list',
				data: [MOCK_NAMED_BOLT],
				not_found: []
			})
		});
	});
	// Mock card images to avoid network requests
	await page.route('**/cards.scryfall.io/**', (route) => {
		route.fulfill({
			status: 200,
			contentType: 'image/svg+xml',
			body: '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>'
		});
	});
}

// Helper: create a fresh DB. Ends on '/' with store.dbMode === 'active'.
// All subsequent in-app navigation must use spaGoto (not page.goto) to
// preserve the store module state across routes.
async function setupWithDB(page: import('@playwright/test').Page) {
	await page.goto('./');
	await page.evaluate(() => {
		return new Promise<void>((resolve) => {
			const req = indexedDB.deleteDatabase('LMdecktools');
			req.onsuccess = () => resolve();
			req.onerror = () => resolve();
		});
	});
	await page.goto('./');
	await page.waitForLoadState('networkidle');

	// Create a new DB via the modal
	const dbButton = page.locator('button', { hasText: /Choose DB|Database/ });
	await dbButton.evaluate((btn) => (btn as HTMLElement).click());
	await expect(page.getByText('Start from scratch')).toBeVisible({ timeout: 5000 });
	await page.getByRole('button', { name: 'Create New Database', exact: true }).click();
	// Confirm the destructive create-new action
	await page.getByRole('button', { name: 'Delete and Create New' }).click();
	await expect(page.getByRole('button', { name: 'Database', exact: true })).toBeVisible();
}

// SPA navigation — clicks the first matching nav link so SvelteKit routes
// client-side and the store module state (dbMode, savedCardLists, …) is preserved.
async function spaGoto(page: import('@playwright/test').Page, href: string) {
	await page
		.locator(`a[href="${appHref(href)}"]`)
		.first()
		.click();
}

// Helper: search for a card and add it via evaluate (bypasses the hover-reveal
// CSS overlay, which has opacity:0 until :hover is active).
async function addCardViaSearch(
	page: import('@playwright/test').Page,
	cardName = 'Lightning Bolt'
) {
	const searchInput = page.locator('input[placeholder="Search for cards..."]');
	await searchInput.fill(cardName);
	// Click the Search button — more reliable than pressing Enter
	await page.getByRole('button', { name: 'Search' }).click();
	await expect(page.getByText(cardName).first()).toBeVisible();
	// The add button is inside an opacity-0 overlay; use evaluate to call btn.click()
	// directly in the browser context, bypassing all CSS/coordinate pointer-events issues.
	await page
		.locator('[data-testid="card-add-btn"]')
		.first()
		.evaluate((btn) => {
			(btn as HTMLElement).click();
		});
	// Wait for the "Added …" notification toast, confirming the async DB write completed.
	// Using hasText to avoid a false-positive from the collection page's "Found X cards" toast.
	await expect(page.locator('.animate-slide-in').filter({ hasText: /added/i })).toBeVisible({
		timeout: 3000
	});
}

// Helper: wait for the notification toast to disappear.
async function waitForToastGone(page: import('@playwright/test').Page) {
	await expect(page.locator('.animate-slide-in')).not.toBeVisible({ timeout: 5000 });
}

// ==================== Card Lists Page ====================

test.describe('Card Lists', () => {
	test.beforeEach(async ({ page }) => {
		await mockScryfallAPI(page);
	});

	test('navigating to /card-lists shows the card lists page', async ({ page }) => {
		await setupWithDB(page);
		await spaGoto(page, '/card-lists');

		await expect(page.getByRole('button', { name: 'New List' })).toBeVisible();
		await expect(page.locator('select').first()).toBeVisible();
	});

	test('creating a new list', async ({ page }) => {
		await setupWithDB(page);
		await spaGoto(page, '/card-lists');

		// A fresh DB has no lists until the user makes one
		const select = page.locator('select').first();
		await expect(select.locator('option')).toHaveText(['No lists']);

		await page.getByRole('button', { name: 'New List' }).click();

		await expect(select.locator('option')).toHaveText(['A list']);

		await page.getByRole('button', { name: 'New List' }).click();

		await expect(select.locator('option')).toHaveCount(2);
	});

	test('adding cards to a list from search results', async ({ page }) => {
		await setupWithDB(page);
		await spaGoto(page, '/card-lists');

		await page.getByRole('button', { name: 'Add Cards' }).click();
		await addCardViaSearch(page);
		await page.locator('button[title="Close"]').click();

		await expect(
			page.locator('[data-testid="list-cards"]').getByAltText('Lightning Bolt')
		).toBeVisible();
	});

	test('removing cards from a list', async ({ page }) => {
		await setupWithDB(page);
		await spaGoto(page, '/card-lists');

		// Add a card first
		await page.getByRole('button', { name: 'Add Cards' }).click();
		await addCardViaSearch(page);
		await page.locator('button[title="Close"]').click();

		await expect(
			page.locator('[data-testid="list-cards"]').getByAltText('Lightning Bolt')
		).toBeVisible();

		// The decrement button (−) doubles as "Remove from list" at qty=1, which is
		// now also its accessible name — the glyph alone was a tooltip-only label,
		// and a tooltip is not a label a phone or a screen reader ever sees (#76).
		// Still via evaluate: on a hover-capable pointer this stepper is the small
		// pill floating on the card art.
		await page
			.locator('[data-testid="list-cards"] div.group')
			.first()
			.getByRole('button', { name: 'Remove from list' })
			.evaluate((btn) => (btn as HTMLElement).click());

		await expect(page.getByText('No cards in list yet')).toBeVisible();
	});

	test('list shows which cards are owned in collection', async ({ page }) => {
		await setupWithDB(page);

		// Add Lightning Bolt to collection
		await spaGoto(page, '/collection');
		await page.getByRole('button', { name: 'Add Cards' }).click();
		await addCardViaSearch(page);
		await page.locator('button[title="Close"]').click();

		// Add same card to a list
		await spaGoto(page, '/card-lists');
		// Wait for card-lists page to render before interacting (no list yet —
		// adding the first card creates one)
		await expect(page.getByRole('heading', { name: 'No list selected' })).toBeVisible();
		await page.getByRole('button', { name: 'Add Cards' }).click();
		await addCardViaSearch(page);
		await page.locator('button[title="Close"]').click();

		// Ownership banner should show fully owned
		await expect(page.locator('[data-testid="ownership-banner"]')).toContainText(
			'Owned — you have all cards'
		);
	});

	test('missing cards summary shows unowned cards', async ({ page }) => {
		await setupWithDB(page);
		await spaGoto(page, '/card-lists');

		// Add a card to list without adding to collection
		await page.getByRole('button', { name: 'Add Cards' }).click();
		await addCardViaSearch(page);
		await page.locator('button[title="Close"]').click();

		// The native <dialog> makes outside elements inert while open, so we must
		// check the banner after closing. Use data-testid for reliable targeting since
		// getByText(regex) has trouble finding the element with reactive text nodes.
		await expect(page.locator('[data-testid="ownership-banner"]')).toContainText('Missing');
	});

	test('switching between multiple saved lists', async ({ page }) => {
		await setupWithDB(page);
		await spaGoto(page, '/card-lists');

		// Rename current list via import (# header line only — no API calls)
		await page.getByRole('button', { name: 'Import' }).click();
		await page.locator('textarea').fill('# First List');
		await page.getByRole('button', { name: 'Load List' }).click();
		// Wait for the Import modal to close, then for the toast to clear
		await expect(page.locator('[aria-label="Import List"]')).not.toBeVisible({ timeout: 5000 });
		await waitForToastGone(page);

		// Create a second list
		await page.getByRole('button', { name: 'New List' }).click();

		// Select should now have 2 options
		const select = page.locator('select').first();
		await expect(select.locator('option')).toHaveCount(2);

		// Switch back to the first list and verify the heading updates
		await select.selectOption({ index: 0 });
		await expect(page.getByRole('heading', { name: 'First List' })).toBeVisible();
	});

	test('importing a list from text', async ({ page }) => {
		await setupWithDB(page);
		await spaGoto(page, '/card-lists');

		await page.getByRole('button', { name: 'Import' }).click();

		const textarea = page.locator('textarea');
		await textarea.fill('# My Red List\n4 Lightning Bolt');

		await page.getByRole('button', { name: 'Load List' }).click();

		// Import calls the mocked collection API for "Lightning Bolt"
		await expect(page.getByRole('heading', { name: 'My Red List' })).toBeVisible();
		await expect(
			page.locator('[data-testid="list-cards"]').getByAltText('Lightning Bolt')
		).toBeVisible();
	});

	test('exporting a list as text', async ({ page }) => {
		await setupWithDB(page);
		await spaGoto(page, '/card-lists');

		// Add a card
		await page.getByRole('button', { name: 'Add Cards' }).click();
		await addCardViaSearch(page);
		await page.locator('button[title="Close"]').click();

		// Click Export
		await page.getByRole('button', { name: 'Export' }).click();

		const exportPre = page.locator('[data-testid="export-text"]');
		await expect(exportPre).toBeVisible();
		const text = await exportPre.textContent();
		expect(text).toContain('Lightning Bolt');
	});
});

// ==================== DB Modal Stats ====================

test.describe('DB modal content stats', () => {
	test.beforeEach(async ({ page }) => {
		await mockScryfallAPI(page);
	});

	test('reports collection size and list count of the whole database', async ({ page }) => {
		await setupWithDB(page);

		// Collection-only database: one card owned, no lists
		await spaGoto(page, '/collection');
		await page.getByRole('button', { name: 'Add Cards' }).click();
		await addCardViaSearch(page);
		await page.locator('button[title="Close"]').click();
		await waitForToastGone(page);

		await page
			.getByRole('button', { name: 'Database', exact: true })
			.evaluate((btn) => (btn as HTMLElement).click());

		await expect(page.getByTestId('db-stat-lists')).toHaveText('0');
		await expect(page.getByTestId('db-stat-list-cards')).toHaveText('0');
		await expect(page.getByTestId('db-stat-collection')).toHaveText('1 (1 unique)');
	});
});
