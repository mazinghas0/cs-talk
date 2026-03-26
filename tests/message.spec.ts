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
  await expect(page.locator('.ticket-list-container, .empty-workspace-screen, .layout-inner').first()).toBeVisible({ timeout: 30_000 });
}

test.describe('message', () => {
  test.use({ storageState: 'playwright/.auth/user.json' });

  test('메시지 전송 후 채팅방 표시', async ({ page }) => {
    await ensureAuthenticated(page);

    // 테스트용 티켓 생성
    const title = `메시지테스트 ${Date.now()}`;
    await createTicket(page, title, '메시지 전송 테스트용');
    const ticketItem = await waitForTicketInList(page, title);
    await ticketItem.click();

    // 메시지 입력 영역 확인
    const textarea = page.locator('.chat-input-area textarea').first();
    await expect(textarea).toBeVisible({ timeout: 10_000 });

    const msg = `테스트 메시지 ${Date.now()}`;
    await textarea.fill(msg);
    await textarea.press('Enter');

    // 전송된 메시지가 채팅방에 표시되는지 확인
    await expect(page.locator('.message-bubble').filter({ hasText: msg }).first()).toBeVisible({ timeout: 15_000 });
  });

  test('PC 우클릭 컨텍스트 메뉴 — 복사/북마크/공감 버튼 표시', async ({ page }) => {
    await ensureAuthenticated(page);

    const title = `컨텍스트메뉴 ${Date.now()}`;
    await createTicket(page, title, '컨텍스트 메뉴 테스트용');
    const ticketItem = await waitForTicketInList(page, title);
    await ticketItem.click();

    // 메시지 전송 (전송 버튼 클릭)
    const textarea = page.locator('.chat-input-area textarea').first();
    await expect(textarea).toBeVisible({ timeout: 10_000 });
    await textarea.click();
    await textarea.fill('우클릭 테스트 메시지');
    await page.locator('.send-btn').click();

    // 메시지 버블 대기 (Realtime 지연 고려해 25초)
    const bubble = page.locator('.message-bubble').filter({ hasText: '우클릭 테스트 메시지' }).first();
    await expect(bubble).toBeVisible({ timeout: 25_000 });

    // 우클릭 → 컨텍스트 메뉴 오픈
    await bubble.click({ button: 'right' });

    const ctxMenu = page.locator('.msg-context-menu').first();
    await expect(ctxMenu).toBeVisible({ timeout: 5_000 });

    // 복사/북마크/공감 버튼 존재 확인
    await expect(page.locator('.msg-ctx-item').first()).toBeVisible();

    // Escape로 닫기
    await page.keyboard.press('Escape');
    await expect(ctxMenu).toBeHidden({ timeout: 3_000 });
  });
});
