import "server-only"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

/** Contenuto del blocco Note dell'utente corrente — sola lettura, solo per
 * Server Component. Stesso schema minimale già visto per mail-filters. */
export async function getNote(): Promise<string> {
  const session = await auth()
  if (!session?.user?.id) return ""
  const row = await prisma.noteWidget.findUnique({
    where: { userId: session.user.id },
    select: { text: true },
  })
  return row?.text ?? ""
}
