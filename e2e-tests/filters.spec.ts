import { test, expect } from '@playwright/test';

test.describe('Game Filters', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('Filters - category checkboxes narrow the list and allow multiple selections', async ({ page }) => {
    const cards = page.getByTestId('game-card');
    const categoryBoxes = page.getByRole('group', { name: 'Categories' }).getByRole('checkbox');
    const total = await cards.count();
    expect(await categoryBoxes.count()).toBeGreaterThan(1);

    await test.step('Select one category', async () => {
      await categoryBoxes.first().check();
      const label = (await categoryBoxes.first().locator('xpath=..').textContent())?.trim() ?? '';
      const visible = page.locator('[data-filter-item]:not([hidden])');
      await expect(page).toHaveURL(/category=\d+/);
      for (const category of await visible.getByTestId('game-category').allTextContents()) {
        expect(category.trim()).toBe(label);
      }
      expect(await visible.count()).toBeLessThan(total);
    });

    await test.step('Select a second category shows more games', async () => {
      const before = await page.locator('[data-filter-item]:not([hidden])').count();
      await categoryBoxes.nth(1).check();
      expect(await page.locator('[data-filter-item]:not([hidden])').count()).toBeGreaterThan(before);
    });
  });

  test('Filters - publisher select, combination, and clear', async ({ page }) => {
    const visible = page.locator('[data-filter-item]:not([hidden])');
    const total = await visible.count();
    const publisher = page.getByTestId('filter-publisher');

    await test.step('Filter by publisher', async () => {
      await publisher.selectOption({ index: 1 });
      const name = (await publisher.locator('option:checked').textContent())?.trim() ?? '';
      await expect(page).toHaveURL(/publisher=\d+/);
      for (const text of await visible.getByTestId('game-publisher').allTextContents()) {
        expect(text.trim()).toBe(name);
      }
      expect(await visible.count()).toBeLessThanOrEqual(total);
    });

    await test.step('Combine with a category', async () => {
      const publisherCount = await visible.count();
      await page.getByRole('group', { name: 'Categories' }).getByRole('checkbox').first().check();
      expect(await visible.count()).toBeLessThanOrEqual(publisherCount);
    });

    await test.step('Clear filters restores everything', async () => {
      await page.getByTestId('filter-clear').click();
      await expect(visible).toHaveCount(total);
      await expect(page.getByTestId('filter-count')).toHaveText(`Showing ${total} of ${total} games`);
      await expect(page).not.toHaveURL(/category=|publisher=/);
    });
  });

  test('Filters - URL query restores the combined (AND) selection', async ({ page }) => {
    await page.goto('/?category=1&publisher=1');
    const visible = page.locator('[data-filter-item]:not([hidden])');
    const total = await page.locator('[data-filter-item]').count();

    await expect(page.getByTestId('filter-category-1')).toBeChecked();
    await expect(page.getByTestId('filter-publisher')).toHaveValue('1');
    const shown = await visible.count();
    expect(shown).toBeGreaterThan(0);
    expect(shown).toBeLessThan(total);
    await expect(page.getByTestId('filter-count')).toHaveText(`Showing ${shown} of ${total} games`);
    for (const card of await visible.all()) {
      await expect(card).toHaveAttribute('data-category-id', '1');
      await expect(card).toHaveAttribute('data-publisher-id', '1');
    }
  });

  test('Filters - controls are keyboard operable', async ({ page }) => {
    const first = page.getByRole('group', { name: 'Categories' }).getByRole('checkbox').first();
    await first.focus();
    await page.keyboard.press('Space');
    await expect(first).toBeChecked();
    await expect(page).toHaveURL(/category=\d+/);
  });
});
