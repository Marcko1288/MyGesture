/** Inserimento a foglio dal basso: 2 tocchi, validazione, salvataggio ottimistico, ricorrenze, rinnovo, annulla. */
import { expect, test, type Page } from '@playwright/test'
import { legacyYearly } from './legacy-helpers'
import { euro, expectMainToContain, login, mainText } from './helpers'

const dialog = (page: Page) => page.locator('dialog[open]')

test.beforeEach(async ({ page }) => login(page))

test('nuova spesa dal + in 2 tocchi, con validazione e aggiornamento immediato dei totali', async ({ page }) => {
  const before = legacyYearly()
  await expectMainToContain(page, euro(before))
  await page.getByRole('button', { name: 'Aggiungi', exact: true }).click()
  await dialog(page)
    .getByRole('button', { name: /^Spesa/ })
    .click()
  await page.waitForURL((url) => url.pathname === '/' && url.searchParams.get('foglio') === 'spesa')
  await dialog(page).getByRole('button', { name: 'Aggiungi', exact: true }).click()
  await expect(dialog(page).getByText('Inserisci un importo')).toBeVisible()
  await dialog(page).getByLabel('Importo').fill('12,50')
  await dialog(page).getByLabel('Descrizione').fill('Pizza')
  await dialog(page).getByRole('button', { name: 'Casa', exact: true }).click()
  await dialog(page).getByRole('button', { name: 'Aggiungi', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Spesa aggiunta' })).toBeVisible()
  await page.waitForURL((url) => url.pathname === '/' && !url.search)
  await expectMainToContain(page, euro(before + 12.5))
})

test('modifica da URL con il foglio aperto; "indietro" chiude il foglio aperto dall’app', async ({ page }) => {
  await page.goto('/spese?foglio=spesa&id=BUY_SEED0001')
  await expect(dialog(page).getByLabel('Importo')).toHaveValue('85,4')
  await dialog(page).getByLabel('Importo').fill('13.000')
  await dialog(page).getByRole('button', { name: 'Salva', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Spesa aggiornata' })).toBeVisible()
  // Navigazione interna (come farebbe l'utente): la modifica è già nella cache locale.
  await page.getByRole('link', { name: /^Casa/ }).click()
  await page.waitForURL('**/spese/gruppi/GRP_SEEDCASA')
  await expectMainToContain(page, euro(13000))
  const row = page.locator('main li', { hasText: 'Bolletta luce' })
  await row.getByRole('button', { name: 'Modifica' }).focus()
  await row.getByRole('button', { name: 'Modifica' }).click()
  await expect(dialog(page)).toBeVisible()
  await page.goBack()
  await expect(dialog(page)).toHaveCount(0)
  await page.goto('/spese?foglio=spesa&id=BUY_SEED0001')
  await dialog(page).getByLabel('Importo').fill('85,4')
  await dialog(page).getByRole('button', { name: 'Salva', exact: true }).click()
})

test('spesa ricorrente: anteprima e serie salvata con uid_father', async ({ page }) => {
  await page.goto('/spese/gruppi/GRP_SEEDAUTO')
  await page.getByRole('button', { name: 'Nuova spesa' }).click()
  await expect(dialog(page).getByRole('button', { name: 'Auto', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await dialog(page).getByLabel('Importo').fill('50')
  await dialog(page).getByLabel('Descrizione').fill('Assicurazione')
  await dialog(page).getByText('Ripeti').click()
  await dialog(page).getByRole('button', { name: 'Fine mese' }).click()
  const now = new Date()
  const end = new Date(now.getFullYear(), now.getMonth() + 2, 28)
  await dialog(page)
    .getByLabel('Fino al')
    .fill(`${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-28`)
  await expect(dialog(page)).toContainText('Verranno create 2 spese')
  await dialog(page).getByRole('button', { name: 'Aggiungi', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: '2 spese ricorrenti create' })).toBeVisible()
  await page.goto('/spese/gruppi/GRP_SEEDAUTO?periodo=all')
  await expect(page.locator('main li', { hasText: 'Assicurazione' })).toHaveCount(2)
  // Eliminazione della serie con annulla
  const row = page.locator('main li', { hasText: 'Assicurazione' }).first()
  await row.getByRole('button', { name: 'Elimina' }).focus()
  await row.getByRole('button', { name: 'Elimina' }).click()
  await page.getByRole('button', { name: 'Tutta la serie (2)' }).click()
  await expect(page.locator('main li', { hasText: 'Assicurazione' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Annulla' }).click()
  await expect(page.locator('main li', { hasText: 'Assicurazione' })).toHaveCount(2)
})

test('saldo con "Spese dell’anno" e importi all’italiana', async ({ page }) => {
  await page.goto('/altro/risparmi')
  await page.getByRole('button', { name: 'Nuovo saldo' }).click()
  await dialog(page).getByLabel('Saldo del conto').fill('13.000')
  await dialog(page).getByLabel('Altri accrediti').fill('1.234,56')
  await expect(dialog(page)).toContainText(euro(14234.56))
  await page.keyboard.press('Escape')
})

test('abbonamento: rinnovo dal foglio di modifica; il rinnovato esce da "In scadenza"', async ({ page }) => {
  await page.goto('/altro/abbonamenti?filtro=expiring')
  await page.locator('main li', { hasText: 'Netflix' }).click()
  await dialog(page).getByRole('button', { name: 'Rinnova', exact: true }).click()
  await expect(dialog(page)).toContainText('Rinnova abbonamento')
  await page
    .locator('dialog[open] footer, dialog[open] > div')
    .getByRole('button', { name: 'Rinnova', exact: true })
    .last()
    .click()
  await expect(page.getByRole('status').filter({ hasText: 'Abbonamento rinnovato' })).toBeVisible()
  await expect.poll(() => mainText(page)).not.toContain('Netflix')
})
