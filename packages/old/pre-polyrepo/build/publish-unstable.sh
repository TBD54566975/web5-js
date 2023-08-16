#!/bin/bash

# This script handles the publishing of the current 
# commits as an npm based unstable package

# Add dev dependencies to current path
export PATH="$PATH:node_modules/.bin"

# Fetch the current version from the package.json
new_version=$(node -pe "require('./package.json').version")

# Fetch the new unstable version
new_unstable_version=$new_version"-unstable.$(git rev-parse --short HEAD)-$(date +'%Y.%m.%d-%H-%M-%S') "

# Set the unstable version in the package.json
npm version $new_unstable_version --no-git-tag-version

# Publish the unstable version
npm publish --tag unstable --no-git-tag-version --access public

# Reset changes to the package.json
git checkout -- package.json
git checkout -- package-lock.json