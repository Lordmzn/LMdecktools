import { test, expect } from '@playwright/test';

// Clear IndexedDB before each test to ensure clean state
test.beforeEach(async ({ page }) => {
	await page.goto('./');
	await page.evaluate(() => {
		return new Promise<void>((resolve) => {
			const req = indexedDB.deleteDatabase('LMdecktools');
			req.onsuccess = () => resolve();
			req.onerror = () => resolve();
		});
	});
});

async function createNewDatabase(page: import('@playwright/test').Page) {
	await page.goto('./');
	await page.waitForLoadState('networkidle');
	const dbButton = page.getByTestId('db-modal-toggle');
	await expect(dbButton).toBeVisible();
	await dbButton.evaluate((btn) => (btn as HTMLElement).click());
	await page.getByRole('button', { name: 'Create New Database', exact: true }).click();
	await page.getByRole('button', { name: 'Delete and Create New' }).click();
	await expect(page.getByRole('button', { name: 'Database', exact: true })).toBeVisible();
}

test.describe('Copy registry (#90)', () => {
	test('a fresh database starts at one copy, in the warning lane', async ({ page }) => {
		await createNewDatabase(page);

		const chip = page.getByTestId('copy-counter');
		await expect(chip).toBeVisible();
		await expect(chip).toHaveText('1 copy');
	});

	test('the counter opens the modal straight to the Copies tab', async ({ page }) => {
		await createNewDatabase(page);

		await page.getByTestId('copy-counter').evaluate((btn) => (btn as HTMLElement).click());

		await expect(page.getByTestId('copies-count')).toHaveText('1 copy');
		await expect(page.getByTestId('copies-warning')).toBeVisible();
	});

	test('downloading a backup records a second copy and clears the warning', async ({ page }) => {
		await createNewDatabase(page);

		await page.getByTestId('copy-counter').evaluate((btn) => (btn as HTMLElement).click());
		const downloadPromise = page.waitForEvent('download');
		await page.getByRole('button', { name: 'Save a copy', exact: true }).click();
		await downloadPromise;

		await expect(page.getByTestId('copies-count')).toHaveText('2 copies');
		await expect(page.getByTestId('copies-warning')).not.toBeVisible();

		// The header chip reflects it too, and drops the warning styling.
		const chip = page.getByTestId('copy-counter');
		await expect(chip).toHaveText('2 copies');
		await expect(chip).not.toHaveClass(/text-warning/);
	});
});
