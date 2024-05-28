---
"@web5/credentials": patch
---

## Summary:
This patch updates the JWT verification logic for did:dht and adds support for status list credentials.

## Changes:
### JWT Verification for did:dht:

* Updated the algorithm (alg) check to ensure that the alg value in the JWT header matches the normalized alg value in the public key JWK.

### Status List Credentials:

`StatusListCredential` represents a digitally verifiable status list credential according to the
[W3C Verifiable Credentials Status List v2021](https://www.w3.org/community/reports/credentials/CG-FINAL-vc-status-list-2021-20230102/).

* Added support for creation of Status List Credentials
* Added support for verifying if a credential is revoked in it's corresponding status list credential.
