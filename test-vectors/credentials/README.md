# `credentials` Test Vectors

This directory contains test vectors for the `credentials` module. It's important to note that the test vectors ensure
that
the implementations are following the [Verifiable Credential 1.1 specification](https://www.w3.org/TR/vc-data-model/).

## `create`

Create test vectors are available in the [json file](./create.json), which contains success and failure test cases.

### Input

The value of `input` is an object with the following properties.

| Property           | Description                                                                                                              |
|--------------------|--------------------------------------------------------------------------------------------------------------------------|
| `signerDidUri`     | the did uri that will be used to sign the verifiable credential created.                                                 |
| `signerPrivateJwk` | Json Web Key object associated with the `signerDidUri` which will be used for signing `credential`.                      |
| `credential`       | A JSON object that represents a Verifiable Credential 1.1 according to the [spec](https://www.w3.org/TR/vc-data-model/). |

### Output

The value of `output` is a Verifiable Credential 1.1 encoded as a JSON Web Token (
see [here](https://www.w3.org/TR/vc-data-model/#json-web-token) for more details). The signature is created using
the `signerPrivateJwk` private key.

### Reference implementations

The reference implementations for:

* `create_success` can be
  found [here](https://github.com/TBD54566975/web5-kt/blob/466e8d8ca9771ae3a98767e5a4a79ac7b1e7a5d8/credentials/src/test/kotlin/web5/sdk/credentials/VerifiableCredentialTest.kt#L244).
* `create_failure` can be
  found [here](https://github.com/TBD54566975/web5-kt/blob/466e8d8ca9771ae3a98767e5a4a79ac7b1e7a5d8/credentials/src/test/kotlin/web5/sdk/credentials/VerifiableCredentialTest.kt#L285).

## `verify`

Verify test vectors are available in the [json file](./verify.json), which contains success and failure test cases.

### Input

The value of `input` is an object with the single property `vcJwt`. The value of `vcJwt` is a Verifiable Credential 1.1
encoded as a JSON Web Token (see [here](https://www.w3.org/TR/vc-data-model/#json-web-token) for more details).

### Output

Output is empty, signalling that no exception nor errors should be thrown for success cases. For failure cases, the
`errors` property is set to `true`, signalling that an exception or an error should be returned or thrown.

### Reference implementations

The reference implementations for:

* `verify_success` can be
  found [here](https://github.com/TBD54566975/web5-kt/blob/466e8d8ca9771ae3a98767e5a4a79ac7b1e7a5d8/credentials/src/test/kotlin/web5/sdk/credentials/VerifiableCredentialTest.kt#L261).
* `verify_failure` can be
  found [here](https://github.com/TBD54566975/web5-kt/blob/466e8d8ca9771ae3a98767e5a4a79ac7b1e7a5d8/credentials/src/test/kotlin/web5/sdk/credentials/VerifiableCredentialTest.kt#L273).
