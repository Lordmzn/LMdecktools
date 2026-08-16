import { test, expect } from '@playwright/test';

// Helper: open the DB modal via JS click + wait for the section toolbar
async function openDBModal(page: import('@playwright/test').Page) {
	await page.waitForLoadState('networkidle');
	const dbButton = page.getByTestId('db-modal-toggle');
	await expect(dbButton).toBeVisible();
	await dbButton.evaluate((btn) => (btn as HTMLElement).click());
	// The toolbar is always present once the modal is open
	await expect(page.getByRole('button', { name: 'In-browser DB', exact: true })).toBeVisible({
		timeout: 5000
	});
}

// Helper: expand one of the modal's accordion sections. The toolbar buttons
// toggle, so only click when the section is not already expanded.
async function openSection(page: import('@playwright/test').Page, name: string) {
	const tab = page.getByRole('button', { name, exact: true });
	await expect(tab).toBeEnabled();
	if ((await tab.getAttribute('aria-expanded')) !== 'true') {
		await tab.click();
	}
	await expect(tab).toHaveAttribute('aria-expanded', 'true');
}

// Helper: start from an empty IndexedDB
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

// Helper: create a fresh database from the "In-browser DB" section.
// Creating a DB closes the modal, so callers must re-open it.
async function createDB(page: import('@playwright/test').Page) {
	await openSection(page, 'In-browser DB');
	await page.getByRole('button', { name: 'Create New Database', exact: true }).click();
	// Confirm the destructive create-new action
	await page.getByRole('button', { name: 'Delete and Create New', exact: true }).click();
	await expect(page.getByTestId('db-modal-toggle')).toContainText('Database');
}

test.describe('Linked File — File System Access API', () => {
	test('the File DB section is unavailable until a database is active', async ({ page }) => {
		await resetDB(page);
		await openDBModal(page);

		// Linking a file requires an active DB, so the whole section is disabled
		await expect(page.getByRole('button', { name: 'File DB', exact: true })).toBeDisabled();
	});

	test('shows "Link a File" section in DB modal when API is available', async ({ page }) => {
		await resetDB(page);
		await openDBModal(page);
		await createDB(page);

		// Creating the DB closes the modal — re-open it
		await openDBModal(page);
		await openSection(page, 'File DB');

		// Chromium supports File System Access API, so the section should be visible
		await expect(page.getByText('Link a File (Bring Your Own Cloud)')).toBeVisible();
	});

	test('the link buttons are enabled after creating a database', async ({ page }) => {
		await resetDB(page);
		await openDBModal(page);
		await createDB(page);

		// Creating the DB closes the modal — re-open it
		await openDBModal(page);
		await openSection(page, 'File DB');

		for (const name of ['New File...', 'Existing File...']) {
			const linkButton = page.getByRole('button', { name, exact: true });
			await expect(linkButton).toBeVisible();
			await expect(linkButton).toBeEnabled();
		}
	});
});
