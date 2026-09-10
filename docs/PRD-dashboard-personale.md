# PRD — Dashboard Personale
**Working title:** DailyHub (nome provvisorio, da cambiare)
**Autore:** [tuo nome]
**Data:** Settembre 2026
**Versione:** 0.1

---

## 1. Visione del prodotto

Una dashboard web personale, unica pagina di ingresso alla propria giornata, che unisce in un'unica interfaccia:
- gli impegni del giorno (calendario),
- le email importanti da gestire,
- un daily tracker per il journaling.

L'obiettivo è ridurre il context-switching tra Google Calendar, Gmail e un'app/quaderno di journaling separati, avendo un unico posto dove partire ogni mattina e chiudere ogni sera.

**Non è:** un sostituto di Gmail/Calendar (restano la fonte dati), né un task manager complesso, né un CRM. È un pannello di sintesi + un diario.

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

## 4. Struttura della dashboard (i "blocchi")

Layout a blocchi/card su un'unica pagina, responsive.

### Blocco 1 — Impegni di oggi
- Vista rapida degli eventi della giornata corrente (orario, titolo, luogo/link se presente).
- Evidenza del prossimo impegno imminente.
- Eventuale vista settimanale secondaria (nice-to-have, non MVP).

### Blocco 2 — Mail importanti
- Elenco delle mail filtrate come "importanti" (starred, da mittenti specifici, con label dedicata, o filtrate da regole tue).
- Azioni rapide: segna come letta, archivia, apri in Gmail.
- **Non MVP:** rispondere direttamente dalla dashboard (rischio complessità/sicurezza da valutare dopo).

### Blocco 3 — Daily tracker / Journaling
- Campo di scrittura libera per il giorno corrente.
- Storico consultabile (giorni precedenti).
- Eventuali campi strutturati aggiuntivi (umore, 3 cose fatte bene, obiettivo del giorno) — da decidere in base a cosa userai davvero.

### Blocco 4 (opzionale, fase successiva) — Quick add
- Aggiungere velocemente un evento o una nota senza uscire dalla dashboard.

---

## 5. Cosa è MVP e cosa no

| Feature | MVP | Dopo |
|---|---|---|
| Login con Google (OAuth) | ✅ | |
| Vista impegni di oggi (sola lettura) | ✅ | |
| Journaling con salvataggio persistente | ✅ | |
| Mail importanti (sola lettura, filtro base) | ✅ | |
| Azioni su mail (archivia/segna letta) | | ✅ |
| Vista calendario settimanale | | ✅ |
| Statistiche/streak sul journaling | | ✅ |
| Notifiche/reminder | | ✅ |
| Multi-account (più caselle mail/calendari) | | ✅ |
| App mobile / PWA | | ✅ |

**Regola guida:** l'MVP deve rispondere solo alla domanda "cosa ho oggi + cosa mi scrivo oggi", in sola lettura per calendario/mail. Le azioni (rispondere, archiviare, modificare eventi) arrivano dopo, quando la base è stabile.

---

## 6. Stack tecnico proposto

- **Frontend/Framework:** Next.js (React) — gestisce sia le pagine che le API routes lato server, comodo per l'OAuth.
- **Autenticazione:** NextAuth.js (Auth.js) con provider Google — gestisce OAuth, token, refresh in modo standard, senza reinventarlo da zero.
- **API esterne:**
  - Google Calendar API (lettura eventi)
  - Gmail API (lettura mail, filtro per label/importanza)
- **Database:** Supabase (Postgres gratuito) o Vercel Postgres — per salvare le voci di journal e le tue preferenze/filtri.
- **Hosting:** Vercel — deploy automatico da GitHub, free tier sufficiente per uso personale.
- **Styling:** Tailwind CSS — veloce per costruire un layout a blocchi pulito.

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

### Fase 0 — Setup (1-2 sessioni)
- Inizializzare repo Next.js + Tailwind.
- Configurare progetto su Vercel (deploy "hello world").
- Creare progetto su Google Cloud Console, abilitare le API, generare credenziali.
- Configurare NextAuth con provider Google, verificare login funzionante.

**Obiettivo di fine fase:** riesci a fare login con Google e vedere il tuo nome/email nella pagina.

---

### Fase 1 — Blocco Calendario (MVP)
- Chiamata a Google Calendar API per recuperare gli eventi del giorno corrente.
- Componente UI: lista eventi con orario, titolo, eventuale link Meet/luogo.
- Gestione stato vuoto ("nessun impegno oggi") e stato di errore (token scaduto, ecc.).

**Obiettivo di fine fase:** apri la dashboard e vedi i tuoi impegni reali di oggi.

---

### Fase 2 — Blocco Journaling (MVP)
- Schema database per le voci di journal (data, testo, eventuali campi strutturati).
- UI per scrivere/salvare la voce del giorno.
- Vista storico (lista o calendario delle voci passate).
- Autosave o salvataggio esplicito (da decidere in base a preferenza d'uso).

**Obiettivo di fine fase:** puoi scrivere oggi e ritrovare quello che hai scritto ieri.

---

### Fase 3 — Blocco Mail Importanti (MVP)
- Chiamata a Gmail API, filtro iniziale (es. label "Important" di Gmail, o starred).
- UI: lista mail con mittente, oggetto, snippet, link per aprire in Gmail.
- Definire insieme (nell'uso reale) cosa significa "importante" per te — probabilmente andrà raffinato dopo le prime settimane d'uso.

**Obiettivo di fine fase:** dashboard completa in versione MVP, sola lettura su tutti e 3 i blocchi.

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

- **Scope creep:** la tentazione di aggiungere blocchi (task manager, note, abitudini...) è alta. Tenere l'MVP stretto ai 3 blocchi core prima di espandere.
- **Rate limit API Google:** per uso personale non è un problema, ma va gestita la cache (non richiamare le API a ogni render).
- **Sicurezza token:** i token OAuth vanno gestiti lato server (API routes), mai esposti al client.
- **Google Cloud Console in "Testing" mode:** i token di test possono avere scadenze più corte finché l'app non è "verificata" — per uso personale non serve la verifica ufficiale, ma va capito il comportamento dei refresh token in questa modalità.

---

## 10. Metriche di successo (informali, uso personale)

- Apri la dashboard invece delle singole app almeno 5 giorni su 7.
- Scrivi nel journal con più costanza rispetto a prima (baseline: quanto scrivevi oggi, senza dashboard).
- Non perdi più mail importanti che prima si perdevano nel rumore.

---

## 11. Prossimi passi immediati

1. Aprire Claude Code nella cartella del progetto.
2. Fase 0: setup Next.js + Tailwind + deploy Vercel iniziale.
3. Fase 0: setup Google Cloud Console + NextAuth.
4. Procedere fase per fase come da roadmap, validando ogni "obiettivo di fine fase" prima di passare oltre.
