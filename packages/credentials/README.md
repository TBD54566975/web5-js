## Credentials


### VerifiableCredential Creation and Verification

The `VerifiableCredential` class provides methods for the creation, handling, and signing of Verifiable Credentials (VCs) in JWT format.
- **VerifiableCredential.create**: Creates a Verifiable Credential (VC) in JWT format.
- **VerifiableCredential.validatePayload**: Validates the structure and integrity of a Verifiable Credential payload.
- **VerifiableCredential.verify**: Verifies the integrity of a VC JWT.
- **VerifiableCredential.decode**: Decodes a VC JWT into its constituent parts: header, payload, and signature.

### VP Creation and Verification

The `VerifiablePresentation` class provides utility methods for creation and handling Verifiable Presentations (VPs) in JWT format.
- **VerifiablePresentation.create**: Creates a Verifiable Presentation (VP) in JWT format from a presentation definition and set of credentials.
- **VerifiablePresentation.verify**: Verifies the integrity of a VP JWT.
- **VerifiablePresentation.validatePayload**: Validates the structure and integrity of a Verifiable Presentation payload.
- **VerifiablePresentation.decode**: Decodes a VP JWT into its constituent parts: header, payload, and signature.

### Presentation Exchange Helpers

These methods assist in evaluating verifiable credentials and presentations against specified presentation definitions.

- **VerifiableCredential.evaluateCredentials**: Evaluates a set of verifiable credentials against a specified presentation definition.
- **VerifiablePresentation.evaluatePresentation**: Evaluates a given Verifiable Presentation against a specified presentation definition.

### Verifiable Credentials and Presentations Library
Note: you do not have to use the functions to create SSI objects, you can instead create them yourselves with the boilerplate types in types.ts

```typescript
      const vc: VerifiableCredentialV1 = {
        '@context'          : ['https://www.w3.org/2018/credentials/v1'],
        'id'                : 'my-cred',
        'type'              : ['VerifiableCredential'],
        'issuer'            : 'did:key:123',
        'issuanceDate'      : getCurrentXmlSchema112Timestamp(),
        'credentialSubject' : {
          'btcAddress': 'btcAddress123'
        }
      };
```
### Signer Options Object

The `Signer` represents a function that takes a byte array as input and returns a promise that resolves to a byte array, representing the signature of the input data.

### Type Definition

```typescript
type Signer = (data: Uint8Array) => Promise<Uint8Array>;
```

