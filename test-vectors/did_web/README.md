# `did:web` Test Vectors

## Resolve

Resolution test vectors are available [here](./resolve.json)

### Input

The value of `input` is an object that contains the following properties:

| Property     | Description                                                                                                                                                                            |
|--------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `didUri`     | The DID URI to be resolved.                                                                                                                                                            |
| `mockServer` | Optional. Object used to describe mocking behavior. Every key in the object is a URL, and the value is the JSON object that should be sent back as the response to a HTTP GET request. |

### Output

The value of `output` is an object that contains the following properties.

| Property                | Description                                                                                                                                                                                       |
|-------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `didDocument`           | the expected [didDocument](https://www.w3.org/TR/did-core/#dfn-diddocument) when `input.didUri` is resolved. Note that `didDocument` is set to `{}` if resolution is unsuccessful                 |
| `didDocumentMetadata`   | the expected [didDocumentMetadata](https://www.w3.org/TR/did-core/#dfn-diddocumentmetadata) when `input.didUri` is resolved. Note for `did:web` this is _always_ an empty object                  |
| `didResolutionMetadata` | the expected [didResolutionMetadata](https://www.w3.org/TR/did-core/#dfn-didresolutionmetadata) when `input.didUri` is resolved. Note for `did:web`, on success, this is _always_ an empty object |
