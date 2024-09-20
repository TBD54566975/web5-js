# Web5 Browser package

| Web5 tools and features to use in the browser |
| --------------------------------------------- |

[![NPM Package][browser-npm-badge]][browser-npm-link]
[![NPM Downloads][browser-downloads-badge]][browser-npm-link]

[![Build Status][browser-build-badge]][browser-build-link]
[![Open Issues][browser-issues-badge]][browser-issues-link]
[![Code Coverage][browser-coverage-badge]][browser-coverage-link]

---

- [Web5 Browser](#introduction)
  - [Activate Polyfills](#activate-polyfills)
  - [Project Resources](#project-resources)

---

<a id="introduction"></a>

This package contains browser-specific helpers for building DWAs (Decentralized Web Apps).

### Activate Polyfills

This enables a service worker that can handle Web5 features in the browser such as resolving DRLs that look like: `http://dweb/did:dht:abc123/protocols/read/aHR0cHM6Ly9hcmV3ZXdlYjV5ZXQuY29tL3NjaGVtYXMvcHJvdG9jb2xz/avatar`

To enable this functionality import and run `activatePolyfills()` at the entrypoint of your project, or within an existing service worker.

## Project Resources

| Resource                                | Description                                                                   |
| --------------------------------------- | ----------------------------------------------------------------------------- |
| [CODEOWNERS][codeowners-link]           | Outlines the project lead(s)                                                  |
| [CODE OF CONDUCT][code-of-conduct-link] | Expected behavior for project contributors, promoting a welcoming environment |
| [CONTRIBUTING][contributing-link]       | Developer guide to build, test, run, access CI, chat, discuss, file issues    |
| [GOVERNANCE][governance-link]           | Project governance                                                            |
| [LICENSE][license-link]                 | Apache License, Version 2.0                                                   |

[browser-npm-badge]: https://img.shields.io/npm/v/@web5/browser.svg?style=flat&color=blue&santize=true
[browser-npm-link]: https://www.npmjs.com/package/@web5/browser
[browser-downloads-badge]: https://img.shields.io/npm/dt/@web5/browser?&color=blue
[browser-build-badge]: https://img.shields.io/github/actions/workflow/status/TBD54566975/web5-js/tests-ci.yml?branch=main&label=build
[browser-build-link]: https://github.com/TBD54566975/web5-js/actions/workflows/tests-ci.yml
[browser-coverage-badge]: https://img.shields.io/codecov/c/gh/TBD54566975/web5-js/main?style=flat&token=YI87CKF1LI
[browser-coverage-link]: https://app.codecov.io/github/TBD54566975/web5-js/tree/main/packages%2Fbrowser
[browser-issues-badge]: https://img.shields.io/github/issues/TBD54566975/web5-js/package:%20browser?label=issues
[browser-issues-link]: https://github.com/TBD54566975/web5-js/issues?q=is%3Aopen+is%3Aissue+label%3A"package%3A+browser"
[browser-repo-link]: https://github.com/TBD54566975/web5-js/tree/main/packages/browser
[browser-jsdelivr-link]: https://www.jsdelivr.com/package/npm/@web5/browser
[browser-jsdelivr-browser]: https://cdn.jsdelivr.net/npm/@web5/browser/dist/browser.mjs
[browser-unpkg-link]: https://unpkg.com/@web5/browser
[browser-unpkg-browser]: https://unpkg.com/@web5/browser/dist/browser.mjs
[codeowners-link]: https://github.com/TBD54566975/web5-js/blob/main/CODEOWNERS
[code-of-conduct-link]: https://github.com/TBD54566975/web5-js/blob/main/CODE_OF_CONDUCT.md
[contributing-link]: https://github.com/TBD54566975/web5-js/blob/main/CONTRIBUTING.md
[governance-link]: https://github.com/TBD54566975/web5-js/blob/main/GOVERNANCE.md
[license-link]: https://github.com/TBD54566975/web5-js/blob/main/LICENSE
[discord-badge]: https://img.shields.io/discord/937858703112155166?color=5865F2&logo=discord&logoColor=white
[discord-link]: https://discord.com/channels/937858703112155166/969272658501976117
