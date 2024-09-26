# Web5 Identity Agent

| A library for building Web5 identity management applications |
| ------------------------------------------------------------ |

[![NPM Package][identity-agent-npm-badge]][identity-agent-npm-link]
[![NPM Downloads][identity-agent-downloads-badge]][identity-agent-npm-link]

[![Build Status][identity-agent-build-badge]][identity-agent-build-link]
[![Open Issues][identity-agent-issues-badge]][identity-agent-issues-link]
[![Code Coverage][identity-agent-coverage-badge]][identity-agent-coverage-link]

---

- [Introduction](#introduction)
- [Getting Started](#getting-started)
  - [Node.js](#nodejs)
  - [Web Browsers](#web-browsers)
  - [React Native](#react-native)
- [Contributing](#contributing)
- [Core Concepts](#core-concepts)
  - [Launching an Identity Agent](#launching-an-identity-agent)
  - [Creating an End User Identity](#creating-an-end-user-identity)
- [Customization](#customization)
  - [Using Non-default Data Stores](#using-non-default-data-stores)

---

<a id="introduction"></a>

The Identity Agent SDK is a component of the
[Web5 JS](https://github.com/TBD54566975/web5-js) platform, created to simplify the development of
applications that manage multiple Web5 identities on behalf of a single entity. Identity agents,
sometimes called "wallets", are typically
native desktop (e.g., [Electron](https://www.electronjs.org)) or
mobile (e.g, [React Native](https://reactnative.dev)) apps that are installed by end users to
manage one or more decentralized identities.

## Getting Started

This JavaScript library was designed for modern development runtimes, including Node.js, web
browsers, and React Native. The package is distributed as `@web5/identity-agent` via
[npmjs.com][identity-agent-npm-link], [jsdelivr.com][identity-agent-jsdelivr-link],
[unpkg.com][identity-agent-unpkg-link], and [github.com][identity-agent-repo-link].

### Node.js

This library is designed and tested for the _active_ (`v20`) and _maintenance_
(`v18`) [LTS releases](https://nodejs.org/en/about/previous-releases) of Node.js

Install the latest version of `@web5/identity-agent` using `npm` or your preferred package manager:

```shell
npm install @web5/identity-agent
```

Example ESM import:

```js
import { Ed25519 } from "@web5/identity-agent";
```

Example CJS require:

```js
const { Ed25519 } = require("@web5/identity-agent");
```

### Web Browsers

A polyfilled distribution is published to [jsdelivr.com][identity-agent-jsdelivr-browser] and
[unpkg.com][identity-agent-unpkg-browser] that can imported in a module `<script>` tag:

```html
<!DOCTYPE html>
<html lang="en">
  <body>
    <script type="module">
      // Example import from JSDELIVR
      import { Web5IdentityAgent } from "https://cdn.jsdelivr.net/npm/@web5/identity-agent/dist/browser.mjs";
    </script>
  </body>
</html>
```

<a id="secure-context"></a>

> [!IMPORTANT]
> The `@web5/identity-agent` library depends on the
> [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API) in web browsers.
> Web Crypto is available in all modern browsers but is accessible only in a
> [secure context](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts).
>
> This means you will not be able to use many `@web5/identity-agent` features in a browser unless
> the page is served over `https://` or `wss://`. Locally-delivered resources such as those with
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

### Launching an Identity Agent

An [agent](https://developer.tbd.website/docs/web5/learn/agents) is software that acts on behalf of
a user to manage identity, public or private data, and interactions with other apps or services in a
network. Identity Agents are a specific type of agent focused on simplifying the management of a
person's online identities, since they often have several.

Many people already use multiple personas when interacting with others online depending on
whether the context is family, career, or social. This might take the form of a work issued email
that you use for career apps and a personal email that you use when interacting with family and
friends. The same is true with Web5 identities except that the unique identifier is a
[Decentralized Identifier (DID)](https://developer.tbd.website/docs/web5/learn/decentralized-identifiers)
rather than an email address. Developers can create identity management apps, sometimes called
"wallets", that focus on making it easy to connect Web5 apps to one or more identities and keep track
of which apps have access to your data.

Every time an Identity Agent app runs on a computing device, whether desktop or mobile, the
following should occur:

1. Check whether the agent was previously initialized.
2. If this is the first run on this device, initialize the agent.
3. Load the agent's DID and keys to prepare for use.

An example implementation of these steps would be:

```ts
import { Web5IdentityAgent } from '@web5/identity-agent'

// Create a Web5 Identity Agent instance.
const agent = await Web5IdentityAgent.create();

// Prompt the end user to enter a password, which prevents unauthorized access to the encrypted
// identity vault that secures the Agent's DID and cryptographic keys.
const password = /* input by user */


// If its the first launch, initialize the identity vault for the agent, and if not provided, return
// the generated recovery phrase.
let recoveryPhrase: string;
if (await agent.firstLaunch()) {
  // Unless provided, a 12-word recovery phrase will automatically be generated and the Agent's
  // cryptographic keys deterministically generated from the phrase.
  recoveryPhrase = await agent.initialize({ password, recoveryPhrase });
}

// On every launch unlock the identity vault using the provided password and load the Agent's DID
// and keys from encrypted vault storage.
await userAgent.start({ password });
```

### Creating an End User Identity

In Web5 apps, a user’s unique identifier - like an email address - is called a
[Decentralized Identifier (DID)](https://developer.tbd.website/docs/web5/learn/decentralized-identifiers).
You can think of an Identity as an isolated space uniquely identified by a DID that stores and
manages the data relevant to a particular context or use case.

For example, a person might have one identity for work-related apps and data, another for
personal/family, and yet another for their social media persona.

By organizing cryptographic keys, profile information, data, and credentials into separate
identities, an Identity Agent can help users maintain greater control over their personal
information and how it is shared with others. Users can choose which identity to share with
different parties, depending on the context and level of trust.

The follow code example walks through how to create a new identity, manage it with the Identity
Agent, and store data in the
[Decentralized Web Node (DWN)](https://developer.tbd.website/docs/web5/learn/decentralized-web-nodes/)
data store controlled by the newly created identity.

```ts
import { getTechPreviewDwnEndpoints, Web5 } from "@web5/api";

// Retrieve publicly addressable DWNs that other network participants can use to exchange messages
// and data with the new Identity.
const serviceEndpointNodes = await getTechPreviewDwnEndpoints();

// Generate a new Identity for the end-user.
const careerIdentity = await agent.identity.create({
  didMethod: "dht",
  metadata: { name: "Alice" },
  didOptions: {
    services: [
      {
        id: "dwn",
        type: "DecentralizedWebNode",
        serviceEndpoint: serviceEndpointNodes,
        enc: "#enc",
        sig: "#sig",
      },
    ],
    verificationMethods: [
      {
        algorithm: "Ed25519",
        id: "sig",
        purposes: ["assertionMethod", "authentication"],
      },
      {
        algorithm: "secp256k1",
        id: "enc",
        purposes: ["keyAgreement"],
      },
    ],
  },
});
```

### Writing Data to an Identity's Data Store

The [Web5 API](https://github.com/TBD54566975/web5-js/tree/main/packages/api) makes it simple to
store data in an identity's DWN data store by handling all of the message and data preparation and
processing steps. Using the `careerIdentity` created earlier, a simple message payload can be
written as follows:

```ts
// Instantiate a Web5 instance with the "Career" Identity.
const web5Career = new Web5({ agent, connectedDid: careerIdentity.did.uri });

// Write a simple text record.
const { record, status } = await web5Career.dwn.records.write({
  data: "Message",
  message: {
    dataFormat: "text/plain",
  },
});

console.log(status.code); // Output: 202

const recordData = await record?.data.text();
console.log(recordData); // Output: Message
```

## Customization

### Using Non-default Data Stores

By default, `Web5IdentityAgent` uses a [LevelDB](https://github.com/Level/level) store for both the
agent's identity vault and the DID resolver cache. For testing and prototyping purposes it may be
desirable to use an in-memory store that doesn't persist data. There are also runtime environments,
such as React Native, that don't support using the [level](https://www.npmjs.com/package/level)
package. Any implementation of the
[`KeyValueStore`](https://github.com/TBD54566975/web5-js/blob/5f364bc0d859e28f1388524ebe8ef152a71727c4/packages/common/src/types.ts#L4-L43)
interface can be substituted for the default identity vault and DID resolver cache.

For example, to use the in-memory `KeyValueStore` implementation from `@web5/common`:

```ts
import { MemoryStore } from "@web5/common";
import { DidDht, DidJwk } from "@web5/dids";
import { Web5IdentityAgent } from "@web5/identity-agent";
import { AgentDidApi, DidResolverCacheLevel, DwnDidStore } from "@web5/agent";

// Instantiate Identity Vault with an in-memory store.
const agentVault = new HdIdentityVault({
  keyDerivationWorkFactor: 210_000,
  store: new MemoryStore<string, string>(),
});

// Instantiate DID API with an in-memory resolver cache.
const didApi = new AgentDidApi({
  didMethods: [DidDht, DidJwk],
  resolverCache: new DidResolverCacheMemory(),
  store: new DwnDidStore(),
});

// Create a Web5 Identity Agent instance.
const agent = await Web5IdentityAgent.create({ agentVault, didApi });
```

## Project Resources

| Resource                                | Description                                                                   |
| --------------------------------------- | ----------------------------------------------------------------------------- |
| [CODEOWNERS][codeowners-link]           | Outlines the project lead(s)                                                  |
| [CODE OF CONDUCT][code-of-conduct-link] | Expected behavior for project contributors, promoting a welcoming environment |
| [CONTRIBUTING][contributing-link]       | Developer guide to build, test, run, access CI, chat, discuss, file issues    |
| [GOVERNANCE][governance-link]           | Project governance                                                            |
| [LICENSE][license-link]                 | Apache License, Version 2.0                                                   |

[identity-agent-npm-badge]: https://img.shields.io/npm/v/@web5/identity-agent.svg?style=flat&color=blue&santize=true
[identity-agent-npm-link]: https://www.npmjs.com/package/@web5/identity-agent
[identity-agent-downloads-badge]: https://img.shields.io/npm/dt/@web5/identity-agent?&color=blue
[identity-agent-build-badge]: https://img.shields.io/github/actions/workflow/status/TBD54566975/web5-js/tests-ci.yml?branch=main&label=build
[identity-agent-build-link]: https://github.com/TBD54566975/web5-js/actions/workflows/tests-ci.yml
[identity-agent-coverage-badge]: https://img.shields.io/codecov/c/gh/TBD54566975/web5-js/main?style=flat&token=YI87CKF1LI
[identity-agent-coverage-link]: https://app.codecov.io/github/TBD54566975/web5-js/tree/main/packages%2Fcrypto-aws-kms
[identity-agent-issues-badge]: https://img.shields.io/github/issues/TBD54566975/web5-js/package:%20identity-agent?label=issues
[identity-agent-issues-link]: https://github.com/TBD54566975/web5-js/issues?q=is%3Aopen+is%3Aissue+label%3A"package%3A+identity-agent"
[identity-agent-repo-link]: https://github.com/TBD54566975/web5-js/tree/main/packages/identity-agent
[identity-agent-jsdelivr-link]: https://www.jsdelivr.com/package/npm/@web5/identity-agent
[identity-agent-jsdelivr-browser]: https://cdn.jsdelivr.net/npm/@web5/identity-agent/dist/browser.mjs
[identity-agent-unpkg-link]: https://unpkg.com/@web5/identity-agent
[identity-agent-unpkg-browser]: https://unpkg.com/@web5/identity-agent/dist/browser.mjs
[codeowners-link]: https://github.com/TBD54566975/web5-js/blob/main/CODEOWNERS
[code-of-conduct-link]: https://github.com/TBD54566975/web5-js/blob/main/CODE_OF_CONDUCT.md
[contributing-link]: https://github.com/TBD54566975/web5-js/blob/main/CONTRIBUTING.md
[governance-link]: https://github.com/TBD54566975/web5-js/blob/main/GOVERNANCE.md
[license-link]: https://github.com/TBD54566975/web5-js/blob/main/LICENSE
[discord-badge]: https://img.shields.io/discord/937858703112155166?color=5865F2&logo=discord&logoColor=white
[discord-link]: https://discord.com/channels/937858703112155166/969272658501976117
