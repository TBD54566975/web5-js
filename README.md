# Web5 JS SDK
Making developing with Web5 components at least 5 times easier to work with.

⚠️ WEB5 JS SDK IS IN A PRE-BETA STATE ⚠️

## Introduction

Web5 consists of the following components:
- Decentralized Identifiers
- Verifiable Credentials
- DWeb Node personal datastores

The SDK sets out to gather the most oft used functionality from all three of these 
pillar technologies to provide a simple library that is as close to effortless as 
possible. 

## Docs

### **`Web5.connect(OPTIONS_OBJECT)`**

Enables an app to request connection to a user's local identity app, or generate an in-app DID to represent the user (e.g. if the user does not have an identity app).

> NOTE: This method may only be invoked within the scope of a 'trusted user action', which is something the browser/OS decides. For browsers this is generally some direct user intent, like clicking a link or button.

The `connect` method takes an object with the following properties:

#### **`onRequest(REQUEST_OBJECT)`**

An event function that is called in response to a pending connection response being delivered by the user's identity app, composed of the following properties:

- **`pin`**  - *`number`*: 1-4 digit numerical code that must be displayed by the app developer in UI so the user can confirm they are connecting to the correct app.
- **`port`** - *`number`*: The port number the identity app was located on.


#### **`onConnected(CONNECTION_OBJECT)`**

An event function that is called in response to the user accepting the connection and sending the DID they selected back to the app:

- **`did`**  - *`string`*: The decentralized identifier sent back to the app.

#### **`onDenied()`**

An event function that is called in response to the user refusing to accept or respond to the connection attempt for any reason.

#### **Example** 

```javascript
document.querySelector('#connect_button').addEventListener('click', async event => {

  event.preventDefault();

  Web5.connect({
    onRequest(response){
      document.querySelector('#pin_code_text').textContent = response.pin;
    },
    onConnected(connection){
      alert('Connection succeeded! Connected to DID: ' + connection.did);
    },
    onDenied(){
      alert('Connection was denied');
    }
  })

});
```

### **`Web5.records.query(TARGET_DID, PARAMETERS_OBJECT)`**

Method for querying the DWeb Node of a provided target DID. The target DID and parameters object are required arguments, with the parameters options composed as follows:

- **`author`**  - *`string`*: The decentralized identifier of the DID signing the query. This may be the same as the `TARGET_DID` parameter if the target and the signer of the query are the same entity, which is common for an app querying the DWeb Node of its own user.
- **`message`**  - *`object`*: The properties of the DWeb Node Message Descriptor that will be used to construct a valid DWeb Node message.

#### **Example** 

```javascript
const response = await Web5.records.query(aliceDid, {
  author: aliceDid,
  message: {
    filter: {
      schema: 'https://schema.org/Playlist',
      dataFormat: 'application/json'
    }
  }
});
```

### **`Web5.records.write(TARGET_DID, PARAMETERS_OBJECT)`**

Method for writing a message with data to the DWeb Node of a provided target DID. The target DID and parameters object are required arguments, with the parameters options composed as follows:

- **`author`**  - *`string`*: The decentralized identifier of the DID signing the query. This may be the same as the `TARGET_DID` parameter if the target and the signer of the query are the same entity, which is common for an app querying the DWeb Node of its own user.
- **`message`**  - *`object`*: The properties of the DWeb Node Message Descriptor that will be used to construct a valid DWeb Node message.
- **`data`**  - *`blob | stream | file`*: The data object of the bytes to be sent.

#### **Example** 

```javascript
const imageFile = document.querySelector('#file_input').files[0];
const response = await Web5.records.write(aliceDid, {
  author: aliceDid,
  data: imageFile,
  message: {
    dataFormat: 'image/png'
  }
});
```

## Project Resources

| Resource                                   | Description                                                                    |
| ------------------------------------------ | ------------------------------------------------------------------------------ |
| [CODEOWNERS](./CODEOWNERS)                 | Outlines the project lead(s)                                                   |
| [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) | Expected behavior for project contributors, promoting a welcoming environment |
| [CONTRIBUTING.md](./CONTRIBUTING.md)       | Developer guide to build, test, run, access CI, chat, discuss, file issues     |
| [GOVERNANCE.md](./GOVERNANCE.md)           | Project governance                                                             |
| [LICENSE](./LICENSE)                       | Apache License, Version 2.0                                                    |