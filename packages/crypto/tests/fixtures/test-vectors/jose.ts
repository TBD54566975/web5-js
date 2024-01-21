export const joseToMulticodecTestVectors = [
  {
    output : { code: 237, name: 'ed25519-pub' },
    input  : {
      alg : 'EdDSA',
      crv : 'Ed25519',
      kty : 'OKP',
      x   : 'lSPJrpccK4uv3f7IUCVYDz5qcUhSjiPHFyRcr5Z5VYg',
    },
  },
  {
    output : { code: 4864, name: 'ed25519-priv' },
    input  : {
      d   : 'fbGqifMN3h7tjLMd2gi5dggG-A2s7paNkBbdFAyGZyU',
      alg : 'EdDSA',
      crv : 'Ed25519',
      kty : 'OKP',
      x   : 'lSPJrpccK4uv3f7IUCVYDz5qcUhSjiPHFyRcr5Z5VYg',
    },
  },
  {
    output : { code: 231, name: 'secp256k1-pub' },
    input  : {
      alg : 'ES256K',
      crv : 'secp256k1',
      kty : 'EC',
      x   : 'hEpfKD1BpSyoP9CYULUxD8JoTGB6Y8NNxe2cX0p_bQY',
      y   : 'SNP8nyU4iDWeu7nfcjpJ04htOgF8u94pFUzBYiPw75g',
    },
  },
  {
    output : { code: 4865, name: 'secp256k1-priv' },
    input  : {
      d   : 'KvnTJGCOHzsUHEaIj1gy5uOE22K-3Shpl6NYLG7TRGQ',
      alg : 'ES256K',
      crv : 'secp256k1',
      kty : 'EC',
      x   : 'hEpfKD1BpSyoP9CYULUxD8JoTGB6Y8NNxe2cX0p_bQY',
      y   : 'SNP8nyU4iDWeu7nfcjpJ04htOgF8u94pFUzBYiPw75g',
    },
  },
  {
    output : { code: 236, name: 'x25519-pub' },
    input  : {
      crv : 'X25519',
      kty : 'OKP',
      x   : 'Uszsfy4vkz9MKeflgUpQot7sJhDyco2aYWCRXKTrcQg',
    },
  },
  {
    output : { code: 4866, name: 'x25519-priv' },
    input  : {
      d   : 'MJf4AAqcwfBC68Wkb8nRbmnIdHb07zYM7vU_TAOgmtM',
      crv : 'X25519',
      kty : 'OKP',
      x   : 'Uszsfy4vkz9MKeflgUpQot7sJhDyco2aYWCRXKTrcQg',
    },
  },
];

export const jwkToThumbprintTestVectors = [
  {
    input: {
      kty : 'RSA',
      n   : '0vx7agoebGcQSuuPiLJXZptN9nndrQmbXEps2aiAFbWhM78LhWx4cbbfAAtVT86zwu1RK7aPFFxuhDR1L6tSoc_BJECPebWKRXjBZCiFV4n3oknjhMstn64tZ_2W-5JsGY4Hc5n9yBXArwl93lqt7_RN5w6Cf0h4QyQ5v-65YGjQR0_FDW2QvzqY368QQMicAtaSqzs8KJZgnYb9c7d0zgdAZHzu6qMQvRL5hajrn1n91CbOpbISD08qNLyrdkt-bFTWhAI4vMQFh6WeZu0fM4lFd2NcRwr3XPksINHaQ-G_xBniIqbw0Ls1jF44-csFCur-kEgU8awapJzKnqDKgw',
      e   : 'AQAB',
      alg : 'RS256',
      kid : '2011-04-29',
    },
    output: 'NzbLsXh8uDCcd-6MNwXF4W_7noWXFZAfHkxZsRGC9Xs',
  },
  {
    input: {
      alg : 'A128CBC',
      kty : 'oct',
      k   : 'cuY-fEu_V1s4b8HbGzy_9VOaNtxiUPzLn6KOATdz0ks',
    },
    output: 'legaImFEtXYAJYZ8_ZGbZnx-bhc_9nN53pxGpOum3Io',
  },
  {
    input: {
      alg : 'ES256K',
      crv : 'secp256k1',
      kty : 'EC',
      x   : '_TihFv5t24hjWsRcdZBeEJa65hQB5aiOYmG6mMu1RZA',
      y   : 'UfiOGckhJuh9f3-Yi7g-jTILYP6vEWOSF1drwjBHebA',
    },
    output: 'dwzDb6KNsqS3QMTqH0jfBHcoHJzYZBc5scB5n5VLe1E',
  },
  {
    input: {
      crv : 'X25519',
      kty : 'OKP',
      x   : 'cuY-fEu_V1s4b8HbGzy_9VOaNtxiUPzLn6KOATdz0ks',
    },
    output: 'KCfBQ0EA2cWr1Kbt-mnlj8LQ9C2AJfcuEm8mtgOe7wQ',
  },
  {
    input: {
      d   : 'MJf4AAqcwfBC68Wkb8nRbmnIdHb07zYM7vU_TAOgmtM',
      crv : 'X25519',
      kty : 'OKP',
      x   : 'Uszsfy4vkz9MKeflgUpQot7sJhDyco2aYWCRXKTrcQg',
    },
    output: 'lQN1EkHZz4VkAcVGD4gsc0JBcLwvkUprOxkiO4kpbbs',
  },
];

export const jwkToMultibaseIdTestVectors = [
  {
    input: {
      crv : 'secp256k1',
      kty : 'EC',
      x   : '_TihFv5t24hjWsRcdZBeEJa65hQB5aiOYmG6mMu1RZA',
      y   : 'UfiOGckhJuh9f3-Yi7g-jTILYP6vEWOSF1drwjBHebA',
    },
    output: 'zQ3sheTFzDvGpXAc9AXtwGF3MW1CusKovnwM4pSsUamqKCyLB',
  },
  {
    input: {
      crv : 'X25519',
      kty : 'OKP',
      x   : 'cuY-fEu_V1s4b8HbGzy_9VOaNtxiUPzLn6KOATdz0ks',
    },
    output: 'z6LSjQhGhqqYgrFsNFoZL9wzuKpS1xQ7YNE6fnLgSyW2hUt2',
  },
  {
    input: {
      crv : 'Ed25519',
      kty : 'OKP',
      x   : 'wwk7wOlocpOHDopgc0cZVCnl_7zFrp-JpvZe9vr5500'
    },
    output: 'z6MksabiHWJ5wQqJGDzxw1EiV5zi6BE6QRENTnHBcKHSqLaQ',
  },
];
