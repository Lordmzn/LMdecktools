import { test, expect } from '@playwright/test';

// Helper: create a fresh DB
async function _setupWithDB(page: import('@playwright/test').Page) {
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

// Helper: open DB modal
async function openDBModal(page: import('@playwright/test').Page) {
	await page.waitForLoadState('networkidle');
	const dbButton = page.locator('button', { hasText: /Choose DB|Database/ });
	await expect(dbButton).toBeVisible();
	await dbButton.evaluate((btn) => (btn as HTMLElement).click());
	await expect(page.getByText('Import from File')).toBeVisible({ timeout: 5000 });
}

// ==================== [planned] Database Import from File ====================

test.describe('Database Import', () => {
	test('importing a .json file loads deck data', async ({ page }) => {
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

		await openDBModal(page);

		// Prepare a JSON file with deck data
		const importData = JSON.stringify({
			decks: [
				{
					name: 'Imported Red Deck',
					deck_cards: [{ id: 'c1', name: 'Lightning Bolt', LM_quantity: 4 }],
					created_at: Date.now(),
					updated_at: Date.now()
				}
			]
		});

		// Upload via the file input in the modal
		const fileInput = page.locator('input[type="file"]');
		await expect(fileInput).toBeVisible();

		// Create a temporary file and set it on the input
		await fileInput.setInputFiles({
			name: 'backup.json',
			mimeType: 'application/json',
			buffer: Buffer.from(importData)
		});

		// Click "Import File" button
		// Currently throws "Not implemented"
		const importButton = page.getByRole('button', { name: 'Import File', exact: true });
		await importButton.click();

		// Modal should close after successful import
		await expect(page.getByText('Import from File')).not.toBeVisible({ timeout: 5000 });

		// DB should be loaded
		await expect(page.locator('button', { hasText: 'Database' })).toBeVisible();
	});

	test('importing a .yjs file loads deck data', async ({ page }) => {
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

		await openDBModal(page);

		// For Yjs binary, we'd need to create a proper Yjs export in the browser
		// For now, test that the file input accepts .yjs files
		const fileInput = page.locator('input[type="file"]');
		await expect(fileInput).toBeVisible();

		// Create a minimal file (won't be valid Yjs but tests the flow)
		await fileInput.setInputFiles({
			name: 'backup.yjs',
			mimeType: 'application/octet-stream',
			buffer: Buffer.from([0x00])
		});

		const importButton = page.getByRole('button', { name: 'Import File', exact: true });
		await importButton.click();

		// Should not throw "Not implemented" — should attempt to process the file
		// Even if it fails to parse, it should show an error message, not crash
		await expect(page.getByText(/not implemented/i)).not.toBeVisible();
	});
});
