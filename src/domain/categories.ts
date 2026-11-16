export interface CategoryRule {
  category: string
  keywords: string[]
}

export const DEFAULT_CATEGORY = 'Spese'

/** Regole storiche (class/bank.jsx). Dalla Fase 4 saranno modificabili e salvate su Firestore. */
export const defaultCategoryRules: CategoryRule[] = [
  { category: 'Salvadanaio', keywords: ['Accantonamento', 'Salvadanaio'] },
  { category: 'Palestra', keywords: ['Virgin', 'Wellhub', 'Fabio Zamuner'] },
  { category: 'Auto', keywords: ['ALD AUTOMOTIVE', 'Ayvens'] },
  { category: 'Affitto', keywords: ['Aldo Cassi', 'CANONE DI LOCAZIONE'] },
  { category: 'Stipendio', keywords: ['Stipendio', 'Pensione'] },
]

/** Prima regola la cui keyword compare (senza distinzione maiuscole/minuscole) in operazione + dettagli. */
export function determineNewCategory(
  operation?: string | null,
  detail?: string | null,
  rules: CategoryRule[] = defaultCategoryRules,
): string {
  const text = `${operation ?? ''} ${detail ?? ''}`.toLocaleLowerCase('it-IT')
  const rule = rules.find(({ keywords }) =>
    keywords.some((keyword) => text.includes(keyword.toLocaleLowerCase('it-IT'))),
  )
  return rule?.category ?? DEFAULT_CATEGORY
}
