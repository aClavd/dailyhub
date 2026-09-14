import "server-only"

import { auth } from "@/auth"
import {
  DEFAULT_BOARD_STATE,
  migrateLegacyLayout,
  sanitizeLayout,
  type BoardState,
  type WidgetPlacement,
} from "@/lib/board"
import { prisma } from "@/lib/prisma"

/**
 * Layout della board dell'utente corrente. Solo lettura, solo per Server
 * Component — non importare questo file da un Client Component.
 */
export async function getBoardLayout(): Promise<BoardState> {
  const session = await auth()
  if (!session?.user?.id) return DEFAULT_BOARD_STATE

  const row = await prisma.boardLayout.findUnique({
    where: { userId: session.user.id },
  })
  if (!row) return DEFAULT_BOARD_STATE

  const saved = row.layout as WidgetPlacement[]
  // Board create prima della griglia logica: `layout` è ancora vuoto, ma
  // `order`/`sizes` hanno i dati vecchi — si ricostruisce al volo, nessuna
  // migrazione manuale richiesta (si salva da sola alla prossima modifica).
  const layout =
    Array.isArray(saved) && saved.length > 0
      ? saved
      : migrateLegacyLayout(row.order, (row.sizes as Record<string, string>) ?? {})

  return {
    layout: layout.length > 0 ? sanitizeLayout(layout) : DEFAULT_BOARD_STATE.layout,
    railCollapsed: row.railCollapsed,
    // A differenza del layout, una lista vuota qui è uno stato valido (l'utente
    // ha rimosso tutte le abitudini di proposito): nessun fallback ai default.
    habitList: row.habitList,
  }
}
