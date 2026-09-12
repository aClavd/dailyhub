# Setup Spotify — DailyHub

Serve per il widget Spotify in testata (brano in riproduzione ora). Come Google, è un login OAuth — un'app da registrare una volta sul pannello sviluppatori di Spotify.

---

## 1. Crea un'app su Spotify for Developers

1. Vai su <https://developer.spotify.com/dashboard> e accedi col tuo account Spotify normale (non serve un account developer a parte).
2. **Create app**.
3. Compila:
   - **App name**: `DailyHub` (o quello che vuoi, è solo per te)
   - **App description**: qualcosa tipo "dashboard personale"
   - **Redirect URI**: `http://localhost:3000/api/auth/callback/spotify` — esatto così, è quello che Auth.js si aspetta. Quando andrà online aggiungeremo anche l'URL vero (es. `https://dailyhub.vercel.app/api/auth/callback/spotify`).
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

Sola lettura, nessuna scrittura: non potremo cambiare/skippare brani dalla dashboard, solo vedere cosa stai ascoltando (come per Calendar e Gmail).

## Nota sulla modalità "Development"

Le nuove app Spotify partono in modalità Development: funzionano solo per l'account con cui hai creato l'app (il tuo) più eventuali utenti aggiunti a mano in **Settings → User Management**. Per uso personale va benissimo così, non serve richiedere l'estensione a Spotify.

---

Quando hai fatto questi 4 passi, dimmelo e costruisco il widget.
