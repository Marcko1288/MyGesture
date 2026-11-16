# Verifica finale (Fase 7)

Branch `redesign`, 16/11/2026. Tutte le verifiche automatiche sono ripetibili con i comandi indicati.

## Criteri di accettazione

| Criterio | Esito | Come è verificato |
|---|---|---|
| `npm run build`, `npm run lint`, `npm test` senza errori | ✅ | Build (con typecheck dell'app e del service worker), oxlint 0 avvisi, 837 test Vitest |
| Stessi totali dell'app attuale (saldo, spese dell'anno, entrate/uscite del mese, abbonamenti in scadenza) | ✅ con le differenze volute | `src/domain/__tests__/golden.test.ts`: confronto con il codice storico su dati generati (5 seed × 7 date "oggi", 716 casi). `tests/e2e/01-totals.spec.ts`: i numeri mostrati dall'app = quelli calcolati dal codice storico sui dati di esempio. Differenze volute in `changes.test.ts` e in `docs/PIANO.md` |
| 390×844 (e 375, 430): nessuno scroll orizzontale, niente coperto da tab bar o notch | ✅ | `tests/e2e/03-layout-a11y.spec.ts` su 19 schermate e fogli per ciascuna larghezza; safe area con `env(safe-area-inset-*)` |
| Ogni schermata ha un URL; ricaricando si resta lì; il tasto indietro funziona | ✅ | `tests/e2e/02-navigation.spec.ts`, `04-forms.spec.ts` (i fogli si chiudono con "indietro") |
| Importare due volte lo stesso XLSX non crea duplicati | ✅ | `tests/e2e/05-import.spec.ts` (7 righe, 1 già presente, 2 errori → 4 importate; re-import → 0) |
| Lighthouse mobile: PWA installabile, Accessibility ≥ 95, Performance ≥ 85 | ✅ | Installabilità: nessun errore da Chrome (`Page.getInstallabilityErrors`, test `06-pwa.spec.ts`). Lighthouse 13.6 mobile (vedi sotto): Accessibility 100, Performance 95–99, Best Practices 100 |
| Le rules impediscono a un utente di leggere i dati di un altro | ✅ | `npm run test:rules` (emulatore Firestore, 6 test) |
| "Andamento Spese" calcola il salvadanaio su `new_category` | ✅ | `changes.test.ts` + card "Questo mese" e categoria Salvadanaio in `01-totals.spec.ts` |
| Dall'iPhone la notifica di prova arriva; il token si riregistra da solo | ⏳ da provare sul dispositivo | Richiede il deploy (functions + hosting) e l'iPhone: vedi checklist sotto |

Altre verifiche: accessibilità axe (WCAG 2 A/AA + best practice) senza violazioni su 19 schermate e fogli, in chiaro e in scuro; target touch ≥ 44 px; app utilizzabile offline (service worker + cache Firestore) senza stati vuoti falsi; aggiornamento della PWA con "Aggiorna".

### Lighthouse (mobile, Lighthouse 13.6, build di produzione sugli emulatori)

| Pagina | Performance | Accessibility | Best Practices | LCP | TBT | CLS |
|---|---|---|---|---|---|---|
| `/login` (prima visita) | 98 | 100 | 100 | 0,8 s | 150 ms | 0 |
| `/` Oggi | 95 | 100 | 100 | 0,7 s | 260 ms | 0,04 |
| `/spese` | 96 | 100 | 100 | 0,7 s | 240 ms | 0 |
| `/conto` (3 esecuzioni) | 96–99 | 100 | 100 | 0,7 s | 130–230 ms | 0 |
| `/altro/abbonamenti` | 99 | 100 | 100 | 0,7 s | 130 ms | 0 |

Le pagine dopo il login sono misurate con lo storage conservato (serve la sessione), quindi come visita ripetuta con il service worker attivo. La categoria "PWA" non esiste più in Lighthouse 12+: l'installabilità è verificata con Chrome stesso (nessun errore).

Bundle iniziale ≈ 310 kB compressi (app 27 kB, React 87 kB, Firebase core 184 kB, CSS 6 kB). Recharts (109 kB), xlsx (141 kB), Firebase Messaging (17 kB) e Functions (3 kB) si caricano solo quando servono.

## Comandi

```bash
npm run build && npm run lint && npm test
npm run test:rules          # rules sull'emulatore Firestore
npm run test:e2e            # 24 test Playwright: emulatori + dati di esempio + build di produzione
```

Lighthouse (opzionale, sulla build servita da `npx vite preview --mode emulator`):

```bash
npx lighthouse http://127.0.0.1:4173/login --form-factor=mobile --only-categories=performance,accessibility,best-practices --view
```

## Checklist sull'iPhone (dopo il deploy)

Passaggio da Netlify a Firebase Hosting: l'indirizzo cambia, quindi l'app va reinstallata.

1. Deploy (vedi README): rules e indici, functions (Node 22), hosting. Nel build di produzione servono le `VITE_FIREBASE_*` e `VITE_FIREBASE_VAPID_KEY`.
2. Su iPhone: rimuovi la vecchia icona di My Gesture (Netlify) dalla Home.
3. Apri `https://mygestion-446b9.web.app` in Safari → Condividi → **Aggiungi alla schermata Home**. Controlla che l'icona sia quella giusta (non nera) e che all'avvio compaia la schermata di caricamento.
4. Apri l'app **dall'icona**, accedi, vai in Altro › Impostazioni › Notifiche → **Attiva notifiche** → consenti.
5. Verifica: Permesso "Concesso", Questo dispositivo "Registrato", data di aggiornamento di oggi.
6. **Invia notifica di prova**: deve arrivare anche con l'app chiusa; toccandola si apre l'app.
7. Riregistrazione automatica: da console Firestore elimina il documento in `NewMyDB/{uid}/PushToken`, chiudi l'app dal multitasking, riaprila → il documento ricompare (Impostazioni mostra di nuovo "Registrato").
8. Notifiche di scadenza: il giorno dopo alle 9:00 controlla i log con `firebase functions:log --only sendSubscriptionExpiryNotifications`.
9. Prova rapida dell'app: aggiungi una spesa dal ＋, swipe su una riga, gesto indietro dal bordo, modalità aereo (l'app si apre con gli ultimi dati e il banner offline), tema scuro di sistema.

## Limiti noti

- Il salvataggio è ottimistico: se si chiude l'app nell'istante stesso in cui si tocca "Salva" (prima che Firestore scriva la modifica nella cache del dispositivo, pochi millisecondi), la modifica può andare persa.
- Al primo avvio offline senza dati già scaricati, le schermate restano in caricamento (con il banner offline) finché non torna la rete.
- Le notifiche push non sono verificabili nell'ambiente di sviluppo (servono il deploy e un dispositivo reale).
