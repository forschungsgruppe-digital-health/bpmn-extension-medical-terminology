#!/usr/bin/env bash
#
# Validate the BPMN *core* of each file against the official OMG BPMN 2.0 XSD
# (Semantic / DI / DC), shipped with bpmn-moddle.
#
# SCOPE: this checks structural standard-conformance ONLY. Custom term:
# data lives in <extensionElements> and is accepted by the schema via
# processContents="lax" — i.e. a green XSD result does NOT mean the extensions
# are valid. Extension correctness is checked by tools/moddle-roundtrip.mjs.
#
# Default mode is INFORMATIONAL: it prints per-file PASS/FAIL and a summary, then
# exits 0 even on failures (so it never blocks on the standard XSD's known
# limitations w.r.t. extensions). Pass --strict to make a schema-invalid core
# fail the run (exit 1).
#
# Requires: node (to locate the XSD + file list) and xmllint (libxml2).
# Usage: tools/validate-xsd.sh [--strict] [file.bpmn ...]

set -uo pipefail

STRICT=0
FILE_ARGS=()
for arg in "$@"; do
  if [ "$arg" = "--strict" ]; then
    STRICT=1
  else
    FILE_ARGS+=("$arg")
  fi
done

if ! command -v node >/dev/null 2>&1; then
  echo "validate-xsd: node not found on PATH — skipping XSD validation (informational)."
  exit 0
fi

if ! command -v xmllint >/dev/null 2>&1; then
  echo "validate-xsd: xmllint (libxml2) not found — skipping XSD validation (informational)."
  echo "             install it via: apt-get install libxml2-utils  /  brew install libxml2"
  exit 0
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT" || exit 1

# Locate the BPMN20.xsd shipped with bpmn-moddle.
MODDLE_PKG="$(node -e "process.stdout.write(require.resolve('bpmn-moddle/package.json'))" 2>/dev/null)"
if [ -z "$MODDLE_PKG" ]; then
  echo "validate-xsd: bpmn-moddle not installed — skipping (run npm install --legacy-peer-deps)."
  exit 0
fi
XSD="$(dirname "$MODDLE_PKG")/resources/bpmn/xsd/BPMN20.xsd"
if [ ! -f "$XSD" ]; then
  echo "validate-xsd: BPMN20.xsd not found at $XSD — skipping."
  exit 0
fi

# Resolve the file list (explicit args, else discovery) via the shared helper.
# (Plain `while read` loop — portable to bash 3.2 on macOS, which lacks `mapfile`.)
FILES=()
while IFS= read -r line; do
  [ -n "$line" ] && FILES+=("$line")
done < <(node "$SCRIPT_DIR/bpmn-files.mjs" "${FILE_ARGS[@]+"${FILE_ARGS[@]}"}")

if [ "${#FILES[@]}" -eq 0 ]; then
  echo "validate-xsd: no .bpmn files found — nothing to validate."
  exit 0
fi

echo "validate-xsd: validating ${#FILES[@]} file(s) against BPMN20.xsd (core only)…"
echo

FAIL=0
for f in "${FILES[@]}"; do
  if out="$(xmllint --noout --schema "$XSD" "$f" 2>&1)"; then
    echo "✓ $f"
  else
    echo "✖ $f"
    echo "$out" | sed 's/^/    /' | head -8
    FAIL=$((FAIL + 1))
  fi
done

echo
if [ "$FAIL" -gt 0 ]; then
  echo "validate-xsd: $FAIL file(s) failed the BPMN-core schema."
  echo "validate-xsd: NOTE — extension content is not validated here (lax); see moddle-roundtrip."
  if [ "$STRICT" -eq 1 ]; then
    exit 1
  fi
  echo "validate-xsd: informational mode — not failing the run (use --strict to enforce)."
  exit 0
fi
echo "validate-xsd: OK (BPMN core is schema-valid)."
