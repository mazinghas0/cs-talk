import { expect, test } from '@playwright/test';
import { loginAs } from './utils/auth';
import { createTicket, waitForTicketInList } from './utils/ticket';

const TEST_EMAIL = process.env.TEST_EMAIL ?? 'momsclaus@gmail.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? '';

async function ensureAuthenticated(page: Parameters<typeof loginAs>[0]) {
  await page.goto('/');
  if (await page.locator('input[type="email"]').isVisible()) {
    await loginAs(page, TEST_EMAIL, TEST_PASSWORD);
    return;
  }
  await expect(page.locator('.ticket-list-container, .empty-workspace-screen').first()).toBeVisible({ timeout: 30_000 });
}

test.describe('ticket', () => {
  test.use({ storageState: 'playwright/.auth/user.json' });

  test('티켓 목록 로드', async ({ page }) => {
    await ensureAuthenticated(page);
    await expect(page.locator('.ticket-list-body')).toBeVisible();
    await expect(page.locator('.ticket-item, .empty-state').first()).toBeVisible();
  });

  test('신규 티켓 생성 후 목록에 표시', async ({ page }) => {
    await ensureAuthenticated(page);

    const title = `Playwright 자동 티켓 ${Date.now()}`;
    const content = 'Playwright 테스트로 생성한 회귀 검사용 티켓입니다.';

    await createTicket(page, title, content);
    const ticketItem = await waitForTicketInList(page, title);
    await expect(ticketItem).toContainText(title);
  });

  test('티켓 완료 처리 및 원복', async ({ page }) => {
    await ensureAuthenticated(page);

    // 테스트용 티켓 생성 후 클릭 (목록이 비어있을 수 있으므로)
    const title = `완료원복 테스트 ${Date.now()}`;
    await createTicket(page, title, '완료/원복 테스트용 티켓');
    const firstTicket = await waitForTicketInList(page, title);
    await firstTicket.click();

    // 완료 처리
    const completeBtn = page.locator('.qa-btn.qa-btn-resolve');
    await expect(completeBtn).toBeVisible({ timeout: 10_000 });
    await completeBtn.click();

    // 완료 상태 확인
    await expect(page.locator('.status-badge')).toContainText('처리완료', { timeout: 10_000 });

    // 원복
    const restoreBtn = page.locator('.qa-btn.qa-btn-restore');
    await expect(restoreBtn).toBeVisible({ timeout: 10_000 });
    await restoreBtn.click();

    await expect(page.locator('.status-badge')).toContainText('진행중', { timeout: 10_000 });
  });
});
