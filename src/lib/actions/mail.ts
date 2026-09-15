"use server"

import { getMail, type MailResult } from "@/lib/mail"

/** Sola lettura esposta come Server Action perché serve a un Client
 * Component (MailLive, per il polling) — stesso schema di
 * fetchBoardLayouts() in actions/board.ts. */
export async function refreshMail(): Promise<MailResult> {
  return getMail()
}
