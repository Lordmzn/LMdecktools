import { test, expect } from '@playwright/test';

// Helper: wipe IndexedDB and land on a page with no database at all
async function resetDB(page: import('@playwright/test').Page) {
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
}

// Helper: create a fresh DB
async function setupWithDB(page: import('@playwright/test').Page) {
	await resetDB(page);

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
	await expect(page.getByRole('button', { name: 'In-browser DB', exact: true })).toBeVisible({
		timeout: 5000
	});
}

// ==================== Restore from file (#52, #42) ====================

// Restore lives in the "In-browser DB" section, which needs no active database
// and no File System Access API — it is reachable in every browser and in every
// dbMode (#42). The section is the default one only when no DB is loaded, so
// the tab gets clicked either way.
async function openRestorePanel(page: import('@playwright/test').Page) {
	const tab = page.getByRole('button', { name: 'In-browser DB', exact: true });
	if ((await tab.getAttribute('aria-expanded')) !== 'true') {
		await tab.click();
	}
	await expect(page.getByRole('heading', { name: 'Restore from file' })).toBeVisible();
}

async function setupWithDBAndRestorePanel(page: import('@playwright/test').Page) {
	await setupWithDB(page);
	const dbButton = page.locator('button', { hasText: /Choose DB|Database/ });
	await dbButton.evaluate((btn) => (btn as HTMLElement).click());
	await openRestorePanel(page);
}

const restoreFileInput = (page: import('@playwright/test').Page) =>
	page.locator('input[type="file"][accept=".yjs,.json"]');

// A valid export, small enough to inline
const genuineExport = (listName = 'Restored Deck') =>
	JSON.stringify({
		app: 'LM Deck Tools',
		version: '1.0',
		exported_at: 1_755_000_000_000,
		cardLists: [
			{
				name: listName,
				cards: [{ id: 'c1', name: 'Lightning Bolt', LM_quantity: 4 }],
				cardMatching: 'generic',
				languageMatching: 'any',
				created_at: 1_755_000_000_000,
				updated_at: 1_755_000_000_000
			}
		],
		collection: []
	});

const restoreButton = (page: import('@playwright/test').Page) =>
	page.getByRole('button', { name: /^Restore/ });

test.describe('Restore from file validation', () => {
	test('an unrelated .json file is refused and leaves the database untouched', async ({ page }) => {
		await setupWithDBAndRestorePanel(page);

		await restoreFileInput(page).setInputFiles({
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
		await setupWithDBAndRestorePanel(page);

		await restoreFileInput(page).setInputFiles({
			name: 'moxfield-backup.json',
			mimeType: 'application/json',
			buffer: Buffer.from(JSON.stringify({ app: 'Moxfield', cardLists: [{ name: 'Theirs' }] }))
		});

		await expect(page.getByText(/exported by "Moxfield"/)).toBeVisible();
		await expect(restoreButton(page)).toBeDisabled();
	});

	test('a genuine export shows what it holds and restores', async ({ page }) => {
		await setupWithDBAndRestorePanel(page);

		await restoreFileInput(page).setInputFiles({
			name: 'lm-backup.json',
			mimeType: 'application/json',
			buffer: Buffer.from(genuineExport())
		});

		await expect(page.getByTestId('restore-preview')).toContainText('LM Deck Tools v1.0');
		await expect(page.getByTestId('restore-preview')).toContainText('1 list, 0 collection cards');

		// The database created by setupWithDB is empty, so there is nothing to
		// confirm away — the restore runs straight off the button
		await restoreButton(page).click();
		await expect(page.getByText(/Restored 1 list successfully/)).toBeVisible();
	});

	test('restoring over existing data asks first, and Cancel changes nothing', async ({ page }) => {
		await setupWithDBAndRestorePanel(page);

		// First restore populates the database
		await restoreFileInput(page).setInputFiles({
			name: 'first.json',
			mimeType: 'application/json',
			buffer: Buffer.from(genuineExport('Keep Me'))
		});
		await restoreButton(page).click();
		await expect(page.getByText(/Restored 1 list successfully/)).toBeVisible();

		// A second restore would now destroy it, so it must be confirmed (#42)
		await restoreFileInput(page).setInputFiles({
			name: 'second.json',
			mimeType: 'application/json',
			buffer: Buffer.from(genuineExport('Replace Me'))
		});
		await restoreButton(page).click();
		await expect(page.getByText('Restore over your database?')).toBeVisible();

		await page.getByRole('button', { name: 'Cancel', exact: true }).click();
		await expect(page.getByText('Restore over your database?')).not.toBeVisible();

		const names = await page.evaluate(async () => {
			const db = await new Promise<IDBDatabase>((resolve, reject) => {
				const req = indexedDB.open('LMdecktools');
				req.onsuccess = () => resolve(req.result);
				req.onerror = () => reject(req.error);
			});
			const all = await new Promise<{ name: string }[]>((resolve) => {
				const req = db.transaction('card_lists').objectStore('card_lists').getAll();
				req.onsuccess = () => resolve(req.result);
			});
			db.close();
			return all.map((l) => l.name);
		});
		expect(names).toEqual(['Keep Me']);
	});
});

// ==================== Database restore with no database (#42) ====================

// Restore used to be unreachable in exactly the state where it matters most:
// a browser holding no database at all. These two specs pin that path open.
test.describe('Database Import', () => {
	test('importing a .json file loads deck data with no database present', async ({ page }) => {
		await resetDB(page);
		await openDBModal(page);
		await openRestorePanel(page);

		// Nothing to lose, so no confirmation stands between file and restore
		await restoreFileInput(page).setInputFiles({
			name: 'backup.json',
			mimeType: 'application/json',
			buffer: Buffer.from(genuineExport('Imported Red Deck'))
		});
		await expect(page.getByTestId('restore-preview')).toContainText('1 list');
		await restoreButton(page).click();

		await expect(page.getByText(/Restored 1 list successfully/)).toBeVisible();
		await expect(page.getByRole('button', { name: 'Database', exact: true })).toBeVisible();

		const names = await page.evaluate(async () => {
			const db = await new Promise<IDBDatabase>((resolve, reject) => {
				const req = indexedDB.open('LMdecktools');
				req.onsuccess = () => resolve(req.result);
				req.onerror = () => reject(req.error);
			});
			const all = await new Promise<{ name: string }[]>((resolve) => {
				const req = db.transaction('card_lists').objectStore('card_lists').getAll();
				req.onsuccess = () => resolve(req.result);
			});
			db.close();
			return all.map((l) => l.name);
		});
		expect(names).toEqual(['Imported Red Deck']);
	});

	test('a downloaded .yjs copy restores into a wiped browser', async ({ page }) => {
		// Round-trip through the real binary format: the previous version of this
		// spec fed a one-byte buffer, which the #52 guard now rightly refuses, so
		// the only honest .yjs fixture is one the app itself wrote.
		// Seed the database from JSON rather than from Scryfall, so the round-trip
		// stays offline and deterministic
		await setupWithDBAndRestorePanel(page);
		await restoreFileInput(page).setInputFiles({
			name: 'seed.json',
			mimeType: 'application/json',
			buffer: Buffer.from(genuineExport('Round Trip'))
		});
		await restoreButton(page).click();
		await expect(page.getByText(/Restored 1 list successfully/)).toBeVisible();

		const download = await Promise.all([
			page.waitForEvent('download'),
			page.getByRole('button', { name: 'Download .yjs file', exact: true }).click()
		]).then(([d]) => d);
		const backupPath = await download.path();
		expect(backupPath).toBeTruthy();

		await resetDB(page);
		await openDBModal(page);
		await openRestorePanel(page);

		await restoreFileInput(page).setInputFiles(backupPath!);
		// A .yjs the app wrote passes validation and names itself
		await expect(page.getByTestId('restore-preview')).toContainText('LM Deck Tools');
		await expect(page.getByTestId('restore-preview')).toContainText('1 list');

		await restoreButton(page).click();
		await expect(page.getByText(/Restored 1 list successfully/)).toBeVisible();

		const names = await page.evaluate(async () => {
			const db = await new Promise<IDBDatabase>((resolve, reject) => {
				const req = indexedDB.open('LMdecktools');
				req.onsuccess = () => resolve(req.result);
				req.onerror = () => reject(req.error);
			});
			const all = await new Promise<{ name: string }[]>((resolve) => {
				const req = db.transaction('card_lists').objectStore('card_lists').getAll();
				req.onsuccess = () => resolve(req.result);
			});
			db.close();
			return all.map((l) => l.name);
		});
		expect(names).toEqual(['Round Trip']);
	});
});
