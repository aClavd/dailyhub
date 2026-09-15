import "server-only"

import { auth } from "@/auth"
import {
  DEFAULT_BOARD_STATE,
  migrateLegacyLayout,
  sanitizeLayout,
  type ActiveBoardState,
  type SavedLayoutSummary,
  type WidgetPlacement,
} from "@/lib/board"
import { prisma } from "@/lib/prisma"

const DEFAULT_LAYOUT_NAME = "Predefinito"

/**
 * Il layout attivo dell'utente corrente (Fase 5.4: può averne più d'uno,
 * con nome) + railCollapsed/habitList (condivisi tra tutti i layout,
 * vivono su BoardLayout — vedi schema.prisma). Solo lettura, solo per
 * Server Component — non importare questo file da un Client Component.
 *
 * Migrazione automatica, silenziosa, una tantum: se l'utente non ha
 * ancora nessuna SavedLayout (chiunque prima di questa fase), la prima
 * si crea da sola qui, col contenuto della vecchia BoardLayout.layout
 * (o da `order`/`sizes` se ancora più vecchia, o dal default per un
 * utente nuovo di zecca) — nessun passo manuale richiesto.
 */
export async function getActiveBoardLayout(): Promise<ActiveBoardState> {
  const session = await auth()
  if (!session?.user?.id) {
    return { ...DEFAULT_BOARD_STATE, layoutId: "default", layoutName: DEFAULT_LAYOUT_NAME }
  }
  const userId = session.user.id

  const prefs = await prisma.boardLayout.findUnique({ where: { userId } })

  let active = await prisma.savedLayout.findFirst({ where: { userId, isActive: true } })
  if (!active) {
    const legacyLayout = prefs ? (prefs.layout as WidgetPlacement[]) : []
    const layout =
      Array.isArray(legacyLayout) && legacyLayout.length > 0
        ? legacyLayout
        : prefs
          ? migrateLegacyLayout(prefs.order, (prefs.sizes as Record<string, string>) ?? {})
          : []
    active = await prisma.savedLayout.create({
      data: {
        userId,
        name: DEFAULT_LAYOUT_NAME,
        layout: layout.length > 0 ? sanitizeLayout(layout) : DEFAULT_BOARD_STATE.layout,
        isActive: true,
      },
    })
  }

  return {
    layout: sanitizeLayout(active.layout as WidgetPlacement[]),
    railCollapsed: prefs?.railCollapsed ?? false,
    rightPanelCollapsed: prefs?.rightPanelCollapsed ?? false,
    // A differenza del layout, una lista vuota qui è uno stato valido (l'utente
    // ha rimosso tutte le abitudini di proposito): nessun fallback ai default.
    habitList: prefs?.habitList ?? [...DEFAULT_BOARD_STATE.habitList],
    layoutId: active.id,
    layoutName: active.name,
  }
}

/** Layout salvati dell'utente corrente, senza il contenuto — per lo
 * switcher. Ordinati per nome, non per data: è un elenco da scegliere,
 * non una cronologia. */
export async function listBoardLayouts(): Promise<SavedLayoutSummary[]> {
  const session = await auth()
  if (!session?.user?.id) return []
  const rows = await prisma.savedLayout.findMany({
    where: { userId: session.user.id },
    orderBy: { name: "asc" },
    select: { id: true, name: true, isActive: true },
  })
  return rows
}
