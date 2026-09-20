"use client"

import { useEffect } from "react"

/**
 * Production Readiness Audit v1 — copre il caso limite in cui a fallire
 * è il ROOT layout stesso (non solo /dashboard, vedi dashboard/error.tsx):
 * per convenzione Next.js questo file deve renderizzare da sé <html>/
 * <body>, non può riusare RootLayout (che a quel punto potrebbe essere
 * proprio la causa dell'errore). Volutamente minimale — nessun font
 * personalizzato (potrebbero non essere disponibili in questo stato),
 * nessuna dipendenza da altri componenti dell'app.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="it">
      <body style={{ fontFamily: "system-ui, sans-serif" }}>
        <main
          style={{
            display: "flex",
            minHeight: "100vh",
            alignItems: "center",
            justifyContent: "center",
            padding: "1.5rem",
            textAlign: "center",
          }}
        >
          <div style={{ maxWidth: "24rem" }}>
            <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.75rem" }}>
              DailyHub non è riuscito a partire
            </h1>
            <p style={{ fontSize: "0.875rem", color: "#666", marginBottom: "1.5rem" }}>
              Riprova tra poco — se il problema continua, i tuoi dati restano al
              sicuro, nessuna modifica va persa.
            </p>
            <button
              onClick={reset}
              style={{
                padding: "0.625rem 1.5rem",
                borderRadius: "0.5rem",
                border: "1px solid #ccc",
                background: "#111",
                color: "#fff",
                fontSize: "0.875rem",
                cursor: "pointer",
              }}
            >
              Riprova
            </button>
          </div>
        </main>
      </body>
    </html>
  )
}
