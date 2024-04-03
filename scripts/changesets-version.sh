#!/bin/bash

IGNORE_API_RELEASE=""

# force api release if argument is passed
FORCE_API_RELEASE=$1

# if there is no PR, then we release without the Web5 API
if [[ -z "$FORCE_API_RELEASE" ]]; then
    echo "This is a release without the Web5 API"
    IGNORE_API_RELEASE="--ignore @leordev-web5/api"
else
    echo "Web5 API Release DETECTED"
fi

CMD="pnpm changeset version $IGNORE_API_RELEASE"
echo "Running: $CMD"
$CMD

# update pnpm-lock.yaml
pnpm install --no-frozen-lockfile