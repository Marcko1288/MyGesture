# My Gesture

PWA per la gestione delle finanze personali (saldo, spese, estratto conto, abbonamenti), pensata per iPhone
("Aggiungi a Home"). React 19 + Vite + TypeScript + Tailwind CSS v4, Firebase (Auth, Firestore, Cloud Messaging,
Functions, Hosting).

Documentazione di progetto: [`docs/ANALISI.md`](docs/ANALISI.md) (stato iniziale), [`docs/PIANO.md`](docs/PIANO.md)
(fasi, decisioni, differenze volute), [`docs/FASE0-NOTIFICHE.md`](docs/FASE0-NOTIFICHE.md),
[`docs/VERIFICA.md`](docs/VERIFICA.md) (criteri di accettazione e checklist per l'iPhone).

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

I valori della web app Firebase sono pubblici per natura (finiscono nel bundle), ma non sono scritti nel codice: la
build si ferma se mancano. `.env.emulator` contiene valori fittizi per il progetto `demo-mygesture` degli emulatori.

## Script

| Comando | Cosa fa |
|---|---|
| `npm run dev` | Server di sviluppo |
| `npm run dev:emulator` | Server di sviluppo collegato agli emulatori |
| `npm run build` | Typecheck (app + service worker) e build di produzione in `dist/` |
| `npm run preview` | Serve la build |
| `npm run lint` | oxlint |
| `npm run format` / `format:check` | Prettier |
| `npm test` | Test unitari del dominio (Vitest, fuso `Europe/Rome`) |
| `npm run test:rules` | Test delle security rules sull'emulatore Firestore |
| `npm run test:e2e` | Test end-to-end Playwright (emulatori + dati di esempio + build) |
| `npm run emulators` | Emulatori Auth, Firestore, Functions, Hosting (UI su http://127.0.0.1:4000) |
| `npm run assets:pwa` | Rigenera apple-touch-icon, icone maskable e schermate di avvio iOS da `public/icons/icon-512.png` |

## Emulatori Firebase

```bash
npm run emulators -- --project demo-mygesture
```

In un altro terminale:

```bash
node scripts/seed-emulator.mjs   # utente demo@mygesture.test / password123 + dati di esempio
npm run dev:emulator
```

## Struttura

```
src/
  app/        shell (tab bar, fogli), router con un URL per ogni schermata, tema, aggiornamento PWA
  data/       accesso a Firestore: hook (useCash, useBuys, useBankRecords…), scritture, auth, push, regole
  domain/     tipi del modello dati e logica di business pura, con test (e il codice storico per i confronti)
  features/   schermate per area (home, expenses, statement, savings, subscriptions, settings, forms, auth)
  lib/        inizializzazione Firebase e variabili d'ambiente
  ui/         design system (Card, ListRow, Amount, BottomSheet, TabBar, grafici…)
  firebase-messaging-sw.ts  service worker unico: cache offline + notifiche
functions/    Cloud Functions (notifiche scadenze abbonamenti, notifica di prova)
tests/        test delle security rules e test end-to-end
scripts/      dati di esempio e seed degli emulatori, generazione asset PWA
```

Dati: `NewMyDB/{uid}/{Bank|Buy|Cash|Group|Partner|Subscription|PushToken|Settings}`. Nomi dei campi e formato degli
uid non vanno cambiati (vedi `src/domain/types.ts`). `Settings/categoryRules` contiene le regole di categorizzazione
personalizzate (se assente valgono quelle storiche).

## Deploy

Il progetto di default è `mygestion-446b9` (`.firebaserc`).

```bash
npm run build
firebase deploy --only firestore:rules,firestore:indexes
cd functions && npm ci && cd .. && firebase deploy --only functions
firebase deploy --only hosting
```

L'hosting serve `dist/` con rewrite di tutte le route su `index.html`. `index.html`, il manifest e il service worker
non vengono messi in cache dal browser; gli asset con hash sono `immutable`. Dopo il passaggio da Netlify, sull'iPhone
l'app va reinstallata dal nuovo indirizzo (vedi `docs/VERIFICA.md`).
