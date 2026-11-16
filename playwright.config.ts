import { defineConfig, devices } from '@playwright/test'

/**
 * Test end-to-end sugli emulatori Firebase con i dati di scripts/seed-data.mjs.
 * Esecuzione: npm run test:e2e (avvia emulatori, carica i dati, compila e serve l'app).
 * I file sono eseguiti in ordine e in sequenza: alcuni modificano i dati.
 */
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    ...devices['iPhone 13'],
    browserName: 'chromium',
    locale: 'it-IT',
    timezoneId: 'Europe/Rome',
    trace: 'off',
  },
  webServer: {
    command: 'npx vite build --mode emulator && npx vite preview --mode emulator --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
    timeout: 180_000,
  },
})
