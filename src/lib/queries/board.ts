import "server-only"

import { auth } from "@/auth"
import {
  DEFAULT_BOARD_STATE,
  isWidgetType,
  type BoardState,
  type WidgetSize,
  type WidgetType,
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

  const order = row.order.filter(isWidgetType)
  return {
    order: order.length > 0 ? order : DEFAULT_BOARD_STATE.order,
    sizes: (row.sizes as Partial<Record<WidgetType, WidgetSize>>) ?? {},
    railCollapsed: row.railCollapsed,
    // A differenza di `order`, una lista vuota qui è uno stato valido (l'utente
    // ha rimosso tutte le abitudini di proposito): nessun fallback ai default.
    habitList: row.habitList,
  }
}
