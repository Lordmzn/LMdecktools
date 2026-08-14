import { test, expect } from '@playwright/test';

// Helper: create a fresh DB
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
	// Confirm the destructive create-new action
	await page.getByRole('button', { name: 'Delete and Create New' }).click();
	await expect(page.getByRole('button', { name: 'Database', exact: true })).toBeVisible();
}

// Helper: open DB modal
async function openDBModal(page: import('@playwright/test').Page) {
	await page.waitForLoadState('networkidle');
	const dbButton = page.locator('button', { hasText: /Choose DB|Database/ });
	await expect(dbButton).toBeVisible();
	await dbButton.evaluate((btn) => (btn as HTMLElement).click());
	await expect(page.getByText('Import from File')).toBeVisible({ timeout: 5000 });
}

// ==================== Restore from file (#52) ====================

// "Restore from file" renders only where the File System Access API is absent
// (Firefox). Chromium has it, so we remove it before the app loads to reach the
// same code path the Firefox fallback uses.
async function setupFirefoxLikeWithDB(page: import('@playwright/test').Page) {
	await page.addInitScript(() => {
		// @ts-expect-error — emulating a browser without the File System Access API
		delete window.showSaveFilePicker;
	});
	await setupWithDB(page);
	await openRestorePanel(page);
}

async function openRestorePanel(page: import('@playwright/test').Page) {
	const dbButton = page.locator('button', { hasText: /Choose DB|Database/ });
	await dbButton.evaluate((btn) => (btn as HTMLElement).click());
	await page.getByRole('button', { name: 'Link File', exact: true }).click();
	await expect(page.getByRole('heading', { name: 'Restore from file' })).toBeVisible();
}

const restoreButton = (page: import('@playwright/test').Page) =>
	page.getByRole('button', { name: /^Restore/ });

test.describe('Restore from file validation', () => {
	test('an unrelated .json file is refused and leaves the database untouched', async ({ page }) => {
		await setupFirefoxLikeWithDB(page);

		await page.locator('input[type="file"][accept=".yjs,.json"]').setInputFiles({
			name: 'shopping-list.json',
			mimeType: 'application/json',
			buffer: Buffer.from(JSON.stringify({ tasks: ['buy milk'], done: false }))
		});

		await expect(page.getByText(/not an LM Deck Tools export/)).toBeVisible();
		await expect(restoreButton(page)).toBeDisabled();

		// Nothing was written: the DB is still the empty one we created
		const listCount = await page.evaluate(async () => {
			const db = await new Promise<IDBDatabase>((resolve, reject) => {
				const req = indexedDB.open('LMdecktools');
				req.onsuccess = () => resolve(req.result);
				req.onerror = () => reject(req.error);
			});
			const count = await new Promise<number>((resolve) => {
				const req = db.transaction('card_lists').objectStore('card_lists').count();
				req.onsuccess = () => resolve(req.result);
			});
			db.close();
			return count;
		});
		expect(listCount).toBe(0);
	});

	test('an export from another app is refused by name', async ({ page }) => {
		await setupFirefoxLikeWithDB(page);

		await page.locator('input[type="file"][accept=".yjs,.json"]').setInputFiles({
			name: 'moxfield-backup.json',
			mimeType: 'application/json',
			buffer: Buffer.from(JSON.stringify({ app: 'Moxfield', cardLists: [{ name: 'Theirs' }] }))
		});

		await expect(page.getByText(/exported by "Moxfield"/)).toBeVisible();
		await expect(restoreButton(page)).toBeDisabled();
	});

	test('a genuine export shows what it holds and restores', async ({ page }) => {
		await setupFirefoxLikeWithDB(page);

		await page.locator('input[type="file"][accept=".yjs,.json"]').setInputFiles({
			name: 'lm-backup.json',
			mimeType: 'application/json',
			buffer: Buffer.from(
				JSON.stringify({
					app: 'LM Deck Tools',
					version: '1.0',
					exported_at: 1_755_000_000_000,
					cardLists: [
						{
							name: 'Restored Deck',
							cards: [{ id: 'c1', name: 'Lightning Bolt', LM_quantity: 4 }],
							cardMatching: 'generic',
							languageMatching: 'any',
							created_at: 1_755_000_000_000,
							updated_at: 1_755_000_000_000
						}
					],
					collection: []
				})
			)
		});

		await expect(page.getByTestId('restore-preview')).toContainText('LM Deck Tools v1.0');
		await expect(page.getByTestId('restore-preview')).toContainText('1 list, 0 collection cards');

		await restoreButton(page).click();
		await expect(page.getByText(/Restored 1 list successfully/)).toBeVisible();
	});
});

// ==================== [planned] Database Import from File ====================

// These two specs drive an "Import from File" section that the tabbed-modal
// redesign removed. They are not simply out of date: restoring a backup now
// lives under "Restore from file", which renders only when the File System
// Access API is absent (Firefox) and only inside the export section, which
// needs an active database. On Chromium with no DB there is no file input in
// the DOM at all, so there is nothing to rewrite them against yet.
// Re-enable once #42 settles where restore belongs. See also #35.
test.describe('Database Import', () => {
	test.fixme('importing a .json file loads deck data', async ({ page }) => {
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
		await expect(page.getByRole('button', { name: 'Database', exact: true })).toBeVisible();
	});

	test.fixme('importing a .yjs file loads deck data', async ({ page }) => {
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
