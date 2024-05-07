#!/bin/bash

CHANGESET_STATUS=$(pnpm changeset status)

ALL_RELEASES_COUNT=$(echo $CHANGESET_STATUS | grep -o "web5/" | wc -l)
echo "ALL_RELEASES_COUNT: $ALL_RELEASES_COUNT"

API_RELEASES_COUNT=$(echo $CHANGESET_STATUS | grep -o "web5/api" | wc -l)
echo "API_RELEASES_COUNT: $API_RELEASES_COUNT"

# check if it has changesets
if [[ $ALL_RELEASES_COUNT == 0 ]]; then
    echo "No changesets detected, proceed as normal..."
    exit 0
fi

# check if it has any api releases to be handled
if [[ $API_RELEASES_COUNT == 0 ]]; then
    echo "No API releases detected, proceed as normal..."
    exit 0
fi

# manual kick api release trigger input
echo "KICK_API_RELEASE: $KICK_API_RELEASE"

# check for api release labeled PRs
API_RELEASE_PR=$(gh pr list \
        --base 'main' \
        --head 'changeset-release/main' \
        --json title,labels,number \
        --jq '[.[] | select(.labels[]?.name == "api-release")] | first | .number')
echo "API_RELEASE_PR: $API_RELEASE_PR"

if [[ -n $API_RELEASE_PR || $KICK_API_RELEASE == "true" ]]; then
    echo "@web5/api release DETECTED"
    RELEASE_WEB5_API="true"
    echo "release_web5_api=$RELEASE_WEB5_API" >> $GITHUB_OUTPUT
    exit 0
fi

if [[ $API_RELEASES_COUNT == $ALL_RELEASES_COUNT ]]; then
    echo "Only @web5/api release detected, checking for API Release labeled PR or Kick trigger..."
    if [[ -z $RELEASE_WEB5_API ]]; then
        echo "No API Release labeled PR found and KICK_API_RELEASE is false, skipping the PR creation..."
        # removes all the api changesets files to ensure a Version Packages PR is not created
        find .changeset -type f -name "*.md" ! -name "README.md" -exec rm {} +
        exit 0
    fi
fi
