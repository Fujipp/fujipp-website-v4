-- ═════════════════════════════════════════════════════════════════════════════
-- Store ENUM field `options` as TEXT instead of JSONB.
--
-- billing-service (Spring Boot 4) runs on Jackson 3 (`tools.jackson`), but Hibernate
-- 7.2 only auto-configures a JSON FormatMapper for Jackson 2 (`com.fasterxml.jackson`).
-- With no mapper it can't read a jsonb column at all — GET /config 500s with
-- "Could not find a FormatMapper for the JSON format".
--
-- The column only ever holds a JSON array string that the frontend parses itself, so
-- a plain text column is enough and needs no JSON mapping. Existing values are kept
-- (jsonb → text is a lossless cast of the document text). Idempotent.
-- ═════════════════════════════════════════════════════════════════════════════

ALTER TABLE billing.feature_variable_templates
  ALTER COLUMN options TYPE text USING options::text;
