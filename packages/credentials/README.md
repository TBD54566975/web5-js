## Credentials


### VC Creation and Verification

The `VC` class provides methods for the creation, handling, and signing of Verifiable Credentials (VCs) in JWT format.

- **VC.createVerifiableCredentialJwt**: Creates a Verifiable Credential (VC) in JWT format.
- **VC.decodeVerifiableCredentialJwt**: Decodes a VC JWT into its constituent parts: header, payload, and signature.
- **VC.verifyVerifiableCredentialJwt**: Verifies the integrity of a VC JWT.
- **VC.validateVerifiableCredentialPayload**: Validates the structure and integrity of a Verifiable Credential payload.

### VP Creation and Verification

The `VP` class provides utility methods for creation and handling Verifiable Presentations (VPs) in JWT format.

- **VP.createVerifiablePresentationJwt**: Creates a Verifiable Presentation (VP) in JWT format from a presentation definition and set of credentials.
- **VP.decodeVerifiablePresentationJwt**: Decodes a VP JWT into its constituent parts: header, payload, and signature.
- **VP.verifyVerifiablePresentationJwt**: Verifies the integrity of a VP JWT.
- **VP.validateVerifiablePresentationPayload**: Validates the structure and integrity of a Verifiable Presentation payload.

### Presentation Exchange Helpers

These methods assist in evaluating verifiable credentials and presentations against specified presentation definitions.

- **VC.evaluateCredentials**: Evaluates a set of verifiable credentials against a specified presentation definition.
- **VP.evaluatePresentation**: Evaluates a given Verifiable Presentation against a specified presentation definition.

### Verifiable Credentials and Presentations Library
Note: you do not have to use the functions to create SSI objects, you can instead create them yourselves with the boilerplate types in types.ts

### Signer Options Object

The `Signer` represents a function that takes a byte array as input and returns a promise that resolves to a byte array, representing the signature of the input data.

### Type Definition

```typescript
type Signer = (data: Uint8Array) => Promise<Uint8Array>;
```

