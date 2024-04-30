#!/bin/bash

mkdir -p .tbdocs

SUMMARY_FILE=.tbdocs/summary.md

rm -f ${SUMMARY_FILE}
touch ${SUMMARY_FILE}

INPUT_ENTRY_POINTS="
- file: packages/api/src/index.ts
  docsReporter: typedoc
  docsGenerator: typedoc-html
  readmeFile: packages/api/README.md
- file: packages/crypto/src/index.ts
  docsReporter: typedoc
  docsGenerator: typedoc-html
  readmeFile: packages/crypto/README.md
- file: packages/crypto-aws-kms/src/index.ts
  docsReporter: typedoc
  docsGenerator: typedoc-html
  readmeFile: packages/crypto-aws-kms/README.md
- file: packages/dids/src/index.ts
  docsReporter: typedoc
  docsGenerator: typedoc-html
  readmeFile: packages/dids/README.md
- file: packages/credentials/src/index.ts
  docsReporter: typedoc
  docsGenerator: typedoc-html
  readmeFile: packages/credentials/README.md
"

# Default docker image
DOCKER_IMAGE="ghcr.io/tbd54566975/tbdocs:main"

# Check for --local-image flag and update DOCKER_IMAGE if present
for arg in "$@"
do
    if [ "$arg" == "--local-image" ]; then
        DOCKER_IMAGE="tbdocs:latest"
    fi
done

docker run -v $(pwd):/github/workspace/ \
   --workdir /github/workspace          \
   -e "GITHUB_REPOSITORY=TBD54566975/web5-js" \
   -e "GITHUB_STEP_SUMMARY=${SUMMARY_FILE}" \
   -e "INPUT_ENTRY_POINTS=${INPUT_ENTRY_POINTS}" \
   -e "INPUT_GROUP_DOCS=true" \
   ${DOCKER_IMAGE}