# @web5/agent

## 0.3.3

### Patch Changes

- [#433](https://github.com/TBD54566975/web5-js/pull/433) [`ac1e6f1`](https://github.com/TBD54566975/web5-js/commit/ac1e6f1eca57026b24bc22d89ac1785a804caed5) Thanks [@LiranCohen](https://github.com/LiranCohen)! - Extend and Test RPC DWN/Web5 Clients to support `http` and `ws`
  - move `HttpDwnRpcClient` to `/prototyping` folder
  - move `JSON RPC` related files to `/prototyping` folder
  - create `WebSocketDwnRpcClient` in `/prototyping` folder
  - create `WebSocketWeb5RpcClient` wrapper in `rpc-client`
    - does not support `sendDidRequest` via sockets
- Updated dependencies [[`eb02b62`](https://github.com/TBD54566975/web5-js/commit/eb02b62ca4d3877c4ae4ea606f7e0bb0ca4e4e83), [`d3814cd`](https://github.com/TBD54566975/web5-js/commit/d3814cd6b258b858b307feadf236f710e657d2f8), [`857d160`](https://github.com/TBD54566975/web5-js/commit/857d16012c851acf38e18ceaa8664a25098f6055)]:
  - @web5/dids@1.0.2

## 0.3.2

### Patch Changes

- [#500](https://github.com/TBD54566975/web5-js/pull/500) [`41ac378`](https://github.com/TBD54566975/web5-js/commit/41ac378a0197e56aeb70cf2d80d6b3917d4c1490) Thanks [@LiranCohen](https://github.com/LiranCohen)! - Upgrade DWN SDK with newest features

  - remove `Permissions` interface and replace permissions with a first-class protocol representing it
  - adding `RecordsTags` functionality

## 0.3.1

### Patch Changes

- [#484](https://github.com/TBD54566975/web5-js/pull/484) [`c47ea5e`](https://github.com/TBD54566975/web5-js/commit/c47ea5ee936c9164c6ead47caf1ad099c1a4b0f1) Thanks [@LiranCohen](https://github.com/LiranCohen)! - Upgrade `dwn-sdk-js` to the latest version consuming `1.0.0` of `@web5/dids`

- [#482](https://github.com/TBD54566975/web5-js/pull/482) [`ddb38d0`](https://github.com/TBD54566975/web5-js/commit/ddb38d0da0c510e9af00afddffe228c22cb830cd) Thanks [@LiranCohen](https://github.com/LiranCohen)! - - Upgrade packages to consume `1.0.0` of foundational `web5` packages.
  - Using foundational `dids` package instead
