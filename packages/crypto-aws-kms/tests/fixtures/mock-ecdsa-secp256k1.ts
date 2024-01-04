import type {
  SignCommandOutput,
  CreateKeyCommandOutput,
  CreateAliasCommandOutput,
  DescribeKeyCommandOutput,
  GetPublicKeyCommandOutput,
} from '@aws-sdk/client-kms';

export const mockCreateAliasCommandOutput: CreateAliasCommandOutput = {
  '$metadata': {
    httpStatusCode    : 200,
    requestId         : 'f347b0e9-714c-4948-a3bd-85c7c8aaf570',
    extendedRequestId : undefined,
    cfId              : undefined,
    attempts          : 1,
    totalRetryDelay   : 0
  }
};

export const mockCreateKeyCommandOutput: CreateKeyCommandOutput = {
  '$metadata': {
    httpStatusCode  : 200,
    requestId       : '4f6a302b-0708-4aa7-a1ff-2052603fb92f',
    attempts        : 1,
    totalRetryDelay : 0
  },
  KeyMetadata: {
    AWSAccountId          : '111122223333',
    Arn                   : 'arn:aws:kms:us-east-1:111122223333:key/1234abcd-12ab-34cd-56ef-1234567890ab',
    CreationDate          : new Date('2023-12-23T13:27:44.258Z'),
    CustomerMasterKeySpec : 'ECC_SECG_P256K1',
    Description           : '',
    Enabled               : true,
    KeyId                 : '1234abcd-12ab-34cd-56ef-1234567890ab',
    KeyManager            : 'CUSTOMER',
    KeySpec               : 'ECC_SECG_P256K1',
    KeyState              : 'Enabled',
    KeyUsage              : 'SIGN_VERIFY',
    MultiRegion           : false,
    Origin                : 'AWS_KMS',
    SigningAlgorithms     : ['ECDSA_SHA_256']
  }
};

export const mockDescribeKeyCommandOutput: DescribeKeyCommandOutput = {
  '$metadata': {
    httpStatusCode    : 200,
    requestId         : '06e6f8ec-7fdc-43c7-bb5e-0734f6fff978',
    extendedRequestId : undefined,
    cfId              : undefined,
    attempts          : 1,
    totalRetryDelay   : 0
  },
  KeyMetadata: {
    AWSAccountId          : '111122223333',
    Arn                   : 'arn:aws:kms:us-east-1:111122223333:key/1234abcd-12ab-34cd-56ef-1234567890ab',
    CreationDate          : new Date('2023-12-23T13:27:44.258Z'),
    CustomerMasterKeySpec : 'ECC_SECG_P256K1',
    Description           : '',
    Enabled               : true,
    KeyId                 : '1234abcd-12ab-34cd-56ef-1234567890ab',
    KeyManager            : 'CUSTOMER',
    KeySpec               : 'ECC_SECG_P256K1',
    KeyState              : 'Enabled',
    KeyUsage              : 'SIGN_VERIFY',
    MultiRegion           : false,
    Origin                : 'AWS_KMS',
    SigningAlgorithms     : ['ECDSA_SHA_256']
  }
};

export const mockGetPublicKeyCommandOutput: GetPublicKeyCommandOutput = {
  '$metadata': {
    httpStatusCode  : 200,
    requestId       : 'a35b7319-db50-42bb-a098-4ccf0846ee26',
    attempts        : 1,
    totalRetryDelay : 0
  },
  CustomerMasterKeySpec : 'ECC_SECG_P256K1',
  KeyId                 : 'arn:aws:kms:us-east-1:111122223333:key/1234abcd-12ab-34cd-56ef-1234567890ab',
  KeySpec               : 'ECC_SECG_P256K1',
  KeyUsage              : 'SIGN_VERIFY',
  PublicKey             : new Uint8Array([
    48,  86,  48,  16,   6,   7,  42, 134,  72, 206,  61,   2,
    1,   6,   5,  43, 129,   4,   0,  10,   3,  66,   0,   4,
    182,   3, 133,  76, 244,  82,  80, 250, 140,  46, 239, 105,
    5,  60, 249, 116, 177, 205, 135, 250,  41, 225,  38, 122,
    206, 103,  58, 102,  97, 116,  11,  52, 234, 168, 238, 224,
    220,  25,  22, 169,  65,  91, 191,  31,  40, 192, 120,  43,
    76, 201, 109, 245, 216,  87, 116, 128, 241,  67, 192,  35,
    234,  86,  45, 237
  ]),
  SigningAlgorithms: ['ECDSA_SHA_256']
};

export const mockSignCommandOutput: SignCommandOutput = {

  '$metadata': {
    httpStatusCode  : 200,
    requestId       : 'b3efb68b-576c-4dbc-bcb8-d44933924706',
    attempts        : 1,
    totalRetryDelay : 0
  },
  KeyId     : 'arn:aws:kms:us-east-1:111122223333:key/1234abcd-12ab-34cd-56ef-1234567890ab',
  Signature : new Uint8Array([
    48,  70,   2,  33,   0, 136, 145, 145,  76,  67,  27, 170,
    230, 130, 222, 252,  87, 254,   7,  76, 140, 183,   0, 247,
    144, 215,  46,  42,  81,  71,  76, 202,  14, 224,  15, 170,
    132,   2,  33,   0, 174,  27, 157, 198, 164, 143,  74, 229,
    25,  70, 114, 192,  82,  61, 204,  80, 108, 253, 135,  98,
    197, 145,  69, 120, 146,  61, 183, 245,   9,  27, 157,  27
  ]),
  SigningAlgorithm: 'ECDSA_SHA_256'
};

export const mockEcdsaSecp256k1 = {
  createKeyAlias: {
    input  : { alias: 'urn:jwk:U01_M3_A9vMLOWixG-rlfC-_f3LLdurttn7c7d3_upU', awsKeyId: '1234abcd-12ab-34cd-56ef-1234567890ab' },
    output : mockCreateAliasCommandOutput
  },
  generateKey: {
    input  : { algorithm: 'ES256K' },
    output : mockCreateKeyCommandOutput
  },
  getKeySpec: {
    input  : { keyUri: 'urn:jwk:U01_M3_A9vMLOWixG-rlfC-_f3LLdurttn7c7d3_upU' },
    output : mockDescribeKeyCommandOutput
  },
  getPublicKey: {
    input  : { keyUri: 'urn:jwk:U01_M3_A9vMLOWixG-rlfC-_f3LLdurttn7c7d3_upU' },
    output : mockGetPublicKeyCommandOutput
  },
  sign: {
    input  : { algorithm: 'ES256K', data: new Uint8Array([0, 1, 2, 3, 4]), keyUri: 'urn:jwk:U01_M3_A9vMLOWixG-rlfC-_f3LLdurttn7c7d3_upU' },
    output : mockSignCommandOutput
  },
  verify: {
    input: {
      key: {
        kty : 'EC',
        x   : 'tgOFTPRSUPqMLu9pBTz5dLHNh_op4SZ6zmc6ZmF0CzQ',
        y   : '6qju4NwZFqlBW78fKMB4K0zJbfXYV3SA8UPAI-pWLe0',
        crv : 'secp256k1',
        alg : 'ES256K',
        kid : 'U01_M3_A9vMLOWixG-rlfC-_f3LLdurttn7c7d3_upU'
      },
      signature: new Uint8Array([
        136, 145, 145,  76,  67,  27, 170, 230, 130, 222, 252,
        87, 254,   7,  76, 140, 183,   0, 247, 144, 215,  46,
        42,  81,  71,  76, 202,  14, 224,  15, 170, 132, 174,
        27, 157, 198, 164, 143,  74, 229,  25,  70, 114, 192,
        82,  61, 204,  80, 108, 253, 135,  98, 197, 145,  69,
        120, 146,  61, 183, 245,   9,  27, 157,  27
      ]),
      data: new Uint8Array([0, 1, 2, 3, 4]),
    },
    output: mockSignCommandOutput
  }
};