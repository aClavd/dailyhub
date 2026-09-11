import { config } from "dotenv"
import { defineConfig, env } from "prisma/config"

// La CLI Prisma (migrate, studio, ...) gira fuori da Next.js: non ha
// il caricamento automatico di .env.local, quindi lo facciamo qui.
config({ path: ".env.local" })

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // Connessione diretta: le migrazioni passano da qui, non dal pooler
    // (pgbouncer in transaction mode non va d'accordo con i lock del migrate).
    url: env("DIRECT_URL"),
  },
})
