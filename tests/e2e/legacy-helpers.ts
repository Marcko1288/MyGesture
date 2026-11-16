import * as legacy from '../../src/domain/__legacy__/calculations.js'
import { buildSample } from '../../scripts/seed-data.mjs'

/** Spese dell'anno calcolate dal codice storico sui dati di esempio. */
export function legacyYearly(today = new Date()) {
  const sample = buildSample(today)
  return legacy.homeView({ buyRecords: sample.Buy, groupRecords: sample.Group }).yearlyExpenses as number
}
