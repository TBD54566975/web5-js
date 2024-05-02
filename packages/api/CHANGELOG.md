# @web5/api

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
