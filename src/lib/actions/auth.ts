"use server"

import { signIn, signOut } from "@/auth"

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

/**
 * Esci da DailyHub — stessa azione già usata da top-bar.tsx (lì definita
 * inline perché quel file è un Server Component, "use server" a funzione
 * va bene). Sidebar System Refinement (sez. 14): l'account center
 * (insights-dialog.tsx, Client Component) è il nuovo posto dove vive
 * "Esci" — serve qui la stessa versione estratta a livello file.
 */
export async function logout() {
  await signOut({ redirectTo: "/" })
}
