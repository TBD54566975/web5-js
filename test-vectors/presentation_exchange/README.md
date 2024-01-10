# Presentation Exchange Test Vectors

## CreatePresentationFromCredentials

Input and output for a full presentation exchange test vectors are available [here](./wa-license.json) The reference implementation can be found [here](https://github.com/TBD54566975/web5-js/blob/main/packages/credentials/src/presentation-exchange.ts#L80)

### Input

the value of `input` is a an object with `presentationDefinition` and the corresponding `credentialJwt`

| Property                | Description                                                                                                                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `presentationDefinition`           | the input [presentationDefinition](https://identity.foundation/presentation-exchange/#presentation-definition)  showing the requirements used for this getting an example WA license               |
| `credentialJwt`   | the input [verifiable credential secured as a JWT](https://www.w3.org/TR/vc-data-model/#json-web-token) that corresponds to the presentationDefinition to fulfill it and do a full presentation exchange

### Output

the value of `output` is an object that contains the following properties

| Property                | Description                                                                                                                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `presentationSubmission`           | the expected [presentationSubmission](https://identity.foundation/presentation-exchange/#presentation-submission) when the `inputs` are processed by `createPresentationFromCredentials`.             |
