import { redirect } from "next/navigation"

import { auth, signIn } from "@/auth"
import { Button } from "@/components/ui/button"

export default async function Home() {
  const session = await auth()
  if (session?.user) redirect("/dashboard")

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm text-center">
        <div className="mb-10 flex items-center justify-center gap-2">
          <span className="bg-primary size-2 rounded-full" />
          <span className="font-heading text-lg font-semibold">
            <span className="text-muted-foreground font-normal">Daily</span>Hub
          </span>
        </div>

        <h1 className="font-heading text-2xl font-medium tracking-tight text-balance">
          La tua giornata in una pagina
        </h1>
        <p className="text-muted-foreground mt-3 text-sm">
          Impegni di oggi, mail importanti e diario. Accedi con Google per
          iniziare.
        </p>

        <form
          className="mt-8"
          action={async () => {
            "use server"
            await signIn("google", { redirectTo: "/dashboard" })
          }}
        >
          <Button type="submit" size="lg" className="w-full">
            Accedi con Google
          </Button>
        </form>

        <p className="text-muted-foreground mt-6 text-xs">
          Chiediamo l&apos;accesso in sola lettura a Calendar e Gmail. I dati
          restano tra te e Google.
        </p>
      </div>
    </main>
  )
}
