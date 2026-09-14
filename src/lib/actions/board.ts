"use server"

import { auth } from "@/auth"
import { listBoardLayouts } from "@/lib/queries/board"
import type { ActiveBoardState, BoardState, SavedLayoutSummary } from "@/lib/board"
import { prisma } from "@/lib/prisma"

/** Sola lettura, esposta come Server Action perché lo switcher (client,
 * interattivo) ne ha bisogno — queries/board.ts è solo per Server
 * Component. Stesso schema già usato per la Cronologia (actions/history.ts). */
export async function fetchBoardLayouts(): Promise<SavedLayoutSummary[]> {
  return listBoardLayouts()
}

/** Salva il layout attivo (posizione/dimensione dei blocchi) e le
 * preferenze condivise tra tutti i layout (rail, abitudini) — stessa
 * chiamata unica a ogni mutazione della board di prima, solo ora scrive
 * su due tabelle nella stessa transazione: `layout` sul SavedLayout
 * giusto, il resto su BoardLayout. `updateMany` con userId nel `where`,
 * non solo l'id: mai fidarsi ciecamente di un id passato dal client. */
export async function saveBoardLayout(layoutId: string, state: BoardState) {
  const session = await auth()
  if (!session?.user?.id) return
  const userId = session.user.id

  await prisma.$transaction([
    prisma.savedLayout.updateMany({
      where: { id: layoutId, userId },
      data: { layout: state.layout },
    }),
    prisma.boardLayout.upsert({
      where: { userId },
      update: { railCollapsed: state.railCollapsed, habitList: state.habitList },
      // order/sizes non si scrivono più — restano solo per compatibilità con
      // le righe create prima della griglia logica (colonne non-null in DB).
      create: {
        userId,
        order: [],
        railCollapsed: state.railCollapsed,
        habitList: state.habitList,
      },
    }),
  ])
}

/** Passa a un altro layout salvato — un'unica riga isActive per utente
 * alla volta, applicato qui in transazione (nessun vincolo DB per
 * questo). Ritorna lo stato fresco per aggiornare la board sul posto,
 * senza ricaricare la pagina; null se l'id non è (più) valido o non è
 * dell'utente. */
export async function switchBoardLayout(layoutId: string): Promise<ActiveBoardState | null> {
  const session = await auth()
  if (!session?.user?.id) return null
  const userId = session.user.id

  const target = await prisma.savedLayout.findFirst({ where: { id: layoutId, userId } })
  if (!target) return null

  await prisma.$transaction([
    prisma.savedLayout.updateMany({ where: { userId }, data: { isActive: false } }),
    prisma.savedLayout.update({ where: { id: target.id }, data: { isActive: true } }),
  ])

  const prefs = await prisma.boardLayout.findUnique({ where: { userId } })
  return {
    layout: target.layout as ActiveBoardState["layout"],
    railCollapsed: prefs?.railCollapsed ?? false,
    habitList: prefs?.habitList ?? [],
    layoutId: target.id,
    layoutName: target.name,
  }
}

export type BoardLayoutActionResult =
  | { ok: true; state: ActiveBoardState }
  | { ok: false; reason: "duplicate" | "invalid" }

function normalizeLayoutName(name: string): string | null {
  const trimmed = name.trim().slice(0, 40)
  return trimmed.length > 0 ? trimmed : null
}

/** Crea un nuovo layout come copia di quello attualmente attivo (confermato
 * con Claudio: si personalizza da lì, non si riparte da zero ogni volta) e
 * lo attiva subito. */
export async function createBoardLayout(rawName: string): Promise<BoardLayoutActionResult> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, reason: "invalid" }
  const userId = session.user.id
  const name = normalizeLayoutName(rawName)
  if (!name) return { ok: false, reason: "invalid" }

  const current = await prisma.savedLayout.findFirst({ where: { userId, isActive: true } })

  try {
    const created = await prisma.$transaction(async (tx) => {
      await tx.savedLayout.updateMany({ where: { userId }, data: { isActive: false } })
      return tx.savedLayout.create({
        data: { userId, name, layout: current?.layout ?? [], isActive: true },
      })
    })
    const prefs = await prisma.boardLayout.findUnique({ where: { userId } })
    return {
      ok: true,
      state: {
        layout: created.layout as ActiveBoardState["layout"],
        railCollapsed: prefs?.railCollapsed ?? false,
        habitList: prefs?.habitList ?? [],
        layoutId: created.id,
        layoutName: created.name,
      },
    }
  } catch {
    // Vincolo @@unique([userId, name]) — nome già usato.
    return { ok: false, reason: "duplicate" }
  }
}

/** Rinomina un layout salvato (non cambia quale sia attivo). */
export async function renameBoardLayout(
  layoutId: string,
  rawName: string,
): Promise<{ ok: true } | { ok: false; reason: "duplicate" | "invalid" }> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, reason: "invalid" }
  const name = normalizeLayoutName(rawName)
  if (!name) return { ok: false, reason: "invalid" }

  try {
    const result = await prisma.savedLayout.updateMany({
      where: { id: layoutId, userId: session.user.id },
      data: { name },
    })
    return result.count > 0 ? { ok: true } : { ok: false, reason: "invalid" }
  } catch {
    return { ok: false, reason: "duplicate" }
  }
}

/** Elimina un layout salvato — mai l'ultimo (c'è sempre almeno un
 * layout). Se era quello attivo, attiva il più recente tra quelli
 * rimasti prima di cancellarlo, e ritorna lo stato fresco. */
export async function deleteBoardLayout(
  layoutId: string,
): Promise<{ ok: true; state: ActiveBoardState | null } | { ok: false; reason: "last" | "invalid" }> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, reason: "invalid" }
  const userId = session.user.id

  const all = await prisma.savedLayout.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  })
  const target = all.find((l) => l.id === layoutId)
  if (!target) return { ok: false, reason: "invalid" }
  if (all.length <= 1) return { ok: false, reason: "last" }

  let freshState: ActiveBoardState | null = null

  if (target.isActive) {
    const next = all.find((l) => l.id !== layoutId)!
    await prisma.$transaction([
      prisma.savedLayout.update({ where: { id: next.id }, data: { isActive: true } }),
      prisma.savedLayout.delete({ where: { id: layoutId } }),
    ])
    const prefs = await prisma.boardLayout.findUnique({ where: { userId } })
    freshState = {
      layout: next.layout as ActiveBoardState["layout"],
      railCollapsed: prefs?.railCollapsed ?? false,
      habitList: prefs?.habitList ?? [],
      layoutId: next.id,
      layoutName: next.name,
    }
  } else {
    await prisma.savedLayout.delete({ where: { id: layoutId } })
  }

  return { ok: true, state: freshState }
}
