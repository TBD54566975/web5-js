# Web5 JS SDK
Making developing with Web5 components at least 5 times easier to work with.

⚠️ WEB5 JS SDK IS CURRENTLY IN TECH PREVIEW ⚠️

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

*NPM*
```yaml
npm install @tbd54566975/web5
```

*CDNs*
```yaml
https://unpkg.com/@tbd54566975/web5@0.7.0/dist/browser.js
```
```yaml
https://cdn.jsdelivr.net/npm/@tbd54566975/web5@0.7.0/dist/browser.mjs
```

### Importing the SDK

```javascript
import { Web5 } from '@tbd54566975/web5';
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

- **`web5`**  - *`Web5 instance`*: A class instance that enables access to a locally running DWeb Node, DID interaction methods, and other capabilities related to the connected DID.
- **`did`**  - *`DID instance`*: A class instance representing the Decentralized Identifier of the DID that was created or attained connection to.


### **`Record` instances from responses**

Every modifying method (`create`, `write`, etc.) and the `entries` from queries return an instance of a `Record` class, which is a representation of the Record(s) being referenced. `Record` class instances offer the following properties and methods:

- **`id`**  - *`string`*: The unique identifier based on the record entry's composition. Note: all entries across all records are deterministically unique.
- **`descriptor`**  - *`object`*: The descriptor object for the constructed DWeb Node message.
- **`data`**  - *`object`*: a object with the following convenience methods that read out the data of the record entry in the following formats:
  - **`text`**  - *`function`*: produces a textual representation of the data.
  - **`json`**  - *`function`*: if the value is JSON data, this method will return a parsed JSON object.
  - **`stream`**  - *`function`*: returns the raw stream of bytes for the data.
- **`send`**  - *`function`*: generates a `delete` entry tombstone for the record. This is a convenience method that allows you to easily delete records with less verbosity.
- **`update`**  - *`function`*: takes in a new request object matching the expected method signature of a `write` and overwrites the record. This is a convenience method that allows you to easily overwrite records with less verbosity.
- **`delete`**  - *`function`*: generates a `delete` entry tombstone for the record. This is a convenience method that allows you to easily delete records with less verbosity.

### **`web5.dwn.records.query()`**

Method for querying the DWeb Node of a provided `target` DID.

```javascript
// This invocation will query the user's own DWeb Nodes
const { records } = await web5.dwn.records.query({
  message: {
    filter: {
      schema: 'https://schema.org/Playlist',
      dataFormat: 'application/json'
    }
  }
});


console.log(records) // an array of record entries from Bob's DWeb Nodes

// This invocation will query Bob's DWeb Nodes
const { records } = await web5.dwn.records.query({
  from: 'did:example:bob',
  message: {
    filter: {
      protocol: 'https://music.org/protocol',
      schema: 'https://schema.org/Playlist',
      dataFormat: 'application/json'
    }
  }
});

console.log(records) // an array of record entries from Bob's DWeb Nodes
```

#### **Request**

The query `request` must contain the following:

- **`from`** - *`DID string`* (*optional*): the decentralized identifier of the DID of the DWeb Node the query will fetch results from.
- **`message`**  - *`object`*: the properties of the DWeb Node Message Descriptor that will be used to construct a valid record query:
    - **`filter`**  - *`object`*: properties against which results of the query will be filtered: 
      - **`protocol`** - *`URI string`* (*optional*): the URI of the protocol bucket in which to query.
      - **`schema`** - *`URI string`* (*optional*): the URI of the protocol bucket in which to query.
      - **`dataFormat`** - *`Media Type string`* (*optional*): the IANA string corresponding with the format of the data to filter for. See IANA's Media Type list here: https://www.iana.org/assignments/media-types/media-types.xhtml

### **`web5.dwn.records.create()`**

Method for creating a new record and storing it in the user's local DWeb Node, remote DWeb Nodes, or another party's DWeb Nodes (if permitted).

```javascript
// this creates a record and stores it in the user's local DWeb Node
const { record } = await web5.dwn.records.create({
  data: 'Hello World!',
  message: {
    dataFormat: 'text/plain'
  }
});

console.log(await record.data.text()) // logs "Hello World!" 
const { status } = await record.send(myDid) // send the record to the user's remote DWeb Nodes
const { status } = await record.send('did:example:bob') // send the newly generated record to Bob's DWeb Nodes

// this creates a record, but does not store it in the user's local DWeb Node
const { record } = await web5.dwn.records.create({
  store: false,
  data: 'Hello again, World!',
  message: {
    dataFormat: 'text/plain'
  }
});

const { status } = await record.send('did:example:bob') // send the newly generated record to Bob's DWeb Nodes
```

#### **Request**

The `create` request object is composed as follows:

- **`store`**  - *`boolean`*: tells the create function whether or not to store the record in the user's local DWeb Node. (you might pass `false` if you didn't want to retain a copy of the record for yourself)
- **`data`**  - *`text|object|file|blob`*: The data payload of the record.
- **`message`**  - *`object`*: The properties of the DWeb Node Message Descriptor that will be used to construct a valid record query:
    - **`protocol`** - *`URI string`* (*optional*): the URI of the protocol under which the record will be bucketed.
    - **`schema`** - *`URI string`* (*optional*): the URI of the schema under which the record will be bucketed.
    - **`dataFormat`** - *`Media Type string`* (*optional*): the IANA string corresponding with the format of the data the record will be bucketed. See IANA's Media Type list here: https://www.iana.org/assignments/media-types/media-types.xhtml


### **`web5.dwn.records.write()`**

Method for writing an update to a record in the user's local DWeb Node, remote DWeb Nodes, or another party's DWeb Nodes (if permitted).


```javascript
// this creates a record and stores it in the user's local DWeb Node
const { record } = await web5.dwn.records.create({
  data: 'Hello World!',
  message: {
    dataFormat: 'text/plain'
  }
});

console.log(await record.data.text()) // logs "Hello World!"
const { status } = await record.send(myDid) // send the record to the user's remote DWeb Nodes
const { status } = await record.send('did:example:bob') // send the newly generated record to Bob's DWeb Nodes

// this overwrites the existing a record, but does not store it in the user's local DWeb Node
const { record } = await web5.dwn.records.write({
  data: 'Hello again, World!',
  message: {
    recordId: record.id,
    dataFormat: 'text/plain'
  }
});

console.log(await record.data.text()) // logs "Hello again, World!"
const { status } = await record.send(myDid) // send updated record to the user's remote DWeb Nodes
const { status } = await record.send('did:example:bob') // send the updated record to Bob's DWeb Nodes

// A convenience method of the Record instance
const { status } = await record.update({
  data: 'Hello for a final time, world'
})
```
#### **Request**

The `write` request object is composed as follows:

- **`store`**  - *`boolean`*: tells the `write` function whether or not to store the record in the user's local DWeb Node. (you might pass `false` if you didn't want to retain a copy of the record for yourself)
- **`data`**  - *`text|object|file|blob`*: The data payload of the record.
- **`message`**  - *`object`*: The properties of the DWeb Node Message Descriptor that will be used to construct a valid record query:
    - **`protocol`** - *`URI string`* (*optional*): the URI of the protocol under which the record will be bucketed.
    - **`schema`** - *`URI string`* (*optional*): the URI of the schema under which the record will be bucketed.
    - **`dataFormat`** - *`Media Type string`* (*optional*): the IANA string corresponding with the format of the data the record will be bucketed. See IANA's Media Type list here: https://www.iana.org/assignments/media-types/media-types.xhtml

### **`web5.dwn.records.read()`**

Method for reading a record stored in the DWeb Node of the user's local DWeb Node, remote DWeb Nodes, or another party's DWeb Nodes (if permitted).

```javascript
// Reads the indicated record from the user's DWeb Nodes
const { record } = await web5.dwn.records.read({
  message: {
    recordId: 'bfw35evr6e54c4cqa4c589h4cq3v7w4nc534c9w7h5'
  }
});

console.log(await record.data.text()) // assuming the record is a text payload, logs the text

// Reads the indicated record from Bob's DWeb Nodes
const { record } = await web5.dwn.records.read({
  from: 'did:example:bob',
  message: {
    recordId: 'bfw35evr6e54c4cqa4c589h4cq3v7w4nc534c9w7h5'
  }
});

console.log(await record.data.text()) // assuming the record is a text payload, logs the text
```

#### **Request**

The `read` request object is composed as follows:

- **`from`** - *`DID string`* (*optional*): The DID of the DWeb Node the read request will fetch the indicated record from.
- **`message`**  - *`object`*: The properties of the DWeb Node Message Descriptor that will be used to construct a valid DWeb Node message.
  - **`recordId`**  - *`string`*: the required record ID string that identifies the record data you are fetching.

### **`web5.dwn.records.delete()`**

Method for deleting a record stored in the DWeb Node of the user's local DWeb Node, remote DWeb Nodes, or another party's DWeb Nodes (if permitted).

```javascript
// Deletes the indicated record from the user's DWeb Node
const { record } = await web5.dwn.records.delete({
  message: {
    recordId: 'bfw35evr6e54c4cqa4c589h4cq3v7w4nc534c9w7h5'
  }
});

// Deletes the indicated record from Bob's DWeb Node
const { record } = await web5.dwn.records.delete({
  from: 'did:example:bob',
  message: {
    recordId: 'bfw35evr6e54c4cqa4c589h4cq3v7w4nc534c9w7h5'
  }
});
```

#### **Request**

The `delete` request object is composed as follows:

- **`from`** - *`DID string`* (*optional*): The DID of the DWeb Node the delete tombstone will be sent to.
- **`message`**  - *`object`*: The properties of the DWeb Node Message Descriptor that will be used to construct a valid DWeb Node message.
    - **`recordId`**  - *`string`*: the required record ID string that identifies the record being deleted.

### **`web5.dwn.protocols.configure()`**

Method for configuring a protocol definition in the DWeb Node of the user's local DWeb Node, remote DWeb Nodes, or another party's DWeb Nodes (if permitted).

```javascript
const { protocol } = await web5.dwn.protocols.configure({
  message: {
    definition: {
      protocol: "https://photos.org/protocol",
      types: {
        "album": {
          "schema": "https://photos.org/protocol/album",
          "dataFormat": [ "application/json" ]
        },
        "photo": {
          "schema": "https://photos.org/protocols/photo",
          "dataFormat": [ "application/json" ]
        },
        "binaryImage": {
          "dataFormat": [
            "image/png",
            "jpeg",
            "gif"
          ]
        }
      },
      structure: {
        "album": {
          $actions: [
            {
              who: "recipient",
              can: "read"
            }
          ]
        },
        "photo": {
          $actions: [
            {
              who: "recipient",
              can: "read"
            }
          ],
          "binaryImage": {
            $actions: [
              {
                who: "author",
                of: "photo",
                can: "write"
              }
            ]
          }
        }
      }
    }
  }
});

protocol.send(myDid) // sends the protocol configuration to the user's other DWeb Nodes.
```

#### **Request**

The `configure` request object is composed as follows:

- **`from`**  - *`string`*: The decentralized identifier of the DID signing the query. This may be the same as the `target` parameter if the target and the signer of the query are the same entity, which is common for an app querying the DWeb Node of its own user.
- **`message`**  - *`object`*: The properties of the DWeb Node Message Descriptor that will be used to construct a valid DWeb Node message.
  - **`definition`**  - *`object`*: an object that defines the enforced composition of the protocol.
    - **`protocol`**  - *`URI string`*: a URI that represents the protocol being configured.
    - **`types`**  - *`object`*: an object that defines the records that can be used in the `structure` graph of the `definition` object. The following properties are optional constraints you can set for the type being defined:
      - **`schema`** - *`URI string`* (*optional*): the URI of the schema under which the record will be bucketed.
      - **`dataFormat`** - *`Media Type string`* (*optional*): the IANA string corresponding with the format of the data the record will be bucketed. See IANA's Media Type list here: https://www.iana.org/assignments/media-types/media-types.xhtml
    - **`structure`**  - *`object`*: an object that defines the structure of a protocol, including data relationships and constraints on which entities can perform various activities. Fields under the `structure` object of the Protocol definition are expected to be either type references matching those defined in the `types` object. The type structures are recursive, so types form a graph and each type can have within it further attached types or the following rule statements that are all denoted with the prefix `$`:
      - **`$actions`**  - *`array`*: one or more rule objects that expose various allowed actions to actors (`author`, `recipient`), composed as follows:
        - **`who`**  - *`string`*: the actor (`author`, `recipient`) that is being permitted to invoke a given action.
        - **`of`**  - *`string`*: the protocol path that refers to the record subject. Using the above example protocol, the protocol path to `binaryImage` would be `photo/binaryImage`.
        - **`can`**  - *`string`*: the action being permitted by the rule.


### **`web5.dwn.protocols.query()`**

Method for querying a DID's DWeb Nodes for the presence of a protocol. This method is useful in detecting what protocols a given DID has installed to enable interaction over the protocol.

```javascript
const { protocols } = await web5.dwn.protocols.query({
  message: {
    filter: {
      protocol: 'https://music.org/protocol'
    }
  }
});

console.log(protocols) // logs an array of protocol configurations installed on the user's own DWeb Node

const { protocols } = await web5.dwn.protocols.query({
  from: 'did:example:bob',
  message: {
    filter: {
      protocol: 'https://music.org/protocol'
    }
  }
});

console.log(protocols) // logs an array of protocol configurations installed on Bob's DWeb Node
```

#### **Request**

The query `request` must contain the following:

- **`from`** - *`DID string`* (*optional*): the decentralized identifier of the DID of the DWeb Node the query will fetch results from.
- **`message`**  - *`object`*: The properties of the DWeb Node Message Descriptor that will be used to construct a valid record query:
  - **`filter`**  - *`object`*: properties against which results of the query will be filtered: 
    - **`protocol`** - *`URI string`* (*optional*): the URI of the protocol bucket in which to query.


### **`web5.did.create(method, options)`**

The `create` method under the `did` object enables generation of DIDs for a supported set of DID Methods. The output is method-specific, and handles things like key generation and assembly of DID Documents that can be published to DID networks.

> NOTE: You do not usually need to manually invoke this, as the `Web5.connect()` method already acquires a DID for the user (either by direct creation or connection to an identity agent app).

```javascript
const myDid = await Web5.did.create('ion');
```

## Project Resources

| Resource                                   | Description                                                                    |
| ------------------------------------------ | ------------------------------------------------------------------------------ |
| [CODEOWNERS](./CODEOWNERS)                 | Outlines the project lead(s)                                                   |
| [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) | Expected behavior for project contributors, promoting a welcoming environment |
| [CONTRIBUTING.md](./CONTRIBUTING.md)       | Developer guide to build, test, run, access CI, chat, discuss, file issues     |
| [GOVERNANCE.md](./GOVERNANCE.md)           | Project governance                                                             |
| [LICENSE](./LICENSE)                       | Apache License, Version 2.0                                                    |