"use server"

import { auth } from "@/auth"
import type { DiarioState } from "@/lib/diario"
import { prisma } from "@/lib/prisma"

/** Salva (crea o aggiorna) la voce di diario di un giorno. */
export async function saveDiarioEntry(date: string, data: DiarioState) {
  const session = await auth()
  if (!session?.user?.id) return
  const fields = {
    mood: data.mood,
    obiettivo: data.obiettivo,
    testo: data.testo,
    wins: data.wins,
    habits: data.habits,
    weight: data.weight,
    sleepHours: data.sleepHours,
  }
  await prisma.journalEntry.upsert({
    where: { userId_date: { userId: session.user.id, date } },
    update: fields,
    create: { userId: session.user.id, date, ...fields },
  })
}

/**
 * Registra una sessione di studio completata oggi (blocco da 25 min). Azione
 * a sé, non dentro saveDiarioEntry: incrementa in modo atomico (increment,
 * non "leggi e riscrivi il totale") così due tab aperte non si perdono un
 * conteggio a vicenda, e non serve conoscere il resto del record del giorno.
 */
export async function incrementPomodoroSession(date: string) {
  const session = await auth()
  if (!session?.user?.id) return
  await prisma.journalEntry.upsert({
    where: { userId_date: { userId: session.user.id, date } },
    update: { pomodoroSessions: { increment: 1 } },
    create: { userId: session.user.id, date, pomodoroSessions: 1 },
  })
}
