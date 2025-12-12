import { expect, test } from '@playwright/test';

test.describe('Gulfara smoke journey', () => {
  test('Landing page loads key messaging @smoke', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: /Master Gulf Arabic/i })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: /Start Learning/i }).first()).toBeVisible();
  });

  test('Navigation to onboarding and practice dashboard @smoke', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: /Start Learning/i }).first().click({ timeout: 15000 });
    await expect(page).toHaveURL(/onboarding/, { timeout: 15000 });
    await expect(page.getByRole('heading', { name: /Welcome to Gulfara/i })).toBeVisible({ timeout: 30000 });
  });

  test('Theme toggle appears on landing', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const themeToggle = page.getByRole('button', { name: /English|عربي/ });
    await expect(themeToggle).toBeVisible();
  });
});


