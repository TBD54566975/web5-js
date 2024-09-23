# @web5/api

## 0.11.0

### Minor Changes

- [#824](https://github.com/TBD54566975/web5-js/pull/824) [`0862ffc`](https://github.com/TBD54566975/web5-js/commit/0862ffc1f23550406ff592e8393cb2eb5a769079) Thanks [@LiranCohen](https://github.com/LiranCohen)! - Support impersonation using delegated grants for DWN record operations using WalletConnect

- [#836](https://github.com/TBD54566975/web5-js/pull/836) [`3d1f825`](https://github.com/TBD54566975/web5-js/commit/3d1f8258465e1177d6d5fe17c2e1ea786baa331d) Thanks [@LiranCohen](https://github.com/LiranCohen)! - Finalize ability to WalletConnect with sync involved

- [#850](https://github.com/TBD54566975/web5-js/pull/850) [`fea0535`](https://github.com/TBD54566975/web5-js/commit/fea0535876d5b00ab5e0abea695e52aeaad9d78b) Thanks [@shamilovtim](https://github.com/shamilovtim)! - connect methods now work with dwn and user agent and are no longer stubbed

### Patch Changes

- [#893](https://github.com/TBD54566975/web5-js/pull/893) [`43a5078`](https://github.com/TBD54566975/web5-js/commit/43a50783b150a2363c75f06d47903602a6920f5e) Thanks [@LiranCohen](https://github.com/LiranCohen)! - differentiate between Record creator and author

- [#894](https://github.com/TBD54566975/web5-js/pull/894) [`e7cb25a`](https://github.com/TBD54566975/web5-js/commit/e7cb25a06ac5c521943bd0bb1cac55770c2ea82c) Thanks [@LiranCohen](https://github.com/LiranCohen)! - Enable Protocol Query/Configure with delegate Grant

- [#892](https://github.com/TBD54566975/web5-js/pull/892) [`2ec2d21`](https://github.com/TBD54566975/web5-js/commit/2ec2d213ae10a9576da78927771768a11a05409b) Thanks [@LiranCohen](https://github.com/LiranCohen)! - dataFormat is a mutible record property

- [#824](https://github.com/TBD54566975/web5-js/pull/824) [`0862ffc`](https://github.com/TBD54566975/web5-js/commit/0862ffc1f23550406ff592e8393cb2eb5a769079) Thanks [@LiranCohen](https://github.com/LiranCohen)! - Introduce a `grants` API for `Web5.dwn`

- [#853](https://github.com/TBD54566975/web5-js/pull/853) [`7347438`](https://github.com/TBD54566975/web5-js/commit/734743884f21491efce9392e129d612735e85282) Thanks [@LiranCohen](https://github.com/LiranCohen)! - Upgrade `agent` to refelcy the newest `dwn-sdk-js` and `dwn-server`

- [#522](https://github.com/TBD54566975/web5-js/pull/522) [`2f7bbbe`](https://github.com/TBD54566975/web5-js/commit/2f7bbbe5c3947460eb6336e1153851de69a38ee8) Thanks [@LiranCohen](https://github.com/LiranCohen)! - Add `records.subscribe()` functionality to the DwnApi

- [#859](https://github.com/TBD54566975/web5-js/pull/859) [`7fc1f1d`](https://github.com/TBD54566975/web5-js/commit/7fc1f1dc1913fb3c77516db0f6ba2c55787bc84b) Thanks [@LiranCohen](https://github.com/LiranCohen)! - Consume single PermissionApi for dealing with permissions, fix bug for Record class not fetching delegate permissions for request.

- [#905](https://github.com/TBD54566975/web5-js/pull/905) [`3cfc21d`](https://github.com/TBD54566975/web5-js/commit/3cfc21df01e505891a47c9d6cd5bd1aa916c1550) Thanks [@LiranCohen](https://github.com/LiranCohen)! - Moving web-features to @web5/browser package

- [#899](https://github.com/TBD54566975/web5-js/pull/899) [`9f0a128`](https://github.com/TBD54566975/web5-js/commit/9f0a1280eb0b0b85794e6c2509aa3ed751511662) Thanks [@LiranCohen](https://github.com/LiranCohen)! - Allow reading public records in delegate state even if no explicit grant exists.

- [#903](https://github.com/TBD54566975/web5-js/pull/903) [`17a4290`](https://github.com/TBD54566975/web5-js/commit/17a42902582481e2424fe7f3c3eb10dd1851e24a) Thanks [@shamilovtim](https://github.com/shamilovtim)! - use workspace for deps

- Updated dependencies [[`17a4290`](https://github.com/TBD54566975/web5-js/commit/17a42902582481e2424fe7f3c3eb10dd1851e24a)]:
  - @web5/user-agent@0.6.4
  - @web5/crypto@1.0.5
  - @web5/agent@0.7.4
  - @web5/dids@1.1.5

## 0.10.0

### Minor Changes

- [#635](https://github.com/TBD54566975/web5-js/pull/635) [`09f80b7`](https://github.com/TBD54566975/web5-js/commit/09f80b70d099c743cb1057e3d66eb0471c542f14) Thanks [@LiranCohen](https://github.com/LiranCohen)! - Implement a `delete` method and state on the `@web5/api` `Record` class

- [#736](https://github.com/TBD54566975/web5-js/pull/736) [`89f239d`](https://github.com/TBD54566975/web5-js/commit/89f239d1338a71ce700ac1efaef124035a5363c9) Thanks [@LiranCohen](https://github.com/LiranCohen)! - Update Agent to latest version along with dwn-sdk-js to v 0.4.0

- [#694](https://github.com/TBD54566975/web5-js/pull/694) [`cc3aa58`](https://github.com/TBD54566975/web5-js/commit/cc3aa58069dd5465834b32174e3f840ddf782d60) Thanks [@thehenrytsai](https://github.com/thehenrytsai)! - Added WalletConnectOptions and updated dwn-sdk-js dependencies.

### Patch Changes

- [#769](https://github.com/TBD54566975/web5-js/pull/769) [`d18aa6b`](https://github.com/TBD54566975/web5-js/commit/d18aa6bfe0388097e48416477d3c43147dfd4282) Thanks [@LiranCohen](https://github.com/LiranCohen)! - Add DWN Tenent Registration to `Web5.connect()`

- [#770](https://github.com/TBD54566975/web5-js/pull/770) [`f71ce8a`](https://github.com/TBD54566975/web5-js/commit/f71ce8a6b9b10dfb1a627a9fe0d7473a453422e0) Thanks [@LiranCohen](https://github.com/LiranCohen)! - Upgrade `dwn-sdk-js` and `dwn-server`

- [#745](https://github.com/TBD54566975/web5-js/pull/745) [`a956f72`](https://github.com/TBD54566975/web5-js/commit/a956f729f2c7a8e935d4a66511b393d1ccf1476a) Thanks [@LiranCohen](https://github.com/LiranCohen)! - make `rawMessage` not private in `Record` class

- [#750](https://github.com/TBD54566975/web5-js/pull/750) [`750aa1c`](https://github.com/TBD54566975/web5-js/commit/750aa1c2c52515104c7ff4e36945297b58d68356) Thanks [@LiranCohen](https://github.com/LiranCohen)! - default DWN Server selection updated to select only 1 defaulting to the `beta` TBD hosted version

- Updated dependencies [[`8baa679`](https://github.com/TBD54566975/web5-js/commit/8baa679ae496c9052025b11d435c48390579be47), [`f71ce8a`](https://github.com/TBD54566975/web5-js/commit/f71ce8a6b9b10dfb1a627a9fe0d7473a453422e0)]:
  - @web5/agent@0.4.1
  - @web5/user-agent@0.4.1

## 0.9.4

### Patch Changes

- [#507](https://github.com/TBD54566975/web5-js/pull/507) [`d863c37`](https://github.com/TBD54566975/web5-js/commit/d863c373ef1cfff18cd2b4e9864057fea107115e) Thanks [@LiranCohen](https://github.com/LiranCohen)! - add reference types from dwn-sdk-js to avoid pnpm build error

  https://github.com/microsoft/TypeScript/issues/47663#issuecomment-1962129199

- [#644](https://github.com/TBD54566975/web5-js/pull/644) [`8b8de7a`](https://github.com/TBD54566975/web5-js/commit/8b8de7a82337a68c8625107da2f9fc7ce4286c07) Thanks [@LiranCohen](https://github.com/LiranCohen)! - Update `@web5/api` to the latest `@web5/agent` `v0.3.7`

  Includes upgrade to `dwn-sdk-js`@`v0.3.5`

  Features:

  - Ability to apply the `prune` property to a `RecordsWriteDelete`

- [#523](https://github.com/TBD54566975/web5-js/pull/523) [`05eeb76`](https://github.com/TBD54566975/web5-js/commit/05eeb763f5e27a7ac38c24c6c2ac6a5a08c84f37) Thanks [@LiranCohen](https://github.com/LiranCohen)! - Add a helper methods for generating a PaginationCursor from `api` without importing `dwn-sdk-js` directly.

- [#579](https://github.com/TBD54566975/web5-js/pull/579) [`b36e7b1`](https://github.com/TBD54566975/web5-js/commit/b36e7b1eabd7c99313d6f6adb335c5a6d085d83e) Thanks [@thehenrytsai](https://github.com/thehenrytsai)! - Updated some dependencies of `api` package

- [#492](https://github.com/TBD54566975/web5-js/pull/492) [`b516a5f`](https://github.com/TBD54566975/web5-js/commit/b516a5f71c3e2babefa644f2d88b1520c844ca0c) Thanks [@LiranCohen](https://github.com/LiranCohen)! - `@web5/api` supports `prune` via `RecordsWriteDelete`

- Updated dependencies [[`8b8de7a`](https://github.com/TBD54566975/web5-js/commit/8b8de7a82337a68c8625107da2f9fc7ce4286c07)]:
  - @web5/user-agent@0.3.8
  - @web5/agent@0.3.8

## 0.9.3

### Patch Changes

- [#500](https://github.com/TBD54566975/web5-js/pull/500) [`41ac378`](https://github.com/TBD54566975/web5-js/commit/41ac378a0197e56aeb70cf2d80d6b3917d4c1490) Thanks [@LiranCohen](https://github.com/LiranCohen)! - Upgrade DWN SDK with newest features

  - remove `Permissions` interface and replace permissions with a first-class protocol representing it
  - adding `RecordsTags` functionality

- Updated dependencies [[`41ac378`](https://github.com/TBD54566975/web5-js/commit/41ac378a0197e56aeb70cf2d80d6b3917d4c1490)]:
  - @web5/user-agent@0.3.2
  - @web5/agent@0.3.2

## 0.9.2

### Patch Changes

- [#494](https://github.com/TBD54566975/web5-js/pull/494) [`d12eff8`](https://github.com/TBD54566975/web5-js/commit/d12eff8dc360dc4991325d4d686269497c13e453) Thanks [@LiranCohen](https://github.com/LiranCohen)! - When updating a record, we must include the `parentContextId` in the create options

## 0.9.1

### Patch Changes

- [#484](https://github.com/TBD54566975/web5-js/pull/484) [`c47ea5e`](https://github.com/TBD54566975/web5-js/commit/c47ea5ee936c9164c6ead47caf1ad099c1a4b0f1) Thanks [@LiranCohen](https://github.com/LiranCohen)! - Upgrade `dwn-sdk-js` to the latest version consuming `1.0.0` of `@web5/dids`

- [#482](https://github.com/TBD54566975/web5-js/pull/482) [`ddb38d0`](https://github.com/TBD54566975/web5-js/commit/ddb38d0da0c510e9af00afddffe228c22cb830cd) Thanks [@LiranCohen](https://github.com/LiranCohen)! - - Upgrade `api` latest `dwn` changes.
  - Protocol `can` actions now take an array.
  - Protocol `can` verbs are now `['create', 'update', 'delete', 'query', 'subscribe', 'co-update', 'co-delete']`
  - `paginagion` is now handles by an object instead of a string.
  - Upgrade packages to consume `1.0.0` of foundational `web5` packages.
- Updated dependencies [[`c47ea5e`](https://github.com/TBD54566975/web5-js/commit/c47ea5ee936c9164c6ead47caf1ad099c1a4b0f1), [`ddb38d0`](https://github.com/TBD54566975/web5-js/commit/ddb38d0da0c510e9af00afddffe228c22cb830cd)]:
  - @web5/agent@0.3.1
  - @web5/user-agent@0.3.1
