import { describe, expect, it } from 'vitest'
import { cashCsv, statementCsv } from '../csv'
import { categoryColorOrder, firstMonthWithData } from '../bank'
import type { Bank, Cash } from '../types'

const stamp = { data_ins: '2026-01-01T00:00:00.000Z', data_modify: '2026-01-01T00:00:00.000Z' }
const bank = (values: Partial<Bank>): Bank => ({
  uid: 'BANK_1',
  data_valore: new Date(2026, 9, 3, 12).toISOString(),
  operation: 'POS "Bar"',
  detail: 'x',
  card: '',
  accounting: '',
  category: 'Bar',
  new_category: 'Spese',
  currency: 'EUR',
  amount: -2.5,
  ...stamp,
  ...values,
})

describe('esportazioni CSV', () => {
  it('estratto conto: intestazioni storiche, ; come separatore, virgolette raddoppiate', () => {
    expect(statementCsv([bank({})])).toBe(
      '﻿"UID";"Data";"Operazione";"Dettagli";"Conto o carta";"Contabilizzazione";"Categoria";"Valuta";"Importo"\n"BANK_1";"03/10/2026";"POS ""Bar""";"x";"";"";"Bar";"EUR";"-2.5"',
    )
  })
  it('storico saldo: tutte le colonne in ordine alfabetico, date Timestamp in ISO', () => {
    const cash = {
      uid: 'CASH_1',
      conto: 1,
      anticipo: 0,
      otherp: 0,
      otherm: 0,
      data_valore: { seconds: 0 },
      ...stamp,
    } as unknown as Cash
    expect(cashCsv([cash]).split('\n')[0]).toBe(
      '﻿"anticipo";"conto";"data_ins";"data_modify";"data_valore";"otherm";"otherp";"uid"',
    )
    expect(cashCsv([cash]).split('\n')[1]).toContain('"1970-01-01T00:00:00.000Z"')
  })
})

describe('colori delle categorie', () => {
  it('ordine stabile: regole, Spese, poi alfabetico', () => {
    const records = [
      bank({ new_category: 'Zeta' }),
      bank({ new_category: 'Affitto' }),
      bank({ new_category: 'Bar' }),
      bank({ new_category: '' }),
    ]
    expect(categoryColorOrder(records, ['Salvadanaio', 'Affitto'])).toEqual([
      'Salvadanaio',
      'Affitto',
      'Spese',
      'Bar',
      'Zeta',
    ])
  })
  it('primo mese con dati', () => {
    expect(firstMonthWithData([bank({}), bank({ data_valore: new Date(2025, 4, 1).toISOString() })])).toBe('2025-05')
    expect(firstMonthWithData([])).toBeNull()
  })
})
