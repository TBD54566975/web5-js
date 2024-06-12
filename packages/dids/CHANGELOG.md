# @web5/dids

## 1.1.1

### Patch Changes

- [#689](https://github.com/TBD54566975/web5-js/pull/689) [`16eb49d`](https://github.com/TBD54566975/web5-js/commit/16eb49d00ee45bd25fa62c370a5b729801581950) Thanks [@nitro-neal](https://github.com/nitro-neal)! - Update KeyTypeToDefaultAlgorithmMap for did dht

## 1.1.0

### Minor Changes

- [#636](https://github.com/TBD54566975/web5-js/pull/636) [`b425bbc`](https://github.com/TBD54566975/web5-js/commit/b425bbc6bfedb44121d18b4f9d72f18cdd33ac00) Thanks [@thehenrytsai](https://github.com/thehenrytsai)! - 1. Vector 3 compliance 2. X25519 support 3. Previous DID link support 4. DNS record chunking support for record > 255 characters (only in context of vector 3 compliance)

### Patch Changes

- [#637](https://github.com/TBD54566975/web5-js/pull/637) [`269384b`](https://github.com/TBD54566975/web5-js/commit/269384b7b96635c1205419293df346bff9491a1b) Thanks [@LiranCohen](https://github.com/LiranCohen)! - Reintroduce ability to specify custom Verification Method IDs for `did:dht`

- [#579](https://github.com/TBD54566975/web5-js/pull/579) [`b36e7b1`](https://github.com/TBD54566975/web5-js/commit/b36e7b1eabd7c99313d6f6adb335c5a6d085d83e) Thanks [@thehenrytsai](https://github.com/thehenrytsai)! - Updated dependencies of all packages

- Updated dependencies [[`b36e7b1`](https://github.com/TBD54566975/web5-js/commit/b36e7b1eabd7c99313d6f6adb335c5a6d085d83e)]:
  - @web5/common@1.0.1
  - @web5/crypto@1.0.1

## 1.0.3

### Patch Changes

- [#575](https://github.com/TBD54566975/web5-js/pull/575) [`98eeb4c`](https://github.com/TBD54566975/web5-js/commit/98eeb4cffad6d2cea4a79fc6b4811056a3aeb922) Thanks [@thehenrytsai](https://github.com/thehenrytsai)! - Fixed DID DHT library regression where `kid` becomes `undefined`

## 1.0.2

### Patch Changes

- [#499](https://github.com/TBD54566975/web5-js/pull/499) [`eb02b62`](https://github.com/TBD54566975/web5-js/commit/eb02b62ca4d3877c4ae4ea606f7e0bb0ca4e4e83) Thanks [@shamilovtim](https://github.com/shamilovtim)! - chore: bump ion

- [#508](https://github.com/TBD54566975/web5-js/pull/508) [`d3814cd`](https://github.com/TBD54566975/web5-js/commit/d3814cd6b258b858b307feadf236f710e657d2f8) Thanks [@LiranCohen](https://github.com/LiranCohen)! - We sometimes get failures in CI publishing to the DHT. In order to make debugging these errors easier, we add the identifier to the error thrown.

- [#504](https://github.com/TBD54566975/web5-js/pull/504) [`857d160`](https://github.com/TBD54566975/web5-js/commit/857d16012c851acf38e18ceaa8664a25098f6055) Thanks [@thehenrytsai](https://github.com/thehenrytsai)! - DID:DHT - Only have <ID>. suffix for Root and Gateway Record names

## 1.0.1

### Patch Changes

- [#496](https://github.com/TBD54566975/web5-js/pull/496) [`20d6466`](https://github.com/TBD54566975/web5-js/commit/20d6466561163958fe3ace21b84f9f51c2133dd9) Thanks [@LiranCohen](https://github.com/LiranCohen)! - Do not cache results that contain a resolution error.

## 1.0.0

### Major Changes

- [#479](https://github.com/TBD54566975/web5-js/pull/479) [`a0edc10`](https://github.com/TBD54566975/web5-js/commit/a0edc1085cd78fa0a57383a9919c71f4971d3aba) Thanks [@leordev](https://github.com/leordev)! - Official tbDEX v1 release 🎉

### Patch Changes

- Updated dependencies [[`a0edc10`](https://github.com/TBD54566975/web5-js/commit/a0edc1085cd78fa0a57383a9919c71f4971d3aba)]:
  - @web5/common@1.0.0
  - @web5/crypto@1.0.0
