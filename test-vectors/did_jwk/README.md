# `did:jwk` Test Vectors

## Resolve

Resolution test vectors are available [here](./resolve.json)

### Input

the value of `input` is a string that is to be treated as a DID URI

### Output

the value of `output` is an object that contains the following properties

| Property                | Description                                                                                                                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `didDocument`           | the expected [didDocument](https://www.w3.org/TR/did-core/#dfn-diddocument) when `input` is resolved. Note that `didDocument` is set to `null` if resolution is unsuccessful               |
| `didDocumentMetadata`   | the expected [didDocumentMetadata](https://www.w3.org/TR/did-core/#dfn-diddocumentmetadata) when `input` is resolved. Note for `did:jwk` this is _always_ an empty object                  |
| `didResolutionMetadata` | the expected [didResolutionMetadata](https://www.w3.org/TR/did-core/#dfn-didresolutionmetadata) when `input` is resolved. Note for `did:jwk`, on success, this is _always_ an empty object |
