import { expect, type Page } from '@playwright/test';

const EMAIL_INPUT = 'input[type="email"]';
const PASSWORD_INPUT = 'input[type="password"]';
const LOGIN_BUTTON = 'button.auth-submit-btn';
const MAIN_LAYOUT_SELECTOR = '.ticket-list-container, .empty-workspace-screen, .layout-inner';

export async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const emailInput = page.locator(EMAIL_INPUT);
  if (await emailInput.isVisible()) {
    await emailInput.fill(email);
    await page.locator(PASSWORD_INPUT).fill(password);
    await page.locator(LOGIN_BUTTON).click();
  }

  await expect(page.locator(MAIN_LAYOUT_SELECTOR).first()).toBeVisible({ timeout: 30_000 });
}

export async function logout(page: Page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator(MAIN_LAYOUT_SELECTOR).first()).toBeVisible({ timeout: 15_000 });

  // 데스크탑: 사이드바 하단 프로필 버튼 / 모바일: 하단 네비 프로필 버튼
  const desktopProfileButton = page.locator('.sidebar-bottom .sidebar-btn').last();
  const mobileProfileButton = page.getByRole('button', { name: /프로필/i });

  if (await desktopProfileButton.isVisible()) {
    await desktopProfileButton.click();
  } else {
    await mobileProfileButton.click();
  }

  await expect(page.locator('.profile-settings-modal')).toBeVisible({ timeout: 10_000 });
  await page.locator('.btn-logout').click();
  await expect(page.locator(EMAIL_INPUT)).toBeVisible({ timeout: 30_000 });
}
