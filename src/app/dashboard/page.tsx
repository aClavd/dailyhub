import { redirect } from "next/navigation"

import { auth, signOut } from "@/auth"
import { Button } from "@/components/ui/button"

function greeting(date = new Date()) {
  const h = date.getHours()
  if (h < 12) return "buondì"
  if (h < 18) return "buon pomeriggio"
  return "buonasera"
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) redirect("/")

  const firstName = session.user.name?.split(" ")[0]?.toLowerCase()

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-5">
      <header className="flex items-center justify-between border-b pb-4">
        <span className="font-heading text-base font-semibold">
          <span className="text-muted-foreground font-normal">Daily</span>Hub
        </span>
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground hidden text-sm sm:inline">
            {session.user.email}
          </span>
          <form
            action={async () => {
              "use server"
              await signOut({ redirectTo: "/" })
            }}
          >
            <Button type="submit" variant="outline" size="sm">
              Esci
            </Button>
          </form>
        </div>
      </header>

      <section className="py-16 text-center">
        <h1 className="font-heading text-4xl font-medium lowercase tracking-tight text-balance">
          {greeting()}
          {firstName ? `, ${firstName}` : ""}
        </h1>
        <p className="text-muted-foreground mt-3 font-mono text-xs tracking-[0.15em] uppercase">
          Fase 0 · accesso Google attivo — i blocchi arrivano nella Fase 1
        </p>
      </section>

      {session.error ? (
        <p className="border-destructive/30 bg-destructive/10 text-destructive mx-auto max-w-md rounded-lg border p-3 text-center text-sm">
          Permessi Google da riautorizzare ({session.error}). Esci e rifai
          l&apos;accesso.
        </p>
      ) : null}
    </main>
  )
}
