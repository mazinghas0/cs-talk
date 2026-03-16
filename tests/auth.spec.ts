import { expect, test } from '@playwright/test';
import { loginAs, logout } from './utils/auth';

const EMPTY_STORAGE_STATE = { cookies: [], origins: [] };
const TEST_EMAIL = process.env.TEST_EMAIL ?? 'momsclaus@gmail.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? '';

test.describe('auth', () => {
  test.describe.configure({ mode: 'parallel' });
  test.use({ storageState: EMPTY_STORAGE_STATE });

  test('이메일/비밀번호 로그인 성공', async ({ page }) => {
    await loginAs(page, TEST_EMAIL, TEST_PASSWORD);
    await expect(page.locator('.ticket-list-container, .empty-workspace-screen').first()).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeHidden();
  });

  test('잘못된 비밀번호 에러 메시지', async ({ page }) => {
    await page.goto('/');
    await page.locator('input[type="email"]').fill(TEST_EMAIL);
    await page.locator('input[type="password"]').fill(`${TEST_PASSWORD}-invalid`);
    await page.locator('button.auth-submit-btn').click();

    const errorAlert = page.locator('.auth-alert.error');
    await expect(errorAlert).toBeVisible({ timeout: 30_000 });
    await expect(errorAlert).toContainText(/invalid|credentials|password|로그인|인증/i);
  });

  test('로그아웃 후 로그인 페이지 리다이렉트', async ({ browser }) => {
    const context = await browser.newContext({
      storageState: 'playwright/.auth/user.json',
      baseURL: 'https://cs-talk.pages.dev',
    });
    const page = await context.newPage();

    await page.goto('/');
    if (await page.locator('input[type="email"]').isVisible()) {
      await loginAs(page, TEST_EMAIL, TEST_PASSWORD);
    }

    await logout(page);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await context.close();
  });
});
