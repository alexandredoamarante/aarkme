import { test, expect } from '@playwright/test';

test('Final Polish Verification', async ({ page }) => {
  // 1. Open root homepage
  await page.goto('http://localhost:8000/');

  // 2-4. Welcome screen check
  const welcomeScreen = page.locator('#welcomeScreen');
  await expect(welcomeScreen).toBeVisible();
  await expect(page.locator('.welcome-title')).toHaveText('Your taste, curated.');
  await expect(page.locator('.welcome-logo')).toBeVisible();
  await page.screenshot({ path: 'test-results/welcome-desktop.png' });

  // 32-37. Mobile Welcome check
  await page.setViewportSize({ width: 360, height: 800 });
  await page.screenshot({ path: 'test-results/welcome-mobile.png' });
  await page.setViewportSize({ width: 1280, height: 800 });

  // 5. Click Start creating
  await page.locator('[data-action="start-creating"]').click();

  // 6. Editor opens
  await expect(page.locator('.app-shell')).toBeVisible();
  await expect(page.locator('body')).toHaveClass(/mode-edit/);

  // 7. Edit profile
  await page.locator('.profile-editor-toggle summary').click();
  await page.locator('[data-profile-field="name"]').fill('Jules Test');

  // 8-11. Add items to all 4 categories
  const cats = ['movies', 'albums', 'books', 'games'];
  for (const cat of cats) {
    const detail = page.locator(`.editor-details[data-kind="${cat}"]`).first();
    await detail.scrollIntoViewIfNeeded();
    await detail.click();
    await detail.locator('[data-media-field="title"]').fill(`Test ${cat}`);
    // Wait for debounce save
    await page.waitForTimeout(500);
  }

  // 12. Confirm coexistence
  for (const cat of cats) {
    await expect(page.locator(`.editor-details[data-kind="${cat}"].is-filled`).first()).toBeVisible();
  }

  // 13-16. Fixed Header check
  await page.evaluate(() => window.scrollTo(0, 500));
  const header = page.locator('.site-header');
  const headerBox = await header.boundingBox();
  expect(headerBox?.y).toBeCloseTo(0, 0); // Stuck at top
  await page.screenshot({ path: 'test-results/editor-scrolled.png' });

  // 17. Long nickname check
  await page.locator('[data-profile-field="username"]').fill('verylongnicknamethatshouldtruncate');
  await page.evaluate(() => {
    // Mock auth status as if logged in with this long nickname
    const authStatus = document.getElementById('authStatus');
    authStatus.textContent = '@verylongnicknamethatshouldtruncate';
    authStatus.hidden = false;
    document.getElementById('signInBtn').hidden = true;
  });
  await expect(page.locator('#authStatus')).toHaveCSS('text-overflow', 'ellipsis');

  // 18-19. Preview buttons
  await expect(page.locator('[data-action="preview-public"]')).not.toBeVisible();
  await expect(page.locator('[data-action="view-public"]')).toHaveText('public preview');

  // 20-23. Open public preview
  await page.locator('[data-action="view-public"]').click();
  await expect(page.locator('body')).toHaveClass(/mode-preview/);
  await expect(page.locator('.media-public-card')).toHaveCount(10);
  await expect(page.locator('.profile-editor-toggle')).not.toBeVisible();

  // 24. Return to editor
  await page.locator('[data-action="enter-owner"]').click();
  await expect(page.locator('body')).toHaveClass(/mode-edit/);

  // 25-26. Share check
  await page.locator('[data-action="share-profile"]').click();
  // We can't easily check clipboard in playwright without permissions but we check if announceSaved is called
  await expect(page.locator('#saveStatus')).toHaveText(/public profile link copied/);

  // 27-29. Public profile URL
  await page.goto('http://localhost:8000/?u=nickname');
  await expect(page.locator('#welcomeScreen')).toBeHidden();
  // It shows profile (or 404 if not in DB, but bypasses welcome)

  // 35. Horizontal overflow check
  await page.setViewportSize({ width: 320, height: 568 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
  await page.screenshot({ path: 'test-results/public-mobile-320.png' });

  // 39. Magic Link modal
  await page.goto('http://localhost:8000/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.locator('.welcome-actions [data-action="sign-in"]').click();
  await expect(page.locator('#loginModal')).toBeVisible();
});
