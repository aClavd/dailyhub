"use server"

import { auth } from "@/auth"
import type { BoardState } from "@/lib/board"
import { prisma } from "@/lib/prisma"

/** Salva il layout della board (posizione/dimensione dei blocchi, rail, abitudini). */
export async function saveBoardLayout(state: BoardState) {
  const session = await auth()
  if (!session?.user?.id) return
  const fields = {
    layout: state.layout,
    railCollapsed: state.railCollapsed,
    habitList: state.habitList,
  }
  await prisma.boardLayout.upsert({
    where: { userId: session.user.id },
    update: fields,
    // order/sizes non si scrivono più — restano solo per compatibilità con
    // le righe create prima della griglia logica (colonne non-null in DB).
    create: { userId: session.user.id, order: [], ...fields },
  })
}
