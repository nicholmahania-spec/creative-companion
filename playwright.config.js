import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
    /* Opt-in escape hatch for sandboxes that carry a Chromium but not the exact
       build this Playwright pins — the launcher hard-fails on the revision in
       its path rather than using what is there, which makes the whole suite
       unrunnable for a reason that has nothing to do with the app. Unset in CI
       and locally, so the default behaviour is untouched:
         PW_CHROMIUM_PATH=/opt/pw-browsers/chromium npx playwright test */
    ...(process.env.PW_CHROMIUM_PATH
      ? { launchOptions: { executablePath: process.env.PW_CHROMIUM_PATH } }
      : {}),
  },
  webServer: {
    // Force local auth gate for e2e (ignore .env.local Supabase)
    command:
      'VITE_SUPABASE_URL= VITE_SUPABASE_ANON_KEY= npm run build && npm run preview -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      ...process.env,
      VITE_SUPABASE_URL: '',
      VITE_SUPABASE_ANON_KEY: '',
    },
  },
})
