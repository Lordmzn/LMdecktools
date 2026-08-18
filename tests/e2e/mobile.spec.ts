/**
 * Phone usability (#76).
 *
 * Runs only under the `mobile` project — 390×844 with `hasTouch`, which is what
 * makes `(hover: none)` true and the `touch:` variant apply. The desktop project
 * is structurally incapable of failing any of these.
 *
 * The bug this spec exists for was not a layout wobble: `opacity: 0` does not
 * disable hit-testing, so every card action in the app was invisible *and still
 * tappable*, and a tap meant to inspect a card removed a copy from the
 * collection with nothing ever drawn on screen.
 */
import { test, expect, type Page } from '@playwright/test';
import { appHref } from './base';

const MOCK_BOLT = {
	id: 'bolt-id-001',
	name: 'Lightning Bolt',
	mana_cost: '{R}',
	type_line: 'Instant',
	set: 'lea',
	set_name: 'Limited Edition Alpha',
	image_uris: {
		small: 'https://cards.scryfall.io/small/front/bolt.jpg',
		normal: 'https://cards.scryfall.io/normal/front/bolt.jpg'
	}
};

async function mockScryfallAPI(page: Page) {
	await page.route('**/api.scryfall.com/cards/search**', (route) =>
		route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({ object: 'list', total_cards: 1, has_more: false, data: [MOCK_BOLT] })
		})
	);
	await page.route('**/api.scryfall.com/cards/named**', (route) =>
		route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify(MOCK_BOLT)
		})
	);
	await page.route('**/cards.scryfall.io/**', (route) =>
		route.fulfill({
			status: 200,
			contentType: 'image/svg+xml',
			body: '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>'
		})
	);
}

/** Fresh DB via the modal. Ends on '/' with `store.dbMode === 'active'`. */
async function setupWithDB(page: Page) {
	await page.goto('./');
	await page.evaluate(
		() =>
			new Promise<void>((resolve) => {
				const req = indexedDB.deleteDatabase('LMdecktools');
				req.onsuccess = () => resolve();
				req.onerror = () => resolve();
			})
	);
	await page.goto('./');
	await page.waitForLoadState('networkidle');

	const dbButton = page.locator('button', { hasText: /Choose DB|Database/ });
	await dbButton.evaluate((btn) => (btn as HTMLElement).click());
	await expect(page.getByText('Start from scratch')).toBeVisible({ timeout: 5000 });
	await page.getByRole('button', { name: 'Create New Database', exact: true }).click();
	await page.getByRole('button', { name: 'Delete and Create New' }).click();
	await expect(page.getByRole('button', { name: 'Database', exact: true })).toBeVisible();
}

/**
 * Client-side navigation, so the store module state survives the route change.
 *
 * The home link renders as bare `/decktools`, not `/decktools/` — Paraglide
 * normalises the href it rewrites — so '/' has to be spelled as the empty route.
 */
async function spaGoto(page: Page, route: string) {
	await page
		.locator(`a[href="${appHref(route === '/' ? '' : route)}"]`)
		.first()
		.click();
}

/** Adds one Lightning Bolt to the collection through the search modal. */
async function seedCollection(page: Page) {
	await spaGoto(page, '/collection');
	await page.getByRole('button', { name: 'Add Cards' }).click();
	await page.locator('input[placeholder="Search for cards..."]').fill('Lightning Bolt');
	await page.getByRole('button', { name: 'Search' }).click();

	// A plain .click() is the assertion: before #76 the add button sat under an
	// opacity-0 overlay and every spec had to reach it with evaluate().
	await page.locator('[data-testid="card-add-btn"]').first().click();
	await expect(page.locator('.animate-slide-in').filter({ hasText: /added/i })).toBeVisible({
		timeout: 3000
	});
	await page.locator('button[title="Close"]').click();
}

test.describe('Phone usability', () => {
	test.beforeEach(async ({ page }) => {
		await mockScryfallAPI(page);
	});

	test('the emulated device really has no hover', async ({ page }) => {
		// Guard for the rest of the file: every touch assertion below is vacuous
		// if the context reports a hover-capable pointer, and it would pass anyway.
		await page.goto('./');
		expect(await page.evaluate(() => matchMedia('(hover: none)').matches)).toBe(true);
	});

	test('no page overflows 390px or renders a control off-screen', async ({ page }) => {
		// Populated, not empty: the 67px of overflow on /card-lists came from a list
		// select sized to its longest option next to a Delete List button, and an
		// empty database renders neither at full width.
		await setupWithDB(page);
		await seedCollection(page);
		await spaGoto(page, '/card-lists');
		await page.getByRole('button', { name: 'New List' }).click();
		await page.getByRole('button', { name: 'New List' }).click(); // compare needs two

		for (const route of ['/', '/collection', '/card-lists', '/card-lists/compare']) {
			await spaGoto(page, route);
			await page.waitForLoadState('networkidle');

			const overflow = await page.evaluate(() => {
				const width = window.innerWidth;
				const strays = [...document.querySelectorAll('a, button, input, select, textarea')]
					.filter((el) => {
						const r = el.getBoundingClientRect();
						// Zero-size elements are hidden, not misplaced.
						return r.width > 0 && r.height > 0 && (r.right > width + 1 || r.left < -1);
					})
					.map((el) => `${el.tagName}:${(el.textContent ?? '').trim().slice(0, 30)}`);
				return { scrollWidth: document.body.scrollWidth, width, strays };
			});

			expect(overflow.strays, `controls outside the viewport on ${route}`).toEqual([]);
			expect(overflow.scrollWidth, `horizontal overflow on ${route}`).toBeLessThanOrEqual(
				overflow.width + 1
			);
		}

		// /diagnostics is footer-linked rather than in the nav, so it needs its own
		// hop; nothing on it depends on store state surviving the navigation.
		await page.goto('./diagnostics');
		await page.waitForLoadState('networkidle');
		const diagnostics = await page.evaluate(() => ({
			scrollWidth: document.body.scrollWidth,
			width: window.innerWidth
		}));
		expect(diagnostics.scrollWidth).toBeLessThanOrEqual(diagnostics.width + 1);
	});

	test('every non-inline control reaches 44px', async ({ page }) => {
		// The issue counted 15 / 60 / 76 / 26 / 17 sub-44px targets per page. What
		// survives is the three links inside the footer's disclaimer sentences,
		// which WCAG 2.5.5 exempts by name: a target sized by the line-height of
		// the prose around it cannot grow without breaking the paragraph.
		const INLINE_PROSE = ['Scryfall', 'API terms', 'GNU Affero General Public License v3.0'];

		for (const route of ['', 'collection', 'card-lists', 'card-lists/compare', 'diagnostics']) {
			await page.goto('./' + route);
			await page.waitForLoadState('networkidle');

			const undersized = await page.evaluate((exempt) => {
				const out: string[] = [];
				for (const el of document.querySelectorAll('a, button, input, select, textarea')) {
					const r = el.getBoundingClientRect();
					if (r.width === 0 || r.height === 0) continue;
					if (exempt.includes((el.textContent ?? '').trim())) continue;
					if (r.height < 44 || r.width < 44) {
						out.push(`${Math.round(r.width)}×${Math.round(r.height)} "${el.textContent?.trim()}"`);
					}
				}
				return out;
			}, INLINE_PROSE);

			expect(undersized, `undersized targets on /${route}`).toEqual([]);
		}
	});

	test('primary navigation is labelled and reaches 44px', async ({ page }) => {
		await page.goto('./');

		for (const label of ['Home', 'Collection', 'Card Lists']) {
			const link = page.getByRole('link', { name: label, exact: true });
			// Not sr-only: readable without a hover, which is the whole information
			// scent of the app on first load.
			await expect(link).toBeVisible();
			const box = (await link.boundingBox())!;
			expect(box.height, `${label} height`).toBeGreaterThanOrEqual(44);
			expect(box.width, `${label} width`).toBeGreaterThanOrEqual(44);
		}
	});

	test('collection card controls are visible before they can be tapped', async ({ page }) => {
		await setupWithDB(page);
		await seedCollection(page);

		const removeBtn = page.getByRole('button', { name: 'Remove one' }).first();
		await expect(removeBtn).toBeVisible();

		// The precise failure from the issue: opacity 0 with pointer-events auto.
		const opacity = await removeBtn.evaluate((el) => {
			// The overlay owns the opacity, not the button.
			let node: HTMLElement | null = el as HTMLElement;
			while (node) {
				if (getComputedStyle(node).opacity !== '1') return getComputedStyle(node).opacity;
				node = node.parentElement;
			}
			return '1';
		});
		expect(opacity).toBe('1');

		for (const name of ['Remove one', 'Edit quantity', 'Add one']) {
			const box = (await page.getByRole('button', { name }).first().boundingBox())!;
			expect(box.height, `${name} height`).toBeGreaterThanOrEqual(44);
		}
	});

	test('changing a quantity on a phone is possible and deliberate', async ({ page }) => {
		await setupWithDB(page);
		await seedCollection(page);

		const quantity = page.getByRole('button', { name: 'Edit quantity' }).first();
		await expect(quantity).toHaveText('1×');

		// A real tap at real coordinates, not an evaluate() that bypasses layout.
		await page.getByRole('button', { name: 'Add one' }).first().tap();
		await expect(quantity).toHaveText('2×');

		await page.getByRole('button', { name: 'Remove one' }).first().tap();
		await expect(quantity).toHaveText('1×');
	});

	test('the list quantity stepper is labelled and 44px tall', async ({ page }) => {
		await setupWithDB(page);
		await spaGoto(page, '/card-lists');
		await page.getByRole('button', { name: 'New List' }).click();

		await page.getByRole('button', { name: 'Add Cards' }).click();
		await page.locator('input[placeholder="Search for cards..."]').fill('Lightning Bolt');
		await page.getByRole('button', { name: 'Search' }).click();
		await page.locator('[data-testid="card-add-btn"]').first().click();
		await expect(page.locator('.animate-slide-in').filter({ hasText: /added/i })).toBeVisible({
			timeout: 3000
		});
		await page.locator('button[title="Close"]').click();

		const cards = page.locator('[data-testid="list-cards"]');
		// Two buttons carrying a `+` sat 40px apart with no label but a tooltip;
		// only one of them is about the collection, and it now says so.
		await expect(cards.getByRole('button', { name: 'Add to collection' })).toContainText(
			'To collection'
		);
		await expect(cards.getByRole('button', { name: 'Remove card' })).toContainText('Remove');

		const stepper = cards.getByRole('button', { name: 'Increase quantity' });
		const box = (await stepper.boundingBox())!;
		expect(box.height).toBeGreaterThanOrEqual(44);

		await stepper.tap();
		await expect(cards.getByText('2×')).toBeVisible();
	});

	test('the DB modal is fully reachable on a 568px-tall screen', async ({ page }) => {
		await page.setViewportSize({ width: 320, height: 568 });
		await page.goto('./');
		await page.waitForLoadState('networkidle');

		await page
			.locator('[data-testid="db-modal-toggle"]')
			.evaluate((btn) => (btn as HTMLElement).click());

		const panel = page.locator('.panel').first();
		await expect(panel).toBeVisible();

		const box = (await panel.boundingBox())!;
		expect(box.y, 'panel clipped at the top').toBeGreaterThanOrEqual(-1);
		expect(box.y + box.height, 'panel clipped at the bottom').toBeLessThanOrEqual(568 + 1);

		// The tab strip stays one row of single-line tabs rather than wrapping
		// "In-browser DB" onto three lines.
		const tab = page.getByRole('button', { name: 'In-browser DB', exact: true });
		const tabBox = (await tab.boundingBox())!;
		expect(tabBox.height).toBeGreaterThanOrEqual(44);
		expect(tabBox.height).toBeLessThan(70);
	});
});
