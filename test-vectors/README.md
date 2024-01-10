# Web5 Test Vectors

## Description

This directory contains test vectors for all features we intend to support accross several languages. Each feature has its own directory which contains a single vectors file per sub-feature e.g.

```text
web5-test-vectors
├── README.md
├── did-jwk <--- feature
│   └── resolve.json <--- sub-feature
├── index.html
└── vectors.schema.json
```

## Test Vector Files

Test vector files should adhere to [`vectors.schema.json`]('./vectors.schema.json'). This repo contains a [`test-vector-validation`]('../scripts/test-vector-validation') script that validates all vectors files in this directory. It can be run manually by following the instructions [here](../scripts/test-vector-validation/README.md).

> [!NOTE]
> Test Vector Validation runs automatically anytime a change is made in this directory or to the script itself.

Each test vector file is a structured collection of test vector objects, where each vector asserts a specific outcome for a given input. Below is a table that outlines the expected fields in a test vector file:

| Field                   | Type    | Description                                                                                          | Required |
| ----------------------- | ------- | ---------------------------------------------------------------------------------------------------- | :------: |
| `description`           | string  | A general description of the test vectors collection.                                                |   Yes    |
| `vectors`               | array   | An array of test vector objects.                                                                     |   Yes    |
| `vectors[].description` | string  | A description of what this test vector is testing.                                                   |   Yes    |
| `vectors[].input`       | any     | The input for the test vector, which can be of any type.                                             |   Yes    |
| `vectors[].output`      | any     | The expected output for the test vector, which can be of any type.                                   |    No    |
| `vectors[].errors`      | boolean | Indicates whether the test vector is expected to produce an error. Defaults to false if not present. |    No    |

### Rationale for Test Vector Structure

The structure of a `vector` object is designed to fulfill two conditions:

* the function works and returns something that should match `output`
* the function throws an error (in whatever way the consuming language represents errors)
  * _optionally_, the error's _output_ should match `output`

`errors: true` is an instruction to anticipate an error in the implementation language. For example:

* In languages like Kotlin or Javascript, the presence of `errors: true` would imply that `assertThrows` be used.
* In Go, the expectation would be for the err variable to be non-nil.
* In Rust, the error handling would pivot on matching `Result.Err` rather than `Result.Ok`.

Should `errors` be set to `true`, the `output` field may optionally be used to include expected error messages.

## Creating New Test Vector Full Walkthrough

### Step 1: Create New Test Vector

1. Navigate to the GitHub repository: sdk-development[https://github.com/TBD54566975/sdk-development/tree/main/web5-test-vectors]

2. Create a new folder and JSON file with the structure example_feature/hello_world.json.

3. Populate the JSON file as follows. Note that adherence to the [json schema](./vectors.schema.json) is enforced by CI.

```json
{
  "description": "vector example",
  "vectors": [
    {
      "description": "this is an example",
      "input": "hello world",
      "output": "hello world",
      "errors" : false
    }
  ]
}
```

### Step 2: Copy JSON to Local Test-Vectors Directory

Copy the `hello_world.json` file from `example_feature` directory into your SDK's test-vectors folder. make sure the file
and file name are both identical to that in the sdk-development repo.

### Step 3: Create Unit Test in web5-kt

1. In the `web5-kt` project, create a new unit test class.

1. Name the class following the given pattern:

* Prefix: `Web5TestVectors`

* Middle: Convert `example_feature` to `ExampleFeature` (capitalize words and remove underscores)

* Combined Output: `Web5TestVectorsExampleFeature`

1. Implement the class and test method as follows:

```kt
class Web5TestVectorsExampleFeature {
  @Test
  fun hello_world() {
    val testVectors = mapper.readValue(File("../test-vectors/example_feature/hello_world.json"), typeRef)
    assertEquals(testVectors.vectors[0].input, testVectors.vectors[0].output)
  }
}
```

### Step 4: Create Unit Test in web5-js

1. In the `web5-js` project, create a new unit test class.

1. Name the class following the given pattern:

* Prefix: `Web5TestVectors`

* Middle: Convert `example_feature` to `ExampleFeature` (capitalize words and remove underscores)

* Combined Output: `Web5TestVectorsExampleFeature`

1. Implement the class and test method as follows:

```javascript
  import ExampleFeatureHelloWorldSpecJson from '../../../test-vectors/example_feature/hello_world.json' assert { type: 'json' };

  describe('Web5TestVectorsExampleFeature', () => {
    it('hello_world', async () => {
      const vectors = ExampleFeatureHelloWorldSpecJson.vectors;
      expect(vectors[0].input).to.equal(vectors[0].output)
    });
  });
```

### Step 5: Completion

* Once the above steps are completed, the `sdk-development` repository will automatically detect the new test vectors by consuming artifacts generated by a github action (No action by you required)
* Once the new vector merges into the sdk-development repo, PRs will be automatically opened on all SDKs that don't have it yet.
* The system will indicate whether the test passes or fails with a checkmark or an 'x' on the [test vectors dashboard](https://tbd54566975.github.io/sdk-development/).

Your new test vector system is now set up and ready for use!
