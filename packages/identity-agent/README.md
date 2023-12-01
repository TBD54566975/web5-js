<!-- TODO: This is just a start. Will add a better description eventually. -->

## Description

This package provides an implementation of a web5 agent using the building blocks in `@web5/agent`.

While similar to `@web5/user-agent`, this package differs by not using IndexedDB for the DID Resolution Cache (detailed below). Use `@web5/user-agent` on web platforms with IndexedDB access. For platforms without IndexedDB access (e.g., React Native), this package is more suitable.

## Implementation

Start by examining the self-documenting [identity-agent.ts](./src/identity-agent.ts) file.

#### DidResolver

If you do not supply a `DidResolver`, the agent defaults to an unpersisted in-memory cache. For larger production applications, supply `create` with a custom `DidResolver` featuring a `cache` attribute, which should be a class implementing the `DidResolverCache` class.

Browsers with IndexedDB access can utilize `DidResolverCacheLevel`. In such cases, using the `@web5/user-agent` package is recommended, as it employs this persistent cache by default.

```typescript
const didResolver = new DidResolver({
  cache: new CustomDidResolverCache(),
  didResolvers: [DidIonMethod, DidKeyMethod],
});

IdentityAgent.create({ didResolver });
```
