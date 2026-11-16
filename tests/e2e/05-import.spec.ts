/** Import XLSX: anteprima, deduplica con molteplicità, scrittura in batch; reimportare non crea doppioni. */
import { expect, test } from '@playwright/test'
import * as XLSX from 'xlsx'
import { euro, expectMainToContain, login, mainText } from './helpers'

function statementFile(): Buffer {
  const today = new Date()
  const previous = new Date(today.getFullYear(), today.getMonth() - 1, 9)
  const current = new Date(today.getFullYear(), today.getMonth(), Math.min(3, today.getDate()))
  const md = (date: Date) => `${date.getMonth() + 1}/${date.getDate()}/${String(date.getFullYear()).slice(2)}`
  const rows = [
    ['Estratto conto'],
    [],
    ['Data', 'Operazione', 'Dettagli', 'Conto o carta', 'Contabilizzazione', 'Categoria', 'Valuta', 'Importo'],
    // "Bar" del mese scorso esiste già una volta nei dati di esempio: delle due righe se ne importa una.
    [md(previous), 'Pagamento POS', 'Bar', 'Carta', 'Contabilizzato', 'Bar', 'EUR', '-2.50'],
    [md(previous), 'Pagamento POS', 'Bar', 'Carta', 'Contabilizzato', 'Bar', 'EUR', '-2.50'],
    [md(current), 'Stipendio', 'ACME SPA', 'Conto', 'Contabilizzato', 'Entrate', 'EUR', '2,600.00'],
    [md(current), 'Accantonamento', 'Salvadanaio', 'Conto', 'Contabilizzato', 'Risparmio', 'EUR', '-250'],
    [md(current), 'Pagamento POS', 'Farmacia centrale', 'Carta', 'Contabilizzato', 'Salute', 'EUR', '-12.40'],
    ['13/45/26', 'Errore', 'data sbagliata', '', '', '', 'EUR', '-1'],
    [md(current), 'Errore', 'importo sbagliato', '', '', '', 'EUR', 'abc'],
  ]
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), 'Movimenti')
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

test('anteprima, import in batch e re-import senza duplicati', async ({ page }) => {
  await login(page, '/conto/importa')
  const file = {
    name: 'estratto.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer: statementFile(),
  }
  await page.setInputFiles('input[type=file]', file)
  await expectMainToContain(page, 'Righe lette')
  const text = (await mainText(page)).replace(/ /g, '')
  for (const expected of [
    'Righelette7',
    'Righevalide5',
    'Giàpresenti1',
    'Conerrori2',
    euro(2600).replace(/ /g, ''),
    euro(264.9).replace(/ /g, ''),
  ]) {
    expect(text).toContain(expected)
  }
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Scarica errori (CSV)' }).click()
  expect((await download).suggestedFilename()).toBe('errori-importazione-estratto-conto.csv')
  await page.getByRole('button', { name: 'Importa 4 movimenti' }).click()
  await expectMainToContain(page, '4 movimenti importati')
  await page.getByRole('button', { name: 'Importa un altro file' }).click()
  await page.setInputFiles('input[type=file]', file)
  await expectMainToContain(page, 'Niente di nuovo da importare')
  await page.goto('/')
  await expectMainToContain(page, 'Farmacia centrale')
})
