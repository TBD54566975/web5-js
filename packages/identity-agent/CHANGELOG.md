# @web5/identity-agent

## 0.3.8

### Patch Changes

- [#644](https://github.com/TBD54566975/web5-js/pull/644) [`8b8de7a`](https://github.com/TBD54566975/web5-js/commit/8b8de7a82337a68c8625107da2f9fc7ce4286c07) Thanks [@LiranCohen](https://github.com/LiranCohen)! - Upgrade `dwn-sdk-js` to `v0.3.5`

- Updated dependencies [[`8b8de7a`](https://github.com/TBD54566975/web5-js/commit/8b8de7a82337a68c8625107da2f9fc7ce4286c07)]:
  - @web5/agent@0.3.8

## 0.3.7

### Patch Changes

- [#579](https://github.com/TBD54566975/web5-js/pull/579) [`b36e7b1`](https://github.com/TBD54566975/web5-js/commit/b36e7b1eabd7c99313d6f6adb335c5a6d085d83e) Thanks [@thehenrytsai](https://github.com/thehenrytsai)! - Updated dependencies of all packages

- Updated dependencies [[`b425bbc`](https://github.com/TBD54566975/web5-js/commit/b425bbc6bfedb44121d18b4f9d72f18cdd33ac00), [`269384b`](https://github.com/TBD54566975/web5-js/commit/269384b7b96635c1205419293df346bff9491a1b), [`b36e7b1`](https://github.com/TBD54566975/web5-js/commit/b36e7b1eabd7c99313d6f6adb335c5a6d085d83e)]:
  - @web5/agent@0.3.7

## 0.3.6

### Patch Changes

- [#492](https://github.com/TBD54566975/web5-js/pull/492) [`b516a5f`](https://github.com/TBD54566975/web5-js/commit/b516a5f71c3e2babefa644f2d88b1520c844ca0c) Thanks [@LiranCohen](https://github.com/LiranCohen)! - - `@web5/agent` DWN Subscriptions Support
  - `@web5/agent` supports latest `dwn-sdk-js` with `prune` feature from `RecordsWriteDelete`
- Updated dependencies [[`b516a5f`](https://github.com/TBD54566975/web5-js/commit/b516a5f71c3e2babefa644f2d88b1520c844ca0c)]:
  - @web5/agent@0.3.6

## 0.3.5

### Patch Changes

- [#513](https://github.com/TBD54566975/web5-js/pull/513) [`82fe049`](https://github.com/TBD54566975/web5-js/commit/82fe049234423bd08a4b3c7e6cf48bdd5556d5a7) Thanks [@LiranCohen](https://github.com/LiranCohen)! - Add a helper methods for generating a PaginationCursor from `api` without importing `dwn-sdk-js` directly

- Updated dependencies [[`82fe049`](https://github.com/TBD54566975/web5-js/commit/82fe049234423bd08a4b3c7e6cf48bdd5556d5a7)]:
  - @web5/agent@0.3.5

## 0.3.4

### Patch Changes

- [#489](https://github.com/TBD54566975/web5-js/pull/489) [`eabe5ca`](https://github.com/TBD54566975/web5-js/commit/eabe5ca780745d229d5df7a0e64f43a5283a10d7) Thanks [@LiranCohen](https://github.com/LiranCohen)! - Add `DwnServerInfoRpc` to `Web5Rpc` for retrieving server specific info.

  Server Info includes:

  - maxFileSize
  - registrationRequirements
  - webSocketSupport

- Updated dependencies [[`eabe5ca`](https://github.com/TBD54566975/web5-js/commit/eabe5ca780745d229d5df7a0e64f43a5283a10d7)]:
  - @web5/agent@0.3.4

## 0.3.3

### Patch Changes

- [#433](https://github.com/TBD54566975/web5-js/pull/433) [`ac1e6f1`](https://github.com/TBD54566975/web5-js/commit/ac1e6f1eca57026b24bc22d89ac1785a804caed5) Thanks [@LiranCohen](https://github.com/LiranCohen)! - Extend and Test RPC DWN/Web5 Clients to support `http` and `ws`
  - move `HttpDwnRpcClient` to `/prototyping` folder
  - move `JSON RPC` related files to `/prototyping` folder
  - create `WebSocketDwnRpcClient` in `/prototyping` folder
  - create `WebSocketWeb5RpcClient` wrapper in `rpc-client`
    - does not support `sendDidRequest` via sockets
- Updated dependencies [[`ac1e6f1`](https://github.com/TBD54566975/web5-js/commit/ac1e6f1eca57026b24bc22d89ac1785a804caed5), [`eb02b62`](https://github.com/TBD54566975/web5-js/commit/eb02b62ca4d3877c4ae4ea606f7e0bb0ca4e4e83), [`d3814cd`](https://github.com/TBD54566975/web5-js/commit/d3814cd6b258b858b307feadf236f710e657d2f8), [`857d160`](https://github.com/TBD54566975/web5-js/commit/857d16012c851acf38e18ceaa8664a25098f6055)]:
  - @web5/agent@0.3.3
  - @web5/dids@1.0.2

## 0.3.2

### Patch Changes

- [#500](https://github.com/TBD54566975/web5-js/pull/500) [`41ac378`](https://github.com/TBD54566975/web5-js/commit/41ac378a0197e56aeb70cf2d80d6b3917d4c1490) Thanks [@LiranCohen](https://github.com/LiranCohen)! - Upgrade DWN SDK with newest features

  - remove `Permissions` interface and replace permissions with a first-class protocol representing it
  - adding `RecordsTags` functionality

- Updated dependencies [[`41ac378`](https://github.com/TBD54566975/web5-js/commit/41ac378a0197e56aeb70cf2d80d6b3917d4c1490)]:
  - @web5/agent@0.3.2

## 0.3.1

### Patch Changes

- [#482](https://github.com/TBD54566975/web5-js/pull/482) [`ddb38d0`](https://github.com/TBD54566975/web5-js/commit/ddb38d0da0c510e9af00afddffe228c22cb830cd) Thanks [@LiranCohen](https://github.com/LiranCohen)! - - Upgrade packages to consume `1.0.0` of foundational `web5` packages.
  - Using foundational `dids` package instead
- Updated dependencies [[`c47ea5e`](https://github.com/TBD54566975/web5-js/commit/c47ea5ee936c9164c6ead47caf1ad099c1a4b0f1), [`ddb38d0`](https://github.com/TBD54566975/web5-js/commit/ddb38d0da0c510e9af00afddffe228c22cb830cd)]:
  - @web5/agent@0.3.1
