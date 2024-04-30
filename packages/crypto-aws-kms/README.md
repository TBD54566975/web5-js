# Web5 Crypto AWS KMS Extension

| An extension for the [Web5 Crypto API][crypto-repo-link] to enable use of AWS KMS |
| --------------------------------------------------------------------------------- |

[![NPM Package][crypto-aws-kms-npm-badge]][crypto-aws-kms-npm-link]
[![NPM Downloads][crypto-aws-kms-downloads-badge]][crypto-aws-kms-npm-link]

[![Build Status][crypto-aws-kms-build-badge]][crypto-aws-kms-build-link]
[![Open Issues][crypto-aws-kms-issues-badge]][crypto-aws-kms-issues-link]
[![Code Coverage][crypto-aws-kms-coverage-badge]][crypto-aws-kms-coverage-link]

---

- [Introduction](#introduction)
  - [Supported Algorithms & Key Types](#supported-algorithms--key-types)
- [Getting Started](#getting-started)
  - [Node.js Package](#install-the-nodejs-package)
  - [Configure the AWS SDK](#configure-the-aws-sdk)
- [Contributing](#contributing)
- [Core Concepts](#usage)
  - [Key URIs](#key-uris)
  - [Using AWS KMS](#using-a-local-kms)
- [Customization](#customization)
  - [Configure the AWS SDK `KMSClient`](#configure-the-aws-sdk-kmsclient)

---

<a id="introduction"></a>

This JavaScript extension to the [Web5 Crypto API][crypto-repo-link] provides an interface to
leverage the cryptography capabilities offered by the Amazon Web Services
([AWS](https://aws.amazon.com)) Key Management System ([KMS](https://docs.aws.amazon.com/kms))
service. The extension was designed for building backend services and supports the
Node.js runtime environment. The key generation, hashing, and signature algorithm functions can
be used by [other libraries](https://github.com/TBD54566975/web5-js) in this monorepo when working
with Decentralized Identifiers ([DID](https://www.w3.org/TR/did-core/)) and Verifiable Credentials
([VC](https://w3c.github.io/vc-data-model/)).

### Supported Algorithms & Key Types

The following algorithms and key types are currently supported, with plans to expand its offerings
as the extension progresses towards a 1.0 release.

| Capability | Details   |
| ---------- | --------- |
| Signature  | ECDSA     |
| Hash       | SHA-256   |
| ECC Curves | secp256k1 |

## Getting Started

The Web5 Crypto AWS KMS extension is distributed as `@web5/crypto-aws-kms` via
[npmjs.com][crypto-aws-kms-npm-link] and [github.com][crypto-aws-kms-repo-link].

### Install the Node.js Package

This extension is designed and tested for the _active_ (`v20`) and _maintenance_ (`v18`)
[LTS releases](https://nodejs.org/en/about/previous-releases) of Node.js

Install the latest version of `@web5/crypto-aws-kms` using `npm` or your preferred package manager:

```shell
npm install @web5/crypto-aws-kms
```

Example ESM import:

```js
import { AwsKeyManager } from "@web5/crypto-aws-kms";
```

Example CJS require:

```js
const { AwsKeyManager } = require("@web5/crypto-aws-kms");
```

### Configure the AWS SDK

Interacting with the AWS service APIs via AWS SDKs and tools like AWS CLI requires configuration
with necessary credentials and settings. Credentials are essential for identity verification and
encrypting requests. AWS uses these to authenticate and authorize actions based on associated
permissions. Additionally, other configuration details determine request processing, endpoint
routing, and response interpretation.

Commonly, credentials and settings are provided through shared config and credentials files or
environment variables. These files support multiple profiles for various scenarios, with one set as
the `default`. Environment variables offer an alternative, allowing dynamic modification during
runtime.

Follow the steps in one of the following reference guides to supply the required credential and
configuration information to the
[AWS SDK for JavaScript](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/), which this
extension uses for all communication with the AWS KMS API.

- [Shared AWS config and credentials files](https://docs.aws.amazon.com/sdkref/latest/guide/file-format.html)
- [Environment variables](https://docs.aws.amazon.com/sdkref/latest/guide/environment-variables.html)

## Contributing

We welcome you to join our open source community. Whether you're new to open source or a seasoned
contributor, there's a place for you here. From coding to documentation, every contribution matters.
Check out our [contribution guide][contributing-link] for ways to get started.

For help, discussion about best practices, or to chat with others building on Web5 join our
[Discord Server][discord-link]:

[![discord-badge]][discord-link]

Remember, contributing is not just about code; it's about building together. Join us in shaping the
future of the Web!

## Core Concepts

### Key URIs

One of the core design principles for the SDKs in the Web5 ecosystem is the protection of private
key material. Instead of directly handling sensitive key information, our SDKs interact with
cryptographic keys through Key Management Systems (KMS) referenced by a unique identifier called a
**Key URI**. This approach ensures that private keys remain secure, while still allowing for
versatile cryptographic functionalities.

Each KMS assigns a unique identifier to a key when it is created. This identifier can be used to
form a Uniform Resource Identifier ([URI](https://datatracker.ietf.org/doc/html/rfc3986)) by adding
a prefix. The following table shows the format of supported **Key URIs**:

| Prefix        | Key URI Format                                   |
| ------------- | ------------------------------------------------ |
| `urn:jwk`     | `urn:jwk:<jwk-thumbprint>`                       |
| `arn:aws:kms` | `arn:aws:kms:<region>:<account-id>:key/<key-id>` |

All cryptographic keys are represented in JSON Web Key
([JWK](https://datatracker.ietf.org/doc/html/rfc7517)) format and the `jwk-thumbprint`, a
[standardized](https://datatracker.ietf.org/doc/html/rfc7638), deterministic, and unique hash of the
key, acts as a fingerprint, enabling consistent key referencing across all Web5 libraries without
exposing private key information. Additionally, AWS KMS assigns an Amazon Resource Name
([ARN](https://docs.aws.amazon.com/kms/latest/developerguide/find-cmk-id-arn.html)) to each
customer-managed key, which can be used interchangeably as a key identifier.

> [!INFORMATION]
> The advantage to using the `urn:jwk` **Key URI** format is that it enables interoperability
> between all Web5 SDKs and KMS providers. By using a standardized method to compute a thumbprint,
> different implementations will always generate the same thumbprint for any given JWK thereby
> ensuring consistent key referencing.

### Using AWS KMS

This extension to the [Web5 Crypto API][crypto-repo-link] enables use of the key management and
cryptographic features of the [AWS KMS](https://docs.aws.amazon.com/kms/) service. Key generation
and signing take place in the cloud, ensuring private keys never leave the secure AWS KMS
environment. Signature verification and hash computations, being non-sensitive operations, are
safely executed locally. This design choice balances security with flexibility, allowing for
efficient verification and hashing without compromising the confidentiality and integrity of the
private keys.

Start by instantiating an AWS KMS implementation of the `CryptoApi` interface:

```ts
import { AwsKeyManager } from "@web5/crypto-aws-kms";

const kms = new AwsKeyManager();
```

If not provided, a default instance of
[`KMSClient`](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/kms/) from the
[AWS SDK for JavaScript](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/) will be used. This
client signs and encrypts all communication with the AWS KMS API. See
[Configure the AWS SDK `KMSClient`](#configure-the-aws-sdk-kmsclient) for details on how modify
`KMSClient` configuration parameters at runtime.

Generate a random private key:

```ts
const privateKeyUri = await kms.generateKey({ algorithm: "ES256K" });
console.log(privateKeyUri);
// Output: urn:jwk:U01_M3_A9vMLOWixG-rlfC-_f3LLdurttn7c7d3_upU
```

Create an ECDSA signature over arbitrary data using the private key:

```ts
const data = new TextEncoder().encode("Message");
const signature = await kms.sign({
  keyUri: privateKeyUri,
  data,
});
console.log(signature);
// Output:
// Uint8Array(64) [
//   136, 145, 145,  76,  67,  27, 170, 230, 130, 222, 252,
//    87, 254,   7,  76, 140, 183,   0, 247, 144, 215,  46,
//    42,  81,  71,  76, 202,  14, 224,  15, 170, 132, 174,
//    27, 157, 198, 164, 143,  74, 229,  25,  70, 114, 192,
//    82,  61, 204,  80, 108, 253, 135,  98, 197, 145,  69,
//   120, 146,  61, 183, 245,   9,  27, 157,  27
// ]
```

Get the public key in JWK format:

```ts
const publicKey = await kms.getPublicKey({ keyUri: privateKeyUri });
console.log(publicKey);
// Output:
// {
//   kty: "EC",
//   crv: "secp256k1",
//   alg: "ES256K",
//   kid: "U01_M3_A9vMLOWixG-rlfC-_f3LLdurttn7c7d3_upU",
//   x: "tgOFTPRSUPqMLu9pBTz5dLHNh_op4SZ6zmc6ZmF0CzQ",
//   y: "6qju4NwZFqlBW78fKMB4K0zJbfXYV3SA8UPAI-pWLe0"
// }
```

Verify the signature using the public key:

```ts
const isValid = await kms.verify({
  key: publicKey,
  signature,
  data,
});
console.log(isValid);
// Output: true
```

Compute the hash digest of arbitrary data:

```ts
const data = new TextEncoder().encode("Message");
const hash = await kms.digest({ algorithm: "SHA-256", data });
console.log(hash);
// Output:
// Uint8Array(32) [
//     8, 187,  94,  93, 110, 170, 193,  4,
//   158, 222,   8, 147, 211,  14, 208, 34,
//   177, 164, 217, 181, 180, 141, 180, 20,
//   135,  31,  81, 201, 203,  53,  40, 61
// ]
```

## Customization

### Configure the AWS SDK `KMSClient`

By default, `AwsKeyManager` creates an instance of
[`KMSClient`](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/kms/) which uses the
credential and configuration information supplied in shared AWS `config` and `credentials` files or
environment variables. To set the region, credentials, and other options used by `KMSClient` at
runtime, a custom instance can be passed to the `AwsKeyManager` constructor.

For example, to set the AWS region to which the client will send requests:

```typescript
import { KMSClient } from "@aws-sdk/client-kms";
import { AwsKeyManager } from "@web5/crypto-aws-kms";

const kmsClient = new KMSClient({ region: "us-east-1" });
const kms = new AwsKeyManager({ kmsClient });
```

Additional configuration fields of the `KMSClient` class constructor are described in the
[`KMSClientConfig`](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-kms/Interface/KMSClientConfig/)
configuration type.

## Project Resources

| Resource                                | Description                                                                   |
| --------------------------------------- | ----------------------------------------------------------------------------- |
| [CODEOWNERS][codeowners-link]           | Outlines the project lead(s)                                                  |
| [CODE OF CONDUCT][code-of-conduct-link] | Expected behavior for project contributors, promoting a welcoming environment |
| [CONTRIBUTING][contributing-link]       | Developer guide to build, test, run, access CI, chat, discuss, file issues    |
| [GOVERNANCE][governance-link]           | Project governance                                                            |
| [LICENSE][license-link]                 | Apache License, Version 2.0                                                   |

[crypto-aws-kms-npm-badge]: https://img.shields.io/npm/v/@web5/crypto-aws-kms.svg?style=flat&color=blue&santize=true
[crypto-aws-kms-npm-link]: https://www.npmjs.com/package/@web5/crypto-aws-kms
[crypto-aws-kms-downloads-badge]: https://img.shields.io/npm/dt/@web5/crypto-aws-kms?&color=blue
[crypto-aws-kms-build-badge]: https://img.shields.io/github/actions/workflow/status/TBD54566975/web5-js/tests-ci.yml?branch=main&label=build
[crypto-aws-kms-build-link]: https://github.com/TBD54566975/web5-js/actions/workflows/tests-ci.yml
[crypto-aws-kms-coverage-badge]: https://img.shields.io/codecov/c/gh/TBD54566975/web5-js/main?style=flat&token=YI87CKF1LI
[crypto-aws-kms-coverage-link]: https://app.codecov.io/github/TBD54566975/web5-js/tree/main/packages%2Fcrypto-aws-kms
[crypto-aws-kms-issues-badge]: https://img.shields.io/github/issues/TBD54566975/web5-js/package:%20crypto-aws-kms?label=issues
[crypto-aws-kms-issues-link]: https://github.com/TBD54566975/web5-js/issues?q=is%3Aopen+is%3Aissue+label%3A"package%3A+crypto-aws-kms"
[crypto-repo-link]: https://github.com/TBD54566975/web5-js/tree/main/packages/crypto
[crypto-aws-kms-repo-link]: https://github.com/TBD54566975/web5-js/tree/main/packages/crypto-aws-kms
[codeowners-link]: https://github.com/TBD54566975/web5-js/blob/main/CODEOWNERS
[code-of-conduct-link]: https://github.com/TBD54566975/web5-js/blob/main/CODE_OF_CONDUCT.md
[contributing-link]: https://github.com/TBD54566975/web5-js/blob/main/CONTRIBUTING.md
[governance-link]: https://github.com/TBD54566975/web5-js/blob/main/GOVERNANCE.md
[license-link]: https://github.com/TBD54566975/web5-js/blob/main/LICENSE
[discord-badge]: https://img.shields.io/discord/937858703112155166?color=5865F2&logo=discord&logoColor=white
[discord-link]: https://discord.com/channels/937858703112155166/969272658501976117
