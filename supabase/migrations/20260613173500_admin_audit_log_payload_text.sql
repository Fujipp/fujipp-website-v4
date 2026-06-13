-- ═════════════════════════════════════════════════════════════════════════════
-- admin_audit_log.payload: jsonb → text
--
-- billing-service runs on Jackson 3 (package `tools.jackson`, from Spring Boot 4's
-- webmvc starter). Hibernate 7.2's automatic JSON FormatMapper only detects Jackson 2
-- (`com.fasterxml.jackson`) or Yasson, so binding a Map to the jsonb column failed at
-- runtime ("Could not find a FormatMapper for the JSON format") — which 500'd every
-- audited admin write (bot transfer, wallet adjust, price edit, subscription override).
--
-- Fix: the service serializes the payload to a JSON string itself (with the Jackson 3
-- that is on the classpath) and stores it as plain text. The audit payload is never
-- queried as jsonb, so text is sufficient. Idempotent-ish: the USING cast handles any
-- rows present.
-- ═════════════════════════════════════════════════════════════════════════════

ALTER TABLE billing.admin_audit_log
    ALTER COLUMN payload TYPE text USING payload::text;
