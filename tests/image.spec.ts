import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';
import { loginAs } from './utils/auth';
import { waitForTicketInList } from './utils/ticket';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES = path.resolve(__dirname, 'fixtures');

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

async function openCreateModal(page: Parameters<typeof loginAs>[0]) {
  await page.locator('.icon-btn-create').click();
  await expect(page.locator('.modal-form')).toBeVisible({ timeout: 10_000 });
}

test.describe('image', () => {
  test.use({ storageState: 'playwright/.auth/user.json' });

  test('이미지 1장 첨부 후 티켓 생성 — 채팅방 이미지 표시', async ({ page }) => {
    await ensureAuthenticated(page);
    await openCreateModal(page);

    const title = `이미지1장 ${Date.now()}`;
    await page.locator('.modal-form input[type="text"]').fill(title);
    await page.locator('.modal-form textarea').fill('단일 이미지 테스트');

    // 파일 첨부
    await page.locator('.modal-form input[type="file"]').setInputFiles(path.join(FIXTURES, 'red.png'));

    // 썸네일 1개 표시 확인
    await expect(page.locator('.image-thumbnail-item')).toHaveCount(1, { timeout: 5_000 });

    await page.locator('.modal-actions .btn-submit').click();
    await expect(page.locator('.modal-form')).toBeHidden({ timeout: 10_000 });

    // 티켓 목록에 표시 + 클릭해서 채팅방 진입
    const ticketItem = await waitForTicketInList(page, title);
    await ticketItem.click();

    // 채팅방에 이미지 그리드 표시 확인
    await expect(page.locator('.attached-image-grid')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('.attached-image')).toHaveCount(1);
  });

  test('이미지 3장 첨부 — 최대 장수 그리드 표시', async ({ page }) => {
    await ensureAuthenticated(page);
    await openCreateModal(page);

    const title = `이미지3장 ${Date.now()}`;
    await page.locator('.modal-form input[type="text"]').fill(title);
    await page.locator('.modal-form textarea').fill('3장 이미지 테스트');

    // 파일 3장 동시 첨부
    await page.locator('.modal-form input[type="file"]').setInputFiles([
      path.join(FIXTURES, 'red.png'),
      path.join(FIXTURES, 'green.png'),
      path.join(FIXTURES, 'blue.png'),
    ]);

    // 썸네일 3개 + 파일 입력 숨김(최대 도달) 확인
    await expect(page.locator('.image-thumbnail-item')).toHaveCount(3, { timeout: 5_000 });
    await expect(page.locator('.image-limit-notice')).toBeVisible();

    await page.locator('.modal-actions .btn-submit').click();
    await expect(page.locator('.modal-form')).toBeHidden({ timeout: 10_000 });

    const ticketItem = await waitForTicketInList(page, title);
    await ticketItem.click();

    // count-3 그리드 확인
    await expect(page.locator('.attached-image-grid.count-3')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('.attached-image')).toHaveCount(3);
  });

  test('썸네일 개별 제거', async ({ page }) => {
    await ensureAuthenticated(page);
    await openCreateModal(page);

    await page.locator('.modal-form input[type="text"]').fill(`제거테스트 ${Date.now()}`);
    await page.locator('.modal-form textarea').fill('썸네일 제거 테스트');

    await page.locator('.modal-form input[type="file"]').setInputFiles([
      path.join(FIXTURES, 'red.png'),
      path.join(FIXTURES, 'green.png'),
    ]);

    await expect(page.locator('.image-thumbnail-item')).toHaveCount(2, { timeout: 5_000 });

    // 첫 번째 썸네일 제거
    await page.locator('.image-thumbnail-remove').first().click();
    await expect(page.locator('.image-thumbnail-item')).toHaveCount(1);

    // 파일 input이 다시 노출되는지 확인 (최대 미달 상태)
    await expect(page.locator('.modal-form input[type="file"]')).toBeVisible();

    await page.locator('.btn-cancel').click();
  });
});
