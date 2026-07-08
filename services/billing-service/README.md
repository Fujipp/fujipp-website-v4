# billing-service

Internal wallet, catalog, order, subscription, VPS slot, source entitlement, and
feature configuration service for Fujipp's Backend Platform.

Read `../../docs/operations/backend-services.md` before changing service
boundaries, billing flows, wallet ledger logic, runtime subscriptions, or bot
feature configuration.

## Runtime

- Java 21
- Spring Boot 4
- Maven wrapper from this service folder
- JPA with `ddl-auto=validate`
- Default schema: `billing`
- Internal port: `8081`
- Auth: shared `BILLING_SERVICE_TOKEN` sent as `X-Service-Token`

## Local Development

```bash
cp .env.example .env
./mvnw spring-boot:run
```

Run builds or tests only when explicitly requested.
