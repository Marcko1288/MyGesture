import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadEnv, type Plugin } from 'vite'

const require = createRequire(import.meta.url)
const here = dirname(fileURLToPath(import.meta.url))
const firebaseDir = dirname(require.resolve('firebase/package.json'))
const firebaseVersion = (JSON.parse(readFileSync(join(firebaseDir, 'package.json'), 'utf8')) as { version: string })
  .version
const compatScripts = ['firebase-app-compat.js', 'firebase-messaging-compat.js']

const envKeys = {
  apiKey: 'VITE_FIREBASE_API_KEY',
  authDomain: 'VITE_FIREBASE_AUTH_DOMAIN',
  projectId: 'VITE_FIREBASE_PROJECT_ID',
  storageBucket: 'VITE_FIREBASE_STORAGE_BUCKET',
  messagingSenderId: 'VITE_FIREBASE_MESSAGING_SENDER_ID',
  appId: 'VITE_FIREBASE_APP_ID',
}

/**
 * Genera /firebase-messaging-sw.js dalle variabili d'ambiente (nessuna chiave nel codice)
 * e pubblica gli script compat di Firebase dal pacchetto npm sotto /firebase/.
 */
export function firebaseMessagingSw(): Plugin {
  let source = ''
  const render = () => source
  return {
    name: 'mygesture:firebase-messaging-sw',
    configResolved(config) {
      const env = loadEnv(config.mode, config.envDir || config.root, 'VITE_')
      const firebaseConfig = Object.fromEntries(
        Object.entries(envKeys).map(([field, name]) => [field, env[name] ?? '']),
      )
      const missing = Object.entries(envKeys)
        .filter(([field]) => !firebaseConfig[field])
        .map(([, name]) => name)
      if (missing.length && config.command === 'build') {
        throw new Error(`Variabili mancanti per il service worker: ${missing.join(', ')}`)
      }
      source = readFileSync(join(here, 'firebase-messaging-sw.template.js'), 'utf8')
        .replace('__FIREBASE_CONFIG__', JSON.stringify(firebaseConfig, null, 2))
        .replaceAll('__FIREBASE_VERSION__', firebaseVersion)
    },
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const url = request.url?.split('?')[0]
        if (url === '/firebase-messaging-sw.js') {
          response.setHeader('Content-Type', 'application/javascript')
          response.end(render())
          return
        }
        const script = compatScripts.find((name) => url === `/firebase/${name}`)
        if (script) {
          response.setHeader('Content-Type', 'application/javascript')
          response.end(readFileSync(join(firebaseDir, script)))
          return
        }
        next()
      })
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'firebase-messaging-sw.js', source: render() })
      for (const name of compatScripts) {
        this.emitFile({ type: 'asset', fileName: `firebase/${name}`, source: readFileSync(join(firebaseDir, name)) })
      }
    },
  }
}
