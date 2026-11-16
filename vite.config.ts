/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync } from 'node:fs'

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }

const firebaseKeys = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
]

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  if (command === 'build' && mode !== 'test') {
    const env = { ...loadEnv(mode, process.cwd(), 'VITE_'), ...process.env }
    const missing = firebaseKeys.filter((key) => !env[key])
    if (missing.length) throw new Error(`Variabili mancanti per la build: ${missing.join(', ')}. Vedi .env.example.`)
  }
  return {
    define: {
      __APP_VERSION__: JSON.stringify(version),
      __APP_BUILD__: JSON.stringify(new Date().toISOString()),
    },
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'firebase-messaging-sw.ts',
        registerType: 'prompt',
        injectRegister: false,
        includeAssets: ['icons/apple-touch-icon-180.png'],
        manifest: {
          id: '/',
          name: 'My Gesture',
          short_name: 'My Gesture',
          description: 'Le tue finanze personali a colpo d’occhio: saldo, spese, estratto conto e abbonamenti.',
          lang: 'it',
          dir: 'ltr',
          start_url: '/',
          scope: '/',
          display: 'standalone',
          orientation: 'portrait',
          background_color: '#f2f2f7',
          theme_color: '#f2f2f7',
          categories: ['finance', 'productivity'],
          icons: [
            { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: '/icons/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
            { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
          shortcuts: [
            {
              name: 'Nuova spesa',
              url: '/spese?foglio=spesa',
              icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
            },
            {
              name: 'Importa estratto conto',
              url: '/conto/importa',
              icons: [{ src: '/icons/icon-192.png', sizes: '192x192' }],
            },
          ],
        },
        injectManifest: {
          globPatterns: ['**/*.{js,css,html,woff2}', 'icons/*.png'],
          // xlsx serve solo all'import, che richiede comunque la rete per salvare: non va in cache offline.
          globIgnores: ['splash/**', 'firebase-messaging-sw.js', 'assets/xlsx-*.js'],
          maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        },
        devOptions: { enabled: false, type: 'module', navigateFallback: 'index.html' },
      }),
    ],
    build: {
      rolldownOptions: {
        output: {
          // Librerie in chunk separati e stabili: cambiano raramente, restano in cache tra un rilascio e l'altro.
          advancedChunks: {
            groups: [
              // Messaging e Functions sono caricati su richiesta: restano fuori dal chunk iniziale.
              {
                name: 'firebase-messaging',
                test: /node_modules[\\/](@firebase[\\/](messaging|installations)|firebase[\\/]messaging)/,
                priority: 30,
              },
              {
                name: 'firebase-functions',
                test: /node_modules[\\/](@firebase[\\/]functions|firebase[\\/]functions)/,
                priority: 30,
              },
              { name: 'firebase', test: /node_modules[\\/](@firebase|firebase)[\\/]/, priority: 20 },
              {
                name: 'recharts',
                test: /node_modules[\\/](recharts|d3-[^\\/]+|victory-vendor|@reduxjs|redux|immer|reselect|es-toolkit|decimal\.js-light|eventemitter3|react-redux)[\\/]/,
                priority: 20,
              },
              {
                name: 'react',
                test: /node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler|use-sync-external-store)[\\/]/,
                priority: 10,
              },
            ],
          },
        },
      },
    },
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'functions/**/*.test.js'],
      env: { TZ: 'Europe/Rome' },
    },
  }
})
