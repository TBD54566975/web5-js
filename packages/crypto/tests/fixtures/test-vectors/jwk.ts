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