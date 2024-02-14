# `@web5/credentials` <!-- omit in toc -->

The `@web5/credentials` package provides the following functionality:
* creation, signing, verification, and general processing of [Verifiable Credentials (VCs)](https://www.google.com/search?q=w3c+verifiable+credentials&rlz=1C5GCEM_enPK1033PK1033&oq=w3c+verifiable+credentials&gs_lcrp=EgZjaHJvbWUyBggAEEUYOTIGCAEQRRg7MgYIAhBFGDvSAQgzMTIwajBqN6gCALACAA&sourceid=chrome&ie=UTF-8). 
* [Presentation Exchange](https://identity.foundation/presentation-exchange/) evaluation

# Table of Contents <!-- omit in toc -->

- [`VerifiableCredential`](#verifiablecredential)
  - [Features](#features)
  - [Usage](#usage)
    - [Creating a Verifiable Credential](#creating-a-verifiable-credential)
    - [Signing a Verifiable Credential](#signing-a-verifiable-credential)
    - [Verifying a Verifiable Credential](#verifying-a-verifiable-credential)
    - [Parsing a JWT into a Verifiable Credential](#parsing-a-jwt-into-a-verifiable-credential)
  - [`PresentationExchange`](#presentationexchange)
    - [Features](#features-1)
    - [Usage](#usage-1)
    - [Selecting Credentials](#selecting-credentials)
    - [Satisfying a Presentation Definition](#satisfying-a-presentation-definition)
    - [Create Presentation From Credentials](#create-presentation-from-credentials)
    - [Validate Definition](#validate-definition)
    - [Validate Submission](#validate-submission)
    - [Validate Presentation](#validate-presentation)


# `VerifiableCredential`

## Features

* Create Verifiable Credentials with flexible data types.
* Sign credentials using decentralized identifiers (DIDs).
* Verify the integrity and authenticity of VCs encoded as JSON Web Tokens (JWTs).
* Parse JWT representations of VCs into VerifiableCredential instances.

## Usage

### Creating a Verifiable Credential

Create a new `VerifiableCredential` with the following parameters:

- `type`: Type of the credential.
- `issuer`: Issuer URI.
- `subject`: Subject URI.
- `data`: Credential data.
- `expirationDate?`: (optinal) Expiration Date

```javascript
class StreetCredibility {
  constructor(localRespect, legit) {
    this.localRespect = localRespect;
    this.legit = legit;
  }
}

const vc = await VerifiableCredential.create({
  type: "StreetCred",
  issuer: "did:example:issuer",
  subject: "did:example:subject",
  data: new StreetCredibility("high", true)
});
```

### Signing a Verifiable Credential
Sign a `VerifiableCredential` with a DID:

- `did`: The did that is signing the VC

First create a `Did` object as follows:

```javascript
import { DidKey } from '@web5/dids';
const issuer: BearerDid = await DidKey.create();
```

Then sign the VC using the `did` object
```javascript
const vcJwt = await vc.sign({ did: issuer });
```

### Verifying a Verifiable Credential
Verify the integrity and authenticity of a Verifiable Credential

- `vcJwt`: The VC in JWT format as a String.

```javascript
try {
  await VerifiableCredential.verify({ vcJwt: signedVcJwt })
  console.log("VC Verification successful!")
} catch (e: Error) {
  console.log("VC Verification failed: ${e.message}")
}
```

### Parsing a JWT into a Verifiable Credential
Parse a JWT into a `VerifiableCredential` instance

`vcJwt`: The VC JWT as a String.

```javascript
const vc = VerifiableCredential.parseJwt({ vcJwt: signedVcJwt })
```

## `PresentationExchange`

`PresentationExchange` is designed to facilitate the creation of a Verifiable Presentation by providing tools to select and validate Verifiable Credentials against defined criteria.

### Features

- Select credentials that satisfy a given presentation definition.
- Validate if a Verifiable Credential JWT satisfies a Presentation Definition.
- Validate input descriptors within Presentation Definitions.


### Usage

### Selecting Credentials
Select Verifiable Credentials that meet the criteria of a given presentation definition.

- `vcJwts`: The list of Verifiable Credentials to select from.
- `presentationDefinition` The Presentation Definition to match against.

This returns a list of the vcJwts that are acceptable in the presentation definition.
```javascript
const selectedCredentials = PresentationExchange.selectCredentials({
    vcJwts: signedVcJwts,
    presentationDefinition: presentationDefinition
})
```

### Satisfying a Presentation Definition
Validate if a Verifiable Credential JWT satisfies the given presentation definition. Will return an error if the evaluation results in warnings or errors.

- `vcJwts`: The list of Verifiable Credentials to select from.
- `presentationDefinition` The Presentation Definition to match against.

```javascript 
try {
  PresentationExchange.satisfiesPresentationDefinition({ vcJwts: signedVcJwts, presentationDefinition: presentationDefinition })
  console.log("vcJwts satisfies Presentation Definition!")
} catch (e: Error) {
  console.log("Verification failed: ${e.message}")
}
```

### Create Presentation From Credentials
Creates a presentation from a list of Verifiable Credentials that satisfy a given presentation definition. This function initializes the Presentation Exchange (PEX) process, validates the presentation definition, evaluates the credentials against the definition, and finally constructs the presentation result if the evaluation is successful.

- `vcJwts`: The list of Verifiable Credentials to select from.
- `presentationDefinition` The Presentation Definition to match against.

```javascript
const presentationResult = PresentationExchange.createPresentationFromCredentials({ vcJwts: signedVcJwts, presentationDefinition: presentationDefinition })
```

### Validate Definition
This method validates whether an object is usable as a presentation definition or not.

- `presentationDefinition` The Presentation Definition to validate

```javascript
const valid = PresentationExchange.validateDefinition({ presentationDefinition })
```

### Validate Submission
This method validates whether an object is usable as a presentation submission or not.

- `presentationSubmission` The Presentation Submission to validate 

```javascript
const valid = PresentationExchange.validateSubmission({ presentationSubmission })
```

### Validate Presentation
Evaluates a presentation against a presentation definition.

- `presentationDefinition` The Presentation Definition to validate
- `presentation` The Presentation

```javascript
const evaluationResults = PresentationExchange.evaluatePresentation({ presentationDefinition, presentation })
```