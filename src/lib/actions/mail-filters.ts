"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import type { MailFilterSummary } from "@/lib/queries/mail-filters"

function normalizePattern(raw: string): string | null {
  const trimmed = raw.trim().slice(0, 60)
  return trimmed.length > 0 ? trimmed : null
}

export type MailFilterActionResult =
  | { ok: true; filter: MailFilterSummary }
  | { ok: false; reason: "duplicate" | "invalid" }

export async function addMailFilter(rawPattern: string): Promise<MailFilterActionResult> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false, reason: "invalid" }
  const pattern = normalizePattern(rawPattern)
  if (!pattern) return { ok: false, reason: "invalid" }

  try {
    const filter = await prisma.mailFilter.create({
      data: { userId: session.user.id, pattern },
      select: { id: true, pattern: true },
    })
    return { ok: true, filter }
  } catch {
    // Vincolo @@unique([userId, pattern]) — regola già presente.
    return { ok: false, reason: "duplicate" }
  }
}

export async function removeMailFilter(id: string): Promise<{ ok: boolean }> {
  const session = await auth()
  if (!session?.user?.id) return { ok: false }
  const result = await prisma.mailFilter.deleteMany({
    where: { id, userId: session.user.id },
  })
  return { ok: result.count > 0 }
}
