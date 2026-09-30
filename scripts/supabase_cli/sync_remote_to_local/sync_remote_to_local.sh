#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status
set -e

# Load environment variables from .env if present
if [ -f .env ]; then
  set -o allexport
  source .env
  set +o allexport
else
  echo "Error: .env not found"
  exit 1
fi

# Validate required environment variables
if [ -z "$SUPABASE_API_TOKEN" ]; then
  echo "Error: SUPABASE_API_TOKEN is not set in .env"
  exit 1
fi

if [ -z "$SUPABASE_PROJECT_REF_ID" ]; then
  echo "Error: SUPABASE_PROJECT_REF_ID is not set in .env"
  exit 1
fi

# Resolve directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

# Define the absolute path to the seed file inside the project root
SEED_SQL_FILE="$PROJECT_ROOT/supabase/seed.sql"

# Run core commands
npx supabase@latest login --token "$SUPABASE_API_TOKEN"
npx supabase@latest link --project-ref "$SUPABASE_PROJECT_REF_ID"
npx supabase@latest db dump --linked --data-only -f "$SEED_SQL_FILE"
npx supabase@latest db reset --local

# Handle optional cleanup
if [[ "$1" == "--clean" || "$1" == "-c" ]]; then
  rm -f "$SEED_SQL_FILE"
  echo "Cleaned up $SEED_SQL_FILE"
else
  read -p "Do you want to delete $SEED_SQL_FILE? (y/N): " choice
  case "$choice" in 
    [yY][eE][sS]|[yY]) 
      rm -f "$SEED_SQL_FILE"
      echo "Cleaned up $SEED_SQL_FILE"
      ;;
    *)
      echo "Kept $SEED_SQL_FILE"
      ;;
  esac
fi
