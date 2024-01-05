mkdir -p .tbdocs

SUMMARY_FILE=.tbdocs/summary.md

rm -f ${SUMMARY_FILE}
touch ${SUMMARY_FILE}

INPUT_ENTRY_POINTS="
- file: packages/api/src/index.ts
  docsGenerator: typedoc-html
  readmeFile: packages/api/README.md
  docsReporter: api-extractor
- file: packages/crypto/src/index.ts
  docsGenerator: typedoc-html
  readmeFile: packages/crypto/README.md
  docsReporter: api-extractor
  docsReporterIgnore:
  - extractor:ae-missing-release-tag
  - docs:tsdoc-escape-greater-than
  - docs:tsdoc-at-sign-in-word
- file: packages/crypto-aws-kms/src/index.ts
  docsGenerator: typedoc-html
  readmeFile: packages/crypto-aws-kms/README.md
  docsReporter: api-extractor
  docsReporterIgnore:
  - extractor:ae-missing-release-tag
  - docs:tsdoc-escape-greater-than
  - docs:tsdoc-at-sign-in-word
"

docker run -v $(pwd):/github/workspace/ \
   --workdir /github/workspace          \
   -e "GITHUB_REPOSITORY=TBD54566975/web5-js" \
   -e "GITHUB_STEP_SUMMARY=${SUMMARY_FILE}" \
   -e "INPUT_ENTRY_POINTS=${INPUT_ENTRY_POINTS}" \
   -e "INPUT_GROUP_DOCS=true" \
   ghcr.io/tbd54566975/tbdocs:main
