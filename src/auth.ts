import NextAuth from "next-auth"
import Google from "next-auth/providers/google"

/**
 * Scope OAuth richiesti a Google:
 * - openid / email / profile → identità di base
 * - calendar.readonly        → lettura eventi (blocco Impegni)
 * - gmail.readonly           → lettura mail (blocco Mail)
 * Tutto in sola lettura: nessuna scrittura su Calendar/Gmail in questa fase.
 */
const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar.readonly",
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
      return session
    },
  },
})
