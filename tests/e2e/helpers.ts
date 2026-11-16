import { expect, type Page } from '@playwright/test'
import { DEMO_EMAIL, DEMO_PASSWORD } from '../../scripts/seed-data.mjs'

export const ROUTES = [
  '/',
  '/spese',
  '/spese/gruppi',
  '/spese/gruppi/GRP_SEEDCASA',
  '/conto',
  '/conto/categoria/Spese',
  '/conto/movimento/BANK_SEED004',
  '/conto/importa',
  '/altro',
  '/altro/risparmi',
  '/altro/risparmi/storico',
  '/altro/abbonamenti?filtro=all',
  '/altro/impostazioni',
  '/altro/impostazioni/categorie',
  '/spese?foglio=spesa',
  '/spese?foglio=spesa&id=BUY_SEED0001',
  '/altro/risparmi?foglio=saldo',
  '/altro/abbonamenti?foglio=abbonamento&id=SUB_SEED0002',
  '/spese/gruppi?foglio=gruppo&id=GRP_SEEDCASA',
]

export async function login(page: Page, next = '/') {
  await page.goto(`/login`)
  await page.fill('#email', DEMO_EMAIL)
  await page.fill('#password', DEMO_PASSWORD)
  await page.click('button[type=submit]')
  await page.waitForURL((url) => url.pathname === '/')
  if (next !== '/') await page.goto(next)
}

/** Testo visibile normalizzato (spazi e spazi non separabili). */
export async function mainText(page: Page, selector = 'main') {
  return ((await page.textContent(selector)) ?? '').replace(/ /g, ' ').replace(/\s+/g, ' ')
}

export async function expectMainToContain(page: Page, text: string, selector = 'main') {
  await expect.poll(() => mainText(page, selector)).toContain(text)
}

/** Formato degli importi dell'app (it-IT con separatore delle migliaia). */
export function euro(value: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', useGrouping: true })
    .format(value)
    .replace(/ /g, ' ')
}
