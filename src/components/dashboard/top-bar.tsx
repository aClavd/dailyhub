/**
 * Solo il marchio, solo su mobile (su desktop vive nella barra laterale a
 * tutta altezza — vedi rail.tsx). Prima mostrava anche email + "Esci": con
 * l'Account center nel dialog Impostazioni (insights-dialog.tsx, sez. 13-14
 * del documento di rifinitura sidebar) quella riga era ridondante —
 * "Esci" si è spostato lì (lib/actions/auth.ts:logout, stessa Server
 * Action). `lg:hidden` sull'intero header, non solo sul marchio: su
 * desktop non c'è più nulla da mostrare qui, niente riga vuota col bordo.
 */
export function TopBar() {
  return (
    <header className="flex items-center border-b border-border py-3.5 lg:hidden">
      <div className="flex items-center gap-2">
        <span className="bg-primary size-2 rounded-full" />
        <span className="font-heading text-base font-semibold">
          <span className="text-ink-faint font-normal">Daily</span>Hub
        </span>
      </div>
    </header>
  )
}
