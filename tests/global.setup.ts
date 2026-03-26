import type { FullConfig } from '@playwright/test';
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loginAs } from './utils/auth';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

async function globalSetup(config: FullConfig) {
  loadEnvFile(path.resolve(__dirname, '.env.test'));

  const email = process.env.TEST_EMAIL ?? 'momsclaus@gmail.com';
  const password = process.env.TEST_PASSWORD;

  if (!password) {
    throw new Error('TEST_PASSWORD가 필요합니다. tests/.env.test 파일에 설정해주세요.');
  }

  const storageStatePath = path.resolve(__dirname, '../playwright/.auth/user.json');
  fs.mkdirSync(path.dirname(storageStatePath), { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({
    baseURL: config.projects[0]?.use?.baseURL as string | undefined,
  });

  await loginAs(page, email, password);
  // 투어 모달이 테스트를 막지 않도록 완료 플래그 설정
  await page.evaluate(() => localStorage.setItem('cs_talk_tour_done', '1'));
  await page.context().storageState({ path: storageStatePath });
  await browser.close();
}

export default globalSetup;
