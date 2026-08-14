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

		await expect(page.getByRole('button', { name: 'In-browser DB', exact: true })).toBeVisible();
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
		// Confirm the destructive create-new action
		await page.getByRole('button', { name: 'Delete and Create New' }).click();

		// Modal should be dismissed
		await expect(page.getByText('Start from scratch')).not.toBeVisible();

		// DB button should now show "Database" (loaded state)
		await expect(page.getByRole('button', { name: 'Database', exact: true })).toBeVisible();
	});

	test('image cache reports a byte size alongside the image count', async ({ page }) => {
		await page.goto('/');
		await openDBModal(page);
		await page.getByRole('button', { name: 'Cache', exact: true }).click();

		// "how much disk is this costing me" — a count alone does not answer it (#51)
		await expect(page.getByTestId('image-cache-stats')).toHaveText(
			/^\d+ images? · [\d.]+ [kMG]?B$/
		);
	});

	test('home page renders correctly', async ({ page }) => {
		await page.goto('/');

		await expect(page.getByRole('heading', { name: /Chart Your Own Course/i })).toBeVisible();
		await expect(page.getByText('Manage Card Lists')).toBeVisible();
		await expect(page.getByText('Manage Collection')).toBeVisible();
		// The Compact — the manifesto that carries the local-first promise
		await expect(page.getByText('Your data never leaves your device.')).toBeVisible();
	});
});
