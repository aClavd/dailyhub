import "server-only"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export type MailFilterSummary = { id: string; pattern: string }

/** Regole "mail importante" dell'utente corrente — sola lettura, solo per
 * Server Component. Stesso schema di listBoardLayouts() in queries/board.ts. */
export async function listMailFilters(): Promise<MailFilterSummary[]> {
  const session = await auth()
  if (!session?.user?.id) return []
  return prisma.mailFilter.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
    select: { id: true, pattern: true },
  })
}
