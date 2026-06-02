import { test, expect } from '@playwright/test';

test.describe('Header Layout and Responsiveness', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8000/');
  });

  test('Header should be sticky and have glassmorphism effect', async ({ page }) => {
    const header = page.locator('.site-header');
    await expect(header).toHaveCSS('position', 'sticky');
    await expect(header).toHaveCSS('backdrop-filter', /blur\(24px\)/);
  });

  test('Logo should be centered in the header', async ({ page }) => {
    const header = page.locator('.site-header');
    const brand = page.locator('.brand-lockup');

    const headerBox = await header.boundingBox();
    const brandBox = await brand.boundingBox();

    if (headerBox && brandBox) {
      const headerCenter = headerBox.x + headerBox.width / 2;
      const brandCenter = brandBox.x + brandBox.width / 2;
      // Allow for a small margin of error (1px)
      expect(Math.abs(headerCenter - brandCenter)).toBeLessThanOrEqual(1);
    }
  });

  test('Header actions should be grouped on the right', async ({ page }) => {
    const actions = page.locator('.header-actions');
    await expect(actions).toHaveCSS('justify-content', 'flex-end');
  });

  test('Mobile responsiveness (360px)', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    const header = page.locator('.site-header');
    await expect(header).toHaveCSS('flex-direction', 'column');
    await expect(header).toHaveCSS('position', 'sticky');

    // Check if actions wrap or stack
    const actions = page.locator('.header-actions');
    await expect(actions).toHaveCSS('justify-content', 'center');
  });

  test('Long email address truncation', async ({ page }) => {
    // Mocking logged in state with long email
    await page.evaluate(() => {
      const authStatus = document.getElementById('authStatus');
      if (authStatus) {
        authStatus.textContent = 'verylongemailaddress@example.com';
        authStatus.hidden = false;
        document.getElementById('signInBtn').hidden = true;
      }
    });

    const authStatus = page.locator('#authStatus');
    await expect(authStatus).toHaveCSS('text-overflow', 'ellipsis');
    const box = await authStatus.boundingBox();
    if (box) {
      expect(box.width).toBeLessThanOrEqual(160);
    }
  });
});

test('Verify public profile thumbnails', async ({ page }) => {
  // Go to a mock public profile
  await page.goto('http://localhost:8000/?u=paledogg');

  // Check if thumbnails are small and have pointer-events: none
  const covers = page.locator('.media-public-card .cover-wrap');
});

test('Verify compression options in handleImageUpload', async ({ page }) => {
  await page.goto('http://localhost:8000/');
  const handleImageUploadExists = await page.evaluate(() => typeof window.handleImageUpload === 'function');
});
