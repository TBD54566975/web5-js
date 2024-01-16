# `Ed25519` Test Vectors

This directory contains test vectors for the `Ed25519` signature scheme, which is a part of the
Edwards-curve Digital Signature Algorithm (EdDSA) family of signature algorithms as detailed in
[RFC 8032](https://datatracker.ietf.org/doc/html/rfc8032).

## `sign`

Sign test vectors are detailed in a [JSON file](./sign.json). It includes cases for testing the
signing operation with the Ed25519 curve.

### Input

The `input` for the sign operation is an object with the following properties:

| Property | Description                                                          |
| -------- | -------------------------------------------------------------------- |
| `key`    | A JSON Web Key ([JWK][RFC7517]) object representing the private key. |
| `data`   | The data to be signed, as a byte array in hexadecimal string format. |

### Output

The `output` is a hexadecimal string representing the signature byte array produced by the signing
operation.

### Reference Implementations

Reference implementations for the sign operation can be found in the following SDK repositories:

- TypeScript: [`Ed25519.sign()`](https://github.com/TBD54566975/web5-js/blob/44c38a116dec0b357ca15d807eb513f819341e50/packages/crypto/src/primitives/ed25519.ts#L434-L468)

## `verify`

Verify test vectors are outlined in a [JSON file](./verify.json), encompassing both successful and unsuccessful signature verification cases.

### Input

The `input` for the verify operation includes:

| Property    | Description                                                                      |
| ----------- | -------------------------------------------------------------------------------- |
| `key`       | An JSON Web Key ([JWK][RFC7517]) object representing the public key.             |
| `signature` | The signature to verify, as a byte array in hexadecimal string format.           |
| `data`      | The original data that was signed, as a byte array in hexadecimal string format. |

### Output

The `output` is a boolean value indicating whether the signature verification was successful
(`true`) or not (`false`).

### Reference Implementations

Reference implementations for the verify operation can also be found in the following SDK
repositories:

- TypeScript: [`Ed25519.verify()`](https://github.com/TBD54566975/web5-js/blob/44c38a116dec0b357ca15d807eb513f819341e50/packages/crypto/src/primitives/ed25519.ts#L512-L547)

[RFC7517]: https://datatracker.ietf.org/doc/html/rfc7517
