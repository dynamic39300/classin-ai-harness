import { readFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
export const APP_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const SOURCE_ROOT = resolve(process.env.LAB_SOURCE_ROOT || join(APP_ROOT, '../..'));
export const DATA_ROOT = resolve(process.env.LAB_DATA_ROOT || join(SOURCE_ROOT, '.runtime/private/copilot-api-review-lab'));
export async function modelConfig() {
  let file = {};
  try { file = parseEnv(await readFile(process.env.LAB_ENV_FILE || join(SOURCE_ROOT, '.env'), 'utf8')); } catch { /* Status exposes missing configuration. */ }
  const env = { ...file, ...process.env };
  return { apiKey: env.LAB_MODEL_API_KEY || env.DEEPSEEK_API_KEY, baseUrl: env.LAB_MODEL_BASE_URL || env.DEEPSEEK_BASE_URL,
    model: env.LAB_MODEL || 'deepseek-v4-flash' };
}
export async function teacherSecret() {
  const value = JSON.parse(await readFile(join(homedir(), '.classin.token'), 'utf8'))?.secrets?.['632586'];
  if (typeof value !== 'string' || !value.trim()) throw new Error('本机测试教师凭据不可用。');
  return value.trim();
}
