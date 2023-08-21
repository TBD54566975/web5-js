const didDocumentForIdTestVectors = {
  '@context': [
    'https://www.w3.org/ns/did/v1',
    'https://w3id.org/security/suites/jws-2020/v1',
    'https://w3id.org/security/suites/ed25519-2020/v1',
  ],
  id                 : 'did:method:alice',
  verificationMethod : [
    {
      id           : 'did:method:alice#key-1',
      type         : 'JsonWebKey2020',
      controller   : 'did:method:alice',
      publicKeyJwk : {
        alg : 'EdDSA',
        kty : 'OKP',
        crv : 'Ed25519',
        x   : 'GM_NcTChsLlfdODKG573OSWGO7wNwzhkHRPHPxdAYfc'
      }
    },
    {
      id                 : 'did:method:alice#key-2',
      type               : 'Ed25519VerificationKey2020',
      controller         : 'did:method:alice',
      publicKeyMultibase : 'z6LSdCnN59MPkRCaVvXczoipz5tMcPpjrCnvqBcHHjCDohYd'
    },
  ],
  'authentication': [
    'did:method:alice#key-1',
    {
      id           : 'did:method:alice#key-3',
      type         : 'JsonWebKey2020',
      controller   : 'did:method:alice',
      publicKeyJwk : {
        alg : 'EdDSA',
        kty : 'OKP',
        crv : 'Ed25519',
        x   : 'k1GKchkMMp9nbYsShY1R2UVzPsQill6zv2De38ERkfI'
      },
    },
  ],
  'keyAgreement': [
    {
      id           : 'did:method:alice#key-5',
      type         : 'JsonWebKey2020',
      controller   : 'did:method:alice',
      publicKeyJwk : {
        alg : 'EdDSA',
        kty : 'OKP',
        crv : 'X25519',
        x   : 'SOKzporeWqJMJxf1NgPtup3whiBLPLZxgLDORNzbXwA'
      },
    },
    {
      id                 : 'did:method:alice#key-6',
      type               : 'X25519KeyAgreementKey2020',
      controller         : 'did:method:alice',
      publicKeyMultibase : 'z6LSgah1r8rDCT2brDg7Vhh2LYmTkcEVgUHng1Ji68XBy4d'
    },
  ]
};

export const didDocumentIdTestVectors = [
  {
    id    : 'did.getIdByKey.1',
    input : {
      didDocument  : didDocumentForIdTestVectors,
      publicKeyJwk : {
        kty : 'OKP',
        crv : 'Ed25519',
        x   : 'GM_NcTChsLlfdODKG573OSWGO7wNwzhkHRPHPxdAYfc'
      },
    },
    output: 'did:method:alice#key-1'
  },
  {
    id    : 'did.getIdByKey.2',
    input : {
      didDocument        : didDocumentForIdTestVectors,
      publicKeyMultibase : 'z6LSdCnN59MPkRCaVvXczoipz5tMcPpjrCnvqBcHHjCDohYd',
    },
    output: 'did:method:alice#key-2'
  },
  {
    id    : 'did.getIdByKey.3',
    input : {
      didDocument  : didDocumentForIdTestVectors,
      publicKeyJwk : {
        kty : 'OKP',
        crv : 'Ed25519',
        x   : 'k1GKchkMMp9nbYsShY1R2UVzPsQill6zv2De38ERkfI'
      },
      publicKeyMultibase: 'z6LSdCnN59MPkRCaVvXczoipz5tMcPpjrCnvqBcHHjCDohYd',
    },
    output: 'did:method:alice#key-2'
  },
  {
    id    : 'did.getIdByKey.4',
    input : {
      didDocument  : didDocumentForIdTestVectors,
      publicKeyJwk : {
        kty : 'OKP',
        crv : 'Ed25519',
        x   : 'k1GKchkMMp9nbYsShY1R2UVzPsQill6zv2De38ERkfI'
      },
    },
    output: undefined
  }
];

export const didDocumentTypeTestVectors = [
  {
    id    : 'did.getTypes.1',
    input : {
      didDocument: {
        '@context': [
          'https://www.w3.org/ns/did/v1',
          'https://w3id.org/security/suites/ed25519-2020/v1',
          'https://w3id.org/security/suites/x25519-2020/v1'
        ],
        'id'                 : 'did:key:z6MkiTBz1ymuepAQ4HEHYSF1H8quG5GLVVQR3djdX3mDooWp',
        'verificationMethod' : [
          {
            'id'                 : 'did:key:z6MkiTBz1ymuepAQ4HEHYSF1H8quG5GLVVQR3djdX3mDooWp#z6MkiTBz1ymuepAQ4HEHYSF1H8quG5GLVVQR3djdX3mDooWp',
            'type'               : 'Ed25519VerificationKey2020',
            'controller'         : 'did:key:z6MkiTBz1ymuepAQ4HEHYSF1H8quG5GLVVQR3djdX3mDooWp',
            'publicKeyMultibase' : 'z6MkiTBz1ymuepAQ4HEHYSF1H8quG5GLVVQR3djdX3mDooWp'
          },
          {
            'id'                 : 'did:key:z6MkiTBz1ymuepAQ4HEHYSF1H8quG5GLVVQR3djdX3mDooWp#z6LShs9GGnqk85isEBzzshkuVWrVKsRp24GnDuHk8QWkARMW',
            'type'               : 'X25519KeyAgreementKey2020',
            'controller'         : 'did:key:z6MkiTBz1ymuepAQ4HEHYSF1H8quG5GLVVQR3djdX3mDooWp',
            'publicKeyMultibase' : 'z6LShs9GGnqk85isEBzzshkuVWrVKsRp24GnDuHk8QWkARMW'
          }
        ],
        'authentication': [
          'did:key:z6MkiTBz1ymuepAQ4HEHYSF1H8quG5GLVVQR3djdX3mDooWp#z6MkiTBz1ymuepAQ4HEHYSF1H8quG5GLVVQR3djdX3mDooWp',
          {
            'id'                 : 'did:key:z6MkiTBz1ymuepAQ4HEHYSF1H8quG5GLVVQR3djdX3mDooWp#zH3C2AVvLMv6gmMNam3uVAjZpfkcJCwDwnZn6z3wXmqPV',
            'type'               : 'Ed25519VerificationKey2020',
            'controller'         : 'did:key:z6MkiTBz1ymuepAQ4HEHYSF1H8quG5GLVVQR3djdX3mDooWp',
            'publicKeyMultibase' : 'zH3C2AVvLMv6gmMNam3uVAjZpfkcJCwDwnZn6z3wXmqPV'
          }
        ],
        'assertionMethod': [
          'did:key:z6MkiTBz1ymuepAQ4HEHYSF1H8quG5GLVVQR3djdX3mDooWp#z6MkiTBz1ymuepAQ4HEHYSF1H8quG5GLVVQR3djdX3mDooWp',
          {
            'id'                 : 'did:key:z6MkiTBz1ymuepAQ4HEHYSF1H8quG5GLVVQR3djdX3mDooWp#z6MknGc3ocHs3zdPiJbnaaqDi58NGb4pk1Sp9WxWufuXSdxf',
            'type'               : 'Ed25519VerificationKey2020',
            'controller'         : 'did:key:z6MkiTBz1ymuepAQ4HEHYSF1H8quG5GLVVQR3djdX3mDooWp',
            'publicKeyMultibase' : 'z6MknGc3ocHs3zdPiJbnaaqDi58NGb4pk1Sp9WxWufuXSdxf'
          }
        ],
        'capabilityDelegation': [
          'did:key:z6MkiTBz1ymuepAQ4HEHYSF1H8quG5GLVVQR3djdX3mDooWp#z6MkiTBz1ymuepAQ4HEHYSF1H8quG5GLVVQR3djdX3mDooWp'
        ],
        'capabilityInvocation': [
          'did:key:z6MkiTBz1ymuepAQ4HEHYSF1H8quG5GLVVQR3djdX3mDooWp#z6MkiTBz1ymuepAQ4HEHYSF1H8quG5GLVVQR3djdX3mDooWp'
        ],
        'keyAgreement': [
          'did:key:z6MkiTBz1ymuepAQ4HEHYSF1H8quG5GLVVQR3djdX3mDooWp#z6LShs9GGnqk85isEBzzshkuVWrVKsRp24GnDuHk8QWkARMW'
        ]
      },
    },
    output: ['Ed25519VerificationKey2020', 'X25519KeyAgreementKey2020']
  },

  {
    id    : 'did.getTypes.2',
    input : {
      didDocument: {
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
      },
    },
    output: ['JsonWebKey2020']
  },

  // Source: https://w3c.github.io/did-core/#example-did-document-with-different-verification-method-types
  {
    id    : 'did.type.w3c.32',
    input : {
      didDocument: {
        '@context': [
          'https://www.w3.org/ns/did/v1',
          'https://w3id.org/security/suites/ed25519-2018/v1',
          'https://w3id.org/security/suites/x25519-2019/v1',
          'https://w3id.org/security/suites/secp256k1-2019/v1',
          'https://w3id.org/security/suites/jws-2020/v1'
        ],
        'verificationMethod': [
          {
            'id'              : 'did:example:123#key-0',
            'type'            : 'Ed25519VerificationKey2018',
            'controller'      : 'did:example:123',
            'publicKeyBase58' : '3M5RCDjPTWPkKSN3sxUmmMqHbmRPegYP1tjcKyrDbt9J' // external (property name)
          },
          {
            'id'              : 'did:example:123#key-1',
            'type'            : 'X25519KeyAgreementKey2019',
            'controller'      : 'did:example:123',
            'publicKeyBase58' : 'FbQWLPRhTH95MCkQUeFYdiSoQt8zMwetqfWoxqPgaq7x' // external (property name)
          },
          {
            'id'              : 'did:example:123#key-2',
            'type'            : 'EcdsaSecp256k1VerificationKey2019',
            'controller'      : 'did:example:123',
            'publicKeyBase58' : 'ns2aFDq25fEV1NUd3wZ65sgj5QjFW8JCAHdUJfLwfodt' // external (property name)
          },
          {
            'id'           : 'did:example:123#key-3',
            'type'         : 'JsonWebKey2020',
            'controller'   : 'did:example:123',
            'publicKeyJwk' : {
              'kty' : 'EC', // external (property name)
              'crv' : 'P-256', // external (property name)
              'x'   : 'Er6KSSnAjI70ObRWhlaMgqyIOQYrDJTE94ej5hybQ2M', // external (property name)
              'y'   : 'pPVzCOTJwgikPjuUE6UebfZySqEJ0ZtsWFpj7YSPGEk' // external (property name)
            }
          }
        ]
      },
    },
    output: ['Ed25519VerificationKey2018', 'X25519KeyAgreementKey2019', 'EcdsaSecp256k1VerificationKey2019', 'JsonWebKey2020']
  }
];