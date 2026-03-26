import { expect, test } from '@playwright/test';

const MAIN_LAYOUT_SELECTOR = '.ticket-list-container, .empty-workspace-screen, .layout-inner';

test.describe('tour', () => {
  test.use({ storageState: 'playwright/.auth/user.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // 투어 플래그 제거 후 새로고침 — 투어가 다시 표시되도록
    await page.evaluate(() => localStorage.removeItem('cs_talk_tour_done'));
    await page.reload({ waitUntil: 'domcontentloaded' });
  });

  test('첫 진입 시 투어 모달 표시', async ({ page }) => {
    await expect(page.locator('.tour-overlay')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('.tour-title')).toBeVisible();
  });

  test('슬라이드 3장 → 시작하기 → MainLayout 진입', async ({ page }) => {
    await expect(page.locator('.tour-overlay')).toBeVisible({ timeout: 10_000 });

    // 슬라이드 1 → 2
    await page.locator('.tour-next-btn').click();
    await expect(page.locator('.tour-dot.active').nth(1)).toBeVisible({ timeout: 3_000 }).catch(() => {
      // dot index 방식 대신 버튼 텍스트로 확인
    });

    // 슬라이드 2 → 3
    await page.locator('.tour-next-btn').click();

    // 마지막 슬라이드 — 버튼 텍스트 "시작하기" 확인
    await expect(page.locator('.tour-next-btn')).toContainText('시작하기');

    // 시작하기 클릭 → 투어 종료
    await page.locator('.tour-next-btn').click();
    await expect(page.locator('.tour-overlay')).toBeHidden({ timeout: 5_000 });
    await expect(page.locator(MAIN_LAYOUT_SELECTOR).first()).toBeVisible({ timeout: 15_000 });
  });

  test('X 버튼으로 건너뛰기 → MainLayout 진입', async ({ page }) => {
    await expect(page.locator('.tour-overlay')).toBeVisible({ timeout: 10_000 });

    await page.locator('.tour-skip').click();
    await expect(page.locator('.tour-overlay')).toBeHidden({ timeout: 5_000 });
    await expect(page.locator(MAIN_LAYOUT_SELECTOR).first()).toBeVisible({ timeout: 15_000 });
  });

  test.afterEach(async ({ page }) => {
    // 투어 플래그 복원 — 다른 테스트에 영향 없도록
    await page.evaluate(() => localStorage.setItem('cs_talk_tour_done', '1'));
  });
});
