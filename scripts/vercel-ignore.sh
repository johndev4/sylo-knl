#!/bin/bash

# 1. Skip if it is a Preview environment
if [ "$VERCEL_ENV" != "production" ]; then
  echo "🛑 Cancelled: This is a preview environment."
  exit 0 
fi

# 2. Check if the specific folder changed (e.g., ./src)
git diff HEAD^ HEAD --quiet src/ public/ next.config.ts package.json

if [ $? -eq 0 ]; then
  echo "🛑 Cancelled: No changes detected in the watched folder."
  exit 0 
else
  echo "✅ Proceeding: Production environment with folder changes."
  exit 1 
fi
