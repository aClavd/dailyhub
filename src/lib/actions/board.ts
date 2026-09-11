"use server"

import { auth } from "@/auth"
import type { BoardState } from "@/lib/board"
import { prisma } from "@/lib/prisma"

/** Salva il layout della board (blocchi, ordine, taglie, rail). */
export async function saveBoardLayout(state: BoardState) {
  const session = await auth()
  if (!session?.user?.id) return
  const fields = {
    order: state.order,
    sizes: state.sizes,
    railCollapsed: state.railCollapsed,
  }
  await prisma.boardLayout.upsert({
    where: { userId: session.user.id },
    update: fields,
    create: { userId: session.user.id, ...fields },
  })
}
