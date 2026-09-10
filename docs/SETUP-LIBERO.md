# Setup Libero Mail (IMAP) — DailyHub

Serve dalla **Fase 3** (blocco Mail). Libero non ha OAuth: si accede via IMAP con email + password.
Consigliato: attivare la verifica in due passaggi e usare una **password applicativa** dedicata (revocabile senza toccare la password vera).

---

## 1. (Consigliato) Attiva la verifica in due passaggi

1. Accedi a <https://login.libero.it/> → area **Sicurezza** dell'account.
2. Attiva la **verifica in due passaggi** (2FA).

## 2. Genera una password applicativa

1. Nella sezione sicurezza: **Password sicura** → **Genera password** / **Password per app**.
2. Copia la stringa generata (senza spazi).
   - Se **non** hai la 2FA attiva, Libero usa direttamente la password normale dell'account: salta questo passaggio e usa quella (meno sicuro).

## 3. Metti le credenziali in `.env.local`

```
LIBERO_EMAIL=tuonome@libero.it
LIBERO_APP_PASSWORD=<password applicativa>
```

In produzione (Vercel) le stesse due variabili vanno nelle **Environment Variables** del progetto: sono cifrate a riposo e non arrivano mai al client.

---

## Parametri IMAP (riferimento)

| | |
|---|---|
| Host | `imapmail.libero.it` |
| Porta | `993` |
| Sicurezza | SSL/TLS |
| Utente | indirizzo completo (`@libero.it`, `@iol.it`, `@inwind.it`, `@blu.it`) |
| Password | password applicativa (o quella dell'account, senza 2FA) |

SMTP (`smtp.libero.it:465`) servirà solo se un giorno aggiungiamo l'invio. La Fase 3 è sola lettura.

## Cosa considera "importante" DailyHub

Per Libero: messaggi contrassegnati come **speciali** (flag IMAP `\Flagged`) e/o da un elenco di mittenti chiave da definire insieme. Da rifinire dopo le prime settimane d'uso reale.
