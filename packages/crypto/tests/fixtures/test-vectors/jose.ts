export const cryptoKeyPairToJsonWebKeyTestVectors = [
  {
    id        : 'ckp.jwk.1',
    cryptoKey : {
      publicKey: {
        algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1' },
        extractable : true,
        material    : '02c6cf53ccfc13fbdfb25d827636839d9874df3148eba88c07f07601645ca5a006', // Hex, compressed
        type        : 'public',
        usages      : ['verify'],
      },
      privateKey: {
        algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1' },
        extractable : true,
        material    : '1d70915381c9bcb940752c3892b6c3b4476a6906b6aee839227f3f38eaf91190', // Hex
        type        : 'private',
        usages      : ['sign'],
      }
    },
    jsonWebKey: {
      publicKeyJwk: {
        'alg'     : 'ES256K',
        'crv'     : 'secp256k1',
        'ext'     : 'true',
        'key_ops' : ['verify'],
        'kty'     : 'EC',
        'x'       : 'xs9TzPwT-9-yXYJ2NoOdmHTfMUjrqIwH8HYBZFyloAY', // Base64url
        'y'       : 'tMa4vfJC9rR8S87Sx9yEHACYOWOh7_UWLiFal56lObY', // Base64url
      },
      privateKeyJwk: {
        'alg'     : 'ES256K',
        'crv'     : 'secp256k1',
        'd'       : 'HXCRU4HJvLlAdSw4krbDtEdqaQa2rug5In8_OOr5EZA', // Base64url
        'ext'     : 'true',
        'key_ops' : ['sign'],
        'kty'     : 'EC',
        'x'       : 'xs9TzPwT-9-yXYJ2NoOdmHTfMUjrqIwH8HYBZFyloAY', // Base64url
        'y'       : 'tMa4vfJC9rR8S87Sx9yEHACYOWOh7_UWLiFal56lObY', // Base64url
      },
    }
  },
  {
    id        : 'ckp.jwk.2',
    cryptoKey : {
      publicKey: {
        algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1' },
        extractable : true,
        material    : '045d67b538b1f3dc38326a975b17c4312b7620c39b656b3012dc9205c5804870c7ab53846c0b4c6f6c0267f08b9ac7075fe1f0b617d013630d92a3c760908b71e3', // Hex, uncompressed
        type        : 'public',
        usages      : ['verify'],
      },
      privateKey: {
        algorithm   : { name: 'ECDSA', namedCurve: 'secp256k1' },
        extractable : true,
        material    : 'c1f488e4919027f1da827a3f25c8121f9092f5d940c0da9a52cb36e192fa1610', // Hex
        type        : 'private',
        usages      : ['sign'],
      }
    },
    jsonWebKey: {
      publicKeyJwk: {
        'alg'     : 'ES256K',
        'crv'     : 'secp256k1',
        'ext'     : 'true',
        'key_ops' : ['verify'],
        'kty'     : 'EC',
        'x'       : 'XWe1OLHz3DgyapdbF8QxK3Ygw5tlazAS3JIFxYBIcMc', // Base64url
        'y'       : 'q1OEbAtMb2wCZ_CLmscHX-HwthfQE2MNkqPHYJCLceM', // Base64url
      },
      privateKeyJwk: {
        'alg'     : 'ES256K',
        'crv'     : 'secp256k1',
        'd'       : 'wfSI5JGQJ_Hagno_JcgSH5CS9dlAwNqaUss24ZL6FhA', // Base64url
        'ext'     : 'true',
        'key_ops' : ['sign'],
        'kty'     : 'EC',
        'x'       : 'XWe1OLHz3DgyapdbF8QxK3Ygw5tlazAS3JIFxYBIcMc', // Base64url
        'y'       : 'q1OEbAtMb2wCZ_CLmscHX-HwthfQE2MNkqPHYJCLceM', // Base64url
      },
    }
  },
  {
    id        : 'ckp.jwk.3',
    cryptoKey : {
      publicKey: {
        algorithm   : { name: 'EdDSA', namedCurve: 'Ed25519' },
        extractable : true,
        material    : 'ae92a70cff05e3f8f0bd0ef10e492e2b1d7ae4e4b0732ad0be61169767a28085', // Hex
        type        : 'public',
        usages      : ['verify'],
      },
      privateKey: {
        algorithm   : { name: 'EdDSA', namedCurve: 'Ed25519' },
        extractable : true,
        material    : 'f69e3da1db3fc8b7474224e3271099dab537807212477ad034ae52f3e39d8782', // Hex
        type        : 'private',
        usages      : ['sign'],
      }
    },
    jsonWebKey: {
      publicKeyJwk: {
        'alg'     : 'EdDSA',
        'crv'     : 'Ed25519',
        'ext'     : 'true',
        'key_ops' : ['verify'],
        'kty'     : 'OKP',
        'x'       : 'rpKnDP8F4_jwvQ7xDkkuKx165OSwcyrQvmEWl2eigIU', // Base64url
      },
      privateKeyJwk: {
        'alg'     : 'EdDSA',
        'crv'     : 'Ed25519',
        'd'       : '9p49ods_yLdHQiTjJxCZ2rU3gHISR3rQNK5S8-Odh4I', // Base64url
        'ext'     : 'true',
        'key_ops' : ['sign'],
        'kty'     : 'OKP',
        'x'       : 'rpKnDP8F4_jwvQ7xDkkuKx165OSwcyrQvmEWl2eigIU', // Base64url
      },
    }
  },
  {
    id        : 'ckp.jwk.4',
    cryptoKey : {
      publicKey: {
        algorithm   : { name: 'ECDH', namedCurve: 'X25519' },
        extractable : true,
        material    : '796037a1434a9b79d9374bea882fed0a53c2901ce737947463d3687c99286973', // Hex
        type        : 'public',
        usages      : ['deriveBits', 'deriveKey'],
      },
      privateKey: {
        algorithm   : { name: 'ECDH', namedCurve: 'X25519' },
        extractable : true,
        material    : '20a6d2ab343efc5d8718af1afb3157984b63712edc5f5c1c77bcf8f732f8b545', // Hex
        type        : 'private',
        usages      : ['deriveBits', 'deriveKey'],
      }
    },
    jsonWebKey: {
      publicKeyJwk: {
        'crv'     : 'X25519',
        'ext'     : 'true',
        'key_ops' : ['deriveBits', 'deriveKey'],
        'kty'     : 'OKP',
        'x'       : 'eWA3oUNKm3nZN0vqiC_tClPCkBznN5R0Y9NofJkoaXM', // Base64url
      },
      privateKeyJwk: {
        'crv'     : 'X25519',
        'd'       : 'IKbSqzQ-_F2HGK8a-zFXmEtjcS7cX1wcd7z49zL4tUU', // Base64url
        'ext'     : 'true',
        'key_ops' : ['deriveBits', 'deriveKey'],
        'kty'     : 'OKP',
        'x'       : 'eWA3oUNKm3nZN0vqiC_tClPCkBznN5R0Y9NofJkoaXM', // Base64url
      },
    }
  },
];

export const cryptoKeyToJwkTestVectors = [
  {
    id        : 'csk.jwk.1',
    cryptoKey : {
      algorithm   : { name: 'AES-CTR', length: 256 },
      extractable : true,
      material    : '510b48012fab99607ebe03601b894fae74d2dad36fc033ca97daecd0bf480a75', // Hex
      type        : 'secret',
      usages      : ['encrypt', 'decrypt'],
    },
    jsonWebKey: {
      'alg'     : 'A256CTR',
      'ext'     : 'true',
      'key_ops' : ['encrypt', 'decrypt'],
      'k'       : 'UQtIAS-rmWB-vgNgG4lPrnTS2tNvwDPKl9rs0L9ICnU', // Base64url
      'kty'     : 'oct',
    }
  },
  {
    id        : 'csk.jwk.2',
    cryptoKey : {
      algorithm   : { name: 'AES-GCM', length: 256 },
      extractable : true,
      material    : 'fa919d00b0edc66c73efcc2325073fff8173bd30956174cd50b3381f438a56ac', // Hex
      type        : 'secret',
      usages      : ['encrypt', 'decrypt'],
    },
    jsonWebKey: {
      'alg'     : 'A256GCM',
      'ext'     : 'true',
      'key_ops' : ['encrypt', 'decrypt'],
      'k'       : '-pGdALDtxmxz78wjJQc__4FzvTCVYXTNULM4H0OKVqw', // Base64url
      'kty'     : 'oct',
    }
  },
  {
    id        : 'csk.jwk.3',
    cryptoKey : {
      algorithm   : { name: 'HMAC', hash: { name: 'SHA-256' } },
      extractable : true,
      material    : 'dc739a7be3ffc152af69bc45dfb02d81cfe313c7cb074c643144a9c15588d87468bafa02da20ab7fc8f7498916b184459b84aff27736be9cc8f60e49ca0d01c7', // Hex
      type        : 'secret',
      usages      : ['sign', 'verify'],
    },
    jsonWebKey: {
      'alg'     : 'HS256',
      'ext'     : 'true',
      'key_ops' : ['sign', 'verify'],
      'k'       : '3HOae-P_wVKvabxF37Atgc_jE8fLB0xkMUSpwVWI2HRouvoC2iCrf8j3SYkWsYRFm4Sv8nc2vpzI9g5Jyg0Bxw', // Base64url
      'kty'     : 'oct',
    }
  },
];

export const joseToWebCryptoTestVectors = [
  {
    id        : 'jose.wc.1',
    jose      : { crv: 'Ed25519', alg: 'EdDSA', kty: 'OKP' },
    webCrypto : { namedCurve: 'Ed25519', name: 'EdDSA' }
  },
  {
    id        : 'jose.wc.2',
    jose      : { crv: 'Ed448', alg: 'EdDSA', kty: 'OKP' },
    webCrypto : { namedCurve: 'Ed448', name: 'EdDSA' }
  },
  {
    id        : 'jose.wc.3',
    jose      : { crv: 'X25519', kty: 'OKP' },
    webCrypto : { namedCurve: 'X25519', name: 'ECDH' }
  },
  {
    id        : 'jose.wc.4',
    jose      : { crv: 'secp256k1', alg: 'ES256K', kty: 'EC' },
    webCrypto : { namedCurve: 'secp256k1', name: 'ECDSA' }
  },
  {
    id        : 'jose.wc.5',
    jose      : { crv: 'secp256k1', kty: 'EC' },
    webCrypto : { namedCurve: 'secp256k1', name: 'ECDH' }
  },
  {
    id        : 'jose.wc.6',
    jose      : { crv: 'P-256', alg: 'ES256', kty: 'EC' },
    webCrypto : { namedCurve: 'P-256', name: 'ECDSA' }
  },
  {
    id        : 'jose.wc.7',
    jose      : { crv: 'P-384', alg: 'ES384', kty: 'EC' },
    webCrypto : { namedCurve: 'P-384', name: 'ECDSA' }
  },
  {
    id        : 'jose.wc.8',
    jose      : { crv: 'P-521', alg: 'ES512', kty: 'EC' },
    webCrypto : { namedCurve: 'P-521', name: 'ECDSA' }
  },
  {
    id        : 'jose.wc.9',
    jose      : { alg: 'A128CBC', kty: 'oct' },
    webCrypto : { name: 'AES-CBC', length: 128 }
  },
  {
    id        : 'jose.wc.10',
    jose      : { alg: 'A192CBC', kty: 'oct' },
    webCrypto : { name: 'AES-CBC', length: 192 }
  },
  {
    id        : 'jose.wc.11',
    jose      : { alg: 'A256CBC', kty: 'oct' },
    webCrypto : { name: 'AES-CBC', length: 256 }
  },
  {
    id        : 'jose.wc.12',
    jose      : { alg: 'A128CTR', kty: 'oct' },
    webCrypto : { name: 'AES-CTR', length: 128 }
  },
  {
    id        : 'jose.wc.13',
    jose      : { alg: 'A192CTR', kty: 'oct' },
    webCrypto : { name: 'AES-CTR', length: 192 }
  },
  {
    id        : 'jose.wc.14',
    jose      : { alg: 'A256CTR', kty: 'oct' },
    webCrypto : { name: 'AES-CTR', length: 256 }
  },
  {
    id        : 'jose.wc.15',
    jose      : { alg: 'A128GCM', kty: 'oct' },
    webCrypto : { name: 'AES-GCM', length: 128 }
  },
  {
    id        : 'jose.wc.16',
    jose      : { alg: 'A192GCM', kty: 'oct' },
    webCrypto : { name: 'AES-GCM', length: 192 }
  },
  {
    id        : 'jose.wc.17',
    jose      : { alg: 'A256GCM', kty: 'oct' },
    webCrypto : { name: 'AES-GCM', length: 256 }
  },
  {
    id        : 'jose.wc.18',
    jose      : { alg: 'HS256', kty: 'oct' },
    webCrypto : { name: 'HMAC', hash: { name: 'SHA-256' } }
  },
  {
    id        : 'jose.wc.19',
    jose      : { alg: 'HS384', kty: 'oct' },
    webCrypto : { name: 'HMAC', hash: { name: 'SHA-384' } }
  },
  {
    id        : 'jose.wc.20',
    jose      : { alg: 'HS512', kty: 'oct' },
    webCrypto : { name: 'HMAC', hash: { name: 'SHA-512' } }
  },
];

export const joseToMulticodecTestVectors = [
  {
    output : { code: 237, name: 'ed25519-pub' },
    input  : {
      alg : 'EdDSA',
      crv : 'Ed25519',
      kty : 'OKP',
      x   : 'cuY-fEu_V1s4b8HbGzy_9VOaNtxiUPzLn6KOATdz0ks',
    },
  },
  {
    output : { code: 4864, name: 'ed25519-priv' },
    input  : {
      d   : '',
      alg : 'EdDSA',
      crv : 'Ed25519',
      kty : 'OKP',
      x   : 'c5UR1q2r1lOT_ygDhSkU3paf5Bmukg-jX-1t4kIKJvA',
    },
  },
  {
    output : { code: 231, name: 'secp256k1-pub' },
    input  : {
      alg : 'ES256K',
      crv : 'secp256k1',
      kty : 'EC',
      x   : '_TihFv5t24hjWsRcdZBeEJa65hQB5aiOYmG6mMu1RZA',
      y   : 'UfiOGckhJuh9f3-Yi7g-jTILYP6vEWOSF1drwjBHebA',
    },
  },
  {
    output : { code: 4865, name: 'secp256k1-priv' },
    input  : {
      d   : '',
      alg : 'ES256K',
      crv : 'secp256k1',
      kty : 'EC',
      x   : '_TihFv5t24hjWsRcdZBeEJa65hQB5aiOYmG6mMu1RZA',
      y   : 'UfiOGckhJuh9f3-Yi7g-jTILYP6vEWOSF1drwjBHebA',
    },
  },
  {
    output : { code: 236, name: 'x25519-pub' },
    input  : {
      crv : 'X25519',
      kty : 'OKP',
      x   : 'cuY-fEu_V1s4b8HbGzy_9VOaNtxiUPzLn6KOATdz0ks',
    },
  },
  {
    output : { code: 4866, name: 'x25519-priv' },
    input  : {
      d   : '',
      crv : 'X25519',
      kty : 'OKP',
      x   : 'MBZd77wAy5932AEP7MHXOevv_MLzzD9OP_fZAOlnIWM',
    },
  },
];

export const keyToJwkTestVectorsKeyMaterial = '72e63e7c4bbf575b386fc1db1b3cbff5539a36dc6250fccb9fa28e013773d24b';
export const keyToJwkMulticodecTestVectors = [
  {
    input  : 'ed25519-pub',
    output : {
      alg : 'EdDSA',
      crv : 'Ed25519',
      kty : 'OKP',
      x   : 'cuY-fEu_V1s4b8HbGzy_9VOaNtxiUPzLn6KOATdz0ks'
    }
  },
  {
    input  : 'ed25519-priv',
    output : {
      d   : '',
      alg : 'EdDSA',
      crv : 'Ed25519',
      kty : 'OKP',
      x   : 'c5UR1q2r1lOT_ygDhSkU3paf5Bmukg-jX-1t4kIKJvA'
    }
  },
  {
    input  : 'secp256k1-pub',
    output : {
      alg : 'ES256K',
      crv : 'secp256k1',
      kty : 'EC',
      x   : '_TihFv5t24hjWsRcdZBeEJa65hQB5aiOYmG6mMu1RZA',
      y   : 'UfiOGckhJuh9f3-Yi7g-jTILYP6vEWOSF1drwjBHebA'
    }
  },
  {
    input  : 'secp256k1-priv',
    output : {
      d   : '',
      alg : 'ES256K',
      crv : 'secp256k1',
      kty : 'EC',
      x   : '_TihFv5t24hjWsRcdZBeEJa65hQB5aiOYmG6mMu1RZA',
      y   : 'UfiOGckhJuh9f3-Yi7g-jTILYP6vEWOSF1drwjBHebA'
    }
  },
  {
    input  : 'x25519-pub',
    output : {
      crv : 'X25519',
      kty : 'OKP',
      x   : 'cuY-fEu_V1s4b8HbGzy_9VOaNtxiUPzLn6KOATdz0ks'
    }
  },
  {
    input  : 'x25519-priv',
    output : {
      d   : '',
      crv : 'X25519',
      kty : 'OKP',
      x   : 'MBZd77wAy5932AEP7MHXOevv_MLzzD9OP_fZAOlnIWM'
    }
  }
];

export const keyToJwkWebCryptoTestVectors = [
  {
    input  : { namedCurve: 'Ed25519', name: 'EdDSA' },
    output : {
      alg : 'EdDSA',
      crv : 'Ed25519',
      kty : 'OKP',
      x   : 'cuY-fEu_V1s4b8HbGzy_9VOaNtxiUPzLn6KOATdz0ks'
    }
  },
  {
    input  : { namedCurve: 'secp256k1', name: 'ECDSA' },
    output : {
      alg : 'ES256K',
      crv : 'secp256k1',
      kty : 'EC',
      x   : '_TihFv5t24hjWsRcdZBeEJa65hQB5aiOYmG6mMu1RZA',
      y   : 'UfiOGckhJuh9f3-Yi7g-jTILYP6vEWOSF1drwjBHebA',
    }
  },
  {
    input  : { namedCurve: 'X25519', name: 'ECDH' },
    output : {
      crv : 'X25519',
      kty : 'OKP',
      x   : 'cuY-fEu_V1s4b8HbGzy_9VOaNtxiUPzLn6KOATdz0ks'
    }
  },
  {
    input  : { namedCurve: 'secp256k1', name: 'ECDSA' },
    output : {
      alg : 'ES256K',
      crv : 'secp256k1',
      kty : 'EC',
      x   : '_TihFv5t24hjWsRcdZBeEJa65hQB5aiOYmG6mMu1RZA',
      y   : 'UfiOGckhJuh9f3-Yi7g-jTILYP6vEWOSF1drwjBHebA'
    }
  },
  {
    input  : { namedCurve: 'secp256k1', name: 'ECDH' },
    output : {
      crv : 'secp256k1',
      kty : 'EC',
      x   : '_TihFv5t24hjWsRcdZBeEJa65hQB5aiOYmG6mMu1RZA',
      y   : 'UfiOGckhJuh9f3-Yi7g-jTILYP6vEWOSF1drwjBHebA'
    }
  },
  {
    input  : { name: 'AES-CBC', length: 128 },
    output : {
      alg : 'A128CBC',
      kty : 'oct',
      k   : 'cuY-fEu_V1s4b8HbGzy_9VOaNtxiUPzLn6KOATdz0ks'
    }
  },
  {
    input  : { name: 'HMAC', hash: { name: 'SHA-256' } },
    output : {
      alg : 'HS256',
      kty : 'oct',
      k   : 'cuY-fEu_V1s4b8HbGzy_9VOaNtxiUPzLn6KOATdz0ks'
    }
  }
];

export const keyToJwkWebCryptoWithNullKTYTestVectors = [
  {
    input  : { namedCurve: 'Ed25519', name: 'EdDSA' },
    output : {
      alg : 'EdDSA',
      crv : 'Ed25519',
      kty : 'OKP',
      x   : 'cuY-fEu_V1s4b8HbGzy_9VOaNtxiUPzLn6KOATdz0ks'
    }
  },
  {
    input  : { namedCurve: 'secp256k1', name: 'ECDSA' },
    output : {
      alg : 'ES256K',
      crv : 'secp256k1',
      kty : 'EC',
      x   : '_TihFv5t24hjWsRcdZBeEJa65hQB5aiOYmG6mMu1RZA',
      y   : 'UfiOGckhJuh9f3-Yi7g-jTILYP6vEWOSF1drwjBHebA',
    }
  },
  {
    input  : { namedCurve: 'X25519', name: 'ECDH' },
    output : {
      crv : 'X25519',
      kty : 'OKP',
      x   : 'cuY-fEu_V1s4b8HbGzy_9VOaNtxiUPzLn6KOATdz0ks'
    }
  },
  {
    input  : { namedCurve: 'secp256k1', name: 'ECDSA' },
    output : {
      alg : 'ES256K',
      crv : 'secp256k1',
      kty : 'EC',
      x   : '_TihFv5t24hjWsRcdZBeEJa65hQB5aiOYmG6mMu1RZA',
      y   : 'UfiOGckhJuh9f3-Yi7g-jTILYP6vEWOSF1drwjBHebA'
    }
  },
  {
    input  : { namedCurve: 'secp256k1', name: 'ECDH' },
    output : {
      crv : 'secp256k1',
      kty : 'EC',
      x   : '_TihFv5t24hjWsRcdZBeEJa65hQB5aiOYmG6mMu1RZA',
      y   : 'UfiOGckhJuh9f3-Yi7g-jTILYP6vEWOSF1drwjBHebA'
    }
  },
  {
    input  : { name: 'AES-CBC', length: 128 },
    output : {
      alg : 'A128CBC',
      kty : null,
    }
  },
  {
    input  : { name: 'HMAC', hash: { name: 'SHA-256' } },
    output : {
      alg : 'HS256',
      kty : null,
    }
  }
];

export const jwkToKeyTestVectors = [
  {
    output: {
      keyMaterial : keyToJwkTestVectorsKeyMaterial,
      keyType     : 'public',
    },
    input: {
      alg : 'EdDSA',
      crv : 'Ed25519',
      kty : 'OKP',
      x   : 'cuY-fEu_V1s4b8HbGzy_9VOaNtxiUPzLn6KOATdz0ks'
    }
  },
  {
    output: {
      keyMaterial : '04fd38a116fe6ddb88635ac45c75905e1096bae61401e5a88e6261ba98cbb5459051f88e19c92126e87d7f7f988bb83e8d320b60feaf11639217576bc2304779b0',
      keyType     : 'public',
    },
    input: {
      alg : 'ES256K',
      crv : 'secp256k1',
      kty : 'EC',
      x   : '_TihFv5t24hjWsRcdZBeEJa65hQB5aiOYmG6mMu1RZA',
      y   : 'UfiOGckhJuh9f3-Yi7g-jTILYP6vEWOSF1drwjBHebA'
    }
  },
  {
    output: {
      keyMaterial : keyToJwkTestVectorsKeyMaterial,
      keyType     : 'private',
    },
    input: {
      alg : 'A128CBC',
      kty : 'oct',
      k   : 'cuY-fEu_V1s4b8HbGzy_9VOaNtxiUPzLn6KOATdz0ks'
    }
  },
  {
    output: {
      keyMaterial : keyToJwkTestVectorsKeyMaterial,
      keyType     : 'private',
    },
    input: {
      alg : 'HS256',
      kty : 'oct',
      k   : 'cuY-fEu_V1s4b8HbGzy_9VOaNtxiUPzLn6KOATdz0ks'
    }
  },
  {
    output: {
      keyMaterial : '',
      keyType     : 'private',
    },
    input: {
      d   : '',
      alg : 'EdDSA',
      crv : 'Ed25519',
      kty : 'OKP',
      x   : 'c5UR1q2r1lOT_ygDhSkU3paf5Bmukg-jX-1t4kIKJvA',
    },
  }
];

export const jwkToThumbprintTestVectors = [
  {
    output : 'NzbLsXh8uDCcd-6MNwXF4W_7noWXFZAfHkxZsRGC9Xs',
    input  : {
      kty : 'RSA',
      n   : '0vx7agoebGcQSuuPiLJXZptN9nndrQmbXEps2aiAFbWhM78LhWx4cbbfAAtVT86zwu1RK7aPFFxuhDR1L6tSoc_BJECPebWKRXjBZCiFV4n3oknjhMstn64tZ_2W-5JsGY4Hc5n9yBXArwl93lqt7_RN5w6Cf0h4QyQ5v-65YGjQR0_FDW2QvzqY368QQMicAtaSqzs8KJZgnYb9c7d0zgdAZHzu6qMQvRL5hajrn1n91CbOpbISD08qNLyrdkt-bFTWhAI4vMQFh6WeZu0fM4lFd2NcRwr3XPksINHaQ-G_xBniIqbw0Ls1jF44-csFCur-kEgU8awapJzKnqDKgw',
      e   : 'AQAB',
      alg : 'RS256',
      kid : '2011-04-29',
    },
  },
  {
    output : 'legaImFEtXYAJYZ8_ZGbZnx-bhc_9nN53pxGpOum3Io',
    input  : {
      alg : 'A128CBC',
      kty : 'oct',
      k   : 'cuY-fEu_V1s4b8HbGzy_9VOaNtxiUPzLn6KOATdz0ks',
    },
  },
  {
    output : 'dwzDb6KNsqS3QMTqH0jfBHcoHJzYZBc5scB5n5VLe1E',
    input  : {
      alg : 'ES256K',
      crv : 'secp256k1',
      kty : 'EC',
      x   : '_TihFv5t24hjWsRcdZBeEJa65hQB5aiOYmG6mMu1RZA',
      y   : 'UfiOGckhJuh9f3-Yi7g-jTILYP6vEWOSF1drwjBHebA',
    },
  },
  {
    output : 'KCfBQ0EA2cWr1Kbt-mnlj8LQ9C2AJfcuEm8mtgOe7wQ',
    input  : {
      crv : 'X25519',
      kty : 'OKP',
      x   : 'cuY-fEu_V1s4b8HbGzy_9VOaNtxiUPzLn6KOATdz0ks',
    },
  },
  {
    output : 'TQdUBtR3MvnNE-7p5sotzCGgZNyQC7EgsiKQz1Erzc4',
    input  : {
      d   : '',
      crv : 'X25519',
      kty : 'OKP',
      x   : 'MBZd77wAy5932AEP7MHXOevv_MLzzD9OP_fZAOlnIWM',
    },
  },
];

export const jwkToCryptoKeyTestVectors = [
  {
    cryptoKey: {
      algorithm   : { name: 'AES-CTR', length: 256 },
      extractable : true,
      type        : 'private',
      usages      : ['encrypt', 'decrypt'],
    },
    jsonWebKey: {
      'alg'     : 'A256CTR',
      'ext'     : 'true',
      'key_ops' : ['encrypt', 'decrypt'],
      'k'       : 'UQtIAS-rmWB-vgNgG4lPrnTS2tNvwDPKl9rs0L9ICnU', // Base64url
      'kty'     : 'oct',
    }
  },
  {
    cryptoKey: {
      algorithm   : { name: 'AES-GCM', length: 256 },
      extractable : false,
      type        : 'private',
      usages      : ['encrypt', 'decrypt'],
    },
    jsonWebKey: {
      'alg'     : 'A256GCM',
      'ext'     : 'false',
      'key_ops' : ['encrypt', 'decrypt'],
      'k'       : '-pGdALDtxmxz78wjJQc__4FzvTCVYXTNULM4H0OKVqw', // Base64url
      'kty'     : 'oct',
    }
  },
  {
    cryptoKey: {
      algorithm   : { name: 'HMAC', hash: { name: 'SHA-256' } },
      extractable : true,
      type        : 'private',
      usages      : ['sign', 'verify'],
    },
    jsonWebKey: {
      'alg'     : 'HS256',
      'ext'     : 'true',
      'key_ops' : ['sign', 'verify'],
      'k'       : '3HOae-P_wVKvabxF37Atgc_jE8fLB0xkMUSpwVWI2HRouvoC2iCrf8j3SYkWsYRFm4Sv8nc2vpzI9g5Jyg0Bxw', // Base64url
      'kty'     : 'oct',
    }
  },
];

export const jwkToMultibaseIdTestVectors = [
  {
    output : 'zQ3sheTFzDvGpXAc9AXtwGF3MW1CusKovnwM4pSsUamqKCyLB',
    input  : {
      alg : 'ES256K',
      crv : 'secp256k1',
      kty : 'EC',
      x   : '_TihFv5t24hjWsRcdZBeEJa65hQB5aiOYmG6mMu1RZA',
      y   : 'UfiOGckhJuh9f3-Yi7g-jTILYP6vEWOSF1drwjBHebA',
    },
  },
  {
    output : 'z6LSjQhGhqqYgrFsNFoZL9wzuKpS1xQ7YNE6fnLgSyW2hUt2',
    input  : {
      crv : 'X25519',
      kty : 'OKP',
      x   : 'cuY-fEu_V1s4b8HbGzy_9VOaNtxiUPzLn6KOATdz0ks',
    },
  },
  {
    output : 'zAuT',
    input  : {
      d   : '',
      crv : 'X25519',
      kty : 'OKP',
      x   : 'MBZd77wAy5932AEP7MHXOevv_MLzzD9OP_fZAOlnIWM',
    },
  },
];
