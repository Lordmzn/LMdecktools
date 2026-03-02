import { test, expect } from '@playwright/test';

// Two Lightning Bolt printings with different Scryfall IDs but same name.
// Generic matching groups by name → "in both".
// Specific matching groups by ID → "only in A" + "only in B".
const BOLT_ALPHA = {
	id: 'bolt-alpha-001',
	name: 'Lightning Bolt',
	mana_cost: '{R}',
	type_line: 'Instant',
	set: 'lea',
	set_name: 'Limited Edition Alpha',
	lang: 'en',
	image_uris: {
		small: 'https://cards.scryfall.io/small/front/bolt-a.jpg',
		normal: 'https://cards.scryfall.io/normal/front/bolt-a.jpg'
	}
};

const BOLT_M10 = {
	id: 'bolt-m10-002',
	name: 'Lightning Bolt',
	mana_cost: '{R}',
	type_line: 'Instant',
	set: 'm10',
	set_name: 'Magic 2010',
	lang: 'en',
	image_uris: {
		small: 'https://cards.scryfall.io/small/front/bolt-b.jpg',
		normal: 'https://cards.scryfall.io/normal/front/bolt-b.jpg'
	}
};

// Track which collection-API call we're on so we can return different printings.
let collectionCallCount = 0;

async function mockScryfallAPI(page: import('@playwright/test').Page) {
	collectionCallCount = 0;

	// The import flow uses POST /cards/collection to resolve card names.
	await page.route('**/api.scryfall.com/cards/collection', (route) => {
		collectionCallCount++;
		const card = collectionCallCount <= 1 ? BOLT_ALPHA : BOLT_M10;
		route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({
				object: 'list',
				data: [card],
				not_found: []
			})
		});
	});

	// Mock card images
	await page.route('**/cards.scryfall.io/**', (route) => {
		route.fulfill({
			status: 200,
			contentType: 'image/svg+xml',
			body: '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>'
		});
	});
}

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

	const dbButton = page.locator('button', { hasText: /Choose DB|Database/ });
	await dbButton.evaluate((btn) => (btn as HTMLElement).click());
	await expect(page.getByText('Start from scratch')).toBeVisible({ timeout: 5000 });
	await page.getByRole('button', { name: 'Create New Database', exact: true }).click();
	await expect(page.locator('button', { hasText: 'Database' })).toBeVisible();
}

async function spaGoto(page: import('@playwright/test').Page, href: string) {
	await page.locator(`a[href="${href}"]`).first().click();
}

async function waitForToastGone(page: import('@playwright/test').Page) {
	await expect(page.locator('.animate-slide-in')).not.toBeVisible({ timeout: 5000 });
}

/** Import a text list into the currently selected card list. */
async function importList(page: import('@playwright/test').Page, text: string) {
	await page.getByRole('button', { name: 'Import' }).click();
	await page.locator('textarea').fill(text);
	await page.getByRole('button', { name: 'Load List' }).click();
	// Wait for import to finish — the modal closes and heading updates
	await expect(page.locator('[aria-label="Import List"]')).not.toBeVisible({ timeout: 10000 });
	await waitForToastGone(page);
}

// ==================== Compare Page Tests ====================

test.describe('Compare page toggles', () => {
	test.beforeEach(async ({ page }) => {
		await mockScryfallAPI(page);
		await setupWithDB(page);
		await spaGoto(page, '/card-lists');

		// Import first list (uses BOLT_ALPHA via mock)
		await importList(page, '# List Alpha\n4 Lightning Bolt');

		// Create a second list and import into it (uses BOLT_M10 via mock)
		await page.getByRole('button', { name: 'New List' }).click();
		await importList(page, '# List M10\n2 Lightning Bolt');

		// Navigate to compare page
		await spaGoto(page, '/card-lists/compare');
		// Wait for the compare page to render
		await expect(page.getByRole('heading', { name: 'Compare Lists' })).toBeVisible();
	});

	test('card matching toggle updates visually', async ({ page }) => {
		// Default is "Generic" — should be highlighted
		const genericBtn = page.getByRole('button', { name: 'Generic' });
		const specificBtn = page.getByRole('button', { name: 'Specific' });

		await expect(genericBtn).toHaveClass(/bg-orange-500/);
		await expect(specificBtn).not.toHaveClass(/bg-orange-500/);

		// Click "Specific"
		await specificBtn.click();
		await expect(specificBtn).toHaveClass(/bg-orange-500/);
		await expect(genericBtn).not.toHaveClass(/bg-orange-500/);

		// Click "Generic" again
		await genericBtn.click();
		await expect(genericBtn).toHaveClass(/bg-orange-500/);
		await expect(specificBtn).not.toHaveClass(/bg-orange-500/);
	});

	test('language matching toggle updates visually', async ({ page }) => {
		const anyBtn = page.getByRole('button', { name: 'Any' });
		const strictBtn = page.getByRole('button', { name: 'Strict' });

		await expect(anyBtn).toHaveClass(/bg-orange-500/);
		await expect(strictBtn).not.toHaveClass(/bg-orange-500/);

		await strictBtn.click();
		await expect(strictBtn).toHaveClass(/bg-orange-500/);
		await expect(anyBtn).not.toHaveClass(/bg-orange-500/);
	});

	test('switching from generic to specific changes comparison result', async ({ page }) => {
		// In Generic mode: same name → "in both" = 1, "only in A" = 0, "only in B" = 0
		await expect(page.locator('text=1 in both')).toBeVisible();
		await expect(page.locator('text=0 only in A')).toBeVisible();
		await expect(page.locator('text=0 only in B')).toBeVisible();

		// Switch to Specific
		await page.getByRole('button', { name: 'Specific' }).click();

		// Different IDs → "in both" = 0, "only in A" = 1, "only in B" = 1
		await expect(page.locator('text=0 in both')).toBeVisible();
		await expect(page.locator('text=1 only in A')).toBeVisible();
		await expect(page.locator('text=1 only in B')).toBeVisible();

		// Switch back to Generic → reverts
		await page.getByRole('button', { name: 'Generic' }).click();
		await expect(page.locator('text=1 in both')).toBeVisible();
		await expect(page.locator('text=0 only in A')).toBeVisible();
		await expect(page.locator('text=0 only in B')).toBeVisible();
	});
});
