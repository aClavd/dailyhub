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
   - _(dopo il deploy)_ `https://IL-TUO-DOMINIO.vercel.app/api/auth/callback/google`
5. **Origini JavaScript autorizzate** → aggiungi:
   - `http://localhost:3000`
   - _(dopo il deploy)_ `https://IL-TUO-DOMINIO.vercel.app`
6. **Crea**. Compare un popup con **Client ID** e **Client secret** (li ritrovi comunque cliccando sul client nella lista).

## 5. Metti le credenziali in `.env.local`

Nella root del progetto:

```bash
cp .env.example .env.local
```

Poi in `.env.local`:

```
AUTH_GOOGLE_ID=<il Client ID>
AUTH_GOOGLE_SECRET=<il Client secret>
```

`AUTH_SECRET` è già generato durante lo scaffold. Se manca: `npx auth secret`.

## 6. Prova

```bash
npm run dev
```

<http://localhost:3000> → **Accedi con Google** → scegli l'account (quello aggiunto come utente di test) → accetta i permessi.
Se atterri su `/dashboard` e vedi il tuo nome: **fine Fase 0.** ✅

---

## Problemi comuni

| Errore | Causa / fix |
|---|---|
| "Errore durante la creazione della configurazione OAuth / brand creato mentre apporti modifiche" | Bug UI della console. La config è comunque creata: **ricarica** `console.cloud.google.com/auth/overview` e continua dai tab Branding / Audience / Clients |
| Schermata "Google non ha verificato questa app" al login | Normale per un'app in **Testing** con scope sensibili → **Avanzate** → **Vai a DailyHub (non sicuro)**. Se invece è `access_blocked`, la tua email non è tra gli **utenti di test** o stai usando un altro account |
| `redirect_uri_mismatch` | L'URI nel client OAuth non è **identico** a `http://localhost:3000/api/auth/callback/google` |
| Login ok ma nessun refresh token | Revoca l'accesso da <https://myaccount.google.com/permissions> e rifai il login |
| Auth.js `Configuration` error | Mancano `AUTH_SECRET` o `AUTH_GOOGLE_*` in `.env.local` |
