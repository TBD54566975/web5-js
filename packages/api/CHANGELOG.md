# @web5/api

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
