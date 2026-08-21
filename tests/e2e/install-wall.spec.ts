/**
 * Install wall and preview mode on an uninstalled iOS browser tab (#87).
 *
 * Runs only under the `ios-browser` project — the context is detected from the
 * user agent, so no other project can reach this code path.
 *
 * What is actually being defended: an iPhone visitor who types a collection into
 * the Safari tab and then installs the app finds it empty, because each Home
 * Screen icon has its own storage container and none of them can see Safari's.
 * The fix is that the tab never writes at all.
 */
import { test, expect, type Page } from '@playwright/test';

/** Whatever the app has managed to persist in this browser's own IndexedDB. */
async function realDatabases(page: Page): Promise<string[]> {
	return page.evaluate(async () => (await indexedDB.databases()).map((d) => d.name ?? ''));
}

test.describe('iOS browser tab', () => {
	test('shows the preview banner and never opens a real database', async ({ page }) => {
		await page.goto('./');
		await page.waitForLoadState('networkidle');

		await expect(page.getByText('Preview — nothing here is being saved.')).toBeVisible();

		// The store is live and writable — preview mode is impermanent, not read-only.
		expect(await page.evaluate(() => document.body.textContent)).not.toContain(
			'No database selected'
		);

		expect(await realDatabases(page)).not.toContain('LMdecktools');
	});

	test('the banner cannot be dismissed and survives navigation', async ({ page }) => {
		await page.goto('./');
		await page.waitForLoadState('networkidle');

		const banner = page.getByText('Preview — nothing here is being saved.');
		await expect(banner).toBeVisible();
		// No close control of any kind inside the banner region.
		await expect(page.locator('[role="status"] button')).toHaveCount(1);

		await page.goto('./collection');
		await page.waitForLoadState('networkidle');
		await expect(banner).toBeVisible();
	});

	test('the install sheet says how, and says it once', async ({ page }) => {
		await page.goto('./');
		await page.waitForLoadState('networkidle');

		const cta = page.getByTestId('preview-install-cta');
		const box = (await cta.boundingBox())!;
		expect(box.height, 'install CTA is a tap target').toBeGreaterThanOrEqual(44);

		await cta.tap();

		await expect(page.getByRole('heading', { name: 'Install LM Deck Tools' })).toBeVisible();
		await expect(page.getByText('Add to Home Screen')).toBeVisible();
		// The residual trap detection cannot solve: a second icon is a third,
		// empty container. The sheet is the only place the user is told.
		await expect(page.getByText('Add the icon once.')).toBeVisible();
	});

	test('adding a card writes to memory and nowhere else', async ({ page }) => {
		await page.route('**/api.scryfall.com/cards/search**', (route) =>
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					object: 'list',
					total_cards: 1,
					has_more: false,
					data: [
						{
							id: 'bolt-id-001',
							name: 'Lightning Bolt',
							mana_cost: '{R}',
							type_line: 'Instant',
							set: 'lea',
							set_name: 'Limited Edition Alpha'
						}
					]
				})
			})
		);

		await page.goto('./collection');
		await page.waitForLoadState('networkidle');

		await page.getByRole('button', { name: 'Add Cards' }).click();
		await page.locator('input[placeholder="Search for cards..."]').fill('Lightning Bolt');
		await page.getByRole('button', { name: 'Search' }).click();
		await page.locator('[data-testid="card-add-btn"]').first().click();
		await expect(page.locator('.animate-slide-in').filter({ hasText: /added/i })).toBeVisible({
			timeout: 5000
		});
		await page.locator('button[title="Close"]').click();

		// Visible in the app…
		await expect(page.getByText('Lightning Bolt').first()).toBeVisible();
		// …and absent from the container an installed app could never read.
		expect(await realDatabases(page)).not.toContain('LMdecktools');
	});
});
