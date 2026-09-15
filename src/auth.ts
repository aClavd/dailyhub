import NextAuth from "next-auth"
import Google from "next-auth/providers/google"

/**
 * Scope OAuth richiesti a Google:
 * - openid / email / profile → identità di base
 * - calendar.events          → lettura E scrittura eventi (blocco Impegni,
 *   compresa la creazione di nuovi impegni dalla dashboard) — non il
 *   generico "calendar" (darebbe accesso anche a impostazioni/elenco
 *   calendari, non ci serve)
 * - gmail.readonly           → lettura mail (blocco Mail), resta di sola
 *   lettura: nessuna scrittura prevista lì
 *
 * Chi aveva già collegato Google prima di calendar.events deve riconnettersi
 * una volta (vedi docs/SETUP-GOOGLE.md) — ma il bottone "Riconnetti Google"
 * già esistente basta da solo: prompt:"consent" qui sotto è fisso su ogni
 * accesso, quindi rifare il login concede subito il nuovo scope senza
 * bisogno di parametri diversi (a differenza di Spotify, che non forza un
 * nuovo consenso automatico).
 */
const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/gmail.readonly",
].join(" ")

/** Rinnova l'access token con un minuto di anticipo sulla scadenza. */
const REFRESH_MARGIN_MS = 60_000

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  providers: [
    Google({
      authorization: {
        params: {
          scope: GOOGLE_SCOPES,
          access_type: "offline", // necessario per ricevere il refresh token
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // 1) Primo accesso: salva i token restituiti da Google nel JWT.
      if (account) {
        token.access_token = account.access_token
        token.refresh_token = account.refresh_token ?? token.refresh_token
        token.expires_at = account.expires_at
        // Bug reale trovato in produzione: senza questa riga, `token.sub`
        // NON è il sub di Google — senza adapter Prisma, Auth.js non ha
        // nessuna riga "User" persistente da cui recuperare un id stabile,
        // quindi ne genera uno CASUALE a ogni nuovo login (un accesso
        // scaduto, "Riconnetti Google", un cookie cancellato...). Risultato
        // osservato per davvero: 4 id utente diversi in due giorni, ognuno
        // trattato come un utente nuovo — layout salvati e cronologia che
        // "sparivano" cambiando login, non un bug di logica altrove.
        // account.providerAccountId È il sub vero di Google (stabile per lo
        // stesso account Google + questo client OAuth, per sempre) — va
        // fissato qui esplicitamente.
        token.sub = account.providerAccountId
        delete token.error
        return token
      }

      // 2) Access token ancora valido: lascia tutto com'è.
      if (
        typeof token.expires_at === "number" &&
        Date.now() < token.expires_at * 1000 - REFRESH_MARGIN_MS
      ) {
        return token
      }

      // 3) Scaduto: prova a rinnovarlo con il refresh token.
      if (!token.refresh_token) return { ...token, error: "NoRefreshToken" }
      try {
        const res = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: process.env.AUTH_GOOGLE_ID ?? "",
            client_secret: process.env.AUTH_GOOGLE_SECRET ?? "",
            grant_type: "refresh_token",
            refresh_token: token.refresh_token,
          }),
        })
        const refreshed = (await res.json()) as {
          access_token: string
          expires_in: number
          refresh_token?: string
        }
        if (!res.ok) throw refreshed

        token.access_token = refreshed.access_token
        token.expires_at = Math.floor(
          Date.now() / 1000 + Number(refreshed.expires_in),
        )
        if (refreshed.refresh_token) token.refresh_token = refreshed.refresh_token
        delete token.error
        return token
      } catch {
        return { ...token, error: "RefreshAccessTokenError" }
      }
    },
    async session({ session, token }) {
      session.accessToken = token.access_token
      session.error = token.error
      // token.sub è il Google `sub` (id stabile dell'account), fissato
      // esplicitamente nel callback jwt sopra — lo usiamo come chiave per
      // le righe del DB, senza bisogno dell'adapter Prisma.
      if (token.sub) session.user.id = token.sub
      return session
    },
  },
})
