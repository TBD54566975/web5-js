#!/bin/bash

IGNORE_API_RELEASE=""

# check if there is a changeset PR with the api-release label
API_RELEASE_PR=$(gh pr list \
                --base 'main' \
                --head 'changeset-release/main' \
                --json title,labels,number \
                --jq '[.[] | select(.labels[]?.name == "api-release")] | first | .number')

# if there is no PR, then we release without the Web5 API
if [[ -z "$API_RELEASE_PR" ]]; then
    echo "This is a release without the Web5 API"
    IGNORE_API_RELEASE="--ignore @web5/api"
else
    echo "Web5 API Release DETECTED"
fi

npx changeset version $IGNORE_API_RELEASE

# update package-lock.json
npm i --package-lock-only