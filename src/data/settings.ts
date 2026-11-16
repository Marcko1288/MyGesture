import { useEffect, useState } from 'react'
import { onSnapshot, setDoc } from 'firebase/firestore'
import { defaultCategoryRules, normalizeRules, recategorize, type CategoryRule } from '../domain/categories'
import type { Bank } from '../domain/types'
import { idOf } from '../domain/numbers'
import { useUserId } from './auth'
import { commitInBatches } from './mutations'
import { userDoc } from './paths'

/** Documento NewMyDB/{uid}/Settings/categoryRules (nuovo; le regole storiche sono il default). */
const RULES_DOC = 'categoryRules'

export interface CategoryRulesState {
  status: 'loading' | 'ready' | 'error'
  rules: CategoryRule[]
  /** true se l'utente non le ha mai personalizzate. */
  isDefault: boolean
}

export function useCategoryRules(): CategoryRulesState {
  const userId = useUserId()
  const [state, setState] = useState<CategoryRulesState>({
    status: 'loading',
    rules: defaultCategoryRules,
    isDefault: true,
  })
  useEffect(
    () =>
      onSnapshot(
        userDoc(userId, 'Settings', RULES_DOC),
        (snapshot) => {
          const rules = snapshot.data()?.rules as CategoryRule[] | undefined
          setState(
            rules
              ? { status: 'ready', rules: normalizeRules(rules), isDefault: false }
              : { status: 'ready', rules: defaultCategoryRules, isDefault: true },
          )
        },
        () => setState({ status: 'error', rules: defaultCategoryRules, isDefault: true }),
      ),
    [userId],
  )
  return state
}

export async function saveCategoryRules(userId: string, rules: CategoryRule[]) {
  await setDoc(userDoc(userId, 'Settings', RULES_DOC), {
    rules: normalizeRules(rules),
    updatedAt: new Date().toISOString(),
  })
}

/** Ricalcola new_category sui movimenti esistenti (solo quelli che cambiano), in batch. */
export async function applyCategoryRules(
  userId: string,
  records: Bank[],
  rules: CategoryRule[],
  onProgress?: (done: number, total: number) => void,
) {
  const changes = recategorize(records, rules)
  const now = new Date().toISOString()
  await commitInBatches(
    changes.map(({ record, to }) => ({
      type: 'update',
      ref: userDoc(userId, 'Bank', idOf(record)),
      data: { new_category: to, data_modify: now },
    })),
    onProgress,
  )
  return changes.length
}
