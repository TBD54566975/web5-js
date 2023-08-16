export const didResolverTestVectors = [
  {
    id     : 'did.resolve.1',
    input  : 'did:key:z6MkmNvXGmVuux5W63nXKEM8zoxFmDLNfe7siCKG2GM7Kd8D',
    output : {
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
];