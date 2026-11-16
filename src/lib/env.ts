const keys = {
  apiKey: 'VITE_FIREBASE_API_KEY',
  authDomain: 'VITE_FIREBASE_AUTH_DOMAIN',
  projectId: 'VITE_FIREBASE_PROJECT_ID',
  storageBucket: 'VITE_FIREBASE_STORAGE_BUCKET',
  messagingSenderId: 'VITE_FIREBASE_MESSAGING_SENDER_ID',
  appId: 'VITE_FIREBASE_APP_ID',
} as const

type FirebaseWebConfig = Record<keyof typeof keys, string>

function readConfig(): FirebaseWebConfig {
  const env = import.meta.env as Record<string, string | undefined>
  const missing: string[] = []
  const config = Object.fromEntries(
    Object.entries(keys).map(([field, name]) => {
      const value = env[name]?.trim() ?? ''
      if (!value) missing.push(name)
      return [field, value]
    }),
  ) as FirebaseWebConfig
  if (missing.length) {
    throw new Error(
      `Configurazione Firebase mancante: ${missing.join(', ')}. Copia .env.example in .env.local e compila i valori.`,
    )
  }
  return config
}

export const firebaseConfig = readConfig()
export const vapidKey = (import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined)?.trim() || ''
export const useEmulators = import.meta.env.VITE_USE_EMULATORS === 'true'
