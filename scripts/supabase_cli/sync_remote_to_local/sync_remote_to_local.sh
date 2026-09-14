#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# Load environment variables from .env if present
if [ -f .env ]; then
  set -o allexport
  source .env
  set +o allexport
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

# Define the full path to the seed file
SEED_SQL_FILE="../../supabase/seed.sql"

# Run core commands
npx supabase@latest login --token "$SUPABASE_API_TOKEN"
npx supabase@latest link --project-ref "$SUPABASE_PROJECT_REF_ID"
npx supabase@latest db dump --linked --data-only -f ./supabase/seed.sql
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