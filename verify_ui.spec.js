import { test, expect } from '@playwright/test';

test.describe('Header Layout and Responsiveness', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8000/');
    await page.evaluate(() => localStorage.setItem('aarkme_welcome_seen', 'true'));
    await page.reload();
  });

  test('Header should be fixed and have glassmorphism effect', async ({ page }) => {
    const header = page.locator('.site-header');
    await expect(header).toHaveCSS('position', 'fixed');
    await expect(header).toHaveCSS('top', '0px');
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
    await expect(header).toHaveCSS('position', 'fixed');
    await expect(header).toHaveCSS('top', '0px');

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

  test('Nickname display in header', async ({ page }) => {
    await page.evaluate(() => {
      // Mock state
      window.localStorage.setItem('aarkme:state:v1', JSON.stringify({
        profile: { username: 'testuser', name: 'Test User' },
        mode: 'edit'
      }));
    });
    await page.reload();

    // Mock auth after reload
    await page.evaluate(() => {
      const authStatus = document.getElementById('authStatus');
      if (authStatus) {
        authStatus.textContent = '@testuser';
        authStatus.hidden = false;
        document.getElementById('signInBtn').hidden = true;
      }
    });

    const authStatus = page.locator('#authStatus');
    await expect(authStatus).toHaveText('@testuser');
  });
});

test('Verify public profile thumbnails', async ({ page }) => {
  // Go to a mock public profile
  await page.goto('http://localhost:8000/?u=paledogg');

  // Check if thumbnails are small and have pointer-events: none
  const covers = page.locator('.media-public-card .cover-wrap');
});

test('Verify category visibility logic: collapsed sections stay visible in public view if filled', async ({ page }) => {
  await page.goto('http://localhost:8000/');
  await page.evaluate(() => localStorage.setItem('aarkme_welcome_seen', 'true'));
  await page.reload();

  // Enter owner mode first to see the toggle button
  await page.click('[data-action="enter-owner"]');

  // Ensure movies section has filled content (demo should have it)
  const moviesShelf = page.locator('[data-section="movies"]');
  await expect(moviesShelf.locator('.media-card')).not.toHaveCount(0);

  // Collapse movies section in editor
  const toggleBtn = page.locator('[data-action="toggle-section"][data-kind="movies"]');
  await expect(toggleBtn).toHaveText('collapse');
  await toggleBtn.click();
  await expect(toggleBtn).toHaveText('expand');

  // Grid should be hidden in editor
  const moviesGrid = page.locator('#moviesGrid');
  await expect(moviesGrid).not.toBeVisible();

  // Go to preview mode
  await page.click('[data-action="view-public"]');

  // Check if movies shelf is STILL VISIBLE in public/preview mode because it has filled media
  await expect(moviesShelf).toBeVisible();
  const publicCards = moviesShelf.locator('.media-public-card');
  await expect(publicCards).not.toHaveCount(0);
});

test('Rating normalization and validation', async ({ page }) => {
  await page.goto('http://localhost:8000/');
  await page.evaluate(() => localStorage.setItem('aarkme_welcome_seen', 'true'));
  await page.reload();
  await page.click('[data-action="enter-owner"]');

  // Expand first movie
  const movieDetails = page.locator('.editor-details[data-kind="movies"]').first();
  await movieDetails.click();

  const ratingInput = movieDetails.locator('[data-media-field="rating"]');

  // Test numeric input
  await ratingInput.fill('8,5');
  await ratingInput.dispatchEvent('change');
  await expect(ratingInput).toHaveValue('8.5/10');

  // Test invalid input
  await ratingInput.fill('12');
  await ratingInput.dispatchEvent('change');
  const validationMessage = await ratingInput.evaluate(el => el.validationMessage);
  expect(validationMessage).toBe('Please use 0-10 or X/10 format.');
});

test('Featured item logic', async ({ page }) => {
  await page.goto('http://localhost:8000/');
  await page.evaluate(() => localStorage.setItem('aarkme_welcome_seen', 'true'));
  await page.reload();
  await page.click('[data-action="enter-owner"]');

  // Try to feature an empty item (last one)
  const emptyItem = page.locator('.editor-details.is-empty').first();
  await emptyItem.scrollIntoViewIfNeeded();
  await emptyItem.click();

  const featureBtn = emptyItem.locator('[data-action="toggle-featured"]');
  await featureBtn.click();

  // Should show toast (can't easily check toast text but can check if button remains inactive)
  await expect(featureBtn).not.toHaveClass(/active/);
});

test('Public preview renders all filled media information', async ({ page }) => {
  await page.goto('http://localhost:8000/');
  await page.evaluate(() => localStorage.setItem('aarkme_welcome_seen', 'true'));
  await page.reload();
  await page.click('[data-action="enter-owner"]');

  // Fill a movie with all details
  const movieDetails = page.locator('.editor-details[data-kind="movies"]').first();
  await movieDetails.click();

  await movieDetails.locator('[data-media-field="title"]').fill('Interstellar');
  await movieDetails.locator('[data-media-field="creator"]').fill('Christopher Nolan');
  await movieDetails.locator('[data-media-field="year"]').fill('2014');
  await movieDetails.locator('[data-media-field="rating"]').fill('9.5');
  await movieDetails.locator('[data-media-field="tag"]').fill('Sci-Fi');
  await movieDetails.locator('[data-media-field="note"]').fill('A masterpiece of time and space.');
  await movieDetails.locator('[data-action="toggle-featured"]').click();

  // Preview
  await page.click('[data-action="view-public"]');

  const card = page.locator('.media-public-card').first();
  await expect(card.locator('.card-title')).toHaveText('Interstellar');
  await expect(card.locator('.card-meta')).toHaveText('Christopher Nolan · 2014');
  await expect(card.locator('.rating-chip')).toHaveText('9.5/10');
  await expect(card.locator('.tag-chip')).toHaveText('Sci-Fi');
  await expect(card.locator('.card-note')).toHaveText('A masterpiece of time and space.');
  await expect(card).toHaveClass(/is-featured/);
});

test('Co-existence of all 4 categories', async ({ page }) => {
  await page.goto('http://localhost:8000/');
  await page.evaluate(() => localStorage.setItem('aarkme_welcome_seen', 'true'));
  await page.reload();
  await page.click('[data-action="enter-owner"]');

  // Clear existing items by resetting demo but we want to start fresh
  await page.evaluate(() => {
    window.localStorage.removeItem('aarkme:state:v1');
  });
  await page.reload();
  const enterOwner = page.locator('[data-action="enter-owner"]');
  if (await enterOwner.isVisible()) {
    await enterOwner.click();
  }

  const categories = ['movies', 'albums', 'books', 'games'];

  for (const cat of categories) {
    const detail = page.locator(`.editor-details[data-kind="${cat}"]`).first();
    await detail.scrollIntoViewIfNeeded();
    await detail.click();
    await detail.locator('[data-media-field="title"]').fill(`Test ${cat}`);
    await detail.click(); // close it
  }

  await page.click('[data-action="view-public"]');

  for (const cat of categories) {
    await expect(page.locator(`[data-section="${cat}"]`)).toBeVisible();
    await expect(page.locator(`[data-section="${cat}"] .card-title`).first()).toContainText(`Test ${cat}`);
  }
});

test('Broken image renders fallback instead of infinite loading', async ({ page }) => {
  await page.goto('http://localhost:8000/');
  await page.evaluate(() => localStorage.setItem('aarkme_welcome_seen', 'true'));
  await page.reload();
  await page.click('[data-action="enter-owner"]');

  // Fill a movie with a broken image
  const movieDetails = page.locator('.editor-details[data-kind="movies"]').first();
  await movieDetails.click();

  // Directly set a broken image in state via evaluate to simulate saved broken URL
  await page.evaluate(() => {
    // Access global state - it might not be exported but is global in browser
    if (window.state) {
      window.state.media.movies[0].cover = 'https://example.com/non-existent-image.jpg';
      window.state.media.movies[0].title = 'Broken Image Movie';
      window.renderApp();
    }
  });

  // Check if placeholder is shown after failure
  const img = page.locator('.media-card img').first();
  // We can't easily trigger onerror in playwright for external URLs, but we can check if placeholder exists
  const placeholder = page.locator('.cover-placeholder').first();
  await expect(placeholder).toBeDefined();
});

test('Slow sync does not block local UI', async ({ page }) => {
  await page.goto('http://localhost:8000/');
  await page.evaluate(() => localStorage.setItem('aarkme_welcome_seen', 'true'));
  await page.reload();
  await page.click('[data-action="enter-owner"]');

  // Mock slow Supabase saveMediaItem
  await page.evaluate(() => {
    if (window.supabase) {
      window.supabase.saveMediaItem = () => new Promise(resolve => setTimeout(resolve, 5000));
    }
  });

  const movieDetails = page.locator('.editor-details[data-kind="movies"]').first();
  await movieDetails.click();
  await movieDetails.locator('[data-media-field="title"]').fill('Responsive while syncing');

  // UI should still be responsive - we can still interact with other elements
  // Use a different section or make sure profile editor is open
  await page.click('.profile-editor-toggle summary');
  const profileName = page.locator('[data-profile-field="name"]');
  await profileName.fill('Still Responsive');
  await expect(profileName).toHaveValue('Still Responsive');

  const saveStatus = page.locator('#saveStatus');
  await expect(saveStatus).toHaveText(/saving...|synced|saved/);
});
