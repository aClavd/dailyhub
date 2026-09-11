import type { DefaultSession } from "next-auth"

type AuthError = "NoRefreshToken" | "RefreshAccessTokenError"

declare module "next-auth" {
  interface Session {
    /** Access token Google per chiamare Calendar/Gmail dal server. */
    accessToken?: string
    /** Presente se il rinnovo del token è fallito: forzare un nuovo login. */
    error?: AuthError
    user: DefaultSession["user"] & { id: string }
  }
}

// `next-auth/jwt` fa solo `export * from "@auth/core/jwt"`: per far combaciare
// l'augmentation con l'interfaccia originale bisogna targettare il modulo vero.
declare module "@auth/core/jwt" {
  interface JWT {
    access_token?: string
    refresh_token?: string
    /** Scadenza dell'access token, in secondi epoch. */
    expires_at?: number
    error?: AuthError
  }
}
