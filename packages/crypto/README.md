# Web5 Crypto API

| A cryptography and JOSE library for building secure Web5 applications |
| --------------------------------------------------------------------- |

[![NPM Package][crypto-npm-badge]][crypto-npm-link]
[![NPM Downloads][crypto-downloads-badge]][crypto-npm-link]

[![Build Status][crypto-build-badge]][crypto-build-link]
[![Open Issues][crypto-issues-badge]][crypto-issues-link]
[![Code Coverage][crypto-coverage-badge]][crypto-coverage-link]

---

- [Introduction](#introduction)
  - [Supported Algorithms & Key Types](#supported-algorithms--key-types)
  - [Extensions](#extensions)
- [Getting Started](#getting-started)
  - [Node.js](#nodejs)
  - [Web Browsers](#web-browsers)
  - [React Native](#react-native)
- [Contributing](#contributing)
- [Core Concepts](#usage)
  - [Key URIs](#key-uris)
  - [Using a Local KMS](#using-a-local-kms)
  - [JSON Web Key (JWK)](#json-web-key-jwk)
  - [Random Number Generation](#random-number-generation)
- [Customization](#customization)
  - [Persistent Local KMS Key Store](#persistent-local-kms-key-store)
- [Cryptographic Primitives](#cryptographic-primitives)

---

<a id="introduction"></a>

The Web5 Crypto API is a core component of the [Web5 JS](https://github.com/TBD54566975/web5-js)
ecosystem, providing the cryptography and JSON Object Signing and Encryption (JOSE) capabilities
essential for building secure applications and services with Decentralized Identifiers
([DID](https://www.w3.org/TR/did-core/)) and Verifiable Credentials
([VC](https://w3c.github.io/vc-data-model/)).

This JavaScript library was designed for modern development runtimes, including Node.js, web
browsers, and React Native. It provides cryptographic functionality for cipher, hash, and signature
algorithms and basic JOSE support for JSON Web Key (JWK). Additionally, it includes the crypto
interfaces and local Key Management System (KMS) implementation that are used by
[other libraries](https://github.com/TBD54566975/web5-js) in this monorepo.

### Supported Algorithms & Key Types

The following algorithms and key types are currently supported, with plans to expand its offerings
as the library progresses towards a 1.0 release.

| Capability     | Details                                         |
| -------------- | ----------------------------------------------- |
| Cipher         | AES-CTR, AES-GCM, XChaCha20, XChaCha20-Poly1305 |
| Signature      | ECDSA, EdDSA                                    |
| Hash           | SHA-256                                         |
| Key Derivation | ConcatKDF, ECDH, PBKDF2                         |
| ECC Curves     | Ed25519, secp256k1, X25519                      |

### Extensions

Packages that extend the functionality of the `@web5/crypto` library:

| Extension         | Repository                                             |
| ----------------- | ------------------------------------------------------ |
| AWS KMS extension | [TBD54566975/crypto-aws-kms][crypto-aws-kms-repo-link] |

## Getting Started

The Web5 Crypto API is distributed as `@web5/crypto` via [npmjs.com][crypto-npm-link],
[jsdelivr.com][crypto-jsdelivr-link], [unpkg.com][crypto-unpkg-link], and
[github.com][crypto-repo-link].

### Node.js

This library is designed and tested for the _active_ (`v20`) and _maintenance_
(`v18`) [LTS releases](https://nodejs.org/en/about/previous-releases) of Node.js

Install the latest version of `@web5/crypto` using `npm` or your preferred package manager:

```shell
npm install @web5/crypto
```

Example ESM import:

```js
import { Ed25519 } from "@web5/crypto";
```

Example CJS require:

```js
const { Ed25519 } = require("@web5/crypto");
```

### Web Browsers

A polyfilled distribution is published to [jsdelivr.com][crypto-jsdelivr-browser] and
[unpkg.com][crypto-unpkg-browser] that can imported in a module `<script>` tag:

```html
<!DOCTYPE html>
<html lang="en">
  <body>
    <script type="module">
      // Example import from JSDELIVR
      import { Ed25519 } from "https://cdn.jsdelivr.net/npm/@web5/crypto/dist/browser.mjs";
    </script>
  </body>
</html>
```

<a id="secure-context"></a>

> [!IMPORTANT]
> The `@web5/crypto` library depends on the
> [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) in web browsers.
> Web Crypto is available in all modern browsers but is accessible only in a
> [secure context](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts).
>
> This means you will not be able to use many `@web5/crypto` features in a browser unless the page
> is served over `https://` or `wss://`. Locally-delivered resources such as those with
> `http://127.0.0.1`, `http://localhost`, or `http://*.localhost` URLs are also considered to have
> been delivered securely.

### React Native

For React Native, you may need a
[polyfill](https://github.com/LinusU/react-native-get-random-values) for `crypto.getRandomValues`.

```js
import "react-native-get-random-values";
```

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

| Prefix    | Key URI Format             |
| --------- | -------------------------- |
| `urn:jwk` | `urn:jwk:<jwk-thumbprint>` |

All cryptographic keys are represented in JSON Web Key
([JWK](https://datatracker.ietf.org/doc/html/rfc7517)) format and the `jwk-thumbprint`, a
[standardized](https://datatracker.ietf.org/doc/html/rfc7638), deterministic, and unique hash of the
key, acts as a fingerprint, enabling consistent key referencing across all Web5 libraries without
exposing private key information.

### Using a Local KMS

This library includes a self-contained Key Management System (KMS) implementation that supports
generating keys, hashing, and creating/verifying digital signatures. Cryptographic operations are
performed within the confines of the local environment, without relying on external services. This
KMS is designed to be used by browser-based web apps or when testing backend services that depend on
cloud-based services (e.g., AWS KMS). Extensions that support external KMS services are
[listed here](#extensions).

Start by instantiating a local KMS implementation of the `CryptoApi` interface:

```ts
import { LocalKeyManager } from "@web5/crypto";

const kms = new LocalKeyManager();
```

An ephemeral, in-memory key store is used by default but any persistent store that implements the
[`KeyValueStore`](https://github.com/TBD54566975/web5-js/blob/5f364bc0d859e28f1388524ebe8ef152a71727c4/packages/common/src/types.ts#L4-L43)
interface can also be passed. See the [Persistent Key Store](#persistent-key-store) customization
for an example.

Generate a random private key:

```ts
const privateKeyUri = await kms.generateKey({ algorithm: "Ed25519" });
console.log(privateKeyUri);
// Output: urn:jwk:8DaTzHZcvQXUVvl8ezQKgGQHza1hiOZlPkdrB55Vt6Q
```

Create an EdDSA signature over arbitrary data using the private key:

```ts
const data = new TextEncoder().encode("Message");
const signature = await kms.sign({
  keyUri: privateKeyUri,
  data,
});
console.log(signature);
// Output:
// Uint8Array(64) [
//   208, 172, 103, 148, 119, 138, 101,  95,  41, 218,  64,
//   178, 132, 102,  15, 126, 102,  85,   3, 174,  96, 140,
//   203,  58, 186,  72,  85,  64,  15, 250, 235,  12,  97,
//   247,  52,  31, 110,  58,  85, 191, 161, 253,  82,   4,
//     1,   4, 230, 135,  81, 145,  59, 128,  83, 106, 105,
//   135,  32, 124,  96,   0,  25,  41, 218,  75
// ]
```

Get the public key in JWK format:

```ts
const publicKey = await kms.getPublicKey({ keyUri: privateKeyUri });
console.log(publicKey);
// Output:
// {
//   kty: "OKP",
//   crv: "Ed25519",
//   alg: "EdDSA",
//   kid: "8DaTzHZcvQXUVvl8ezQKgGQHza1hiOZlPkdrB55Vt6Q",
//   x: "6alAHg28tLuqWtaj0YOg7d5ySM4ERwPqQrLoy2pwdZk"
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

Export the private key:

```ts
const privateKey = await kms.exportKey({ keyUri });
console.log(privateKey);
// Output:
// {
//   kty: "OKP",
//   crv: "Ed25519",
//   alg: "EdDSA",
//   kid: "8DaTzHZcvQXUVvl8ezQKgGQHza1hiOZlPkdrB55Vt6Q",
//   x: "6alAHg28tLuqWtaj0YOg7d5ySM4ERwPqQrLoy2pwdZk",
//   d: "0xLuQyXFaWjrqp2o0orhwvwhtYhp2Z7KeRcioIs78CY"
// }
```

Import a private key generated by another library:

```ts
import type { Jwk } from "@web5/crypto";

const privateKey: Jwk = {
  kty: "OKP",
  crv: "Ed25519",
  x: "0thnrEFw6MVSs1XFgd4OD-Yn05XGQv24hvskmGajtKQ",
  d: "0xLuQyXFaWjrqp2o0orhwvwhtYhp2Z7KeRcioIs78CY",
};

const keyUri = await kms.importKey({ key: privateKey });
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

### JSON Web Key (JWK)

A JSON Web Key (JWK) is a [standardized](https://datatracker.ietf.org/doc/html/rfc7517) format for
representing cryptographic keys in a JSON data structure. The JWK format is used by all
[Web5 SDKs](https://github.com/TBD54566975/sdk-development) to promote portability and
interoperability.

Defining a JWK:

```ts
import type { Jwk } from "@web5/crypto";

const publicKey: Jwk = {
  kty: "OKP",
  crv: "Ed25519",
  x: "KsZRg2-gm9MoSrZqN9aSHUv-zYW8ajgyCfKxLGWJ2DI",
};
```

Computing the [thumbprint](https://datatracker.ietf.org/doc/html/rfc7638) of a JWK outputs a value
that can be used as a unique key identifier (`kid`) or to securely compare JWKs to determine if they
are equivalent:

```ts
import { computeJwkThumbprint } from "@web5/crypto";

const thumbprint = await computeJwkThumbprint({ jwk: publicKey });
console.log(thumbprint);
// Output: VhWyK5rpk2u_51_KniJxjRhwTUOsL8BLuKJaqpNYuEA
```

The provided type guard functions can be used for type narrowing or to perform runtime verification
of a specific JWK key type:

```ts
isPublicJwk(publicKey); // true
isPrivateJwk(publicKey); // false
isOkpPublicJwk(publicKey); // true
isOkpPrivateJwk(publicKey); // false
isOctPrivateJwk(publicKey); // false
isEcPublicJwk(publicKey); // false
isEcPrivateJwk(publicKey); // false
```

### Random Number Generation

Cryptographically strong random number generation is vital in cryptography. The unpredictability of
these random numbers is crucial for creating secure cryptographic keys, initialization vectors, and
nonces (numbers used once). Their strength lies in their resistance to being guessed or replicated,
making them foundational to maintaining the integrity and confidentiality of cryptographic systems.

The Web5 Crypto API includes two utility functions for random number generation:

#### `randomBytes()`

The `randomBytes()` method generates cryptographically strong random values (CSPRNG) of the
specified length. The implementation relies on
[`crypto.getRandomValues`](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues),
which defers to the runtime (browser, Node.js, etc.) for entropy. The pseudo-random number
generator algorithm may vary across runtimes, but is suitable for generating initialization vectors,
nonces and other random values.

> [!IMPORTANT]
> Use a cipher algorithm's `generateKey()` method to generate encryption keys rather than
> `randomBytes()`. This ensures that secrets used for encryption are guaranteed to be generated in a
> [secure context](#secure-context) and
> that the runtime uses the best
> [source of entropy](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues#usage_notes)
> available.

```typescript
import { randomBytes } from "@web5/crypto/utils";

const nonce = randomBytes(24);
```

#### `randomUuid()`

The `randomUuid()` method generates a UUID (Universally Unique Identifier) using a cryptographically
strong random number generator (CSPRNG) following the version 4 format, as specified in
[RFC 4122](https://datatracker.ietf.org/doc/html/rfc4122).

UUIDs are of a fixed size (128 bits), can guarantee uniqueness across space and time, and can be
generated without a centralized authority to administer them. Since UUIDs are unique and persistent,
they make excellent Uniform Resource Names ([URN](https://datatracker.ietf.org/doc/html/rfc2141)).
The following is an example of the string representation of a UUID as a URN:
`urn:uuid:f81d4fae-7dec-11d0-a765-00a0c91e6bf6`.

> [!NOTE]
> This function is available only in [secure contexts](#secure-context) (HTTPS and localhost).

```typescript
import { randomUuid } from "@web5/crypto/utils";

const uuid = randomUuid();
```

## Customization

### Persistent Local KMS Key Store

By default, `LocalKeyManager` uses an in-memory key store to simplify prototyping and testing.
To persist keys that are generated or imported, an implementation of the
[`KeyValueStore`](https://github.com/TBD54566975/web5-js/blob/5f364bc0d859e28f1388524ebe8ef152a71727c4/packages/common/src/types.ts#L4-L43)
interface can be passed.

For example, to use the [LevelDB](https://github.com/Level/level)-backed store from `@web5/common`:

```ts
import type { KeyIdentifier, Jwk } from "@web5/crypto";
import { Level } from "level";
import { LevelStore } from "@web5/common";

const db = new Level<KeyIdentifier, Jwk>("db_location", {
  valueEncoding: "json",
});
const keyStore = new LevelStore<KeyIdentifier, Jwk>({ db });
const kms = new LocalKeyManager({ keyStore });
```

## Cryptographic Primitives

This library encourages using its capabilities through concrete implementations of the `CryptoApi`
interface (e.g., [`LocalKeyManager`](#using-a-local-kms) or
[`AwsKeyManager`][crypto-aws-kms-repo-link]). These implementations provides high-level,
user-friendly access to a range of cryptographic functions. However, for developers requiring
lower-level control or specific customizations, the library also exposes its cryptographic
primitives directly. These primitives include a variety of cipher, hash, signature, key derivation,
and key conversion algorithms for advanced use cases.

> [!WARNING]
> While `@web5/crypto` offers low-level cryptographic primitives, it's crucial to acknowledge the
> complexity and potential risks associated with their use. Secure key management and security
> system design are highly specialized fields, often requiring expert knowledge. Even with correct
> usage of cryptographic functions, designing a secure system poses significant challenges.
>
> It's important to approach the creation of secure systems with caution, seeking expert review and
> continual learning to ensure effectiveness and security. [Crypto 101](https://www.crypto101.io) is
> an introductory course on cryptography to _begin_ your learning journey, freely available for
> developers of all skill levels.

#### AES-CTR

```ts
import { AesCtr, utils } from "@web5/crypto";

// Key Generation
const length = 256; // Length of the key in bits (e.g., 128, 192, 256)
const privateKey = await AesCtr.generateKey({ length });

// Encryption
const data = new TextEncoder().encode("Message");
const counter = utils.randomBytes(16); // Initial value of the counter block
const encryptedData = await AesCtr.encrypt({
  data,
  counter,
  key: privateKey,
  length: 64, // Length of the counter in bits
});

// Decryption
const decryptedData = await AesCtr.decrypt({
  data: encryptedData,
  counter,
  key: privateKey,
  length: 64, // Length of the counter in bits
});
```

#### AES-GCM

```ts
import { AesGcm, utils } from "@web5/crypto";

// Key Generation
const length = 256; // Length of the key in bits (e.g., 128, 192, 256)
const privateKey = await AesGcm.generateKey({ length });

// Encryption
const data = new TextEncoder().encode("Message");
const iv = utils.randomBytes(12); // Initialization vector
const encryptedData = await AesGcm.encrypt({
  data,
  iv,
  key: privateKey,
});

// Decryption
const decryptedData = await AesGcm.decrypt({
  data: encryptedData,
  iv,
  key: privateKey,
});
```

#### ConcatKDF

```ts
import { ConcatKdf, utils } from "@web5/crypto";

// Key Derivation
const derivedKeyingMaterial = await ConcatKdf.deriveKey({
  sharedSecret: utils.randomBytes(32),
  keyDataLen: 128,
  otherInfo: {
    algorithmId: "A128GCM",
    partyUInfo: "Alice",
    partyVInfo: "Bob",
    suppPubInfo: 128,
  },
});
```

#### Ed25519

```ts
import { Ed25519 } from "@web5/crypto";

// Key Generation
const privateKey = await Ed25519.generateKey();

// Public Key Derivation
const publicKey = await Ed25519.computePublicKey({ key: privateKey });

// EdDSA Signing
const signature = await Ed25519.sign({
  key: privateKey,
  data: new TextEncoder().encode("Message"),
});

// EdDSA Signature Verification
const isValid = await Ed25519.verify({
  key: publicKey,
  signature: signature,
  data: new TextEncoder().encode("Message"),
});
```

#### PBKDF2

```ts
import { Pbkdf2, utils } from "@web5/crypto";

// Key Derivation
const derivedKey = await Pbkdf2.deriveKey({
  hash: "SHA-256", // Hash function to use ('SHA-256', 'SHA-384', 'SHA-512')
  password: new TextEncoder().encode("password"), // Password as a Uint8Array
  salt: utils.randomBytes(16), // Salt value
  iterations: 1000, // Number of iterations
  length: 256, // Length of the derived key in bits
});
```

#### secp256k1

```ts
import { Secp256k1 } from "@web5/crypto";

// Key Generation
const privateKey = await Secp256k1.generateKey();

// Public Key Derivation
const publicKey = await Secp256k1.computePublicKey({ key: privateKey });

// ECDH Shared Secret Computation
const sharedSecret = await Secp256k1.sharedSecret({
  privateKeyA: privateKey,
  publicKeyB: anotherPublicKey,
});

// ECDSA Signing
const signature = await Secp256k1.sign({
  key: privateKey,
  data: new TextEncoder().encode("Message"),
});

// ECDSA Signature Verification
const isValid = await Secp256k1.verify({
  key: publicKey,
  signature: signature,
  data: new TextEncoder().encode("Message"),
});
```

#### SHA-256

```ts
import { Sha256 } from "@web5/crypto";

// Hashing
const data = new TextEncoder().encode("Message");
const hash = await Sha256.digest({ data });
```

#### X25519

```ts
import { X25519 } from "@web5/crypto";

// Key Generation
const privateKey = await X25519.generateKey();

// Public Key Derivation
const publicKey = await X25519.computePublicKey({ key: privateKey });

// ECDH Shared Secret Computation
const sharedSecret = await X25519.sharedSecret({
  privateKeyA: privateKey,
  publicKeyB: anotherPublicKey,
});
```

#### XChaCha20

```ts
import { XChaCha20, utils } from "@web5/crypto";

// Key Generation
const privateKey = await XChaCha20.generateKey();

// Encryption
const data = new TextEncoder().encode("Message");
const nonce = utils.randomBytes(24);
const encryptedData = await XChaCha20.encrypt({
  data,
  nonce,
  key: privateKey,
});

// Decryption
const decryptedData = await XChaCha20.decrypt({
  data: encryptedData,
  nonce,
  key: privateKey,
});
```

#### XChaCha20-Poly1305

```ts
import { XChaCha20Poly1305, utils } from "@web5/crypto";

// Key Generation
const privateKey = await XChaCha20Poly1305.generateKey();

// Encryption
const data = new TextEncoder().encode("Message");
const nonce = utils.randomBytes(24);
const additionalData = new TextEncoder().encode("Associated data");
const { ciphertext, tag } = await XChaCha20Poly1305.encrypt({
  data,
  nonce,
  additionalData,
  key: privateKey,
});

// Decryption
const decryptedData = await XChaCha20Poly1305.decrypt({
  data: ciphertext,
  nonce,
  tag,
  additionalData,
  key: privateKey,
});
```

## Project Resources

| Resource                                | Description                                                                   |
| --------------------------------------- | ----------------------------------------------------------------------------- |
| [CODEOWNERS][codeowners-link]           | Outlines the project lead(s)                                                  |
| [CODE OF CONDUCT][code-of-conduct-link] | Expected behavior for project contributors, promoting a welcoming environment |
| [CONTRIBUTING][contributing-link]       | Developer guide to build, test, run, access CI, chat, discuss, file issues    |
| [GOVERNANCE][governance-link]           | Project governance                                                            |
| [LICENSE][license-link]                 | Apache License, Version 2.0                                                   |

[crypto-npm-badge]: https://img.shields.io/npm/v/@web5/crypto.svg?style=flat&color=blue&santize=true
[crypto-npm-link]: https://www.npmjs.com/package/@web5/crypto
[crypto-downloads-badge]: https://img.shields.io/npm/dt/@web5/crypto?&color=blue
[crypto-build-badge]: https://img.shields.io/github/actions/workflow/status/TBD54566975/web5-js/tests-ci.yml?branch=main&label=build
[crypto-build-link]: https://github.com/TBD54566975/web5-js/actions/workflows/tests-ci.yml
[crypto-coverage-badge]: https://img.shields.io/codecov/c/gh/TBD54566975/web5-js/main?style=flat&token=YI87CKF1LI
[crypto-coverage-link]: https://app.codecov.io/github/TBD54566975/web5-js/tree/main/packages%2Fcrypto
[crypto-issues-badge]: https://img.shields.io/github/issues/TBD54566975/web5-js/package:%20crypto?label=issues
[crypto-issues-link]: https://github.com/TBD54566975/web5-js/issues?q=is%3Aopen+is%3Aissue+label%3A"package%3A+crypto"
[crypto-aws-kms-repo-link]: https://github.com/TBD54566975/web5-js/tree/main/packages/crypto-aws-kms
[crypto-repo-link]: https://github.com/TBD54566975/web5-js/tree/main/packages/crypto
[crypto-jsdelivr-link]: https://www.jsdelivr.com/package/npm/@web5/crypto
[crypto-jsdelivr-browser]: https://cdn.jsdelivr.net/npm/@web5/crypto/dist/browser.mjs
[crypto-unpkg-link]: https://unpkg.com/@web5/crypto
[crypto-unpkg-browser]: https://unpkg.com/@web5/crypto/dist/browser.mjs
[codeowners-link]: https://github.com/TBD54566975/web5-js/blob/main/CODEOWNERS
[code-of-conduct-link]: https://github.com/TBD54566975/web5-js/blob/main/CODE_OF_CONDUCT.md
[contributing-link]: https://github.com/TBD54566975/web5-js/blob/main/CONTRIBUTING.md
[governance-link]: https://github.com/TBD54566975/web5-js/blob/main/GOVERNANCE.md
[license-link]: https://github.com/TBD54566975/web5-js/blob/main/LICENSE
[discord-badge]: https://img.shields.io/discord/937858703112155166?color=5865F2&logo=discord&logoColor=white
[discord-link]: https://discord.com/channels/937858703112155166/969272658501976117
