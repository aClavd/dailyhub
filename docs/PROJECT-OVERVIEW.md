# DailyHub — descrizione del progetto (settembre 2026)

> Documento pensato per essere copiato altrove (strumenti di ricerca,
> altri assistenti) per raccogliere idee di miglioramento. Descrive lo
> stato REALE del prodotto oggi, non il PRD originale (`docs/PRD-dashboard-personale.md`,
> ormai superato: prevedeva 3 blocchi fissi, il progetto è stato
> deliberatamente rifatto come board componibile a widget nella prima
> settimana di sviluppo).

## Cos'è

DailyHub è una dashboard personale **per un solo utente** (Claudio,
sviluppatore e unico utilizzatore — non un prodotto multi-tenant, non
c'è onboarding/registrazione per altri). L'idea è una "scrivania
digitale": aprendola si deve capire subito cosa fare, cosa sta
succedendo, cosa è già successo nella giornata. Identità visiva
volutamente minimalista ed editoriale — niente grafici invadenti,
niente notifiche aggressive, niente colori decorativi senza motivo.

Gerarchia dichiarata dallo stesso Claudio: **cosa devo fare → cosa sta
succedendo → cosa è successo**.

## Stack tecnico

- **Next.js 16.3.4** (App Router, Turbopack) · **React 19.2** · TypeScript
- **Tailwind CSS v4** + **Base UI** (`@base-ui/react`) per i componenti
  di base (Dialog, Select) avvolti a mano in `src/components/ui/`
- **Auth.js v5** (beta) — login Google, sessione JWT, **nessun adapter
  Prisma** (`token.sub` impostato esplicitamente al sub numerico di
  Google nel callback `jwt`, altrimenti Auth.js genererebbe un id
  casuale a ogni login — bug reale risolto durante lo sviluppo)
- **Prisma 7.10** + `@prisma/adapter-pg` su **Supabase Postgres**
- **Google Calendar API** (lettura + scrittura, scope `calendar.events`)
  e **Gmail API** (sola lettura) via OAuth Google
- **Libero Mail via IMAP** (`imapflow`) — un solo account configurato
  via variabili d'ambiente, condiviso: NON è per-utente (irrilevante
  ora con un solo utente, ma da tenere a mente se mai diventasse
  multi-utente)
- **Spotify Web API** — OAuth a parte, playback reale (play/pausa/
  skip, traccia in riproduzione, barra di avanzamento), non solo un
  link
- Deploy previsto su **Vercel** — **non ancora in produzione**, girato
  finora solo in sviluppo locale

## Struttura della pagina (tre colonne)

**Rail sinistro** — comprimibile (64px↔240px, persistito per utente):
intestazione con logo e interruttore; selettore di layout salvati
(vedi sotto) con pallino-iniziale quando compresso; **Libreria**
(blocchi trascinabili sulla board); **Cronologia** (ultimi 7 giorni in
miniatura + icona per aprire la Cronologia estesa — mese/settimana,
ricerca testuale nel diario, dettaglio di un giorno).

**Colonna centrale** — testata (saluto che cambia con l'ora, data,
citazione motivazionale, Meteo a sinistra e Spotify a destra allineati
alla larghezza della board sotto), poi la **board**: griglia CSS a 6
colonne logiche, blocchi trascinabili/ridimensionabili dagli angoli o
dai bordi, layout persistito per utente.

**Pannello destro "Oggi"** — aggiunto di recente (Personal Attention
Center), comprimibile (40px↔288px, persistito), con: **Daily Brief**
(riepilogo di una riga), **Attenzione** (righe cliccabili per impegno
imminente/mail importante da gestire/promemoria diario, solo se
davvero presenti), **Azioni rapide** (5 pulsanti reali: nuova nota,
scrivi nel diario, Pomodoro, nuovo evento, cerca nella memoria),
**Focus** (sessioni Pomodoro di oggi + minuti derivati), **Oggi**
(abitudini completate/totali, una riga). Nessun dato inventato, nessun
secondo sistema di notifiche: riusa gli stessi segnali che già fanno
scattare i popup in basso a destra.

## I blocchi (widget) della board

Tutti trascinabili dalla Libreria, ridimensionabili, rimovibili. Tipi
oggi disponibili:

1. **Impegni di oggi** — eventi di Google Calendar di oggi, aggiornati
   ogni 90s, si può aggiungere un impegno da lì. Una "spina" colorata
   sul bordo sinistro del blocco segnala urgenza (rosso <20 min,
   ocra <60 min al prossimo impegno).
2. **Mail importanti** — Gmail + Libero unite in un'unica lista (tab
   Tutte/Gmail/Libero), aggiornata ogni 90s. **Filtri mail**
   configurabili dall'utente (sottostringa su mittente+oggetto) fanno
   comparire un popup quando arriva qualcosa che combacia.
3. **Diario di oggi** — un record al giorno: testo libero, abitudini
   personalizzate (aggiungi/togli), umore (5 livelli), peso e sonno
   (numerici, **facoltativi** — si può lasciare vuoto), sessioni
   Pomodoro completate (automatico). Frecce ‹/› per scrivere/rileggere
   un giorno passato (mai il futuro) — salva da solo 600ms dopo l'ultima
   modifica, con un piccolo "salvataggio…/salvato" per conferma.
4. **Studio · Pomodoro** — timer 25/5/15 min stile Pomofocus, suoni
   sintetizzati (niente file audio), conteggio sessioni persistito per
   giorno.
5. **Calendario** — vista mese di Google Calendar dentro un blocco
   della board (separato da "Impegni", che mostra solo oggi). Cliccare
   un giorno mostra sia gli impegni Google sia (aggiunto di recente)
   diario/abitudini di quel giorno — due pallini indipendenti per
   cella, uno per gli impegni, uno per l'umore del diario.
6. **Note rapide** — testo libero continuo (non per-giorno), salvato
   sul database.
7. **Lettura** — titolo libro + pagina attuale/totale, barra di
   avanzamento, salvato sul database.

Rimossi deliberatamente (superflui secondo Claudio): **Obiettivi della
settimana**, **Acqua**.

## Cronologia

Due livelli: una miniatura sempre visibile nel rail (7 giorni, pallino
umore + riepilogo breve) e una **Cronologia estesa** (dialog aperto
dall'icona nel rail o da "Cerca nella memoria" nel pannello destro) con
vista mese o settimana, ricerca testuale nel diario, dettaglio di un
giorno (umore, testo, abitudini, peso/sonno/pomodori). **Legge solo il
diario**, deliberatamente non gli impegni Google Calendar (quelli si
leggono sempre "live" da Google, non hanno bisogno di una loro
cronologia — Google la tiene già).

## Layout salvati

Si possono avere più disposizioni di blocchi con nome (es. "Predefinito"),
una attiva alla volta, cambiabile da un selettore nel rail; crea/
rinomina/elimina da un dialog a parte. Il meccanismo esiste ed è
completo, ma **Claudio non ha ancora popolato layout mirati** per
contesti diversi (es. "Studio", "Lavoro", "Serata" — nome mai deciso,
solo accennato).

## Notifiche

Un solo sistema di popup (in basso a destra, si autodistruggono dopo
20s), alimentato da tre fonti reali: impegno imminente, mail che
combacia un filtro, promemoria per scrivere il diario (dopo le 20:00
se non ancora scritto). **Nessuno stato persistito** di letto/
ignorato/completato — sono avvisi effimeri, non un registro.

## Tema

Chiaro/scuro completo su tutta l'app, palette ocra/ardesia, tipografia
Fraunces (titoli) / Instrument Sans (corpo) / IBM Plex Mono (etichette,
numeri, date).

## Modello dati (Postgres via Prisma) — le tabelle principali

- `JournalEntry` — una riga per utente+giorno: umore, obiettivo, testo,
  `wins` (3 stringhe — **presente nello schema ma mai letto/scritto
  dall'interfaccia oggi**, residuo di un progetto precedente), abitudini
  (JSON nome→fatta/non fatta), peso, sonno, sessioni Pomodoro.
- `BoardLayout` — una riga per utente: comprimi/espandi rail e
  pannello destro, lista nomi abitudini (condivisa tra tutti i layout).
- `SavedLayout` — un layout salvato con nome, posizione/dimensione di
  ogni blocco, quale sia attivo.
- `MailFilter` — regole utente per i popup mail importanti.
- `NoteWidget`, `LetturaWidget` — contenuto dei blocchi Note/Lettura.
- Connessione Spotify (token OAuth a parte).

## Cosa NON c'è ancora (deliberatamente, non dimenticato)

- **Grafici/statistiche** su abitudini, umore, sonno, peso — giorno/
  settimana/mese/anno, ispirati al quaderno cartaceo di Claudio. Idea
  presente fin dall'inizio del progetto, rimandata finché non c'era uno
  storico vero su database (ora c'è). **Prossimo candidato naturale**,
  non ancora iniziato — nessuna libreria di charting scelta, l'idea è
  SVG fatti a mano coerenti col design system piuttosto che una
  libreria pesante.
- **Countdown live del Pomodoro** nel pannello destro — il timer vive
  solo dentro il blocco Pomodoro (stato locale al componente), non
  visibile altrove.
- **Stato persistito delle notifiche** (letto/completato/ignorato) —
  oggi sono solo popup effimeri.
- **Vista mobile/tablet dedicata** — rail e pannello destro spariscono
  del tutto sotto una certa larghezza di finestra, nessun drawer o
  menu alternativo pensato per schermi piccoli.
- **Ricerca semantica** — la ricerca nella Cronologia è solo
  sottostringa sul testo del diario.
- **Layout multipli mirati** popolati (il meccanismo c'è, i layout
  pensati apposta per contesti diversi no).
- **Assistente AI integrato** — discusso, deliberatamente rimandato.
- **Concetto di "attività/task"** — non esiste nell'app, solo diario/
  abitudini/impegni di calendario.
- **Deploy in produzione** — non ancora fatto.

## Cosa cercare, se si fa ricerca per migliorare il prodotto

Aree dove nuove idee sarebbero benvenute, per dare un contesto a chi
farà ricerca:

- Come rendere i futuri **grafici su abitudini/umore/sonno/peso**
  davvero utili senza tradire l'identità minimalista (niente dashboard
  aziendale piena di numeri).
- Idee per la **vista mobile/tablet** che non snaturino il modello a 3
  colonne desktop.
- Modi per rendere più "vivo" il pannello destro (Daily Brief/
  Attention Center) restando fedeli al vincolo "niente dati finti,
  niente secondo sistema di notifiche" — è un'area nuova, costruita da
  poco, aperta a idee.
- Uso concreto dei **layout multipli** (quali contesti ha senso avere,
  come passare dall'uno all'altro in modo naturale).
- Qualunque idea deve rispettare i vincoli già dati più volte da
  Claudio durante lo sviluppo: **niente dati inventati**, **riusare
  meccanismi esistenti invece di costruirne di paralleli**, **procedere
  per fasi piccole con la sua approvazione**, **mantenere l'identità
  visiva calma ed editoriale**.
