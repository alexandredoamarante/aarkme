import { test, expect } from '@playwright/test';

test.describe('Welcome Screen', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to ensure first-visit behavior
    await page.goto('http://localhost:8000/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('Root / shows welcome screen on first visit', async ({ page }) => {
    const welcomeScreen = page.locator('#welcomeScreen');
    await expect(welcomeScreen).toBeVisible();
    await expect(page.locator('.welcome-title')).toHaveText('Your taste, curated.');
  });

  test('Start creating enters the editor and sets welcome seen flag', async ({ page }) => {
    const startBtn = page.locator('[data-action="start-creating"]');
    await startBtn.click();

    await expect(page.locator('#welcomeScreen')).toBeHidden();
    await expect(page.locator('.app-shell')).toBeVisible();

    const welcomeSeen = await page.evaluate(() => localStorage.getItem('aarkme_welcome_seen'));
    expect(welcomeSeen).toBe('true');

    // Reload and verify it's still hidden
    await page.reload();
    await expect(page.locator('#welcomeScreen')).toBeHidden();
  });

  test('Public profile URL bypasses welcome screen', async ({ page }) => {
    // We can use a fake username, it should show 404 but NOT welcome screen
    await page.goto('http://localhost:8000/?u=nonexistentuser');
    await expect(page.locator('#welcomeScreen')).toBeHidden();
    await expect(page.locator('.error-state')).toBeVisible();
  });

  test('Sign in button in welcome screen opens login modal and hides welcome screen', async ({ page }) => {
    const signInBtn = page.locator('.welcome-actions [data-action="sign-in"]');
    await signInBtn.click();

    await expect(page.locator('#welcomeScreen')).toBeHidden();
    await expect(page.locator('#loginModal')).toBeVisible();
  });


  test('Responsiveness at 320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    const welcomeContent = page.locator('.welcome-content');

    // Check for overflow
    const box = await welcomeContent.boundingBox();
    if (box) {
      expect(box.width).toBeLessThanOrEqual(320);
    }

    // Actions should stack on small screens
    const actions = page.locator('.welcome-actions');
    await expect(actions).toHaveCSS('flex-direction', 'column');
  });

  test('About aarkme button in editor re-opens welcome screen', async ({ page }) => {
    // Enter editor first
    await page.locator('[data-action="start-creating"]').click();
    await expect(page.locator('#welcomeScreen')).toBeHidden();

    // Open backup tools
    await page.locator('.tool-summary:has-text("Backup tools")').click();

    // Click about aarkme
    await page.locator('[data-action="show-welcome"]').click();
    await expect(page.locator('#welcomeScreen')).toBeVisible();
  });
});
