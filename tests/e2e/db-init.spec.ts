import { test, expect } from '@playwright/test';

// Clear IndexedDB before each test to ensure clean state
test.beforeEach(async ({ page }) => {
	await page.goto('/');
	await page.evaluate(() => {
		return new Promise<void>((resolve) => {
			const req = indexedDB.deleteDatabase('LMdecktools');
			req.onsuccess = () => resolve();
			req.onerror = () => resolve();
		});
	});
});

// Helper: open the DB modal via JS click + wait for content
async function openDBModal(page: import('@playwright/test').Page) {
	await page.waitForLoadState('networkidle');
	const dbButton = page.locator('button', { hasText: /Choose DB|Database/ });
	await expect(dbButton).toBeVisible();
	await dbButton.evaluate((btn) => (btn as HTMLElement).click());
	// Wait for modal content to appear
	await expect(page.getByText('Start from scratch')).toBeVisible({ timeout: 5000 });
}

test.describe('Database Initialization', () => {
	test('DB modal shows options when opened', async ({ page }) => {
		await page.goto('/');
		await openDBModal(page);

		await expect(page.getByText('Import from File')).toBeVisible();
		await expect(page.getByText('Start from scratch')).toBeVisible();
		await expect(
			page.getByRole('button', { name: 'Create New Database', exact: true })
		).toBeVisible();
	});

	test('creating a new database dismisses modal and loads DB', async ({ page }) => {
		await page.goto('/');
		await openDBModal(page);

		// Click "Create New Database"
		await page.getByRole('button', { name: 'Create New Database', exact: true }).click();

		// Modal should be dismissed
		await expect(page.getByText('Start from scratch')).not.toBeVisible();

		// DB button should now show "Database" (loaded state)
		await expect(page.locator('button', { hasText: 'Database' })).toBeVisible();
	});

	test('home page renders correctly', async ({ page }) => {
		await page.goto('/');

		await expect(page.getByRole('heading', { name: /Welcome to LM Deck Tools/i })).toBeVisible();
		await expect(page.getByText('Start Building Decks')).toBeVisible();
		await expect(page.getByText('Manage Collection')).toBeVisible();
	});
});
