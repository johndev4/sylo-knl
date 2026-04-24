#!/bin/bash

# Governance Audit: Log session start with governance context

set -euo pipefail

if [[ "${SKIP_GOVERNANCE_AUDIT:-}" == "true" ]]; then
  exit 0
fi

mkdir -p logs/copilot/governance

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
CWD=$(pwd)
LEVEL="${GOVERNANCE_LEVEL:-standard}"

# Read stdin to prevent broken pipe if called without input
cat > /dev/null

jq -Rn \
  --arg timestamp "$TIMESTAMP" \
  --arg cwd "$CWD" \
  --arg level "$LEVEL" \
  '{"timestamp":$timestamp,"event":"session_start","governance_level":$level,"cwd":$cwd}' \
  >> logs/copilot/governance/audit.log

echo "🛡️ Governance audit active (level: $LEVEL)"
exit 0
