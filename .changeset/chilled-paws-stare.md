---
"@web5/agent": patch
---

security enhancements: use separate DIDs for signing, encryption, verification of web5 connect
feature enhancements: prepare code for the option of exporting the DWA's DID to a wallet

breaking changes for wallet authors.

web5 connect's `getAuthRequest()` now returns an object which include both the authRequest and a DID:

```ts
{
  authRequest: Web5ConnectAuthRequest;
  clientEcdhDid: DidResolutionResult;
}
```

web5 connect's `submitAuthResponse()` now requires that the did received from `getAuthRequest()` is passed in to the method at position 4:

```ts
async function submitAuthResponse(
  selectedDid: string,
  authRequest: Web5ConnectAuthRequest,
  randomPin: string,
  clientEcdhDid: DidResolutionResult,
  agent: Web5Agent
) { ... }
```
