import { signOut } from "@/auth"
import { Button } from "@/components/ui/button"

export function TopBar({ email }: { email?: string | null }) {
  return (
    <header className="flex items-center justify-between border-b border-border py-3.5">
      {/* Su desktop il marchio vive nella barra laterale a tutta altezza. */}
      <div className="flex items-center gap-2 lg:hidden">
        <span className="bg-primary size-2 rounded-full" />
        <span className="font-heading text-base font-semibold">
          <span className="text-ink-faint font-normal">Daily</span>Hub
        </span>
      </div>
      <div className="ml-auto flex items-center gap-3">
        {email ? (
          <span className="text-ink-soft hidden text-sm sm:inline">{email}</span>
        ) : null}
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
  )
}
