import { defineConfig } from '@playwright/test';
import base from './playwright.config';

export default defineConfig({
  ...base,
  testMatch: [
    'e2e/copilot-entry-parity.spec.ts',
    'e2e/teachbuddy-general-questions.spec.ts',
    'e2e/teachbuddy-im-personalized-services.spec.ts',
  ],
  use: { ...base.use, baseURL: 'http://127.0.0.1:4174' },
  webServer: {
    command: 'npm run dev:ui -- --host 127.0.0.1 --port 4174 --strictPort',
    url: 'http://127.0.0.1:4174',
    reuseExistingServer: true,
  },
});
