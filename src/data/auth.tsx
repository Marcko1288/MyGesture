import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut as firebaseSignOut, type User } from 'firebase/auth'
import { auth } from '../lib/firebase'
import { resetCollections } from './collectionStore'

interface AuthState {
  status: 'loading' | 'signedIn' | 'signedOut'
  user: User | null
}

const AuthContext = createContext<AuthState>({ status: 'loading', user: null })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading', user: null })
  useEffect(() => onAuthStateChanged(auth, (user) => setState({ status: user ? 'signedIn' : 'signedOut', user })), [])
  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}

/** Uid dell'utente autenticato. Da usare solo nelle schermate protette. */
export function useUserId(): string {
  const { user } = useAuth()
  if (!user) throw new Error('Utente non autenticato.')
  return user.uid
}

export function signIn(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email.trim(), password)
}

export async function signOut() {
  resetCollections()
  await firebaseSignOut(auth)
}
