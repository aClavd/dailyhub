"use server"

import { signIn } from "@/auth"

/**
 * Server Action condivisa dai blocchi che possono avere il token Google
 * scaduto (Impegni, Mail). Va in un file a parte con "use server" a livello
 * file perché deve poter essere importata anche da Client Component (qui
 * mail-card.tsx) — un "use server" inline dentro un file "use client" non è
 * una posizione valida per una Server Action.
 */
export async function reconnectGoogle() {
  await signIn("google", { redirectTo: "/dashboard" })
}
