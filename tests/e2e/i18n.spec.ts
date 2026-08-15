import { test, expect } from '@playwright/test';

/**
 * Locale routing (#39). English lives at `/`, Italian under `/it-it/`, and the
 * footer switcher is the only way to reach the latter without typing a URL.
 */
test.describe('Language switching', () => {
	test('the footer switcher moves the whole page to Italian and back', async ({ page }) => {
		await page.goto('/');
		await expect(page.locator('html')).toHaveAttribute('lang', 'en');
		await expect(page.getByRole('heading', { name: /Chart Your Own Course/i })).toBeVisible();

		await page.getByRole('link', { name: 'Italiano' }).click();

		await expect(page).toHaveURL(/\/it-it\/$/);
		await expect(page.locator('html')).toHaveAttribute('lang', 'it-it');
		await expect(page.getByRole('heading', { name: /Traccia la Tua Rotta/i })).toBeVisible();
		// The chrome around the page follows the locale, not just the landing copy
		await expect(page.getByRole('button', { name: 'Scegli DB' })).toBeVisible();

		await page.getByRole('link', { name: 'English' }).click();

		await expect(page).toHaveURL(/localhost:\d+\/$/);
		await expect(page.locator('html')).toHaveAttribute('lang', 'en');
	});

	test('switching keeps you on the page you were reading', async ({ page }) => {
		await page.goto('/collection');
		await expect(page.getByRole('heading', { name: 'My Collection' })).toBeVisible();

		await page.getByRole('link', { name: 'Italiano' }).click();

		await expect(page).toHaveURL(/\/it-it\/collection\/$/);
		await expect(page.getByRole('heading', { name: 'La mia collezione' })).toBeVisible();
	});

	test('an Italian URL serves Italian directly, with no client-side switch', async ({ page }) => {
		await page.goto('/it-it/card-lists/');

		await expect(page.locator('html')).toHaveAttribute('lang', 'it-it');
		await expect(page.getByRole('button', { name: 'Nuova lista' })).toBeVisible();
		await expect(page.getByRole('link', { name: 'Confronta liste' })).toBeVisible();
	});
});
