# Web5 JS SDK

Making developing with Web5 components at least 5 times easier to work with.

> ⚠️ WEB5 JS SDK IS CURRENTLY IN TECH PREVIEW ⚠️

The SDK is currently still under active development, but having entered the Tech Preview phase there is now a drive to avoid unnecessary changes unless backwards compatibility is provided. Additional functionality will be added in the lead up to 1.0 final, and modifications will be made to address issues and community feedback.

## Introduction

Web5 consists of the following components:

- Decentralized Identifiers
- Verifiable Credentials
- DWeb Node personal datastores

The SDK sets out to gather the most oft used functionality from all three of these
pillar technologies to provide a simple library that is as close to effortless as
possible.

## Docs

### Installation

_NPM_

```yaml
npm install @tbd54566975/web5
```

_CDNs_

```yaml
https://unpkg.com/@tbd54566975/web5@0.7.5/dist/browser.js
```

```yaml
https://cdn.jsdelivr.net/npm/@tbd54566975/web5@0.7.5/dist/browser.mjs
```

### Importing the SDK

```javascript
import { Web5 } from "@tbd54566975/web5";
```

or

```javascript
import { Web5 } from CDN_LINK_HERE;
```

### **`Web5.connect()`**

Enables an app to request connection to a user's local identity app (like a desktop or mobile agent - work is underway for reference apps of each), or generate an in-app DID to represent the user (e.g. if the user does not have an identity app).

> **NOTE:** The outputs of this method invocation with be used throughout the other API methods below.

```javascript
const { web5, did: myDid } = await Web5.connect();
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

- **`data`** - _`object`_: a object with the following convenience methods that read out the data of the record entry in the following formats:
  - **`text`** - _`function`_: produces a textual representation of the data.
  - **`json`** - _`function`_: if the value is JSON data, this method will return a parsed JSON object.
  - **`stream`** - _`function`_: returns the raw stream of bytes for the data.
- **`send`** - _`function`_: sends the record the instance represents to the DWeb Node endpoints of a provided DID.
- **`update`** - _`function`_: takes in a new request object matching the expected method signature of a `write` and overwrites the record. This is a convenience method that allows you to easily overwrite records with less verbosity.
- **`delete`** - _`function`_: generates a `delete` entry tombstone for the record. This is a convenience method that allows you to easily delete records with less verbosity.

### **`web5.dwn.records.query()`**

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
    - **`protocol`** - _`URI string`_ (_optional_): the URI of the protocol bucket in which to query.
    - **`schema`** - _`URI string`_ (_optional_): the URI of the protocol bucket in which to query.
    - **`dataFormat`** - _`Media Type string`_ (_optional_): the IANA string corresponding with the format of the data to filter for. See IANA's Media Type list here: https://www.iana.org/assignments/media-types/media-types.xhtml

### **`web5.dwn.records.create()`**

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

// this creates a record similarly to the above, but uses a protocol
```
    const { record, status } = await web5.dwn.records.write({
      data: {"photo", "Hello again, World!"},
      message: {
        protocol: 'https://photos.org/protocol',
        protocolPath: 'album',
        recipient: did
      }
    });
 ```   

#### **Request**

The `create` request object is composed as follows:

- **`store`** - _`boolean`_: tells the create function whether or not to store the record in the user's local DWeb Node. (you might pass `false` if you didn't want to retain a copy of the record for yourself)
- **`data`** - _`text|object|file|blob`_: the data payload of the record.
- **`message`** - _`object`_: The properties of the DWeb Node Message Descriptor that will be used to construct a valid record query:
  - **`protocol`** - _`URI string`_ (_optional_): the URI of the protocol under which the record will be bucketed.
  - **`schema`** - _`URI string`_ (_optional_): the URI of the schema under which the record will be bucketed.
  - **`dataFormat`** - _`Media Type string`_ (_optional_): the IANA string corresponding with the format of the data the record will be bucketed. See IANA's Media Type list here: https://www.iana.org/assignments/media-types/media-types.xhtml

### **`web5.dwn.records.write()`**

The `create()` method is an alias for `write()` and both can take the same request object properties.

### **`web5.dwn.records.read()`**

Method for reading a record stored in the DWeb Node of the user's local DWeb Node, remote DWeb Nodes, or another party's DWeb Nodes (if permitted).

```javascript
// Reads the indicated record from the user's DWeb Nodes
const { record } = await web5.dwn.records.read({
  message: {
    recordId: "bfw35evr6e54c4cqa4c589h4cq3v7w4nc534c9w7h5",
  },
});

console.log(await record.data.text()); // assuming the record is a text payload, logs the text

// Reads the indicated record from Bob's DWeb Nodes
const { record } = await web5.dwn.records.read({
  from: "did:example:bob",
  message: {
    recordId: "bfw35evr6e54c4cqa4c589h4cq3v7w4nc534c9w7h5",
  },
});

console.log(await record.data.text()); // assuming the record is a text payload, logs the text
```

#### **Request**

The `read` request object is composed as follows:

- **`from`** - _`DID string`_ (_optional_): The DID of the DWeb Node the read request will fetch the indicated record from.
- **`message`** - _`object`_: The properties of the DWeb Node Message Descriptor that will be used to construct a valid DWeb Node message.
  - **`recordId`** - _`string`_: the required record ID string that identifies the record data you are fetching.

### **`web5.dwn.records.delete()`**

Method for deleting a record stored in the DWeb Node of the user's local DWeb Node, remote DWeb Nodes, or another party's DWeb Nodes (if permitted).

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

### **`web5.dwn.protocols.configure()`**

Method for configuring a protocol definition in the DWeb Node of the user's local DWeb Node, remote DWeb Nodes, or another party's DWeb Nodes (if permitted).

```javascript
const { protocol } = await web5.dwn.protocols.configure({
  message: {
    definition: {
      protocol: "https://photos.org/protocol",
      types: {
        album: {
          schema: "https://photos.org/protocol/album",
          dataFormat: ["application/json"],
        },
        photo: {
          schema: "https://photos.org/protocols/photo",
          dataFormat: ["application/json"],
        },
        binaryImage: {
          dataFormat: ["image/png", "jpeg", "gif"],
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

- **`from`** - _`string`_: The decentralized identifier signing the query. This may be the same as the `target` parameter if the target and the signer of the query are the same entity, which is common for an app querying the DWeb Node of its own user.
- **`message`** - _`object`_: The properties of the DWeb Node Message Descriptor that will be used to construct a valid DWeb Node message.
  - **`definition`** - _`object`_: an object that defines the enforced composition of the protocol.
    - **`protocol`** - _`URI string`_: a URI that represents the protocol being configured.
    - **`types`** - _`object`_: an object that defines the records that can be used in the `structure` graph of the `definition` object. The following properties are optional constraints you can set for the type being defined:
      - **`schema`** - _`URI string`_ (_optional_): the URI of the schema under which the record will be bucketed.
      - **`dataFormat`** - _`Media Type string`_ (_optional_): the IANA string corresponding with the format of the data the record will be bucketed. See IANA's Media Type list here: https://www.iana.org/assignments/media-types/media-types.xhtml
    - **`structure`** - _`object`_: an object that defines the structure of a protocol, including data relationships and constraints on which entities can perform various activities. Fields under the `structure` object of the Protocol definition are expected to be either type references matching those defined in the `types` object. The type structures are recursive, so types form a graph and each type can have within it further attached types or the following rule statements that are all denoted with the prefix `$`:
      - **`$actions`** - _`array`_: one or more rule objects that expose various allowed actions to actors (`author`, `recipient`), composed as follows:
        - **`who`** - _`string`_: the actor (`author`, `recipient`) that is being permitted to invoke a given action.
        - **`of`** - _`string`_: the protocol path that refers to the record subject. Using the above example protocol, the protocol path to `binaryImage` would be `photo/binaryImage`.
        - **`can`** - _`string`_: the action being permitted by the rule.

### **`web5.dwn.protocols.query()`**

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

The query `request` must contain the following:

- **`from`** - _`DID string`_ (_optional_): the decentralized identifier of the DWeb Node the query will fetch results from.
- **`message`** - _`object`_: The properties of the DWeb Node Message Descriptor that will be used to construct a valid record query:
  - **`filter`** - _`object`_: properties against which results of the query will be filtered:
    - **`protocol`** - _`URI string`_ (_optional_): the URI of the protocol bucket in which to query.

### **`web5.did.create(method, options)`**

The `create` method under the `did` object enables generation of DIDs for a supported set of DID Methods. The output is method-specific, and handles things like key generation and assembly of DID Documents that can be published to DID networks.

> NOTE: You do not usually need to manually invoke this, as the `Web5.connect()` method already acquires a DID for the user (either by direct creation or connection to an identity agent app).

```javascript
const myDid = await Web5.did.create("ion");
```

## Project Resources

| Resource                                   | Description                                                                   |
| ------------------------------------------ | ----------------------------------------------------------------------------- |
| [CODEOWNERS](./CODEOWNERS)                 | Outlines the project lead(s)                                                  |
| [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) | Expected behavior for project contributors, promoting a welcoming environment |
| [CONTRIBUTING.md](./CONTRIBUTING.md)       | Developer guide to build, test, run, access CI, chat, discuss, file issues    |
| [GOVERNANCE.md](./GOVERNANCE.md)           | Project governance                                                            |
| [LICENSE](./LICENSE)                       | Apache License, Version 2.0                                                   |
