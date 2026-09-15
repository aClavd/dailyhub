import "server-only"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export type LetturaState = { titolo: string; pagina: number; totale: number }

const EMPTY: LetturaState = { titolo: "", pagina: 0, totale: 0 }

/** Contenuto del blocco Lettura dell'utente corrente — sola lettura, solo
 * per Server Component. Stesso schema minimale già visto per mail-filters. */
export async function getLettura(): Promise<LetturaState> {
  const session = await auth()
  if (!session?.user?.id) return EMPTY
  const row = await prisma.letturaWidget.findUnique({
    where: { userId: session.user.id },
    select: { titolo: true, pagina: true, totale: true },
  })
  return row ?? EMPTY
}
