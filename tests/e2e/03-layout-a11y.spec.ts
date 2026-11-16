/**
 * Su 375, 390 e 430 px nessuno scroll orizzontale e nulla coperto dalla tab bar;
 * nessuna violazione WCAG A/AA (axe) in tema chiaro e scuro.
 */
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { login, ROUTES } from './helpers'

for (const [width, height] of [
  [375, 667],
  [390, 844],
  [430, 932],
] as const) {
  test(`layout a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height })
    await login(page)
    for (const route of ROUTES) {
      await page.goto(route)
      await page.locator('main').waitFor()
      await page.waitForTimeout(400)
      const result = await page.evaluate(() => {
        const main = document.querySelector('main')
        const tabbar = document.querySelector('nav[aria-label="Navigazione principale"]')
        const padding = main ? parseFloat(getComputedStyle(main).paddingBottom) : 0
        return {
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          // Lo spazio in fondo al contenuto è maggiore dell'altezza della tab bar: l'ultimo elemento si può sempre scorrere sopra.
          bottomSpace: padding - (tabbar?.getBoundingClientRect().height ?? 0),
        }
      })
      expect(result.overflow, `${route}: scroll orizzontale`).toBeLessThanOrEqual(0)
      expect(result.bottomSpace, `${route}: contenuto coperto dalla tab bar`).toBeGreaterThan(0)
    }
  })
}

for (const mode of ['light', 'dark']) {
  test(`accessibilità (axe) in tema ${mode === 'light' ? 'chiaro' : 'scuro'}`, async ({ page }) => {
    await page.goto('/login')
    await page.evaluate((value) => localStorage.setItem('mygesture-theme', value), mode)
    const loginResults = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
    expect(loginResults.violations.map((item) => item.id)).toEqual([])
    await login(page)
    for (const route of ROUTES) {
      await page.goto(route)
      await page.waitForTimeout(700)
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'best-practice']).analyze()
      expect(results.violations.map((item) => `${route} ${item.id}: ${item.nodes[0]?.target.join(' ')}`)).toEqual([])
    }
  })
}

test('target touch di almeno 44px nelle schermate principali', async ({ page }) => {
  await login(page)
  for (const route of ['/', '/spese', '/conto', '/altro', '/altro/abbonamenti', '/altro/impostazioni']) {
    await page.goto(route)
    await page.locator('main').waitFor()
    await page.waitForTimeout(700)
    const small = await page.evaluate(() =>
      [...document.querySelectorAll('main a, main button, main [role=radio], nav a, nav button')]
        .filter((element) => {
          const rect = element.getBoundingClientRect()
          return rect.width > 0 && (rect.height < 43.5 || rect.width < 43.5)
        })
        .map(
          (element) =>
            `${element.tagName} ${element.textContent?.trim().slice(0, 30) || element.getAttribute('aria-label')}`,
        ),
    )
    expect(small, route).toEqual([])
  }
})
