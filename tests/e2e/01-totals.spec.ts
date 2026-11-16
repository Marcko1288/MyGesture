/**
 * I totali mostrati dall'app coincidono con quelli calcolati dal codice dell'app storica
 * (src/domain/__legacy__) sugli stessi dati; le differenze volute sono verificate esplicitamente.
 */
import { expect, test } from '@playwright/test'
import * as legacy from '../../src/domain/__legacy__/calculations.js'
import { expiringSubscriptions } from '../../src/domain/subscriptions'
import { monthSummary } from '../../src/domain/bank'
import { previousMonthKey } from '../../src/domain/dates'
import { buildSample } from '../../scripts/seed-data.mjs'
import { euro, expectMainToContain, login, mainText } from './helpers'

const today = new Date()
const sample = buildSample(today)
const sorted = legacy.sortByMostRecent([...sample.Cash])
const home = legacy.homeView({
  latestCash: sorted[0],
  previousCash: sorted[1],
  buyRecords: sample.Buy,
  groupRecords: sample.Group,
  bankRecords: sample.Bank,
  subscriptionRecords: sample.Subscription,
})

test.beforeEach(async ({ page }) => login(page))

test('Oggi: saldo, variazione e spese dell’anno come l’app storica', async ({ page }) => {
  await expectMainToContain(page, euro(home.total))
  await expectMainToContain(page, `+${euro(home.delta)}`)
  await expectMainToContain(page, euro(home.yearlyExpenses))
})

test('Spese: totale per gruppi come l’app storica', async ({ page }) => {
  const expenses = legacy.expensesView({ buyRecords: sample.Buy, groupRecords: sample.Group })
  await page.goto('/spese')
  await expectMainToContain(page, euro(expenses.total))
  for (const group of expenses.expenses) await expectMainToContain(page, `${group.name}`)
  for (const group of expenses.excludedGroups) await expectMainToContain(page, euro(group.value))
})

test('Conto: entrate e uscite del mese scorso come la card storica "Andamento Spese"', async ({ page }) => {
  const month = previousMonthKey(today)
  await page.goto(`/conto?mese=${month}&tipo=uscite`)
  await expectMainToContain(page, euro(Math.abs(home.previousMonthNegative)))
  await page.goto(`/conto?mese=${month}&tipo=entrate`)
  await expectMainToContain(page, euro(home.previousMonthPositive))
})

test('Differenze volute: salvadanaio su new_category e scadenze senza rinnovati', async ({ page }) => {
  const savings = monthSummary(sample.Bank, previousMonthKey(today)).savings
  await page.goto(`/conto/categoria/Salvadanaio?mese=${previousMonthKey(today)}&tipo=uscite`)
  await expectMainToContain(page, euro(savings))

  const expiring = expiringSubscriptions(sample.Subscription, today).map(({ subscription }) => subscription.name)
  await page.goto('/altro/abbonamenti?filtro=expiring')
  await expect.poll(() => mainText(page)).toContain(expiring[0])
  const text = await mainText(page)
  const renewedExcluded = sample.Subscription.filter((item) => item.uid_father).map((item) => item.name)
  for (const name of renewedExcluded) expect(text.includes(name), `${name} è già rinnovato`).toBe(false)
  // Il conteggio storico includeva anche i rinnovati: qui deve essere minore o uguale.
  expect(expiring.length).toBeLessThanOrEqual(home.expiringSubscriptions)
})
