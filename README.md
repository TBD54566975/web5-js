# Web5 JS Monorepo

[![Coverage](https://img.shields.io/codecov/c/gh/TBD54566975/web5-js/main?logo=codecov&logoColor=FFFFFF&style=flat-square&token=YI87CKF1LI)](https://codecov.io/github/TBD54566975/web5-js)
[![Chat](https://img.shields.io/badge/chat-on%20discord-7289da.svg?style=flat-square&color=9a1aff&logo=discord&logoColor=FFFFFF&sanitize=true)](https://discord.com/channels/937858703112155166/969272658501976117)
[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/TBD54566975/web5-js/badge)](https://securityscorecards.dev/viewer/?uri=github.com/TBD54566975/web5-js)

This monorepo houses the core components of the [Web5](https://developer.tbd.website/docs/web5/) platform implemented in TypeScript/JavaScript. It features libraries for building applications with decentralized identifiers (DIDs), verifiable credentials (VCs), and decentralized web nodes (DWNs). The packages were designed for modern development runtimes, including Node.js, web browsers, and React Native.

## 🎉 Hacktoberfest 2024 🎉

`web5-js` is a participating project in Hacktoberfest 2024! We’re so excited for your contributions, and have created a wide variety of issues so that anyone can contribute. Whether you're a seasoned developer or a first-time open source contributor, there's something for everyone.

### To get started:
1. Read the [contributing guide](https://github.com/TBD54566975/web5-js/blob/main/CONTRIBUTING.md).
2. Read the [code of conduct](https://github.com/TBD54566975/web5-js/blob/main/CODE_OF_CONDUCT.md).
3. Choose a task from this project's Hacktoberfest issues in our Project Hubs for [our protocol builder here](https://github.com/TBD54566975/tbd-examples/issues/97) and [general tasks here](https://github.com/TBD54566975/web5-js/issues/908) and follow the instructions. Each issue has the 🏷️ `hacktoberfest` label.

Have questions? Connecting with us in our [Discord community](https://discord.gg/tbd) in the `#hacktoberfest` project channel.

---

## Foundational Packages

Below you can find a list of the foundational platform SDK packages included in this repository.

| package | npm | issues | api reference |
| ------- | --- | ------ | ------------- |
| [@web5/common][common-package] | [![NPM Package][common-npm-badge]][common-npm-link] | [![Open Issues][common-issues-badge]][common-issues-link] | _coming soon_ <!--[![API Reference][common-docs-badge]][common-docs-link]--> |
| [@web5/credentials][credentials-package] | [![NPM Package][credentials-npm-badge]][credentials-npm-link] | [![Open Issues][credentials-issues-badge]][credentials-issues-link] | [![API Reference][credentials-docs-badge]][credentials-docs-link] |
| [@web5/crypto][crypto-package] | [![NPM Package][crypto-npm-badge]][crypto-npm-link] | [![Open Issues][crypto-issues-badge]][crypto-issues-link] | [![API Reference][crypto-docs-badge]][crypto-docs-link] |
| [@web5/crypto-aws-kms][crypto-aws-kms-package] | [![NPM Package][crypto-aws-kms-npm-badge]][crypto-aws-kms-npm-link] | [![Open Issues][crypto-aws-kms-issues-badge]][crypto-aws-kms-issues-link] | [![API Reference][crypto-aws-kms-docs-badge]][crypto-aws-kms-docs-link] |
| [@web5/dids][dids-package] | [![NPM Package][dids-npm-badge]][dids-npm-link] | [![Open Issues][dids-issues-badge]][dids-issues-link] | [![API Reference][dids-docs-badge]][dids-docs-link] |

## Decentralized Web Packages

Web5 decentralized web applications are built using decentralized identifiers (DIDs), verifiable credentials (VCs), and decentralized web node (DWN) datastores.  This repository includes the following packages designed to make building Web5 apps as simple as possible.

| package | npm | issues | api reference |
| ------- | --- | ------ | ------------- |
| [@web5/agent][agent-package] | [![NPM Package][agent-npm-badge]][agent-npm-link] | [![Open Issues][agent-issues-badge]][agent-issues-link] | _coming soon_ <!--[![API Reference][agent-docs-badge]][agent-docs-link]--> |
| [@web5/api][api-package] | [![NPM Package][api-npm-badge]][api-npm-link] | [![Open Issues][api-issues-badge]][api-issues-link] | [![API Reference][api-docs-badge]][api-docs-link] |
| [@web5/identity-agent][identity-agent-package] | [![NPM Package][identity-agent-npm-badge]][identity-agent-npm-link] | [![Open Issues][identity-agent-issues-badge]][identity-agent-issues-link] | _coming soon_ <!--[![API Reference][identity-agent-docs-badge]][identity-agent-docs-link]--> |
| [@web5/proxy-agent][proxy-agent-package] | [![NPM Package][proxy-agent-npm-badge]][proxy-agent-npm-link] | [![Open Issues][proxy-agent-issues-badge]][proxy-agent-issues-link] | _coming soon_ <!--[![API Reference][proxy-agent-docs-badge]][proxy-agent-docs-link]--> |
| [@web5/user-agent][user-agent-package] | [![NPM Package][user-agent-npm-badge]][user-agent-npm-link] | [![Open Issues][user-agent-issues-badge]][user-agent-issues-link] | _coming soon_ <!--[![API Reference][user-agent-docs-badge]][user-agent-docs-link]--> |

## Getting Started

To start developing applications and services with the Web5 JS SDK, the following steps will guide
you through setting up your local development environment.

For detailed documentation on usage refer to the
[API reference documentation](https://tbd54566975.github.io/web5-js/). Additionally, comprehensive
guides can be found at the [TBD Developer site](https://developer.tbd.website/docs/) to enhance
your understanding of the underlying concepts and how to implement them effectively.

### Cloning

This repository uses git submodules. To clone this repo with submodules:
```sh
git clone --recurse-submodules git@github.com:TBD54566975/web5-js.git
```

Or to add submodules after cloning:
```sh
git submodule update --init
```

We recommend running the command below once which will configure your environment to only checkout the `test-vectors` directory under the `web5-spec` git submodule directory.
```sh
git -C web5-spec sparse-checkout set test-vectors
```

### Hermit

This project uses [Hermit](https://cashapp.github.io/hermit/) to manage development tooling.
See [this guide](https://cashapp.github.io/hermit/usage/get-started/) to learn how to download the
Hermit open source build and activate it for the project.

By default, the following packages installed by Hermit:
- node
- pnpm

You can check what has been installed by running `hermit status`.

## Contributing

We welcome you to join our open source community. Whether you're new to open source or a seasoned
contributor, there's a place for you here. From coding to documentation, every contribution matters.
Check out our [contribution guide][contributing-link] for ways to get started.

For help, discussion about best practices, or to chat with others building on Web5 join our
[Discord Server][discord-link]:

[![discord-badge]][discord-link]

Remember, contributing is not just about code; it's about building together. Join us in shaping the
future of the Web!

## Working with the `web5-spec` submodule

### Pulling
You may need to update the `web5-spec` submodule after pulling.
```sh
git pull
git submodule update
```

### Pushing
If you have made changes to the `web5-spec` submodule, you should push your changes to the `web5-spec` remote as well as pushing changes to `web5-js`.
```sh
cd web5-spec
git push
cd ..
git push
```

## Project Resources

| Resource                                | Description                                                                   |
| --------------------------------------- | ----------------------------------------------------------------------------- |
| [CODEOWNERS][codeowners-link]           | Outlines the project lead(s)                                                  |
| [CODE OF CONDUCT][code-of-conduct-link] | Expected behavior for project contributors, promoting a welcoming environment |
| [CONTRIBUTING][contributing-link]       | Developer guide to build, test, run, access CI, chat, discuss, file issues    |
| [GOVERNANCE][governance-link]           | Project governance                                                            |
| [LICENSE][license-link]                 | Apache License, Version 2.0                                                   |

[agent-package]: ./packages/agent#readme
[agent-npm-badge]: https://img.shields.io/npm/v/@web5/agent.svg?&color=blue&santize=true
[agent-npm-link]: https://www.npmjs.com/package/@web5/agent
[agent-issues-badge]: https://img.shields.io/github/issues/TBD54566975/web5-js/package:%20agent?label=issues
[agent-issues-link]: https://github.com/TBD54566975/web5-js/issues?q=is%3Aopen+is%3Aissue+label%3A"package%3A+agent"
[agent-docs-badge]: https://img.shields.io/badge/docs-blue?logo=googledocs&logoColor=FFFFFF
[agent-docs-link]: https://tbd54566975.github.io/web5-js/modules/_web5_agent.html

[api-package]: ./packages/api#readme
[api-npm-badge]: https://img.shields.io/npm/v/@web5/api.svg?&color=blue&santize=true
[api-npm-link]: https://www.npmjs.com/package/@web5/api
[api-issues-badge]: https://img.shields.io/github/issues/TBD54566975/web5-js/package:%20api?label=issues
[api-issues-link]: https://github.com/TBD54566975/web5-js/issues?q=is%3Aopen+is%3Aissue+label%3A"package%3A+api"
[api-docs-badge]: https://img.shields.io/badge/docs-blue?logo=googledocs&logoColor=FFFFFF
[api-docs-link]: https://tbd54566975.github.io/web5-js/modules/_web5_api.html

[common-package]: ./packages/common#readme
[common-npm-badge]: https://img.shields.io/npm/v/@web5/common.svg?&color=blue&santize=true
[common-npm-link]: https://www.npmjs.com/package/@web5/common
[common-issues-badge]: https://img.shields.io/github/issues/TBD54566975/web5-js/package:%20common?label=issues
[common-issues-link]: https://github.com/TBD54566975/web5-js/issues?q=is%3Aopen+is%3Aissue+label%3A"package%3A+common"
[common-docs-badge]: https://img.shields.io/badge/docs-blue?logo=googledocs&logoColor=FFFFFF
[common-docs-link]: https://tbd54566975.github.io/web5-js/modules/_web5_common.html

[credentials-package]: ./packages/credentials#readme
[credentials-npm-badge]: https://img.shields.io/npm/v/@web5/credentials.svg?&color=blue&santize=true
[credentials-npm-link]: https://www.npmjs.com/package/@web5/credentials
[credentials-issues-badge]: https://img.shields.io/github/issues/TBD54566975/web5-js/package:%20credentials?label=issues
[credentials-issues-link]: https://github.com/TBD54566975/web5-js/issues?q=is%3Aopen+is%3Aissue+label%3A"package%3A+credentials"
[credentials-docs-badge]: https://img.shields.io/badge/docs-blue?logo=googledocs&logoColor=FFFFFF
[credentials-docs-link]: https://tbd54566975.github.io/web5-js/modules/_web5_credentials.html

[crypto-package]: ./packages/crypto#readme
[crypto-npm-badge]: https://img.shields.io/npm/v/@web5/crypto.svg?&color=blue&santize=true
[crypto-npm-link]: https://www.npmjs.com/package/@web5/crypto
[crypto-issues-badge]: https://img.shields.io/github/issues/TBD54566975/web5-js/package:%20crypto?label=issues
[crypto-issues-link]: https://github.com/TBD54566975/web5-js/issues?q=is%3Aopen+is%3Aissue+label%3A"package%3A+crypto"
[crypto-docs-badge]: https://img.shields.io/badge/docs-blue?logo=googledocs&logoColor=FFFFFF
[crypto-docs-link]: https://tbd54566975.github.io/web5-js/modules/_web5_crypto.html

[crypto-aws-kms-package]: ./packages/crypto-aws-kms#readme
[crypto-aws-kms-npm-badge]: https://img.shields.io/npm/v/@web5/crypto-aws-kms.svg?&color=blue&santize=true
[crypto-aws-kms-npm-link]: https://www.npmjs.com/package/@web5/crypto-aws-kms
[crypto-aws-kms-issues-badge]: https://img.shields.io/github/issues/TBD54566975/web5-js/package:%20crypto-aws-kms?label=issues
[crypto-aws-kms-issues-link]: https://github.com/TBD54566975/web5-js/issues?q=is%3Aopen+is%3Aissue+label%3A"package%3A+crypto-aws-kms"
[crypto-aws-kms-docs-badge]: https://img.shields.io/badge/docs-blue?logo=googledocs&logoColor=FFFFFF
[crypto-aws-kms-docs-link]: https://tbd54566975.github.io/web5-js/modules/_web5_crypto_aws_kms.html

[dids-package]: ./packages/dids#readme
[dids-npm-badge]: https://img.shields.io/npm/v/@web5/dids.svg?&color=blue&santize=true
[dids-npm-link]: https://www.npmjs.com/package/@web5/dids
[dids-issues-badge]: https://img.shields.io/github/issues/TBD54566975/web5-js/package:%20dids?label=issues
[dids-issues-link]: https://github.com/TBD54566975/web5-js/issues?q=is%3Aopen+is%3Aissue+label%3A"package%3A+dids"
[dids-docs-badge]: https://img.shields.io/badge/docs-blue?logo=googledocs&logoColor=FFFFFF
[dids-docs-link]: https://tbd54566975.github.io/web5-js/modules/_web5_dids.html

[identity-agent-package]: ./packages/identity-agent#readme
[identity-agent-npm-badge]: https://img.shields.io/npm/v/@web5/identity-agent.svg?&color=blue&santize=true
[identity-agent-npm-link]: https://www.npmjs.com/package/@web5/identity-agent
[identity-agent-issues-badge]: https://img.shields.io/github/issues/TBD54566975/web5-js/package:%20identity-agent?label=issues
[identity-agent-issues-link]: https://github.com/TBD54566975/web5-js/issues?q=is%3Aopen+is%3Aissue+label%3A"package%3A+identity-agent"
[identity-agent-docs-badge]: https://img.shields.io/badge/docs-blue?logo=googledocs&logoColor=FFFFFF
[identity-agent-docs-link]: https://tbd54566975.github.io/web5-js/modules/_web5_identity_agent.html

[proxy-agent-package]: ./packages/proxy-agent#readme
[proxy-agent-npm-badge]: https://img.shields.io/npm/v/@web5/proxy-agent.svg?&color=blue&santize=true
[proxy-agent-npm-link]: https://www.npmjs.com/package/@web5/proxy-agent
[proxy-agent-issues-badge]: https://img.shields.io/github/issues/TBD54566975/web5-js/package:%20proxy-agent?label=issues
[proxy-agent-issues-link]: https://github.com/TBD54566975/web5-js/issues?q=is%3Aopen+is%3Aissue+label%3A"package%3A+proxy-agent"
[proxy-agent-docs-badge]: https://img.shields.io/badge/docs-blue?logo=googledocs&logoColor=FFFFFF
[proxy-agent-docs-link]: https://tbd54566975.github.io/web5-js/modules/_web5_proxy_agent.html

[user-agent-package]: ./packages/user-agent#readme
[user-agent-npm-badge]: https://img.shields.io/npm/v/@web5/user-agent.svg?&color=blue&santize=true
[user-agent-npm-link]: https://www.npmjs.com/package/@web5/user-agent
[user-agent-issues-badge]: https://img.shields.io/github/issues/TBD54566975/web5-js/package:%20user-agent?label=issues
[user-agent-issues-link]: https://github.com/TBD54566975/web5-js/issues?q=is%3Aopen+is%3Aissue+label%3A"package%3A+user-agent"
[user-agent-docs-badge]: https://img.shields.io/badge/docs-blue?logo=googledocs&logoColor=FFFFFF
[user-agent-docs-link]: https://tbd54566975.github.io/web5-js/modules/_web5_user_agent.html

[codeowners-link]: https://github.com/TBD54566975/web5-js/blob/main/CODEOWNERS
[code-of-conduct-link]: https://github.com/TBD54566975/web5-js/blob/main/CODE_OF_CONDUCT.md
[contributing-link]: https://github.com/TBD54566975/web5-js/blob/main/CONTRIBUTING.md
[governance-link]: https://github.com/TBD54566975/web5-js/blob/main/GOVERNANCE.md
[license-link]: https://github.com/TBD54566975/web5-js/blob/main/LICENSE
[discord-badge]: https://img.shields.io/discord/937858703112155166?color=5865F2&logo=discord&logoColor=white
[discord-link]: https://discord.com/channels/937858703112155166/969272658501976117