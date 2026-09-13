# Setup Google Cloud + OAuth — DailyHub

Obiettivo: ottenere `AUTH_GOOGLE_ID` e `AUTH_GOOGLE_SECRET` da mettere in `.env.local`, con gli scope in **sola lettura** per Calendar e Gmail.

Tempo: ~10 minuti. Serve un account Google (va bene quello personale).

---

## 1. Crea il progetto

1. Vai su <https://console.cloud.google.com/>.
2. In alto, selettore progetti → **Nuovo progetto**.
3. Nome: `DailyHub`. **Crea**.
4. Verifica che il selettore in alto mostri il progetto appena creato.

## 2. Abilita le API

1. Menu ☰ → **API e servizi** → **Libreria**.
2. Cerca **Google Calendar API** → **Abilita**.
3. Torna alla Libreria, cerca **Gmail API** → **Abilita**.

## 3. Google Auth Platform (ex "Schermata consenso OAuth")

Nella console nuova questa sezione si chiama **Google Auth Platform**: <https://console.cloud.google.com/auth/overview> (controlla che in alto sia selezionato il progetto `DailyHub`). Al primo ingresso ti chiede di configurarla — metti nome app `DailyHub` + la tua email, User type **External / Esterno**, e conferma.

Poi, nei tab a sinistra:

1. **Branding** — nome app `DailyHub`, email di supporto = la tua, email sviluppatore = la tua.
2. **Audience** — *User type* = **External**. In **Utenti di test / Test users** → **Add users** → la **tua email Google** (quella con cui farai login) → Salva. Lascia lo stato su **Testing** (per uso personale non serve la verifica).
3. **Data access / Scope** — **non aggiungere nulla**, li chiede il codice.

> **Se compare l'errore "Si è verificato un errore durante la creazione della configurazione OAuth / il brand è stato creato mentre apporti modifiche":** è un bug noto della console. La configurazione è stata creata lo stesso — **ricarica la pagina** (o riapri `console.cloud.google.com/auth/overview`), aspetta ~30s se serve, e continua dai tab qui sopra.

> In modalità *Testing* il refresh token può scadere dopo ~7 giorni di inattività: se ogni tanto ti richiede il login è normale. DailyHub prova comunque a rinnovarlo da solo.

## 4. Crea le credenziali OAuth (client)

Tab **Clients** dentro Google Auth Platform (oppure **API e servizi → Credenziali** nella console vecchia).

1. **Create client** / **Crea credenziali → ID client OAuth**.
2. Tipo di applicazione: **Applicazione web**.
3. Nome: `DailyHub web`.
4. **URI di reindirizzamento autorizzati** → aggiungi:
   - `http://localhost:3000/api/auth/callback/google`
   - `http://127.0.0.1:3000/api/auth/callback/google` — serve per collegare Spotify (docs/SETUP-SPOTIFY.md): Spotify non accetta `localhost` come redirect URI, solo l'IP di loopback esplicito, quindi quel passo va fatto aprendo la dashboard da `127.0.0.1` invece che da `localhost` — senza questa riga il login Google fallirebbe da quell'indirizzo (`redirect_uri_mismatch`).
   - _(dopo il deploy)_ `https://IL-TUO-DOMINIO.vercel.app/api/auth/callback/google`
5. **Origini JavaScript autorizzate** → aggiungi:
   - `http://localhost:3000`
   - `http://127.0.0.1:3000`
   - _(dopo il deploy)_ `https://IL-TUO-DOMINIO.vercel.app`
6. **Crea**. Compare un popup con **Client ID** e **Client secret** (li ritrovi comunque cliccando sul client nella lista).

## 5. Metti le credenziali in `.env.local`

Nella root del progetto, **solo se `.env.local` non esiste ancora** (altrimenti `cp` cancella quello che c'è):

```bash
[ -f .env.local ] || cp .env.example .env.local
```

Poi in `.env.local`:

```
AUTH_GOOGLE_ID=<il Client ID>
AUTH_GOOGLE_SECRET=<il Client secret>
AUTH_URL=http://127.0.0.1:3000
```

`AUTH_SECRET` è già generato durante lo scaffold. Se manca: `npx auth secret`.

**Perché `AUTH_URL` fisso**: senza questa riga, Auth.js prova a dedurre da solo
l'indirizzo (`localhost` o `127.0.0.1`) leggendo l'header `Host` di ogni
singola richiesta — e in dev, con entrambi validi sullo stesso server, può
capitare che lo calcoli in modo diverso tra il momento in cui parte verso
Google e il momento in cui torna indietro con il codice, con errore
`redirect_uri_mismatch` **lato server** (schermata "server error", non
l'errore che mostra direttamente Google). Fissarlo a un solo indirizzo
elimina l'ambiguità alla radice. Da qui in avanti: **sempre `127.0.0.1:3000`
in dev**, mai più `localhost:3000` — coerente anche con quanto richiesto da
Spotify (docs/SETUP-SPOTIFY.md).

## 6. Prova

```bash
npm run dev
```

<http://127.0.0.1:3000> → **Accedi con Google** → scegli l'account (quello aggiunto come utente di test) → accetta i permessi.
Se atterri su `/dashboard` e vedi il tuo nome: **fine Fase 0.** ✅

---

## Problemi comuni

| Errore | Causa / fix |
|---|---|
| "Errore durante la creazione della configurazione OAuth / brand creato mentre apporti modifiche" | Bug UI della console. La config è comunque creata: **ricarica** `console.cloud.google.com/auth/overview` e continua dai tab Branding / Audience / Clients |
| Schermata "Google non ha verificato questa app" al login | Normale per un'app in **Testing** con scope sensibili → **Avanzate** → **Vai a DailyHub (non sicuro)**. Se invece è `access_blocked`, la tua email non è tra gli **utenti di test** o stai usando un altro account |
| `redirect_uri_mismatch` mostrato **da Google** (schermata sua, prima del consenso) | L'URI nel client OAuth non è **identico** a `http://127.0.0.1:3000/api/auth/callback/google` (o manca del tutto tra quelli autorizzati) |
| "Server error" **dopo** aver dato il consenso (log server: `[auth][cause] ResponseBodyError` / `redirect_uri_mismatch`) | Manca `AUTH_URL` in `.env.local` — vedi punto 5 sopra |
| Login ok ma nessun refresh token | Revoca l'accesso da <https://myaccount.google.com/permissions> e rifai il login |
| Auth.js `Configuration` error | Mancano `AUTH_SECRET` o `AUTH_GOOGLE_*` in `.env.local` |
