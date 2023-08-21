export const didKeyCreateDocumentTestVectors = [
  {
    id    : 'did.createDocument.1',
    input : {
      did             : 'did:key:z6MkmNvXGmVuux5W63nXKEM8zoxFmDLNfe7siCKG2GM7Kd8D',
      publicKeyFormat : 'JsonWebKey2020'
    },
    output: {
      '@context': [
        'https://www.w3.org/ns/did/v1',
        'https://w3id.org/security/suites/jws-2020/v1'
      ],
      'id'                 : 'did:key:z6MkmNvXGmVuux5W63nXKEM8zoxFmDLNfe7siCKG2GM7Kd8D',
      'verificationMethod' : [
        {
          'id'           : 'did:key:z6MkmNvXGmVuux5W63nXKEM8zoxFmDLNfe7siCKG2GM7Kd8D#z6MkmNvXGmVuux5W63nXKEM8zoxFmDLNfe7siCKG2GM7Kd8D',
          'type'         : 'JsonWebKey2020',
          'controller'   : 'did:key:z6MkmNvXGmVuux5W63nXKEM8zoxFmDLNfe7siCKG2GM7Kd8D',
          'publicKeyJwk' : {
            'alg' : 'EdDSA',
            'crv' : 'Ed25519',
            'kty' : 'OKP',
            'x'   : 'ZuVpK6HnahBtV1Y_jhnYK-fqHAz3dXmWXT_h-J7SL6I'
          }
        }
      ],
      'assertionMethod': [
        'did:key:z6MkmNvXGmVuux5W63nXKEM8zoxFmDLNfe7siCKG2GM7Kd8D#z6MkmNvXGmVuux5W63nXKEM8zoxFmDLNfe7siCKG2GM7Kd8D'
      ],
      'authentication': [
        'did:key:z6MkmNvXGmVuux5W63nXKEM8zoxFmDLNfe7siCKG2GM7Kd8D#z6MkmNvXGmVuux5W63nXKEM8zoxFmDLNfe7siCKG2GM7Kd8D'
      ],
      'capabilityDelegation': [
        'did:key:z6MkmNvXGmVuux5W63nXKEM8zoxFmDLNfe7siCKG2GM7Kd8D#z6MkmNvXGmVuux5W63nXKEM8zoxFmDLNfe7siCKG2GM7Kd8D'
      ],
      'capabilityInvocation': [
        'did:key:z6MkmNvXGmVuux5W63nXKEM8zoxFmDLNfe7siCKG2GM7Kd8D#z6MkmNvXGmVuux5W63nXKEM8zoxFmDLNfe7siCKG2GM7Kd8D'
      ]
    }
  },
  {
    id    : 'did.createDocument.2',
    input : {
      did             : 'did:key:z6MkmNvXGmVuux5W63nXKEM8zoxFmDLNfe7siCKG2GM7Kd8D',
      publicKeyFormat : 'Ed25519VerificationKey2020'
    },
    output: {
      '@context': [
        'https://www.w3.org/ns/did/v1',
        'https://w3id.org/security/suites/ed25519-2020/v1'
      ],
      'id'                 : 'did:key:z6MkmNvXGmVuux5W63nXKEM8zoxFmDLNfe7siCKG2GM7Kd8D',
      'verificationMethod' : [
        {
          'id'                 : 'did:key:z6MkmNvXGmVuux5W63nXKEM8zoxFmDLNfe7siCKG2GM7Kd8D#z6MkmNvXGmVuux5W63nXKEM8zoxFmDLNfe7siCKG2GM7Kd8D',
          'type'               : 'Ed25519VerificationKey2020',
          'controller'         : 'did:key:z6MkmNvXGmVuux5W63nXKEM8zoxFmDLNfe7siCKG2GM7Kd8D',
          'publicKeyMultibase' : 'z6MkmNvXGmVuux5W63nXKEM8zoxFmDLNfe7siCKG2GM7Kd8D'
        }
      ],
      'assertionMethod': [
        'did:key:z6MkmNvXGmVuux5W63nXKEM8zoxFmDLNfe7siCKG2GM7Kd8D#z6MkmNvXGmVuux5W63nXKEM8zoxFmDLNfe7siCKG2GM7Kd8D'
      ],
      'authentication': [
        'did:key:z6MkmNvXGmVuux5W63nXKEM8zoxFmDLNfe7siCKG2GM7Kd8D#z6MkmNvXGmVuux5W63nXKEM8zoxFmDLNfe7siCKG2GM7Kd8D'
      ],
      'capabilityDelegation': [
        'did:key:z6MkmNvXGmVuux5W63nXKEM8zoxFmDLNfe7siCKG2GM7Kd8D#z6MkmNvXGmVuux5W63nXKEM8zoxFmDLNfe7siCKG2GM7Kd8D'
      ],
      'capabilityInvocation': [
        'did:key:z6MkmNvXGmVuux5W63nXKEM8zoxFmDLNfe7siCKG2GM7Kd8D#z6MkmNvXGmVuux5W63nXKEM8zoxFmDLNfe7siCKG2GM7Kd8D'
      ]
    }
  },
  {
    id    : 'did.createDocument.3',
    input : {
      did                           : 'did:key:z6MkmNvXGmVuux5W63nXKEM8zoxFmDLNfe7siCKG2GM7Kd8D',
      enableEncryptionKeyDerivation : true,
      publicKeyFormat               : 'JsonWebKey2020'
    },
    output: {
      '@context': [
        'https://www.w3.org/ns/did/v1',
        'https://w3id.org/security/suites/jws-2020/v1'
      ],
      'id'                 : 'did:key:z6MkmNvXGmVuux5W63nXKEM8zoxFmDLNfe7siCKG2GM7Kd8D',
      'verificationMethod' : [
        {
          'id'           : 'did:key:z6MkmNvXGmVuux5W63nXKEM8zoxFmDLNfe7siCKG2GM7Kd8D#z6MkmNvXGmVuux5W63nXKEM8zoxFmDLNfe7siCKG2GM7Kd8D',
          'type'         : 'JsonWebKey2020',
          'controller'   : 'did:key:z6MkmNvXGmVuux5W63nXKEM8zoxFmDLNfe7siCKG2GM7Kd8D',
          'publicKeyJwk' : {
            'alg' : 'EdDSA',
            'crv' : 'Ed25519',
            'kty' : 'OKP',
            'x'   : 'ZuVpK6HnahBtV1Y_jhnYK-fqHAz3dXmWXT_h-J7SL6I'
          }
        },
        {
          'id'           : 'did:key:z6MkmNvXGmVuux5W63nXKEM8zoxFmDLNfe7siCKG2GM7Kd8D#z6LSdCnN59MPkRCaVvXczoipz5tMcPpjrCnvqBcHHjCDohYd',
          'type'         : 'JsonWebKey2020',
          'controller'   : 'did:key:z6MkmNvXGmVuux5W63nXKEM8zoxFmDLNfe7siCKG2GM7Kd8D',
          'publicKeyJwk' : {
            'crv' : 'X25519',
            'kty' : 'OKP',
            'x'   : 'FrLpNU0FVX4oAByhAbU71h4yb-WMr6penULFCzbMtxo',
          },
        }
      ],
      'assertionMethod': [
        'did:key:z6MkmNvXGmVuux5W63nXKEM8zoxFmDLNfe7siCKG2GM7Kd8D#z6MkmNvXGmVuux5W63nXKEM8zoxFmDLNfe7siCKG2GM7Kd8D'
      ],
      'authentication': [
        'did:key:z6MkmNvXGmVuux5W63nXKEM8zoxFmDLNfe7siCKG2GM7Kd8D#z6MkmNvXGmVuux5W63nXKEM8zoxFmDLNfe7siCKG2GM7Kd8D'
      ],
      'capabilityDelegation': [
        'did:key:z6MkmNvXGmVuux5W63nXKEM8zoxFmDLNfe7siCKG2GM7Kd8D#z6MkmNvXGmVuux5W63nXKEM8zoxFmDLNfe7siCKG2GM7Kd8D'
      ],
      'capabilityInvocation': [
        'did:key:z6MkmNvXGmVuux5W63nXKEM8zoxFmDLNfe7siCKG2GM7Kd8D#z6MkmNvXGmVuux5W63nXKEM8zoxFmDLNfe7siCKG2GM7Kd8D'
      ],
      'keyAgreement': [
        'did:key:z6MkmNvXGmVuux5W63nXKEM8zoxFmDLNfe7siCKG2GM7Kd8D#z6LSdCnN59MPkRCaVvXczoipz5tMcPpjrCnvqBcHHjCDohYd'
      ]
    }
  },
  {
    id    : 'did.createDocument.4',
    input : {
      did                           : 'did:key:z6MkmNvXGmVuux5W63nXKEM8zoxFmDLNfe7siCKG2GM7Kd8D',
      enableEncryptionKeyDerivation : true,
      publicKeyFormat               : 'Ed25519VerificationKey2020'
    },
    output: {
      '@context': [
        'https://www.w3.org/ns/did/v1',
        'https://w3id.org/security/suites/ed25519-2020/v1',
        'https://w3id.org/security/suites/x25519-2020/v1'
      ],
      'id'                 : 'did:key:z6MkmNvXGmVuux5W63nXKEM8zoxFmDLNfe7siCKG2GM7Kd8D',
      'verificationMethod' : [
        {
          'id'                 : 'did:key:z6MkmNvXGmVuux5W63nXKEM8zoxFmDLNfe7siCKG2GM7Kd8D#z6MkmNvXGmVuux5W63nXKEM8zoxFmDLNfe7siCKG2GM7Kd8D',
          'type'               : 'Ed25519VerificationKey2020',
          'controller'         : 'did:key:z6MkmNvXGmVuux5W63nXKEM8zoxFmDLNfe7siCKG2GM7Kd8D',
          'publicKeyMultibase' : 'z6MkmNvXGmVuux5W63nXKEM8zoxFmDLNfe7siCKG2GM7Kd8D'
        },
        {
          'id'                 : 'did:key:z6MkmNvXGmVuux5W63nXKEM8zoxFmDLNfe7siCKG2GM7Kd8D#z6LSdCnN59MPkRCaVvXczoipz5tMcPpjrCnvqBcHHjCDohYd',
          'type'               : 'X25519KeyAgreementKey2020',
          'controller'         : 'did:key:z6MkmNvXGmVuux5W63nXKEM8zoxFmDLNfe7siCKG2GM7Kd8D',
          'publicKeyMultibase' : 'z6LSdCnN59MPkRCaVvXczoipz5tMcPpjrCnvqBcHHjCDohYd'
        }
      ],
      'assertionMethod': [
        'did:key:z6MkmNvXGmVuux5W63nXKEM8zoxFmDLNfe7siCKG2GM7Kd8D#z6MkmNvXGmVuux5W63nXKEM8zoxFmDLNfe7siCKG2GM7Kd8D'
      ],
      'authentication': [
        'did:key:z6MkmNvXGmVuux5W63nXKEM8zoxFmDLNfe7siCKG2GM7Kd8D#z6MkmNvXGmVuux5W63nXKEM8zoxFmDLNfe7siCKG2GM7Kd8D'
      ],
      'capabilityDelegation': [
        'did:key:z6MkmNvXGmVuux5W63nXKEM8zoxFmDLNfe7siCKG2GM7Kd8D#z6MkmNvXGmVuux5W63nXKEM8zoxFmDLNfe7siCKG2GM7Kd8D'
      ],
      'capabilityInvocation': [
        'did:key:z6MkmNvXGmVuux5W63nXKEM8zoxFmDLNfe7siCKG2GM7Kd8D#z6MkmNvXGmVuux5W63nXKEM8zoxFmDLNfe7siCKG2GM7Kd8D'
      ],
      'keyAgreement': [
        'did:key:z6MkmNvXGmVuux5W63nXKEM8zoxFmDLNfe7siCKG2GM7Kd8D#z6LSdCnN59MPkRCaVvXczoipz5tMcPpjrCnvqBcHHjCDohYd'
      ]
    }
  }
];

export const didKeyCreateTestVectors = [
  {
    id    : 'did.create.1',
    input : {
      keySet: {
        verificationMethodKeys: [{
          'publicKeyJwk': {
            'alg' : 'EdDSA',
            'crv' : 'Ed25519',
            'kty' : 'OKP',
            'x'   : 'rpKnDP8F4_jwvQ7xDkkuKx165OSwcyrQvmEWl2eigIU'
          },
          relationships: ['authentication']
        }],
      },
      publicKeyAlgorithm : 'Ed25519',
      publicKeyFormat    : 'JsonWebKey2020'
    },
    output: {
      did      : 'did:key:z6MkrCigh4zugDVEieqt4WbtWParigHeH5TEYEuKcSyCykUk',
      document : {
        '@context': [
          'https://www.w3.org/ns/did/v1',
          'https://w3id.org/security/suites/jws-2020/v1'
        ],
        'id'                 : 'did:key:z6MkrCigh4zugDVEieqt4WbtWParigHeH5TEYEuKcSyCykUk',
        'verificationMethod' : [
          {
            'id'           : 'did:key:z6MkrCigh4zugDVEieqt4WbtWParigHeH5TEYEuKcSyCykUk#z6MkrCigh4zugDVEieqt4WbtWParigHeH5TEYEuKcSyCykUk',
            'type'         : 'JsonWebKey2020',
            'controller'   : 'did:key:z6MkrCigh4zugDVEieqt4WbtWParigHeH5TEYEuKcSyCykUk',
            'publicKeyJwk' : {
              'alg' : 'EdDSA',
              'crv' : 'Ed25519',
              'kty' : 'OKP',
              'x'   : 'rpKnDP8F4_jwvQ7xDkkuKx165OSwcyrQvmEWl2eigIU'
            }
          }
        ],
        'assertionMethod': [
          'did:key:z6MkrCigh4zugDVEieqt4WbtWParigHeH5TEYEuKcSyCykUk#z6MkrCigh4zugDVEieqt4WbtWParigHeH5TEYEuKcSyCykUk'
        ],
        'authentication': [
          'did:key:z6MkrCigh4zugDVEieqt4WbtWParigHeH5TEYEuKcSyCykUk#z6MkrCigh4zugDVEieqt4WbtWParigHeH5TEYEuKcSyCykUk'
        ],
        'capabilityDelegation': [
          'did:key:z6MkrCigh4zugDVEieqt4WbtWParigHeH5TEYEuKcSyCykUk#z6MkrCigh4zugDVEieqt4WbtWParigHeH5TEYEuKcSyCykUk'
        ],
        'capabilityInvocation': [
          'did:key:z6MkrCigh4zugDVEieqt4WbtWParigHeH5TEYEuKcSyCykUk#z6MkrCigh4zugDVEieqt4WbtWParigHeH5TEYEuKcSyCykUk'
        ],
      },
      keySet: {
        verificationMethodKeys: [{
          'publicKeyJwk': {
            'alg' : 'EdDSA',
            'crv' : 'Ed25519',
            'kty' : 'OKP',
            'x'   : 'rpKnDP8F4_jwvQ7xDkkuKx165OSwcyrQvmEWl2eigIU'
          },
          relationships: ['authentication']
        }],
      },
    }
  },
  {
    id    : 'did.create.2',
    input : {
      enableEncryptionKeyDerivation : true,
      keySet                        : {
        verificationMethodKeys: [{
          publicKeyJwk: {
            alg : 'EdDSA',
            crv : 'Ed25519',
            kty : 'OKP',
            x   : 'rpKnDP8F4_jwvQ7xDkkuKx165OSwcyrQvmEWl2eigIU'
          },
          relationships: ['authentication']
        }],
      },
      publicKeyAlgorithm : 'Ed25519',
      publicKeyFormat    : 'JsonWebKey2020'
    },
    output: {
      did      : 'did:key:z6MkrCigh4zugDVEieqt4WbtWParigHeH5TEYEuKcSyCykUk',
      document : {
        '@context': [
          'https://www.w3.org/ns/did/v1',
          'https://w3id.org/security/suites/jws-2020/v1'
        ],
        'id'                 : 'did:key:z6MkrCigh4zugDVEieqt4WbtWParigHeH5TEYEuKcSyCykUk',
        'verificationMethod' : [
          {
            'id'           : 'did:key:z6MkrCigh4zugDVEieqt4WbtWParigHeH5TEYEuKcSyCykUk#z6MkrCigh4zugDVEieqt4WbtWParigHeH5TEYEuKcSyCykUk',
            'type'         : 'JsonWebKey2020',
            'controller'   : 'did:key:z6MkrCigh4zugDVEieqt4WbtWParigHeH5TEYEuKcSyCykUk',
            'publicKeyJwk' : {
              'alg' : 'EdDSA',
              'crv' : 'Ed25519',
              'kty' : 'OKP',
              'x'   : 'rpKnDP8F4_jwvQ7xDkkuKx165OSwcyrQvmEWl2eigIU'
            }
          },
          {
            'controller'   : 'did:key:z6MkrCigh4zugDVEieqt4WbtWParigHeH5TEYEuKcSyCykUk',
            'type'         : 'JsonWebKey2020',
            'id'           : 'did:key:z6MkrCigh4zugDVEieqt4WbtWParigHeH5TEYEuKcSyCykUk#z6LSjqybG4FgDYHxo4v9tWzgTpCm9a3b9K3QYqicCabqWeHQ',
            'publicKeyJwk' : {
              'crv' : 'X25519',
              'kty' : 'OKP',
              'x'   : 'eWA3oUNKm3nZN0vqiC_tClPCkBznN5R0Y9NofJkoaXM'
            }
          }
        ],
        'assertionMethod': [
          'did:key:z6MkrCigh4zugDVEieqt4WbtWParigHeH5TEYEuKcSyCykUk#z6MkrCigh4zugDVEieqt4WbtWParigHeH5TEYEuKcSyCykUk'
        ],
        'authentication': [
          'did:key:z6MkrCigh4zugDVEieqt4WbtWParigHeH5TEYEuKcSyCykUk#z6MkrCigh4zugDVEieqt4WbtWParigHeH5TEYEuKcSyCykUk'
        ],
        'capabilityDelegation': [
          'did:key:z6MkrCigh4zugDVEieqt4WbtWParigHeH5TEYEuKcSyCykUk#z6MkrCigh4zugDVEieqt4WbtWParigHeH5TEYEuKcSyCykUk'
        ],
        'capabilityInvocation': [
          'did:key:z6MkrCigh4zugDVEieqt4WbtWParigHeH5TEYEuKcSyCykUk#z6MkrCigh4zugDVEieqt4WbtWParigHeH5TEYEuKcSyCykUk'
        ],
        'keyAgreement': [
          'did:key:z6MkrCigh4zugDVEieqt4WbtWParigHeH5TEYEuKcSyCykUk#z6LSjqybG4FgDYHxo4v9tWzgTpCm9a3b9K3QYqicCabqWeHQ'
        ]
      },
      keySet: {
        verificationMethodKeys: [{
          publicKeyJwk: {
            alg : 'EdDSA',
            crv : 'Ed25519',
            kty : 'OKP',
            x   : 'rpKnDP8F4_jwvQ7xDkkuKx165OSwcyrQvmEWl2eigIU'
          },
          relationships: ['authentication']
        }],
      },
    }
  }
];