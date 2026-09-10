# DailyHub

Dashboard personale a pagina unica: impegni di oggi, mail importanti e diario, in un solo posto.
Progetto personale. PRD in [`docs/PRD-dashboard-personale.md`](docs/PRD-dashboard-personale.md).

## Stack

- **Next.js 16** (App Router) · React 19 · TypeScript
- **Tailwind CSS v4** + **shadcn/ui** (stile `base-nova`, Base UI)
- **Auth.js v5** (NextAuth) — login Google, sessione JWT
- Google Calendar API + Gmail API (sola lettura) · Libero Mail via IMAP
- Deploy: Vercel

## Sviluppo locale

```bash
npm install
cp .env.example .env.local     # poi compila le variabili
npm run dev                    # http://localhost:3000
```

- Login Google: [`docs/SETUP-GOOGLE.md`](docs/SETUP-GOOGLE.md)
- Blocco Mail Libero: [`docs/SETUP-LIBERO.md`](docs/SETUP-LIBERO.md)

## Struttura

```
src/
  app/
    page.tsx                 # login ("Accedi con Google")
    dashboard/page.tsx       # area protetta
    api/auth/[...nextauth]/  # handler Auth.js
  auth.ts                    # config Auth.js (provider, scope, refresh token)
  components/ui/             # componenti shadcn
docs/                        # PRD + guide di setup
```

## Roadmap (dal PRD)

- **Fase 0** — setup + login Google  *(in corso)*
- **Fase 1** — blocco Impegni (Calendar, sola lettura)
- **Fase 2** — board componibile + blocco Diario (DB: Supabase + Prisma)
- **Fase 3** — blocco Mail (Gmail + Libero)
- **Fase 4** — rifinitura, deploy stabile, uso quotidiano
