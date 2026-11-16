import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { FiArrowDown, FiArrowUp, FiPlus, FiTrash2, FiX } from 'react-icons/fi'
import { paths, useBack } from '../../app/navigation'
import { useUserId } from '../../data/auth'
import { useBankRecords } from '../../data/hooks'
import { applyCategoryRules, saveCategoryRules, useCategoryRules } from '../../data/settings'
import { defaultCategoryRules, normalizeRules, recategorize, type CategoryRule } from '../../domain/categories'
import { BottomSheet, Button, Card, DataState, IconButton, List, ListRow, Page, SkeletonList, useToast } from '../../ui'
import { ProgressBar } from '../../ui/charts'

const same = (a: CategoryRule[], b: CategoryRule[]) =>
  JSON.stringify(normalizeRules(a)) === JSON.stringify(normalizeRules(b))

function KeywordInput({ onAdd, label }: { onAdd: (keyword: string) => void; label: string }) {
  const [value, setValue] = useState('')
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (value.trim()) onAdd(value.trim())
    setValue('')
  }
  return (
    <form onSubmit={submit} className="mt-2 flex gap-2">
      <input
        aria-label={label}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Aggiungi parola chiave"
        className="min-h-11 min-w-0 flex-1 rounded-xl bg-surface-2 px-3 text-[16px] outline-none"
        enterKeyHint="done"
      />
      <IconButton type="submit" label={label} icon={<FiPlus />} className="bg-accent-soft" />
    </form>
  )
}

/**
 * Regole a parole chiave per la categoria dei movimenti. Si applicano in ordine (vince la prima che trova
 * una parola in operazione o dettagli). Al salvataggio ricalcolano anche i movimenti già importati.
 */
export default function CategoryRulesView() {
  const back = useBack(paths.settings)
  const userId = useUserId()
  const toast = useToast()
  const saved = useCategoryRules()
  const bank = useBankRecords()
  const [draft, setDraft] = useState<CategoryRule[] | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)

  useEffect(() => {
    if (saved.status === 'ready' && draft === null) setDraft(saved.rules)
  }, [saved, draft])

  const rules = draft ?? saved.rules
  const dirty = !same(rules, saved.rules)
  const changes = useMemo(() => recategorize(bank.data, normalizeRules(rules)), [bank.data, rules])
  const summary = useMemo(() => {
    const counts = new Map<string, number>()
    for (const change of changes) {
      const key = `${change.from || 'Senza categoria'} → ${change.to}`
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1])
  }, [changes])

  const update = (index: number, rule: CategoryRule) =>
    setDraft(rules.map((item, position) => (position === index ? rule : item)))
  const move = (index: number, delta: number) => {
    const next = [...rules]
    const [item] = next.splice(index, 1)
    next.splice(index + delta, 0, item!)
    setDraft(next)
  }

  async function save() {
    setProgress({ done: 0, total: changes.length })
    try {
      const normalized = normalizeRules(rules)
      if (dirty) await saveCategoryRules(userId, normalized)
      const updated = await applyCategoryRules(userId, bank.data, normalized, (done, total) =>
        setProgress({ done, total }),
      )
      setDraft(normalized)
      setConfirmOpen(false)
      toast({ message: updated ? `Regole salvate: ${updated} movimenti ricategorizzati.` : 'Regole salvate.' })
    } catch (error) {
      console.error(error)
      toast({ message: 'Salvataggio non riuscito: riprova.', tone: 'error' })
    } finally {
      setProgress(null)
    }
  }

  return (
    <Page title="Categorie" subtitle="Regole per l'estratto conto" back={{ label: 'Impostazioni', onClick: back }}>
      <p className="px-1 text-[15px] text-muted">
        Se l'operazione o i dettagli di un movimento contengono una parola chiave, il movimento prende quella categoria.
        Le regole valgono in ordine: vince la prima. Senza corrispondenze la categoria è “Spese”.
      </p>
      <DataState
        status={saved.status === 'error' ? 'error' : draft === null ? 'loading' : 'ready'}
        skeleton={<SkeletonList rows={4} />}
      >
        {rules.map((rule, index) => (
          <Card key={index}>
            <div className="flex items-center gap-1">
              <input
                aria-label={`Nome della categoria ${index + 1}`}
                value={rule.category}
                onChange={(event) => update(index, { ...rule, category: event.target.value })}
                placeholder="Nome categoria"
                className="min-h-11 min-w-0 flex-1 rounded-xl bg-surface-2 px-3 text-[17px] font-semibold outline-none"
              />
              <IconButton
                label={`Sposta su ${rule.category}`}
                icon={<FiArrowUp />}
                disabled={index === 0}
                onClick={() => move(index, -1)}
              />
              <IconButton
                label={`Sposta giù ${rule.category}`}
                icon={<FiArrowDown />}
                disabled={index === rules.length - 1}
                onClick={() => move(index, 1)}
              />
              <IconButton
                label={`Elimina la regola ${rule.category}`}
                icon={<FiTrash2 />}
                className="text-negative"
                onClick={() => setDraft(rules.filter((_, position) => position !== index))}
              />
            </div>
            <ul className="mt-2 flex flex-wrap gap-2" aria-label={`Parole chiave di ${rule.category}`}>
              {rule.keywords.map((keyword, keywordIndex) => (
                <li key={`${keyword}-${keywordIndex}`}>
                  <button
                    type="button"
                    aria-label={`Rimuovi ${keyword}`}
                    onClick={() =>
                      update(index, {
                        ...rule,
                        keywords: rule.keywords.filter((_, position) => position !== keywordIndex),
                      })
                    }
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-accent-soft pr-3 pl-4 text-[15px] text-accent-strong"
                  >
                    {keyword}
                    <FiX aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
            <KeywordInput
              label={`Aggiungi parola chiave a ${rule.category || 'questa regola'}`}
              onAdd={(keyword) => update(index, { ...rule, keywords: [...rule.keywords, keyword] })}
            />
          </Card>
        ))}
        <Button
          variant="secondary"
          icon={<FiPlus />}
          onClick={() => setDraft([...rules, { category: '', keywords: [] }])}
        >
          Nuova regola
        </Button>
        <Button block disabled={!dirty && !changes.length} onClick={() => setConfirmOpen(true)}>
          {dirty ? 'Salva' : changes.length ? `Riapplica a ${changes.length} movimenti` : 'Nessuna modifica'}
        </Button>
        {!same(rules, defaultCategoryRules) && (
          <Button variant="plain" block onClick={() => setDraft(defaultCategoryRules)}>
            Ripristina le regole predefinite
          </Button>
        )}
      </DataState>
      <BottomSheet
        open={confirmOpen}
        onClose={() => !progress && setConfirmOpen(false)}
        title={dirty ? 'Salvare le regole?' : 'Riapplicare le regole?'}
        footer={
          progress ? (
            <ProgressBar value={progress.done} max={Math.max(progress.total, 1)} label="Aggiornamento dei movimenti" />
          ) : (
            <Button block onClick={save}>
              {changes.length ? `Salva e aggiorna ${changes.length} movimenti` : 'Salva'}
            </Button>
          )
        }
      >
        {changes.length ? (
          <>
            <p className="text-[15px] text-muted">
              {changes.length} {changes.length === 1 ? 'movimento cambierà' : 'movimenti cambieranno'} categoria:
            </p>
            <List className="mt-3" label="Cambi di categoria">
              {summary.slice(0, 8).map(([label, count]) => (
                <ListRow
                  key={label}
                  title={label}
                  trailing={<span className="text-muted">{count}</span>}
                  chevron={false}
                />
              ))}
            </List>
          </>
        ) : (
          <p className="text-[15px] text-muted">Nessun movimento già importato cambia categoria.</p>
        )}
      </BottomSheet>
    </Page>
  )
}
