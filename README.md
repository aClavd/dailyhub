# DailyHub

Dashboard personale a pagina unica: una board componibile a widget
(impegni, mail, diario, Pomodoro, calendario, note, lettura), una
sidebar sinistra con libreria + cronologia (memoria personale), una
sidebar destra come "Personal Attention Center" — cosa richiede
attenzione adesso, senza dover aprire altro.

Progetto personale, un solo utente. Descrizione completa e aggiornata
del prodotto in [`docs/PROJECT-OVERVIEW.md`](docs/PROJECT-OVERVIEW.md)
(filosofia, ogni blocco/meccanismo presente, modello dati, cosa manca
ancora deliberatamente). Il PRD originale in
[`docs/PRD-dashboard-personale.md`](docs/PRD-dashboard-personale.md)
descrive la versione con 3 blocchi fissi: superato dal pivot alla board
componibile deciso nella prima settimana di sviluppo, tenuto solo come
riferimento storico.

## Stack

- **Next.js 16** (App Router, Turbopack) · React 19 · TypeScript
- **Tailwind CSS v4** · **Base UI** (`@base-ui/react`) per i componenti
  di base (Dialog, Select), avvolti a mano in `src/components/ui/`
- **Auth.js v5** (beta) — login Google, sessione JWT (nessun adapter
  Prisma: l'id utente è il `sub` numerico di Google, impostato
  esplicitamente in `src/auth.ts`)
- **Prisma 7** + `@prisma/adapter-pg` su **Supabase Postgres**
- Google Calendar API (lettura + scrittura) · Gmail API (sola lettura)
  · Libero Mail via IMAP (`imapflow`, account unico via env)
- Spotify Web API — connessione OAuth a parte, controlli di
  riproduzione reali
- Deploy: Vercel (non ancora in produzione — sviluppo locale finora)

## Sviluppo locale

```bash
npm install
cp .env.example .env.local     # poi compila le variabili
npm run dev                    # http://localhost:3000
```

Dopo una migrazione dello schema Prisma **mentre `next dev` è già in
esecuzione**, riavvialo (Turbopack può servire un client Prisma
vecchio dalla cache anche dopo `prisma generate`):

```bash
# Ctrl+C per fermare il dev server, poi:
rm -rf .next
npm run dev
```

- Login Google (Calendar + Gmail): [`docs/SETUP-GOOGLE.md`](docs/SETUP-GOOGLE.md)
- Blocco Mail Libero (IMAP): [`docs/SETUP-LIBERO.md`](docs/SETUP-LIBERO.md)
- Spotify: [`docs/SETUP-SPOTIFY.md`](docs/SETUP-SPOTIFY.md)

## Struttura

```
src/
  app/
    page.tsx                 # login ("Accedi con Google")
    dashboard/page.tsx       # area protetta — legge board/diario/
                              # cronologia/impegni/mail in parallelo,
                              # compone Rail + Board + RightPanel
    api/                      # handler Auth.js, OAuth Spotify
  auth.ts                     # config Auth.js (provider, scope, JWT)
  components/
    board/                    # board a griglia, drag&drop/resize,
                              # rail sinistro (Libreria + Cronologia)
    dashboard/                # testata, pannello destro (Attention
                              # Center), Cronologia estesa, dialog
    widgets/                  # contenuto dei singoli blocchi (Diario,
                              # Pomodoro, Calendario, Note, Lettura...)
    ui/                       # wrapper sottili sulle primitive Base UI
  lib/
    actions/                  # Server Action per Client Component
    queries/                  # letture solo per Server Component
    google/                   # Calendar/Gmail
  types/
docs/                         # descrizione prodotto, PRD storico, setup
prisma/                       # schema.prisma + migrazioni
```

## Roadmap

Le fasi numerate del PRD originale sono superate dal pivot alla board
componibile — lo stato attuale (cosa c'è, cosa manca ancora
deliberatamente, dove servirebbero più idee) è in
[`docs/PROJECT-OVERVIEW.md`](docs/PROJECT-OVERVIEW.md).
