# PRD — Dashboard Personale
**Working title:** DailyHub (nome provvisorio, da cambiare)
**Autore:** Claudio Ammirata
**Data:** Settembre 2026
**Versione:** 0.2

> **Changelog 0.1 → 0.2 (10 set 2026)**
> - La dashboard non è più 3 blocchi fissi ma una **board componibile**: 2 blocchi sempre attivi (Impegni, Mail) + una **libreria di blocchi** che l'utente trascina sulla board quando servono (Studio/Pomodoro, Diario, Abitudini, ecc.). Vedi §4.
> - Barra laterale (libreria) **comprimibile a icone**.
> - Testata **centrata**: saluto in base all'ora (buondì / buon pomeriggio / buonasera), frase del giorno, banner "Oggi conta questo".
> - Il Diario diventa **uno dei blocchi di libreria**, non un blocco a sé. Il layout della board è **persistente per-utente**.
> - Blocco Mail **multi-provider da subito**: Gmail (API) + **Libero** (IMAP), perché l'indirizzo principale è `@libero.it`.
> - Fase 0 completata.

---

## 1. Visione del prodotto

Una dashboard web personale, unica pagina di ingresso alla propria giornata. Due blocchi sono sempre lì — **gli impegni del giorno** e **le email importanti** — e attorno a questi l'utente **compone la propria board** trascinando dalla libreria i blocchi che gli servono in quel periodo (diario, timer di studio, abitudini, note…).

L'obiettivo è ridurre il context-switching tra Google Calendar, Gmail/Libero e app separate per journaling/focus/abitudini, avendo un unico posto dove partire ogni mattina e chiudere ogni sera.

**Non è:** un sostituto di Gmail/Calendar (restano la fonte dati), né un task manager complesso, né un CRM. È un pannello di sintesi componibile + un diario.

---

## 2. Problema da risolvere

- Ogni mattina si aprono 3-4 app diverse per capire "cosa devo fare oggi".
- Le mail importanti si perdono nel rumore della inbox.
- Il journaling viene abbandonato perché richiede di aprire un'app a parte, separata dal resto del flusso.

**Ipotesi:** avere tutto in un unico posto, con meno frizione, aumenta la costanza nell'uso quotidiano (soprattutto del journaling).

---

## 3. Utente target

Tu, in prima battuta (progetto personale). Design e feature vanno tarati sul tuo workflow reale, non su un pubblico generico. Man mano che lo usi, il PRD va aggiornato in base a cosa funziona e cosa no.

---

## 4. Struttura della dashboard

Una pagina sola, responsive. Dall'alto:

### Testata (centrata)
- **Saluto** in base all'ora di apertura: *buondì* (mattina) / *buon pomeriggio* / *buonasera*, + data.
- **Frase del giorno** (breve, motivazionale) in card in alto a destra.
- Banner **"Oggi conta questo"**: una riga editabile con la cosa importante della giornata.

### Barra laterale — Libreria dei blocchi
- A sinistra, **comprimibile a sole icone** (stato ricordato).
- Sezione *Sempre attivi*: Impegni, Mail (non rimovibili).
- Sezione *Libreria*: blocchi da **trascinare** (o toccare, su mobile) sulla board. Set iniziale: **Studio/Pomodoro, Diario, Abitudini, Note rapide, Obiettivi della settimana, Lettura, Acqua, Meteo** — da rivedere con l'uso reale (candidati: spese, allenamento, link rapidi, streak).

### Board
- Griglia di blocchi. I due fissi + quelli aggiunti dalla libreria. La × rimuove un blocco (torna disponibile in libreria).
- **Layout persistente per-utente** (quali blocchi, in che ordine).
- Post-MVP: riordino drag-and-drop, ridimensionamento 1/2 colonne.

### Blocco — Impegni di oggi *(fisso)*
- Eventi della giornata corrente (orario, titolo, luogo/link Meet se presente).
- Evidenza del prossimo impegno imminente; eventi passati attenuati.
- Stati: nessun impegno / errore (token scaduto) / non connesso.
- Vista settimanale: nice-to-have, non MVP.

### Blocco — Mail importanti *(fisso, multi-provider)*
- Elenco mail "importanti" da **Gmail** (API) e **Libero** (IMAP), con targhetta del provider.
- "Importante" = speciali/starred, label dedicata, o mittenti chiave — da raffinare con l'uso.
- Azioni rapide (segna letta, archivia, apri): **non MVP**, sola lettura all'inizio.
- Rispondere dalla dashboard: fuori scope per ora.

### Blocco — Diario *(dalla libreria)*
- Scrittura libera per il giorno corrente + storico consultabile.
- Campi strutturati: umore, obiettivo del giorno, "3 cose andate bene" — tenere quelli che usi davvero.

### Blocco — Studio / Pomodoro *(dalla libreria)*
- Timer 25/5, conteggio sessioni del giorno.

### Altri blocchi di libreria
- Abitudini (spunta giornaliera), Note rapide, Obiettivi della settimana, Lettura, Acqua, Meteo. Tenere/togliere in base all'uso.

---

## 5. Cosa è MVP e cosa no

| Feature | MVP | Dopo |
|---|---|---|
| Login con Google (OAuth) | ✅ | |
| Vista impegni di oggi (sola lettura) | ✅ | |
| Board componibile: aggiungi/rimuovi blocchi, layout persistente | ✅ | |
| Rail comprimibile a icone | ✅ | |
| Blocco Diario con salvataggio persistente | ✅ | |
| Mail importanti da Gmail (sola lettura, filtro base) | ✅ | |
| Mail importanti da Libero via IMAP | ✅ | |
| Blocco Studio/Pomodoro | ✅ | |
| Altri blocchi di libreria (abitudini, note, obiettivi, lettura, acqua, meteo) | ~ | in base all'uso |
| Riordino drag-and-drop / resize blocchi | | ✅ |
| Azioni su mail (archivia/segna letta) | | ✅ |
| Vista calendario settimanale | | ✅ |
| Statistiche/streak sul journaling | | ✅ |
| Notifiche/reminder | | ✅ |
| App mobile / PWA | | ✅ |

**Regola guida:** l'MVP deve rispondere a "cosa ho oggi + cosa mi scrivo oggi", in sola lettura per calendario/mail. La board è componibile ma i blocchi di libreria si aggiungono **uno alla volta, solo se li usi davvero**. Le azioni (rispondere, archiviare, modificare eventi) arrivano dopo, quando la base è stabile.

---

## 6. Stack tecnico (scelto e in uso dalla Fase 0)

- **Framework:** Next.js 16 (App Router, Turbopack) + React 19 + TypeScript.
- **Autenticazione:** Auth.js v5 (NextAuth) con provider Google — sessione **JWT** (nessun DB per il login), refresh dell'access token nel callback `jwt`.
- **UI:** Tailwind CSS v4 + shadcn/ui (stile `base-nova`, primitive Base UI). Font: Fraunces (titoli), Instrument Sans (UI), IBM Plex Mono (orari). Accento ocra su neutri ardesia, tema chiaro/scuro.
- **API esterne:**
  - Google Calendar API (lettura eventi)
  - Gmail API (lettura mail)
  - **Libero Mail via IMAP** (`imapmail.libero.it:993`, `imapflow`) — niente OAuth, credenziali cifrate lato server. Vedi `docs/SETUP-LIBERO.md`.
- **Database:** Supabase (Postgres, free tier) + **Prisma** — dalla **Fase 2** (voci di diario + layout della board + preferenze/filtri).
- **Hosting:** Vercel — deploy da GitHub, free tier.

---

## 7. Requisiti tecnici chiave (OAuth Google)

1. Creare un progetto su Google Cloud Console.
2. Abilitare **Google Calendar API** e **Gmail API**.
3. Configurare schermata di consenso OAuth (in modalità "Testing" va bene per uso personale, basta aggiungere la tua email come test user).
4. Generare **Client ID** e **Client Secret**.
5. Definire gli **scope** minimi necessari:
   - `calendar.readonly` (MVP)
   - `gmail.readonly` (MVP)
   - eventuali scope di scrittura in fase successiva.
6. Salvare le credenziali in variabili d'ambiente (`.env.local`), mai nel codice.

---

## 8. Roadmap dettagliata

### Fase 0 — Setup ✅ FATTA (10 set 2026)
- Repo Next.js 16 + Tailwind v4 + shadcn + TypeScript.
- Google Cloud Console: progetto, Calendar + Gmail API, consent screen in Testing, credenziali OAuth.
- Auth.js con provider Google (sessione JWT), login verificato end-to-end.
- Guide `docs/SETUP-GOOGLE.md`, `docs/SETUP-LIBERO.md`, `.env.example`.
- Deploy Vercel: rimandato (si fa in Fase 4, o prima se comodo).

**Obiettivo raggiunto:** login con Google, si atterra su `/dashboard` col proprio nome.

---

### Fase 1 — Blocco Impegni + testata (MVP)
- Chiamata a Google Calendar API per gli eventi del giorno corrente.
- Design system completo portato in React (palette ocra/ardesia, Fraunces, tema chiaro/scuro).
- Testata: saluto orario centrato + data + frase del giorno + banner "Oggi conta questo".
- Blocco Impegni: lista eventi (orario, titolo, luogo/link Meet), evidenza del prossimo, eventi passati attenuati.
- Stati: nessun impegno / errore (token scaduto) / non connesso.

**Obiettivo di fine fase:** apri la dashboard e vedi i tuoi impegni reali di oggi, con l'aspetto giusto.

---

### Fase 2 — Board componibile + Blocco Diario (MVP)
- DB: Supabase + Prisma. Schema: voci di diario, layout della board per-utente, preferenze.
- Barra laterale con libreria di blocchi, comprimibile a icone.
- Board: aggiungi/rimuovi blocchi dalla libreria, layout persistente sul DB.
- Blocco Diario: scrittura + salvataggio del giorno, storico, campi strutturati (umore, obiettivo, "3 cose").

**Obiettivo di fine fase:** componi la tua board, scrivi il diario oggi e ritrovi quello di ieri.

---

### Fase 3 — Blocco Mail Importanti, multi-provider (MVP)
- **Gmail:** Gmail API, filtro iniziale (label "Important" o starred).
- **Libero:** IMAP (`imapflow`), messaggi `\Flagged` e/o mittenti chiave; credenziali cifrate lato server.
- Interfaccia comune ai due provider; UI con targhetta provider, mittente, oggetto, snippet, link per aprire.
- Definire con l'uso reale cosa è "importante".

**Obiettivo di fine fase:** dashboard MVP completa, sola lettura su Impegni e Mail (Gmail + Libero).

---

### Fase 4 — Rifinitura e uso quotidiano
- Sistemare layout/responsive, stati di caricamento, gestione errori robusta.
- Deploy stabile su dominio (anche solo `tuoprogetto.vercel.app` va benissimo per uso personale).
- Uso quotidiano reale per 2-3 settimane, raccolta di frizioni/mancanze.

**Obiettivo di fine fase:** la usi davvero ogni giorno, senza dover tornare alle singole app.

---

### Fase 5 — Iterazioni successive (in base all'uso reale)
Da questa fase in poi la priorità la detta l'uso reale, non il piano iniziale. Candidati possibili:
- Azioni rapide su mail (archivia, segna letta).
- Vista settimanale del calendario.
- Statistiche/streak sul journaling.
- Quick-add di eventi/note.
- PWA per uso da mobile.

---

## 9. Rischi e cose a cui stare attenti

- **Scope creep:** la board componibile rende facile aggiungere blocchi all'infinito. Regola: prima Impegni + Mail + Diario solidi, poi un blocco di libreria alla volta **solo se lo usi davvero**. La libreria è una tentazione, non una checklist.
- **Rate limit API Google:** per uso personale non è un problema, ma va gestita la cache (non richiamare le API a ogni render).
- **Sicurezza token/credenziali:** token OAuth Google e credenziali IMAP Libero solo lato server, mai esposti al client. Libero: password applicativa dedicata, in env var cifrate.
- **Google Cloud Console in "Testing" mode:** i refresh token possono scadere dopo ~7 giorni di inattività finché l'app non è verificata — per uso personale non serve la verifica, il codice prova comunque a rinnovare l'access token a ogni richiesta.
- **Persistenza layout board:** finché non c'è il DB (Fase 2) il layout vive solo in `localStorage`; con più dispositivi va spostato sul DB.

---

## 10. Metriche di successo (informali, uso personale)

- Apri la dashboard invece delle singole app almeno 5 giorni su 7.
- Scrivi nel journal con più costanza rispetto a prima (baseline: quanto scrivevi oggi, senza dashboard).
- Non perdi più mail importanti che prima si perdevano nel rumore.

---

## 11. Prossimi passi immediati

1. ~~Fase 0: setup Next.js + Google Cloud + NextAuth~~ ✅ fatto.
2. **Fase 1:** blocco Impegni (Google Calendar) + testata + design system in React.
3. Fase 2: DB Supabase + Prisma, board componibile, blocco Diario.
4. Procedere fase per fase, validando ogni "obiettivo di fine fase" prima di passare oltre.
5. Deploy Vercel + variabili d'ambiente (`AUTH_*`, `LIBERO_*`) quando la base è stabile.
