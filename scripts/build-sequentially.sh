#!/bin/bash

# Array of folders to loop through
folders=(
  "packages/crypto"
  "packages/crypto-aws-kms"
  "packages/common"
  "packages/dids"
  "packages/credentials"
  "packages/agent"
  "packages/identity-agent"
  "packages/proxy-agent"
  "packages/user-agent"
  "packages/api"
)

# Get the directory of the script
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Navigate to the root directory (assumes the script is in /scripts/)
root_dir="$(dirname "$script_dir")"
cd "$root_dir" || { echo "Failed to navigate to root directory"; exit 1; }

# Loop through each folder
for folder in "${folders[@]}"; do
  echo "Building in $folder"
  cd "$folder" || { echo "Failed to navigate to $folder"; exit 1; }
  pnpm build || { echo "Build failed in $folder"; exit 1; }
  cd "$root_dir"  # Return to the root directory
done

echo "All builds completed successfully."