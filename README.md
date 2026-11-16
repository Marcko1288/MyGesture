# My Gesture

PWA per la gestione delle finanze personali (saldo, spese, estratto conto, abbonamenti), pensata per iPhone.
React 19 + Vite + TypeScript, Firebase (Auth, Firestore, Cloud Messaging, Functions, Hosting).

Documentazione di progetto: [`docs/ANALISI.md`](docs/ANALISI.md), [`docs/PIANO.md`](docs/PIANO.md), [`docs/FASE0-NOTIFICHE.md`](docs/FASE0-NOTIFICHE.md).

## Setup locale

Requisiti: Node.js 22, npm, Java 21+ (solo per gli emulatori Firebase).

```bash
npm install
cp .env.example .env.local   # poi compila i valori
npm run dev                  # http://localhost:5173
```

### Variabili d'ambiente

| Variabile | Dove trovarla |
|---|---|
| `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID` | Console Firebase › Impostazioni progetto › Le tue app › Web |
| `VITE_FIREBASE_VAPID_KEY` | Console Firebase › Cloud Messaging › Certificati Web push (chiave pubblica) |
| `VITE_USE_EMULATORS` | `true` per usare gli emulatori locali |

I valori della web app Firebase sono pubblici per natura (finiscono nel bundle), ma non sono più scritti nel codice: la build fallisce se mancano. Il service worker delle notifiche (`/firebase-messaging-sw.js`) viene generato al build dalle stesse variabili (`vite-plugins/firebaseMessagingSw.ts`).

## Script

| Comando | Cosa fa |
|---|---|
| `npm run dev` | Server di sviluppo |
| `npm run build` | Typecheck + build di produzione in `dist/` |
| `npm run preview` | Serve la build |
| `npm run lint` | oxlint |
| `npm run format` / `format:check` | Prettier |
| `npm test` | Test unitari (Vitest, fuso `Europe/Rome`) |
| `npm run test:rules` | Test delle security rules sull'emulatore Firestore |
| `npm run emulators` | Emulatori Auth, Firestore, Functions, Hosting (UI su http://127.0.0.1:4000) |

## Emulatori Firebase

```bash
npm run emulators -- --project demo-mygesture
```

In un altro terminale:

```bash
node scripts/seed-emulator.mjs   # utente demo@mygesture.test / password123 + dati di esempio
VITE_USE_EMULATORS=true VITE_FIREBASE_PROJECT_ID=demo-mygesture npm run dev
```

## Struttura

```
src/
  app/        shell, router (URL di ogni schermata), tema
  data/       accesso a Firestore: hook (useCash, useBuys, useBankRecords…), scritture, auth, push
  domain/     tipi del modello dati e logica di business pura (testata)
  features/   schermate per area (home, expenses, statement, savings, subscriptions, settings, auth)
  lib/        inizializzazione Firebase e variabili d'ambiente
  ui/         componenti del design system
functions/    Cloud Functions (notifiche scadenze abbonamenti, notifica di prova)
tests/        test delle security rules
scripts/      script di supporto (seed degli emulatori, eventuali migrazioni)
```

Dati: `NewMyDB/{uid}/{Bank|Buy|Cash|Group|Partner|Subscription|PushToken}`. Nomi dei campi e formato degli uid non vanno cambiati (vedi `src/domain/types.ts`).

## Deploy

Il progetto di default è `mygestion-446b9` (`.firebaserc`).

```bash
npm run build
firebase deploy --only hosting
firebase deploy --only firestore:rules,firestore:indexes
cd functions && npm ci && cd .. && firebase deploy --only functions
```

L'hosting serve `dist/` con rewrite di tutte le route su `index.html`. `index.html` e il service worker non vengono messi in cache, gli asset con hash sono `immutable`.
