/** Ogni schermata ha un URL; ricaricando si resta lì; "indietro" funziona; il login riporta alla pagina chiesta. */
import { expect, test } from '@playwright/test'
import { DEMO_EMAIL, DEMO_PASSWORD } from '../../scripts/seed-data.mjs'
import { expectMainToContain, login } from './helpers'

test('deep link senza sessione → login → pagina richiesta', async ({ page }) => {
  await page.goto('/spese/gruppi')
  await page.waitForURL('**/login')
  await page.fill('#email', DEMO_EMAIL)
  await page.fill('#password', DEMO_PASSWORD)
  await page.click('button[type=submit]')
  await page.waitForURL((url) => url.pathname === '/spese/gruppi')
})

test('login con password sbagliata: messaggio in italiano', async ({ page }) => {
  await page.goto('/login')
  await page.fill('#email', DEMO_EMAIL)
  await page.fill('#password', 'sbagliata')
  await page.click('button[type=submit]')
  await expect(page.getByRole('alert')).toHaveText('Email o password non corrette.')
})

test.describe('con sessione', () => {
  test.beforeEach(async ({ page }) => login(page))

  test('tab bar, URL e tab attiva', async ({ page }) => {
    const nav = page.getByRole('navigation', { name: 'Navigazione principale' })
    for (const [label, path] of [
      ['Spese', '/spese'],
      ['Conto', '/conto'],
      ['Altro', '/altro'],
      ['Oggi', '/'],
    ]) {
      await nav.getByRole('link', { name: label }).click()
      await page.waitForURL((url) => url.pathname === path)
      await expect(nav.getByRole('link', { name: label })).toHaveAttribute('aria-current', 'page')
    }
  })

  test('filtri e mesi nell’URL sopravvivono al ricaricamento', async ({ page }) => {
    await page.goto('/altro/abbonamenti')
    await page.getByRole('radio', { name: 'Tutti' }).click()
    await page.waitForURL('**/altro/abbonamenti?filtro=all')
    await page.reload()
    await expect(page.getByRole('radio', { name: 'Tutti' })).toHaveAttribute('aria-checked', 'true')

    await page.goto('/conto?mese=2026-01&tipo=entrate')
    await page.reload()
    await expect(page.getByRole('radio', { name: 'Entrate' })).toHaveAttribute('aria-checked', 'true')
    await expectMainToContain(page, 'gennaio 2026')
  })

  test('indietro: dalla categoria al conto, e "Indietro" senza cronologia va al padre', async ({ page }) => {
    await page.goto('/conto')
    await page.locator('main li a').first().click()
    await page.waitForURL('**/conto/categoria/**')
    await page.goBack()
    await page.waitForURL((url) => url.pathname === '/conto')

    await page.goto('/altro/risparmi/storico')
    await page.getByRole('button', { name: 'Risparmi' }).click()
    await page.waitForURL((url) => url.pathname === '/altro/risparmi')
  })

  test('vecchi URL reindirizzano', async ({ page }) => {
    await page.goto('/conto/categoria/Spese/andamento?mese=2026-10&tipo=uscite')
    await page.waitForURL((url) => url.pathname === '/conto/categoria/Spese')
    await page.goto('/nuovo/spesa')
    await page.waitForURL((url) => url.pathname === '/spese' && url.searchParams.get('foglio') === 'spesa')
    await page.goto('/altro/saldo/CASH_SEED0001')
    await page.waitForURL(
      (url) => url.pathname === '/altro/risparmi/storico' && url.searchParams.get('id') === 'CASH_SEED0001',
    )
  })
})
