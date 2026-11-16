/** PWA: manifest valido e installabile, un solo service worker, avvio offline con i dati in cache. */
import { expect, test } from '@playwright/test'
import { expectMainToContain, login } from './helpers'

test('installabile, service worker attivo e avvio offline', async ({ page, context }) => {
  await login(page)
  await expectMainToContain(page, 'Saldo attuale')
  const cdp = await context.newCDPSession(page)
  const manifest = await cdp.send('Page.getAppManifest')
  expect(manifest.errors).toEqual([])
  expect((await cdp.send('Page.getInstallabilityErrors')).installabilityErrors).toEqual([])
  // Una sessione CDP aperta interferisce con l'emulazione offline di Playwright.
  await cdp.detach()

  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.reload()
  await expect
    .poll(() => page.evaluate(() => navigator.serviceWorker.controller?.scriptURL ?? ''))
    .toContain('/firebase-messaging-sw.js')
  expect(await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length)).toBe(1)

  // Lascia a Firestore il tempo di salvare in IndexedDB i dati appena ricevuti.
  await expectMainToContain(page, 'Saldo attuale')
  await page.waitForTimeout(2000)
  await context.setOffline(true)
  await page.goto('/spese')
  await expectMainToContain(page, 'Totale')
  await expect(page.getByText('Sei offline')).toBeVisible()
  await context.setOffline(false)
  await expect(page.getByText('Sei offline')).toHaveCount(0)
})

test('offline senza dati in cache: niente stati vuoti falsi', async ({ browser }) => {
  const context = await browser.newContext()
  const page = await context.newPage()
  await login(page)
  await page.evaluate(() => navigator.serviceWorker.ready)
  await context.setOffline(true)
  // Il catalogo dei gruppi non è mai stato aperto: in cache potrebbero mancare. Mai "Nessun gruppo".
  await page.goto('/spese/gruppi').catch(() => undefined)
  await page.waitForTimeout(2000)
  const text = await page.textContent('body')
  expect(text ?? '').not.toContain('Nessun gruppo')
  await context.close()
})
