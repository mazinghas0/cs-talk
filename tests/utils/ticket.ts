import { expect, type Page } from '@playwright/test';

export async function createTicket(page: Page, title: string, content: string) {
  await page.locator('.icon-btn-create').click();
  await expect(page.locator('.modal-form')).toBeVisible({ timeout: 10_000 });

  await page.locator('.modal-form input[type="text"]').fill(title);
  await page.locator('.modal-form textarea').fill(content);
  await page.locator('.modal-actions .btn-submit').click();

  await expect(page.locator('.modal-form')).toBeHidden({ timeout: 10_000 });
}

export async function waitForTicketInList(page: Page, title: string) {
  const ticketItem = page.locator('.ticket-item').filter({ hasText: title }).first();
  await expect(ticketItem).toBeVisible({ timeout: 30_000 });
  return ticketItem;
}
