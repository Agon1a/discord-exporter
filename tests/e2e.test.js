import { test, expect } from '@playwright/test';

/**
 * E2E tests for Discord Exporter popup UI.
 * 
 * Note: These tests demonstrate UI testing patterns.
 * To run with actual Discord, you would need:
 * 1. Live Discord instance
 * 2. Extension loaded in test browser
 * 3. Logged-in Discord user
 * 4.  Mock mode for CI/CD
 */

test.describe('Discord Exporter Popup', () => {
  test.beforeEach(async ({ page }) => {
    // In a real scenario, load the popup HTML
    // For now, this demonstrates the test structure
    await page.goto('file://' + __dirname + '/../../public/popup.html');
  });

  test.describe('UI Elements', () => {
    test('should render export button', async ({ page }) => {
      const button = page.locator('#exportBtn');
      await expect(button).toBeVisible();
      await expect(button).toContainText('Экспортировать');
    });

    test('should render date pickers', async ({ page }) => {
      const fromDate = page.locator('#fromDate');
      const toDate = page.locator('#toDate');
      
      await expect(fromDate).toBeVisible();
      await expect(toDate).toBeVisible();
    });

    test('should render quick date buttons', async ({ page }) => {
      const buttons = [
        '#quickToday',
        '#quick7Days',
        '#quick30Days',
        '#quickYear'
      ];

      for (const selector of buttons) {
        const button = page.locator(selector);
        await expect(button).toBeVisible();
      }
    });

    test('should render export format selector', async ({ page }) => {
      const csvRadio = page.locator('input[value="csv"]');
      const jsonRadio = page.locator('input[value="json"]');
      const markdownRadio = page.locator('input[value="markdown"]');

      await expect(csvRadio).toBeVisible();
      await expect(jsonRadio).toBeVisible();
      await expect(markdownRadio).toBeVisible();
    });

    test('should render filters section', async ({ page }) => {
      const filterAuthor = page.locator('#filterAuthor');
      const filterKeywords = page.locator('#filterKeywords');

      await expect(filterAuthor).toBeVisible();
      await expect(filterKeywords).toBeVisible();
    });

    test('should render theme toggle', async ({ page }) => {
      const themeToggle = page.locator('#themeToggle');
      await expect(themeToggle).toBeVisible();
    });

    test('should render API mode toggle', async ({ page }) => {
      const apiToggle = page.locator('#apiModeToggle');
      await expect(apiToggle).toBeVisible();
    });
  });

  test.describe('Quick Date Pickers', () => {
    test('should set todays date with quick button', async ({ page }) => {
      const todayBtn = page.locator('#quickToday');
      await todayBtn.click();

      const fromDate = page.locator('#fromDate');
      const toDate = page.locator('#toDate');

      const today = new Date().toISOString().split('T')[0];
      await expect(fromDate).toHaveValue(today);
      await expect(toDate).toHaveValue(today);
    });

    test('should set 7-day range', async ({ page }) => {
      const button7d = page.locator('#quick7Days');
      await button7d.click();

      const toDate = page.locator('#toDate');
      const today = new Date().toISOString().split('T')[0];
      await expect(toDate).toHaveValue(today);
    });
  });

  test.describe('Export Format Selection', () => {
    test('should select CSV format', async ({ page }) => {
      const csvRadio = page.locator('input[value="csv"]');
      await csvRadio.check();

      await expect(csvRadio).toBeChecked();
    });

    test('should select JSON format', async ({ page }) => {
      const jsonRadio = page.locator('input[value="json"]');
      await jsonRadio.check();

      await expect(jsonRadio).toBeChecked();
    });

    test('should select Markdown format', async ({ page }) => {
      const markdownRadio = page.locator('input[value="markdown"]');
      await markdownRadio.check();

      await expect(markdownRadio).toBeChecked();
    });
  });

  test.describe('Theme Switching', () => {
    test('should toggle dark theme', async ({ page }) => {
      const themeToggle = page.locator('#themeToggle');

      // Initial state (light)
      const html = page.locator('html');
      let theme = await html.evaluate(el => el.dataset.theme);
      expect(['light', undefined]).toContain(theme);

      // Toggle to dark
      await themeToggle.check();
      theme = await html.evaluate(el => el.dataset.theme);
      expect(theme).toBe('dark');

      // Toggle back to light
      await themeToggle.uncheck();
      theme = await html.evaluate(el => el.dataset.theme);
      expect(['light', undefined]).toContain(theme);
    });
  });

  test.describe('Filters', () => {
    test('should accept author filter input', async ({ page }) => {
      const authorInput = page.locator('#filterAuthor');
      await authorInput.fill('Alice');

      await expect(authorInput).toHaveValue('Alice');
    });

    test('should accept keyword filter input', async ({ page }) => {
      const keywordsInput = page.locator('#filterKeywords');
      await keywordsInput.fill('hello, world');

      await expect(keywordsInput).toHaveValue('hello, world');
    });

    test('should toggle filter checkboxes', async ({ page }) => {
      const excludeBotsCheckbox = page.locator('#filterExcludeBots');
      const matchAllCheckbox = page.locator('#filterMatchAll');

      await excludeBotsCheckbox.check();
      await expect(excludeBotsCheckbox).toBeChecked();

      await matchAllCheckbox.check();
      await expect(matchAllCheckbox).toBeChecked();
    });

    test('should reset filters', async ({ page }) => {
      // Set some filters
      await page.locator('#filterAuthor').fill('TestAuthor');
      await page.locator('#filterKeywords').fill('test keywords');
      await page.locator('#filterExcludeBots').check();

      // Click reset button
      const resetBtn = page.locator('#resetFilters');
      await resetBtn.click();

      // Verify filters are cleared
      await expect(page.locator('#filterAuthor')).toHaveValue('');
      await expect(page.locator('#filterKeywords')).toHaveValue('');
      await expect(page.locator('#filterExcludeBots')).not.toBeChecked();
    });
  });

  test.describe('Status Messages', () => {
    test('should display status area', async ({ page }) => {
      const statusEl = page.locator('#status');
      await expect(statusEl).toBeVisible();
    });
  });

  test.describe('Channel Card', () => {
    test('should render channel information card', async ({ page }) => {
      const channelCard = page.locator('.channel-card');
      const channelName = page.locator('#channelName');
      const channelGuild = page.locator('#channelGuild');

      await expect(channelCard).toBeVisible();
      await expect(channelName).toBeVisible();
      await expect(channelGuild).toBeVisible();
    });
  });

  test.describe('Progress Display', () => {
    test('should have progress bar element', async ({ page }) => {
      const progressBar = page.locator('#exportProgress');
      await expect(progressBar).toBeVisible();
      // Initially hidden
      const display = await progressBar.evaluate(el => 
        window.getComputedStyle(el).display
      );
      expect(display).toBe('none'); // Hidden until export starts
    });

    test('should have progress count element', async ({ page }) => {
      const progressCount = page.locator('#progressCount');
      await expect(progressCount).toBeVisible();
    });
  });
});

test.describe('Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('file://' + __dirname + '/../../public/popup.html');
  });

  test('should have proper ARIA labels', async ({ page }) => {
    const buttons = page.locator('button[title]');
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should be keyboard navigable', async ({ page }) => {
    const exportBtn = page.locator('#exportBtn');
    
    // Tab to button
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Button should be focused
    const focused = await page.locator(':focus').count();
    expect(focused).toBeGreaterThan(0);
  });
});
