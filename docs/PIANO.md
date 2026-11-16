# MyGesture — Piano di lavoro

Branch: `fix-push` (Fase 0, da `main`) e `redesign` (Fasi 1–7). Faccio un commit per ogni passo logico e mi fermo alla fine di ogni fase con un riepilogo e l'elenco di cosa provare. Non faccio nessun deploy in produzione.

## Domande aperte (mi servono le risposte prima della Fase 1)

1. **Dove gira oggi l'app?** `_redirects` fa pensare a Netlify. Se passiamo a Firebase Hosting (`mygestion-446b9.web.app`) cambia l'**origine**: su iPhone andrà rimossa l'icona dalla Home, aggiunta di nuovo dal nuovo indirizzo e riattivate le notifiche (token, localStorage e cache sono legati all'origine). Va bene così, oppure c'è un dominio personalizzato da spostare?
2. **Abbonamenti "in scadenza"**: oggi la Home conta anche quelli già rinnovati, mentre la function li esclude. Il prompt chiede di escluderli: confermi? Ne segue che il numero in Home potrà essere **più basso** di quello attuale, e il criterio "stessi totali dell'app attuale" non varrà per questa card. Propongo anche "entro 30 giorni" al posto di "entro un mese di calendario".
3. **Deduplica dell'import**: propongo la chiave `giorno locale (YYYY-MM-DD) + importo + operazione + dettagli` (testo normalizzato: spazi compressi, senza distinzione tra maiuscole e minuscole), confrontata **per molteplicità**. Esempio: se nel file ci sono 2 caffè identici nello stesso giorno e su Firestore ce n'è 1, ne importo 1. Va bene?
4. **Regole di categorizzazione modificabili**: quando le cambi, ricalcolo `new_category` sui movimenti già salvati (con anteprima e conferma) oppure le applico solo ai nuovi import? Propongo un pulsante esplicito "Riapplica alle operazioni esistenti".
5. **`Group.all`**: oggi non c'è modo di impostarlo dall'app. Aggiungo l'interruttore "Includi nei totali" nel form del gruppo? E un gruppo senza il campo `all` (vecchi dati) lo tratto come `true` (come il default di `createGroup`) o come oggi (escluso ovunque)? Propongo `true`, segnalando la differenza.
6. **Pareggio di fine anno**: lo mantengo (in Spese → Gruppi) rendendolo idempotente (non ricrea `Pareggio {anno}` se esiste già)?

## Fase 0 — Hotfix notifiche push (`fix-push`, da `main`)

Cambiamenti minimi, senza riscrivere l'app:
- `index.html`: `<link rel="manifest">`, `apple-touch-icon`, meta `apple-mobile-web-app-capable`/`title`/`status-bar-style` e `theme-color`.
- `pushNotifications.js`: `syncPushToken()` a ogni avvio (e al ritorno in primo piano) se `Notification.permission === 'granted'`: `getToken` → salva `PushToken/{token}` con `token`, `updatedAt`, `deviceId` (id casuale salvato in localStorage) e `userAgent`; elimina gli altri token con lo stesso `deviceId`. Il messaging viene inizializzato in modo lazy e sicuro (niente eccezioni all'avvio).
- Impostazioni: stato reale (permesso, token registrato sì/no, ultimo aggiornamento) + "Invia notifica di prova".
- `functions/index.js`: elimina il token solo per `messaging/registration-token-not-registered` e `messaging/invalid-registration-token`, altrimenti scrive nel log; calcola i giorni in `Europe/Rome`; payload `webpush.notification` (titolo, corpo, icona) + `fcmOptions.link`; log riassuntivo (utenti, token, invii, errori); nuova callable `sendTestNotification` (solo per l'utente autenticato).
- `functions/package.json`: Node 22, `firebase-admin` 13, `firebase-functions` 6.x (ultima).
- `firebase-messaging-sw.js`: gestore `notificationclick` (mette in primo piano o apre l'app).
- La config del service worker resta scritta nel file in questa fase (è un file statico in `public/`, e i valori sono pubblici per natura); la sposto nelle variabili d'ambiente nella Fase 1/6.

## Fase 1 — Fondamenta

- TypeScript (`tsconfig`, `.jsx` → `.tsx` progressivamente; `src/domain/types.ts`).
- SDK Firebase modulare da npm, config da `VITE_FIREBASE_*` + `.env.example`; `persistentLocalCache` con `persistentMultipleTabManager`.
- React Router (`createBrowserRouter`) con un URL per ogni schermata attuale. Le viste esistenti vengono adattate per leggere i parametri dalla route invece che dalle prop di `HubView` (stessa UI).
- `src/data/`: `useCash`, `useBuys`, `useGroups`, `useBankRecords`, `useSubscriptions`, con `onSnapshot` condiviso (un listener per collezione, contatore dei riferimenti, unsubscribe corretto) e mutazioni senza il `get` preliminare.
- Struttura: `src/domain`, `src/data`, `src/features/<area>`, `src/ui`, `src/lib`.
- `firebase.json` (hosting + firestore + functions + emulators), `firestore.rules`, `firestore.indexes.json`, `.firebaserc`, `.gitignore`; rimozione di `dist/` e `public/_redirects`; rimozione di `react-redux`.
- Prettier. README aggiornato.
- Verifica: l'app funziona come prima, ma con URL reali.

Rotte previste:
```
/                       Oggi
/spese                  Spese per gruppo        /spese/gruppi, /spese/gruppi/:groupId, /spese/:buyId
/conto?mese=2026-10&tipo=uscite                 /conto/categoria/:categoria(/andamento), /conto/movimento/:id, /conto/importa
/altro                  /altro/risparmi, /altro/risparmi/storico, /altro/saldo/:cashId
                        /altro/abbonamenti?filtro=, /altro/abbonamenti/:id, /altro/impostazioni
/nuovo/spesa|saldo|abbonamento|gruppo  (foglio dal basso su qualunque schermata, con URL proprio)
/login
```

## Fase 2 — Dominio e test

Funzioni pure in `src/domain/` (`dates.ts`, `cash.ts`, `buys.ts`, `recurrence.ts`, `bank.ts`, `bankImport.ts`, `categories.ts`, `subscriptions.ts`, `format.ts`) con test Vitest.
I test di confronto ("golden") eseguono **le funzioni originali copiate tali e quali** in `src/domain/__legacy__/` sugli stessi dati di esempio e confrontano i risultati con le nuove; le differenze volute (salvadanaio su `new_category`, abbonamenti rinnovati, ecc.) sono test espliciti e documentati. Le date sono fissate con `vi.setSystemTime` e `TZ=Europe/Rome`.

## Fase 3 — Design system e shell

Token CSS in Tailwind v4 (`@theme`), tema sistema/chiaro/scuro, colore principale dalla palette attuale. Componenti in `src/ui/`: `Card`, `ListRow` (con swipe), `Amount` (formattazione `it-IT` + `aria-label` leggibile), `BottomSheet` (`<dialog>`, trascinamento per chiudere), `TabBar`, `Skeleton`, `EmptyState`, `ErrorState`, `OfflineBanner`, `Toast` (con azione "Annulla"), `SegmentedControl`, `Chip`. Safe area, `viewport-fit=cover`, `prefers-reduced-motion`. Font di sistema. Eliminazione dei 17 file `.css`.

## Fase 4 — Schermate

Oggi (saldo, questo mese, spese dell'anno + mini grafico, in scadenza, ultimi movimenti), Spese, Conto, Risparmi/storico, Abbonamenti, Impostazioni (tema, colore, notifiche, regole di categoria salvate in `NewMyDB/{uid}/Settings/categoryRules`, un nuovo documento in una nuova collezione), Login. Ogni vista gestisce i 4 stati: caricamento, vuoto, errore e offline.

> Nota: le regole di categoria richiedono una nuova collezione `Settings` sotto `NewMyDB/{uid}`. È un'**aggiunta** (le collezioni esistenti restano invariate) e le rules la coprono con lo stesso vincolo sull'uid.

## Fase 5 — Inserimento e import

Form a foglio dal basso (importo in primo piano, `inputmode="decimal"`, data di default oggi, chip con icone), salvataggio ottimistico con toast, eliminazione annullabile (rimozione ritardata di circa 5 s, con ripristino), swipe sulle righe. Import XLSX in un Web Worker: anteprima (righe lette/valide/errori/duplicati, totale entrate/uscite), scrittura in `writeBatch` da massimo 500 operazioni con barra di avanzamento, CSV degli errori. Ricorrenze in batch.

## Fase 6 — PWA e rifinitura

`vite-plugin-pwa` (strategia `injectManifest`: **un solo service worker** che include Workbox e Firebase Messaging, così non ci sono due SW in conflitto sullo scope `/`), manifest, icone, `apple-touch-icon`, splash iOS, aggiornamento del SW con avviso "Nuova versione disponibile". Config del SW iniettata al build dalle `VITE_FIREBASE_*`. Bundle splitting (Recharts, xlsx, firebase/messaging caricati lazy).

## Fase 7 — Verifica finale

`npm run build` / `lint` / `test`; test delle rules con `@firebase/rules-unit-testing` sull'emulatore; script `scripts/seed-emulator.ts` con dati di esempio; confronto dei totali con l'app attuale; screenshot con Playwright a 375/390/430 per controllare lo scroll orizzontale e le sovrapposizioni con tab bar e notch; Lighthouse mobile; checklist per i test manuali su iPhone.

## Rischi

- Il **cambio di origine** (domanda 1) azzera installazione, permesso notifiche e token sull'iPhone.
- `persistentLocalCache` con più schede aperte: uso `persistentMultipleTabManager`.
- La libreria `xlsx` 0.18.5 da npm ha vulnerabilità note (prototype pollution/ReDoS) ed è ferma: propongo di passare alla build ufficiale SheetJS dal loro CDN (`https://cdn.sheetjs.com/xlsx-0.20.x/...`) come dipendenza npm via tarball.
