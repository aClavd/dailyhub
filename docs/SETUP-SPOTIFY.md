# Setup Spotify — DailyHub

Serve per il widget Spotify in testata (brano in riproduzione ora). Come Google, è un login OAuth — un'app da registrare una volta sul pannello sviluppatori di Spotify.

---

## 1. Crea un'app su Spotify for Developers

1. Vai su <https://developer.spotify.com/dashboard> e accedi col tuo account Spotify normale (non serve un account developer a parte).
2. **Create app**.
3. Compila:
   - **App name**: `DailyHub` (o quello che vuoi, è solo per te)
   - **App description**: qualcosa tipo "dashboard personale"
   - **Redirect URI**: `http://127.0.0.1:3000/api/auth/callback/spotify` — **non** `localhost` (Spotify lo rifiuta come "non sicuro": accetta solo HTTPS, con un'eccezione proprio per l'IP di loopback `127.0.0.1`, stesso computer/porta di `localhost` ma quello specifico indirizzo va bene anche in HTTP). Quando andrà online aggiungeremo anche l'URL vero (es. `https://dailyhub.vercel.app/api/auth/callback/spotify`, lì HTTPS quindi nessun problema).
   - **Which API/SDKs are you planning to use?**: spunta **Web API**.
4. Accetta i termini, **Save**.

## 2. Prendi Client ID e Client Secret

1. Nella pagina dell'app appena creata: **Settings**.
2. Copia il **Client ID**.
3. **View client secret** → copia anche quello.

## 3. Metti le credenziali in `.env.local`

```
AUTH_SPOTIFY_ID=<client id>
AUTH_SPOTIFY_SECRET=<client secret>
```

## 4. Scope necessari (lo faccio io lato codice, giusto per sapere cosa autorizzi)

- `user-read-currently-playing` — cosa stai ascoltando ora
- `user-read-playback-state` — se è in pausa o in riproduzione
- `user-modify-playback-state` — i pulsanti play/pausa/avanti/indietro nella card

Con l'ultimo scope la card può anche **controllare** la riproduzione, non solo leggerla — invia i comandi al dispositivo Spotify già attivo (telefono, desktop, ecc.), non riproduce nulla dentro DailyHub. Richiede **Spotify Premium**: con un account gratuito l'API di controllo rifiuta i comandi (i pulsanti restano lì ma non fanno nulla, nessun errore visibile).

**Se avevi già collegato Spotify prima di questo scope**: il token vecchio non ha il permesso nuovo, i pulsanti falliranno silenziosamente finché non riautorizzi — **Scollega** dalla card e **Connetti Spotify** di nuovo (una volta sola).

## Nota: per collegare Spotify apri la dashboard da 127.0.0.1, non da localhost

Solo per il giro di login Spotify — apri `http://127.0.0.1:3000` invece di
`http://localhost:3000` nel browser, altrimenti Spotify ti rimanda a un
indirizzo diverso da quello con cui hai iniziato e i cookie di sessione non
combaciano (login che sembra fallire senza un motivo chiaro). Per il resto
del lavoro quotidiano va benissimo `localhost:3000` come sempre.

**Prerequisito**: la prima volta che apri `127.0.0.1:3000` non sei ancora
loggato lì (i cookie di `localhost` non valgono su un indirizzo diverso,
anche se è lo stesso computer) — DailyHub ti chiederà di accedere di nuovo
con Google, e se quell'indirizzo non è tra quelli autorizzati sul client
OAuth Google, l'accesso viene rifiutato (`redirect_uri_mismatch`). Vedi
`docs/SETUP-GOOGLE.md`, punto 4: `http://127.0.0.1:3000/api/auth/callback/
google` deve essere tra gli URI di reindirizzamento autorizzati (aggiunto
lì, va fatto una volta sola).

## Nota sulla modalità "Development"

Le nuove app Spotify partono in modalità Development: funzionano solo per l'account con cui hai creato l'app (il tuo) più eventuali utenti aggiunti a mano in **Settings → User Management**. Per uso personale va benissimo così, non serve richiedere l'estensione a Spotify.

---

## 5. Collega il tuo account (widget già costruito)

1. Riavvia `npm run dev`.
2. Apri la dashboard da `http://127.0.0.1:3000` (vedi nota sopra).
3. Nella card Spotify in testata (a destra del saluto), clic su **Connetti Spotify** — ti porta sulla pagina di consenso di Spotify, poi torni sulla dashboard con quello che stai ascoltando ora (o "Niente in ascolto ora" se in quel momento non hai nulla in riproduzione).

Nota architetturale: Spotify è un **collegamento a parte**, non un modo per accedere a DailyHub — resta Google. Se la sessione Spotify scade te lo dice la card stessa con un link "Riconnetti", niente da configurare di nuovo su `.env.local`.
