# `ES256K` Test Vectors

This directory contains test vectors for the secp256k1 with SHA-256 signature scheme, which is a
part of the Elliptic Curve Digital Signature Algorithm (ECDSA) family of signature algorithms as
detailed in the Standards for Efficient Cryptography Group (SECG) publication
[SEC1](https://www.secg.org/sec1-v2.pdf).

The `ES256K` algorithm identifier is defined in
[RFC8812](https://datatracker.ietf.org/doc/html/rfc8812), which specifies the use of ECDSA with the
secp256k1 curve and the SHA-256 cryptographic hash function.

> [!IMPORTANT]
> All ECDSA signatures, regardless of the curve, are subject to signature malleability such that
> for every valid signature there is a "mirror" signature that's equally valid for the same message
> and public key. Read more
> [here]()
> about the practical implications and mitigation techniques.

## `sign`

Sign test vectors are detailed in a [JSON file](./sign.json). It includes cases for testing the
signing operation with the secp256k1 curve and SHA-256 hash function.

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

- TypeScript: [`Secp256k1.sign()`](https://github.com/TBD54566975/web5-js/blob/44c38a116dec0b357ca15d807eb513f819341e50/packages/crypto/src/primitives/secp256k1.ts#L547-L595)

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

- TypeScript: [`Secp256k1.verify()`](https://github.com/TBD54566975/web5-js/blob/44c38a116dec0b357ca15d807eb513f819341e50/packages/crypto/src/primitives/secp256k1.ts#L670-L724)

[RFC7517]: https://datatracker.ietf.org/doc/html/rfc7517
