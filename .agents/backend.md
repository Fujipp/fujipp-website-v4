# Backend Rules

Read this file before changing anything under `backend/`.

---

## Stack

| | |
| --- | --- |
| Framework | Spring Boot 4 (Spring Framework 7) |
| Language | Java 21 (`<java.version>21</java.version>` in `pom.xml`) |
| Build | Maven via the wrapper — `./mvnw` |
| Persistence | Spring Data JPA + Hibernate 7 |
| Database | Supabase PostgreSQL (see `.agents/database.md`) |
| Auth | Stateless JWT verified against the Supabase JWT secret (no server sessions) |

Base package: `fujipp.project.backend` — layered as
`controller/` · `service/` · `repository/` · `model/` · `dto/` · `config/` · `billing/`.

There is also a separate `services/billing-service/` (internal microservice the backend
calls over HTTP for credit/wallet operations).

---

## Configuration & secrets

- Runtime config lives in `backend/src/main/resources/application.properties`.
- Secrets/values come from **`backend/.env`** (loaded via `spring.config.import=optional:file:.env[.properties]`).
  `backend/.env` is git-ignored — **never commit it**. Keep `backend/.env.example` in sync (placeholders only).
- Properties reference env vars with defaults, e.g. `${CORS_ALLOWED_ORIGINS:http://localhost:5173}`.
  Add new config the same way — env var + sensible local default — never hardcode a secret.

Required env vars: `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `SUPABASE_URL`, `SUPABASE_JWT_SECRET`,
`CORS_ALLOWED_ORIGINS`, `BILLING_*`, `SLIPOK_*`, `PROMPTPAY_ID`.

---

## Database connection (important)

- The app connects through the **Supabase connection pooler in transaction mode — port `6543`** —
  with `?sslmode=require&prepareThreshold=0`. `prepareThreshold=0` is **required**: transaction-mode
  pooling does not keep server-side prepared statements across transactions.
- Do **not** switch back to the session-mode pooler (port `5432`): it caps total client sessions (~15),
  which is exhausted by DevTools restarts + the hosted instance sharing the same user.
- HikariCP is capped small (`maximum-pool-size=5`, override via `DB_POOL_MAX_SIZE`) so the app never
  hogs pooler slots. Keep it modest.
- `spring.jpa.hibernate.ddl-auto=validate` — Hibernate **validates** against the existing schema and
  never modifies it. The schema is owned by Supabase migrations (`supabase/migrations/`), not JPA.
  If an entity and the schema disagree, fix the migration + entity together — do not change `ddl-auto`.

---

## Builds and tests

Per `.agents/README.md`: **do not run `./mvnw test`, `./mvnw package`, or `spring-boot:run`
unless the user explicitly asks.** Running connects to the real Supabase DB and consumes a pooler slot.

To run locally (when asked): `./mvnw spring-boot:run` from `backend/` (starts on port `8080`).

---

## Do Not

- Do not commit `backend/.env` or any real secret.
- Do not change the DB connection mode, `ddl-auto`, or pool sizing without understanding the pooler limits above.
- Do not edit files outside the scope you were asked to change (e.g. don't touch frontend or migrations).
- Do not add a dependency without explicit instruction.
