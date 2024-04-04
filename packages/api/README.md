# Web5 JS SDK

[![NPM](https://img.shields.io/npm/v/@web5/api.svg?style=flat-square&logo=npm&logoColor=FFFFFF&color=FFEC19&santize=true)](https://www.npmjs.com/package/@web5/api)
[![Build Status](https://img.shields.io/github/actions/workflow/status/TBD54566975/web5-js/tests-ci.yml?branch=main&logo=github&label=ci&logoColor=FFFFFF&style=flat-square)](https://github.com/TBD54566975/web5-js/actions/workflows/tests-ci.yml)
[![Coverage](https://img.shields.io/codecov/c/gh/TBD54566975/web5-js/main?logo=codecov&logoColor=FFFFFF&style=flat-square&token=YI87CKF1LI)](https://codecov.io/github/TBD54566975/web5-js)
[![License](https://img.shields.io/npm/l/@web5/api.svg?style=flat-square&color=24f2ff&logo=apache&logoColor=FFFFFF&santize=true)](https://github.com/TBD54566975/web5-js/blob/main/LICENSE)
[![Chat](https://img.shields.io/badge/chat-on%20discord-7289da.svg?style=flat-square&color=9a1aff&logo=discord&logoColor=FFFFFF&sanitize=true)](https://discord.com/channels/937858703112155166/969272658501976117)

Making developing with Web5 components at least 5 times easier to work with.

> ⚠️ WEB5 JS SDK IS CURRENTLY IN TECH PREVIEW ⚠️

The SDK is currently still under active development, but having entered the Tech Preview phase there is now a drive to avoid unnecessary changes unless backwards compatibility is provided. Additional functionality will be added in the lead up to 1.0 final, and modifications will be made to address issues and community feedback.

## Table of Contents

- [Introduction](#introduction)
- [Installation](#installation)
- [Usage](#usage)
- [API Documentation](#api-documentation)
  - [Web5.connect](#web5connectoptions)
  - [web5.dwn.records.query](#web5dwnrecordsqueryrequest)
  - [web5.dwn.records.create](#web5dwnrecordscreaterequest)
  - [web5.dwn.records.write](#web5dwnrecordswriterequest)
  - [web5.dwn.records.read](#web5dwnrecordsreadrequest)
  - [web5.dwn.records.delete](#web5dwnrecordsdeleterequest)
  - [web5.dwn.protocols.configure](#web5dwnprotocolsconfigurerequest)
  - [web5.dwn.protocols.query](#web5dwnprotocolsqueryrequest)
  - [web5.did.create](#web5didcreatemethod-options)
- [Project Resources](#project-resources)

## Introduction

Web5 consists of the following components:

- Decentralized Identifiers
- Verifiable Credentials
- DWeb Node personal datastores

The SDK sets out to gather the most oft used functionality from all three of these
pillar technologies to provide a simple library that is as close to effortless as
possible.

## Installation

_NPM_

```yaml
npm install @web5/api
```

_CDNs_

```yaml
https://unpkg.com/0.8.4/dist/browser.js
```

```yaml
https://cdn.jsdelivr.net/npm/@web5/api@0.8.4/dist/browser.mjs
```

## Usage

### Importing the SDK

```javascript
import { Web5 } from "@web5/api";
```

or

```javascript
import { Web5 } from CDN_LINK_HERE;
```

### Additional Steps

This SDK relies indirectly on the [`@noble/ed25519`](https://github.com/paulmillr/noble-ed25519#usage)
and [`@noble/secp256k1`](https://github.com/paulmillr/noble-secp256k1#usage) packages. Therefore,
in certain environments, you'll need to perform additional steps to make it work.

- Node.js <= 18

```js
// node.js 18 and earlier,  needs globalThis.crypto polyfill
import { webcrypto } from "node:crypto";
// @ts-ignore
if (!globalThis.crypto) globalThis.crypto = webcrypto;
```

- React Native:

```js
// If you're on react native. React Native needs crypto.getRandomValues polyfill and sha512
import "react-native-get-random-values";
import { hmac } from "@noble/hashes/hmac";
import { sha256 } from "@noble/hashes/sha256";
import { sha512 } from "@noble/hashes/sha512";
ed.etc.sha512Sync = (...m) => sha512(ed.etc.concatBytes(...m));
ed.etc.sha512Async = (...m) => Promise.resolve(ed.etc.sha512Sync(...m));

secp.etc.hmacSha256Sync = (k, ...m) =>
  hmac(sha256, k, secp.etc.concatBytes(...m));
secp.etc.hmacSha256Async = (k, ...m) =>
  Promise.resolve(secp.etc.hmacSha256Sync(k, ...m));
```

## API Documentation

### **`Web5.connect(options)`**

Enables an app to request connection to a user's local identity app (like a desktop or mobile agent - work is underway for reference apps of each), or generate an in-app DID to represent the user (e.g. if the user does not have an identity app).

> **NOTE:** The outputs of this method invocation will be used throughout the other API methods below.

```javascript
const { web5, did: myDid } = await Web5.connect();
```

#### **`options`** _(optional)_

An object which may specify any of the following properties:

- **`agent`** - _`Web5Agent instance`_ _(optional)_: an instance of a `Web5Agent` implementation. Defaults to creating a local `Web5UserAgent` if not provided.

- **`appData`** - _`AppDataStore instance`_ _(optional)_: an instance of an `AppDataStore` implementation. Defaults to a LevelDB-backed store with an insecure, static unlock passphrase if not provided. To allow the end user to enter a secure passphrase of their choosing, provide an initialized `AppDataVault`.

- **`connectedDid`** - _`string`_ _(optional)_: an existing DID to connect to.

- **`sync`** - _`string`_ _(optional)_: enable or disable synchronization of DWN records between local and remote DWNs. Sync defaults to running every 2 minutes and can be set to any value accepted by [`ms`](https://www.npmjs.com/package/ms). To disable sync set to `'off'`.

- **`techPreview`** - _`object`_ _(optional)_: an object that specifies configuration parameters that are relevant during the Tech Preview period of Web5 JS and may be deprecated in the future with advance notice.

  - **`dwnEndpoints`** - _`array`_ _(optional)_: a list of DWeb Node endpoints to define in the DID created and returned by `Web5.connect()`. If this property is omitted, during the Tech Preview two nodes will be included by default (e.g., `['https://dwn.tbddev.org/dwn0', 'https://dwn.tbddev.org/dwn3']`).

  For example:

  ```typescript
  const { web5, did: myDid } = await Web5.connect({
    techPreview: {
      dwnEndpoints: ["https://dwn.your-domain.org/"],
    },
  });
  ```

<!-- > NOTE: This method **_MUST_** be invoked within the scope of a 'trusted user action' (something enforced by the OS/browser) if the desire is to connect to a local identity app. For browsers this is generally some direct user action, like clicking a link or button. -->

#### **Response**

An invocation of `Web5.connect()` produces the following items in response:

- **`web5`** - _`Web5 instance`_: A class instance that enables access to a locally running DWeb Node, DID interaction methods, and other capabilities related to the connected DID.
- **`did`** - _`string`_: The DID that was created or attained connection to.

### **`Record` instances from responses**

Every modifying method (`create`, `write`, etc.) and the `entries` from queries return an instance of a `Record` class, which is a representation of the Record(s) being referenced.

Each `Record` instance has the following instance properties: `id`, `attestation`, `contextId`, `dataFormat`, `dateCreated`, `encryption`, `interface`, `method`, `parentId`, `protocol`, `protocolPath`, `recipient`, `schema`, `dataCid`, `dataSize`, `dateModified`, `datePublished`, and `published`.

> **Note** The **`id`** property is a unique identifier based on the record entry's composition. All entries across all records are deterministically unique.

Each `Record` instance has the following instance methods:

- **`data`** - _`object`_: an object with the following convenience methods that read out the data of the record entry in the following formats:
  - **`blob`** - _`function`_: returns the data as a [`Blob`](https://developer.mozilla.org/en-US/docs/Web/API/Blob).
  - **`bytes`** - _`function`_: returns the data as a raw byte array in `Uint8Array` format.
  - **`json`** - _`function`_: returns a parsed JSON object.
  - **`stream`** - _`function`_: returns the data as a raw stream of bytes.
  - **`text`** - _`function`_: returns the data as a string.
- **`send`** - _`function`_: sends the record the instance represents to the DWeb Node endpoints of a provided DID.
- **`update`** - _`function`_: takes in a new request object matching the expected method signature of a `write` and overwrites the record. This is a convenience method that allows you to easily overwrite records with less verbosity.

### **`web5.dwn.records.query(request)`**

Method for querying either the locally connected DWeb Node or any remote DWeb Node specified in the `from` property.

```javascript
// This invocation will query the user's own DWeb Nodes
const { records } = await web5.dwn.records.query({
  message: {
    filter: {
      schema: "https://schema.org/Playlist",
      dataFormat: "application/json",
    },
  },
});

console.log(records); // an array of record entries from Bob's DWeb Nodes

// This invocation will query Bob's DWeb Nodes
const { records } = await web5.dwn.records.query({
  from: "did:example:bob",
  message: {
    filter: {
      protocol: "https://music.org/protocol",
      schema: "https://schema.org/Playlist",
      dataFormat: "application/json",
    },
  },
});

console.log(records); // an array of record entries from Bob's DWeb Nodes
```

#### **Request**

The query `request` contains the following properties:

- **`from`** - _`DID string`_ (_optional_): the decentralized identifier of the DWeb Node the query will fetch results from.
- **`message`** - _`object`_: the properties of the DWeb Node Message Descriptor that will be used to construct a valid record query:
  - **`filter`** - _`object`_: properties against which results of the query will be filtered:
    - **`recordId`** - _`string`_ (_optional_): the record ID string that identifies the record data you are fetching.
    - **`protocol`** - _`URI string`_ (_optional_): the URI of the protocol bucket in which to query.
    - **`protocolPath`** - _`string`_ (_optional_): the path to the record in the protocol configuration.
    - **`contextId`** _`string`_ (_optional_): the `recordId` of a root record of a protocol.
    - **`parentId`** _`string`_ (_optional_): the `recordId` of a the parent of a protocol record.
    - **`recipient`** - _`string`_ (_optional_): the DID in the `recipient` field of the record.
    - **`schema`** - _`URI string`_ (_optional_): the URI of the schema bucket in which to query.
    - **`dataFormat`** - _`Media Type string`_ (_optional_): the IANA string corresponding with the format of the data to filter for. See IANA's Media Type list here: https://www.iana.org/assignments/media-types/media-types.xhtml
  - **`dateSort`** - _`DateSort`_ (_optional_): the `DateSort` value of the date field and direction to sort records by. Defaults to `CreatedAscending`.
  - **`pagination`** - _`object`_ (_optional_): the properties used to paginate results.
    - **`limit`** - _`number`_ (_optional_): the number of records that should be returned with this query. `undefined` returns all records.
    - **`cursor`** - _`messageCid string`_ (_optional_): the `messageCid` of the records toc continue paginating from. This value is returned as a `cursor` in the response object of a `query` if there are more results beyond the `limit`.

#### **Response**

The query `response` contains the following properties:

- **`status`** - _`object`_: the status of the `request`:
  - **`code`** - _`number`_: the `Response Status` code, following the response code patterns for `HTTP Response Status Codes`.
  - **`detail`** _`string`_: a detailed message describing the response.
- **`records`** - _`Records array`_ (_optional_): the array of `Records` returned if the request was successful.
- **`cursor`** - _`messageCid string`_ (_optional_): the `messageCid` of the last message returned in the results if there are exist additional records beyond the specified `limit` in the `query`.

### **`web5.dwn.records.create(request)`**

Method for creating a new record and storing it in the user's local DWeb Node, remote DWeb Nodes, or another party's DWeb Nodes (if permitted).

```javascript
// this creates a record and stores it in the user's local DWeb Node
const { record } = await web5.dwn.records.create({
  data: "Hello World!",
  message: {
    dataFormat: "text/plain",
  },
});

console.log(await record.data.text()); // logs "Hello World!"
const { status } = await record.send(myDid); // send the record to the user's remote DWeb Nodes
const { status } = await record.send("did:example:bob"); // send the newly generated record to Bob's DWeb Nodes

// this creates a record, but does not store it in the user's local DWeb Node
const { record } = await web5.dwn.records.create({
  store: false,
  data: "Hello again, World!",
  message: {
    dataFormat: "text/plain",
  },
});

const { status } = await record.send("did:example:bob"); // send the newly generated record to Bob's DWeb Nodes
```

#### **Request**

The `create` request object is composed as follows:

- **`store`** - _`boolean`_ (_optional_): tells the create function whether or not to store the record in the user's local DWeb Node. (you might pass `false` if you didn't want to retain a copy of the record for yourself)
- **`data`** - _`text|object|file|blob`_: the data payload of the record.
- **`message`** - _`object`_: The properties of the DWeb Node Message Descriptor that will be used to construct a valid record query:
  - **`protocol`** - _`URI string`_ (_optional_): the URI of the protocol under which the record will be bucketed.
  - **`schema`** - _`URI string`_ (_optional_): the URI of the schema under which the record will be bucketed.
  - **`dataFormat`** - _`Media Type string`_ (_optional_): the IANA string corresponding with the format of the data the record will be bucketed. See IANA's Media Type list here: https://www.iana.org/assignments/media-types/media-types.xhtml

### **`web5.dwn.records.write(request)`**

The `create()` method is an alias for `write()` and both can take the same request object properties.

### **`web5.dwn.records.read(request)`**

Method for reading a record stored in the user's local DWeb Node, remote DWeb Nodes, or another party's DWeb Nodes (if permitted). The request takes a filter; if there is exactly one record matching the filter, the record and its data are returned. The most common filter is by `recordId`, but it is also useful to filter by `protocol`, `contextId`, and `protocolPath`.

```javascript
// Reads the indicated record from the user's DWeb Nodes
const { record } = await web5.dwn.records.read({
  message: {
    filter: {
      recordId: "bfw35evr6e54c4cqa4c589h4cq3v7w4nc534c9w7h5",
    },
  },
});

console.log(await record.data.text()); // assuming the record is a text payload, logs the text

// Reads the indicated record from Bob's DWeb Nodes
const { record } = await web5.dwn.records.read({
  from: "did:example:bob",
  message: {
    filter: {
      recordId: "bfw35evr6e54c4cqa4c589h4cq3v7w4nc534c9w7h5",
    },
  },
});

console.log(await record.data.text()); // assuming the record is a text payload, logs the text
```

#### **Request**

The `read` request object is composed as follows:

- **`from`** - _`DID string`_ (_optional_): The DID of the DWeb Node the read request will fetch the indicated record from.
- **`message`** - _`object`_: The properties of the DWeb Node Message Descriptor that will be used to construct a valid DWeb Node message.
  - **`filter`** - _`object`_: properties against which results of the query will be filtered:
    - **`recordId`** - _`string`_ (_optional_): the record ID string that identifies the record data you are fetching.
    - **`protocol`** - _`URI string`_ (_optional_): the URI of the protocol bucket in which to query.
    - **`protocolPath`** - _`string`_ (_optional_): the path to the record in the protocol configuration.
    - **`contextId`** _`string`_ (_optional_): the `recordId` of a root record of a protocol.
    - **`parentId`** _`string`_ (_optional_): the `recordId` of a the parent of a protocol record.
    - **`recipient`** - _`string`_ (_optional_): the DID in the `recipient` field of the record.
    - **`schema`** - _`URI string`_ (_optional_): the URI of the schema bucket in which to query.
    - **`dataFormat`** - _`Media Type string`_ (_optional_): the IANA string corresponding with the format of the data to filter for. See IANA's Media Type list here: https://www.iana.org/assignments/media-types/media-types.xhtml

### **`web5.dwn.records.delete(request)`**

Method for deleting a record stored in the user's local DWeb Node, remote DWeb Nodes, or another party's DWeb Nodes (if permitted).

```javascript
// Deletes the indicated record from the user's DWeb Node
const { record } = await web5.dwn.records.delete({
  message: {
    recordId: "bfw35evr6e54c4cqa4c589h4cq3v7w4nc534c9w7h5",
  },
});

// Deletes the indicated record from Bob's DWeb Node
const { record } = await web5.dwn.records.delete({
  from: "did:example:bob",
  message: {
    recordId: "bfw35evr6e54c4cqa4c589h4cq3v7w4nc534c9w7h5",
  },
});
```

#### **Request**

The `delete` request object is composed as follows:

- **`from`** - _`DID string`_ (_optional_): The DID of the DWeb Node the delete tombstone will be sent to.
- **`message`** - _`object`_: The properties of the DWeb Node Message Descriptor that will be used to construct a valid DWeb Node message.
  - **`recordId`** - _`string`_: the required record ID string that identifies the record being deleted.

### **`web5.dwn.protocols.configure(request)`**

Method for configuring a protocol definition in the DWeb Node of the user's local DWeb Node, remote DWeb Nodes, or another party's DWeb Nodes (if permitted).

```javascript
const { protocol } = await web5.dwn.protocols.configure({
  message: {
    definition: {
      protocol: "https://photos.org/protocol",
      published: true,
      types: {
        album: {
          schema: "https://photos.org/protocol/album",
          dataFormats: ["application/json"],
        },
        photo: {
          schema: "https://photos.org/protocols/photo",
          dataFormats: ["application/json"],
        },
        binaryImage: {
          dataFormats: ["image/png", "jpeg", "gif"],
        },
      },
      structure: {
        album: {
          $actions: [
            {
              who: "recipient",
              can: "read",
            },
          ],
        },
        photo: {
          $actions: [
            {
              who: "recipient",
              can: "read",
            },
          ],
          binaryImage: {
            $actions: [
              {
                who: "author",
                of: "photo",
                can: "write",
              },
            ],
          },
        },
      },
    },
  },
});

protocol.send(myDid); // sends the protocol configuration to the user's other DWeb Nodes.
```

#### **Request**

The `configure` request object is composed as follows:

- **`message`** - _`object`_: The properties of the DWeb Node Message Descriptor that will be used to construct a valid DWeb Node message.
  - **`definition`** - _`object`_: an object that defines the enforced composition of the protocol.
    - **`protocol`** - _`URI string`_: a URI that represents the protocol being configured.
    - **`types`** - _`object`_: an object that defines the records that can be used in the `structure` graph of the `definition` object. The following properties are optional constraints you can set for the type being defined:
      - **`schema`** - _`URI string`_ (_optional_): the URI of the schema under which the record will be bucketed.
      - **`dataFormats`** - _`Media Type string[]`_ (_optional_): Array of the IANA strings corresponding with the formats of the data the record will be bucketed. See IANA's Media Type list here: https://www.iana.org/assignments/media-types/media-types.xhtml
    - **`structure`** - _`object`_: an object that defines the structure of a protocol, including data relationships and constraints on which entities can perform various activities. Fields under the `structure` object of the Protocol definition are expected to be either type references matching those defined in the `types` object. The type structures are recursive, so types form a graph and each type can have within it further attached types or the following rule statements that are all denoted with the prefix `$`:
      - **`$actions`** - _`array`_: one or more rule objects that expose various allowed actions to actors (`author`, `recipient`), composed as follows:
        - **`who`** - _`string`_: the actor (`author`, `recipient`) that is being permitted to invoke a given action.
        - **`of`** - _`string`_: the protocol path that refers to the record subject. Using the above example protocol, the protocol path to `binaryImage` would be `photo/binaryImage`.
        - **`can`** - _`string`_: the action being permitted by the rule.

### **`web5.dwn.protocols.query(request)`**

Method for querying a DID's DWeb Nodes for the presence of a protocol. This method is useful in detecting what protocols a given DID has installed to enable interaction over the protocol.

```javascript
const { protocols } = await web5.dwn.protocols.query({
  message: {
    filter: {
      protocol: "https://music.org/protocol",
    },
  },
});

console.log(protocols); // logs an array of protocol configurations installed on the user's own DWeb Node

const { protocols } = await web5.dwn.protocols.query({
  from: "did:example:bob",
  message: {
    filter: {
      protocol: "https://music.org/protocol",
    },
  },
});

console.log(protocols); // logs an array of protocol configurations installed on Bob's DWeb Node
```

#### **Request**

The `query` request object must contain the following:

- **`from`** - _`DID string`_ (_optional_): the decentralized identifier of the DWeb Node the query will fetch results from.
- **`message`** - _`object`_: The properties of the DWeb Node Message Descriptor that will be used to construct a valid record query:
  - **`filter`** - _`object`_ (_optional_): properties against which results of the query will be filtered:
    - **`protocol`** - _`URI string`_ (_optional_): the URI of the protocol bucket in which to query.

### **`web5.did.create(request)`**

The `create` method under the `did` object enables generation of DIDs for a supported set of DID Methods ('dht'|'jwk').
The output is method-specific, and handles things like key generation and assembly of DID Documents that can be
published to DID networks.

#### **Usage**

```javascript
const myDid = await web5.did.create("dht");
```

#### **Parameters**

The `create` request object must contain the following parameters:

- **`method`** - _`string`_: The DID method to use for generating the DID. Supported methods include 'dht' and 'jwk', among others that may be supported by the SDK.

- **`options`** - _`object`_ (_optional_): An object containing options specific to the DID method chosen. These options can influence how the DID is generated. For instance, they can dictate specifics about the cryptographic keys that are generated or associated with the new DID. Common options include:

- **`store`** - _`boolean`_ (_optional_): Determines whether the DID's cryptographic keys and metadata will be stored in
  the user's DWeb Node.

#### **Notes**

- Typically developers will not manually invoke this method as the more common approach is to use the `Web5.connect()`
  method to acquire a DID for the user (either by direct creation or connection to an identity agent app).

### **`web5.did.resolve(didUri, options)`**

The `resolve` method under the `did` object enables the resolution of a Decentralized Identifier (DID) to its
corresponding DID Document. This operation allows applications to fetch the public keys, service endpoints, and other
metadata associated with a DID.

#### **Usage**

```javascript
const { didDocument } = await web5.did.resolve('did:dht:qftx7z968xcpfy1a1diu75pg5meap3gdtg6ezagaw849wdh6oubo');
```

#### **Parameters**

- **`didUri`** - _`string`_: The DID URI to be resolved. This should be a fully qualified DID following the standard scheme `did:<method>:<identifier>`.

- **`options`** (_optional_): An object containing options for DID resolution. This can include method-specific parameters that influence the resolution process.

#### **Response**

The method returns a DID resolution result as a JavaScript object. The structure of this object adheres to the
[DID Core specifications](https://www.w3.org/TR/did-core/#did-resolution), containing the elements
`didResolutionMetadata`, `didDocument`, and `didDocumentMetadata`.

#### **Notes**

- The resolution process for some DID methods like DID DHT involve network requests to the relevant DID verifiable 
  data registry or a resolver endpoint, which may introduce latency based on the network conditions and the specific DID
  method utilized.

## Project Resources

| Resource                                                                                  | Description                                                                   |
| ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| [CODEOWNERS](https://github.com/TBD54566975/web5-js/blob/main/CODEOWNERS)                 | Outlines the project lead(s)                                                  |
| [CODE_OF_CONDUCT.md](https://github.com/TBD54566975/web5-js/blob/main/CODE_OF_CONDUCT.md) | Expected behavior for project contributors, promoting a welcoming environment |
| [CONTRIBUTING.md](https://github.com/TBD54566975/web5-js/blob/main/CONTRIBUTING.md)       | Developer guide to build, test, run, access CI, chat, discuss, file issues    |
| [GOVERNANCE.md](https://github.com/TBD54566975/web5-js/blob/main/GOVERNANCE.md)           | Project governance                                                            |
| [LICENSE](./LICENSE)                                                                      | Apache License, Version 2.0                                                   |
