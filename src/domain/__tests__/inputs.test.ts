import { describe, expect, it } from 'vitest'
import { formatAmountInput, fromDateInput, parseAmountInput, startOfDayIso, toDateInput } from '../inputs'

describe('importi digitati', () => {
  it.each([
    ['12,50', 12.5],
    ['1.234,56', 1234.56],
    ['1234.5', 1234.5],
    ['-3', -3],
    [' 7 € ', 7],
    ['0,005', 0.01],
    [',5', 0.5],
    ['13.000', 13000],
    ['1.234.567', 1234567],
    ['-2.500', -2500],
    ['12.5', 12.5],
    ['12.50', 12.5],
    ['1234.567', 1234.57],
  ])('%s → %s', (input, expected) => expect(parseAmountInput(input)).toBe(expected))
  it.each(['', 'abc', '1,2,3', '-', '12a'])('%s non è valido', (input) => expect(parseAmountInput(input)).toBeNull())
  it('formatta per la modifica', () => {
    expect(formatAmountInput(1234.5)).toBe('1234,5')
    expect(formatAmountInput(null)).toBe('')
  })
})

describe('date dei form', () => {
  it('giorno locale per il campo data', () => {
    expect(toDateInput(new Date(2026, 10, 16, 0, 30).toISOString())).toBe('2026-11-16')
    expect(toDateInput('2026-11-16')).toBe('2026-11-16')
    expect(toDateInput(null)).toBe('')
  })
  it('mezzogiorno locale, o l’ora originale se il giorno non cambia', () => {
    expect(fromDateInput('2026-11-16')).toBe(new Date(2026, 10, 16, 12).toISOString())
    const previous = new Date(2026, 10, 16, 8, 45).toISOString()
    expect(fromDateInput('2026-11-16', previous)).toBe(previous)
    expect(fromDateInput('2026-11-17', previous)).toBe(new Date(2026, 10, 17, 12).toISOString())
    expect(fromDateInput('16/11/2026')).toBeNull()
  })
  it('abbonamenti: mezzanotte locale come lo storico', () => {
    expect(startOfDayIso('2026-12-01')).toBe(new Date('2026-12-01T00:00:00').toISOString())
  })
})
