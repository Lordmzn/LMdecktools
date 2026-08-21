import { test, expect, type Page } from '@playwright/test';

const SYNTHETIC_MESSAGE = 'E2E synthetic failure';

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

async function createDatabase(page: Page) {
	await page.goto('./');
	await page.waitForLoadState('networkidle');
	const dbButton = page.getByTestId('db-modal-toggle');
	await dbButton.evaluate((btn) => (btn as HTMLElement).click());
	await page.getByRole('button', { name: 'Create New Database', exact: true }).click();
	await page.getByRole('button', { name: 'Delete and Create New' }).click();
	await expect(page.getByRole('button', { name: 'Database', exact: true })).toBeVisible();
}

/** Wait until the journal has actually been written, so navigation can't race the IDB write. */
async function waitForJournalEntry(page: Page, message: string) {
	await page.waitForFunction(
		(needle) =>
			new Promise<boolean>((resolve) => {
				const request = indexedDB.open('LMdecktools');
				request.onsuccess = () => {
					const db = request.result;
					if (!db.objectStoreNames.contains('error_journal')) {
						db.close();
						resolve(false);
						return;
					}
					const getAll = db
						.transaction('error_journal', 'readonly')
						.objectStore('error_journal')
						.getAll();
					getAll.onsuccess = () => {
						const found = (getAll.result as { message: string }[]).some((entry) =>
							entry.message.includes(needle)
						);
						db.close();
						resolve(found);
					};
					getAll.onerror = () => {
						db.close();
						resolve(false);
					};
				};
				request.onerror = () => resolve(false);
			}),
		message
	);
}

test.describe('Diagnostics', () => {
	test('an unhandled rejection is journalled and shown on /diagnostics', async ({ page }) => {
		await createDatabase(page);

		// Nothing awaits this promise, so only the window listener can catch it (#30)
		await page.evaluate((message) => {
			void Promise.reject(new Error(message));
		}, SYNTHETIC_MESSAGE);

		await waitForJournalEntry(page, SYNTHETIC_MESSAGE);

		await page.goto('./diagnostics/');

		const entry = page.getByTestId('diagnostics-list').getByText(SYNTHETIC_MESSAGE);
		await expect(entry).toBeVisible();
		await expect(page.getByTestId('diagnostics-list').getByText('unhandled')).toBeVisible();
	});

	test('the category filter hides errors from other categories', async ({ page }) => {
		await createDatabase(page);
		await page.evaluate((message) => {
			void Promise.reject(new Error(message));
		}, SYNTHETIC_MESSAGE);
		await waitForJournalEntry(page, SYNTHETIC_MESSAGE);

		await page.goto('./diagnostics/');
		await expect(page.getByText(SYNTHETIC_MESSAGE)).toBeVisible();

		await page.getByTestId('diagnostics-category').selectOption('scryfall-api');
		await expect(page.getByText(SYNTHETIC_MESSAGE)).not.toBeVisible();
		await expect(page.getByText('No errors match your filter')).toBeVisible();

		await page.getByTestId('diagnostics-category').selectOption('unhandled');
		await expect(page.getByText(SYNTHETIC_MESSAGE)).toBeVisible();
	});

	test('clearing empties the journal', async ({ page }) => {
		await createDatabase(page);
		await page.evaluate((message) => {
			void Promise.reject(new Error(message));
		}, SYNTHETIC_MESSAGE);
		await waitForJournalEntry(page, SYNTHETIC_MESSAGE);

		await page.goto('./diagnostics/');
		await page.getByRole('button', { name: 'Clear All' }).click();
		// Second match is the one inside the confirmation dialog
		await page.getByRole('button', { name: 'Clear All' }).last().click();

		await expect(page.getByText('No errors recorded')).toBeVisible();
	});

	test('reporting shows exactly what would be sent before opening GitHub', async ({ page }) => {
		await createDatabase(page);
		await page.evaluate((message) => {
			void Promise.reject(new Error(message));
		}, SYNTHETIC_MESSAGE);
		await waitForJournalEntry(page, SYNTHETIC_MESSAGE);

		await page.goto('./diagnostics/');
		await page.getByRole('checkbox', { name: 'Select error for reporting' }).first().check();
		await page.getByRole('button', { name: /Report .* on GitHub/ }).click();

		// The privacy promise is that nothing leaves without the user seeing it first
		await expect(page.getByTestId('report-preview')).toContainText(SYNTHETIC_MESSAGE);
		await expect(page.getByRole('button', { name: 'Open GitHub issue' })).toBeVisible();
	});

	test('says so plainly when no database is open', async ({ page }) => {
		await page.goto('./diagnostics/');

		await expect(page.getByText('No database open')).toBeVisible();
	});
});
