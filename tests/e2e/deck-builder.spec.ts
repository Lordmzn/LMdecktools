import { test, expect } from '@playwright/test';

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
	// Mock card images to avoid network requests
	await page.route('**/cards.scryfall.io/**', (route) => {
		route.fulfill({
			status: 200,
			contentType: 'image/svg+xml',
			body: '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>'
		});
	});
}

// Helper: create a fresh DB and navigate to deck builder
async function setupWithDB(page: import('@playwright/test').Page) {
	await page.goto('/');
	await page.evaluate(() => {
		return new Promise<void>((resolve) => {
			const req = indexedDB.deleteDatabase('LMdecktools');
			req.onsuccess = () => resolve();
			req.onerror = () => resolve();
		});
	});
	await page.goto('/');
	await page.waitForLoadState('networkidle');

	// Create a new DB via the modal
	const dbButton = page.locator('button', { hasText: /Choose DB|Database/ });
	await dbButton.evaluate((btn) => (btn as HTMLElement).click());
	await expect(page.getByText('Start from scratch')).toBeVisible({ timeout: 5000 });
	await page.getByRole('button', { name: 'Create New Database', exact: true }).click();
	await expect(page.locator('button', { hasText: 'Database' })).toBeVisible();
}

// ==================== [planned] Deck Builder Page ====================

test.describe('Deck Builder', () => {
	test.beforeEach(async ({ page }) => {
		await mockScryfallAPI(page);
	});

	test('navigating to /decks shows the deck builder page', async ({ page }) => {
		await setupWithDB(page);
		await page.goto('/decks');

		// The deck builder page should exist and show a heading
		await expect(page.getByRole('heading', { name: /deck/i })).toBeVisible();
	});

	test('creating a new deck with a custom name', async ({ page }) => {
		await setupWithDB(page);
		await page.goto('/decks');

		// Should have a way to create a new deck
		const createButton = page.getByRole('button', { name: /new deck|create deck/i });
		await expect(createButton).toBeVisible();
		await createButton.click();

		// Should be able to name the deck
		const nameInput = page.locator(
			'input[placeholder*="deck name" i], input[placeholder*="name" i]'
		);
		await nameInput.fill('Red Aggro');

		// Verify the deck name is displayed
		await expect(page.getByText('Red Aggro')).toBeVisible();
	});

	test('adding cards to a deck from search results', async ({ page }) => {
		await setupWithDB(page);
		await page.goto('/decks');

		// Search for a card
		const searchInput = page.locator('input[placeholder*="search" i]');
		await expect(searchInput).toBeVisible();
		await searchInput.fill('Lightning Bolt');
		await searchInput.press('Enter');

		// Search results should appear
		await expect(page.getByText('Lightning Bolt')).toBeVisible();

		// Add a card to the deck (click add button on the search result)
		const addButton = page.locator('[title*="add" i], button:has-text("add")').first();
		await addButton.click();

		// Card should appear in the deck list
		await expect(
			page.locator('.deck-cards, [data-testid="deck-cards"]').getByText('Lightning Bolt')
		).toBeVisible();
	});

	test('removing cards from a deck', async ({ page }) => {
		await setupWithDB(page);
		await page.goto('/decks');

		// Add a card first
		const searchInput = page.locator('input[placeholder*="search" i]');
		await searchInput.fill('Lightning Bolt');
		await searchInput.press('Enter');
		await page.locator('[title*="add" i], button:has-text("add")').first().click();

		// Verify card is in deck
		await expect(page.getByText('Lightning Bolt')).toBeVisible();

		// Remove the card
		const removeButton = page.locator('[title*="remove" i], button:has-text("remove")').first();
		await removeButton.click();

		// Card should be removed from deck
		const deckArea = page.locator('.deck-cards, [data-testid="deck-cards"]');
		await expect(deckArea.getByText('Lightning Bolt')).not.toBeVisible();
	});

	test('deck shows which cards are owned in collection', async ({ page }) => {
		await setupWithDB(page);

		// First, add a card to the collection
		await page.goto('/collection');
		await page.locator('button', { hasText: 'Add Cards' }).click();
		const collSearchInput = page.locator('input[placeholder*="search" i]');
		await collSearchInput.fill('Lightning Bolt');
		await collSearchInput.press('Enter');
		await expect(page.getByText('Lightning Bolt')).toBeVisible();
		// Add to collection
		await page.locator('[title*="add" i], button:has-text("add")').first().click();

		// Now go to deck builder and add same card to a deck
		await page.goto('/decks');
		const searchInput = page.locator('input[placeholder*="search" i]');
		await searchInput.fill('Lightning Bolt');
		await searchInput.press('Enter');
		await page.locator('[title*="add" i], button:has-text("add")').first().click();

		// The deck view should show ownership info (e.g. "Own: 1")
		await expect(page.getByText(/own/i)).toBeVisible();
	});

	test('deck needs summary shows owned vs needed quantities', async ({ page }) => {
		await setupWithDB(page);
		await page.goto('/decks');

		// Add cards to deck
		const searchInput = page.locator('input[placeholder*="search" i]');
		await searchInput.fill('Lightning Bolt');
		await searchInput.press('Enter');
		await page.locator('[title*="add" i], button:has-text("add")').first().click();

		// There should be a summary section showing needed cards
		// (since we don't own any, all should be "needed")
		await expect(page.getByText(/need|missing/i)).toBeVisible();
	});

	test('switching between multiple saved decks', async ({ page }) => {
		await setupWithDB(page);
		await page.goto('/decks');

		// Should see at least one deck (auto-created on init)
		// Create a second deck
		const createButton = page.getByRole('button', { name: /new deck|create deck/i });
		await createButton.click();

		// Should have a way to switch between decks (tabs, dropdown, sidebar)
		const deckSelector = page.locator('select, [role="tablist"], [data-testid="deck-selector"]');
		await expect(deckSelector).toBeVisible();

		// Should show at least 2 decks
		const deckOptions = page.locator('select option, [role="tab"], [data-testid="deck-tab"]');
		const count = await deckOptions.count();
		expect(count).toBeGreaterThanOrEqual(2);
	});

	test('importing a deck from text', async ({ page }) => {
		await setupWithDB(page);
		await page.goto('/decks');

		// Should have an import button/option
		const importButton = page.getByRole('button', { name: /import/i });
		await expect(importButton).toBeVisible();
		await importButton.click();

		// Should show a text area for pasting deck lists
		const textarea = page.locator('textarea');
		await expect(textarea).toBeVisible();

		await textarea.fill('# My Red Deck\n4 Lightning Bolt');

		// Submit the import
		const submitButton = page.getByRole('button', { name: /import|load|submit/i });
		await submitButton.click();

		// Deck should be loaded with the imported cards
		await expect(page.getByText('Lightning Bolt')).toBeVisible();
		await expect(page.getByText('My Red Deck')).toBeVisible();
	});

	test('exporting a deck as text', async ({ page }) => {
		await setupWithDB(page);
		await page.goto('/decks');

		// Add a card to the deck first
		const searchInput = page.locator('input[placeholder*="search" i]');
		await searchInput.fill('Lightning Bolt');
		await searchInput.press('Enter');
		await page.locator('[title*="add" i], button:has-text("add")').first().click();

		// Click export
		const exportButton = page.getByRole('button', { name: /export/i });
		await expect(exportButton).toBeVisible();
		await exportButton.click();

		// Should show export text in standard format
		const exportText = page.locator('textarea, pre, [data-testid="export-text"]');
		await expect(exportText).toBeVisible();

		const text = await exportText.textContent();
		expect(text).toContain('Lightning Bolt');
	});
});
