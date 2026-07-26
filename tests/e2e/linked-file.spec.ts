import { test, expect } from '@playwright/test';

// Helper: open the DB modal via JS click + wait for content
async function openDBModal(page: import('@playwright/test').Page) {
	await page.waitForLoadState('networkidle');
	const dbButton = page.locator('button', { hasText: /Choose DB|Database/ });
	await expect(dbButton).toBeVisible();
	await dbButton.evaluate((btn) => (btn as HTMLElement).click());
	await expect(page.getByText('Start from scratch')).toBeVisible({ timeout: 5000 });
}

test.describe('Linked File — File System Access API', () => {
	test('shows "Link a File" section in DB modal when API is available', async ({ page }) => {
		await page.goto('/');
		await openDBModal(page);

		// Chromium supports File System Access API, so the section should be visible
		const linkSection = page.getByText('Link a File (Bring Your Own Cloud)');
		await expect(linkSection).toBeVisible();
	});

	test('Link a File button is disabled when DB is not active', async ({ page }) => {
		await page.goto('/');
		await openDBModal(page);

		const linkButton = page.getByRole('button', { name: 'Link a File...' });
		await expect(linkButton).toBeVisible();
		await expect(linkButton).toBeDisabled();
	});

	test('Link a File button is enabled after creating a database', async ({ page }) => {
		await page.goto('/');
		await openDBModal(page);

		// Create new DB first
		await page.getByRole('button', { name: 'Create New Database', exact: true }).click();
		// Confirm the destructive create-new action
		await page.getByRole('button', { name: 'Delete and Create New' }).click();

		// Re-open modal
		await openDBModal(page);

		const linkButton = page.getByRole('button', { name: 'Link a File...' });
		await expect(linkButton).toBeVisible();
		await expect(linkButton).toBeEnabled();
	});
});
