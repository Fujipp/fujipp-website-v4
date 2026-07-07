#!/usr/bin/env bash
# check-secrets.sh — verify that shared secrets match across the local .env files.
#
# Some values MUST be identical across services or inter-service auth fails (see
# docs/operations/secrets-inventory.md). This compares them WITHOUT printing the real value:
# it shows only an 8-char fingerprint (first 8 hex of sha256) so you can eyeball a
# match without exposing the secret. Exits non-zero if any group mismatches.

set -uo pipefail

cd "$(dirname "$0")/.." || exit 2

RED=$'\033[31m'; GRN=$'\033[32m'; YEL=$'\033[33m'; DIM=$'\033[2m'; RST=$'\033[0m'
fail=0

# Print an 8-char fingerprint of a string (empty -> "--------").
fp() {
  if [ -z "${1:-}" ]; then printf '%s' "--------"; return; fi
  printf '%s' "$1" | shasum -a 256 | cut -c1-8
}

# Read KEY=value from a .env file: last match wins, strip quotes + surrounding ws.
getval() {
  local file="$1" key="$2" line val
  [ -f "$file" ] || { printf '%s' "__NOFILE__"; return; }
  line=$(grep -E "^${key}=" "$file" 2>/dev/null | tail -n1) || true
  [ -n "$line" ] || { printf '%s' "__NOKEY__"; return; }
  val="${line#*=}"
  val="${val%\"}"; val="${val#\"}"      # strip wrapping double quotes
  val="${val%\'}"; val="${val#\'}"      # strip wrapping single quotes
  printf '%s' "$val" | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//'
}

# Compare a group of "file:KEY" entries that should all share one value.
# Usage: check_group "Label" "fileA:KEY1" "fileB:KEY2" ...
check_group() {
  local label="$1"; shift
  echo "── ${label}"
  local first_fp="" first_set=0 group_fail=0 present=0
  for entry in "$@"; do
    local file="${entry%%:*}" key="${entry##*:}" val v_fp status
    val=$(getval "$file" "$key")
    case "$val" in
      __NOFILE__) printf "   %s%-46s%s  %s(no file)%s\n"      "$DIM" "$file ($key)" "$RST" "$YEL" "$RST"; continue ;;
      __NOKEY__)  printf "   %s%-46s%s  %s(key missing)%s\n"  "$DIM" "$file ($key)" "$RST" "$YEL" "$RST"; continue ;;
    esac
    present=$((present+1))
    v_fp=$(fp "$val")
    if [ "$first_set" -eq 0 ]; then first_fp="$v_fp"; first_set=1; status="${GRN}✓${RST}"
    elif [ "$v_fp" = "$first_fp" ]; then status="${GRN}✓${RST}"
    else status="${RED}✗ MISMATCH${RST}"; group_fail=1
    fi
    printf "   %-46s  %s  %s\n" "$file ($key)" "$v_fp" "$status"
  done
  if [ "$present" -lt 2 ]; then
    printf "   %s(only %d value found — nothing to cross-check)%s\n" "$DIM" "$present" "$RST"
  elif [ "$group_fail" -ne 0 ]; then
    printf "   %s→ values differ — fix so all match%s\n" "$RED" "$RST"; fail=1
  fi
  echo
}

echo "Shared-secret check (fingerprints only, no values shown)"
echo

check_group "BOT_SECRET_KEY (AES key — must match everywhere)" \
  "backend/.env:BOT_SECRET_KEY" \
  "services/bot-runtime-service/.env:BOT_SECRET_KEY" \
  "services/billing-service/.env:BOT_SECRET_KEY"

check_group "backend RUNTIME_SERVICE_TOKEN  ==  runtime SERVICE_TOKEN" \
  "backend/.env:RUNTIME_SERVICE_TOKEN" \
  "services/bot-runtime-service/.env:SERVICE_TOKEN"

check_group "BILLING_SERVICE_TOKEN (backend ↔ billing)" \
  "backend/.env:BILLING_SERVICE_TOKEN" \
  "services/billing-service/.env:BILLING_SERVICE_TOKEN"

check_group "VOUCHER_SERVICE_TOKEN (voucher service)" \
  "services/voucher-service/.env:VOUCHER_SERVICE_TOKEN"

if [ "$fail" -ne 0 ]; then
  echo "${RED}✗ One or more shared secrets do not match.${RST}"
  exit 1
fi
echo "${GRN}✓ All cross-checkable shared secrets match.${RST}"
