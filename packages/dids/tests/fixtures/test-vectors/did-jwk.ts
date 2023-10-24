export const didJwkCreateTestVectors = [
  {
    id    : 'did:jwk.create.1',
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
      keyAlgorithm: 'Ed25519',
    },
    output: {
      did      : 'did:jwk:eyJhbGciOiJFZERTQSIsImNydiI6IkVkMjU1MTkiLCJrdHkiOiJPS1AiLCJ4IjoicnBLbkRQOEY0X2p3dlE3eERra3VLeDE2NU9Td2N5clF2bUVXbDJlaWdJVSJ9',
      document : {
        '@context': [
          'https://www.w3.org/ns/did/v1',
          'https://w3id.org/security/suites/jws-2020/v1'
        ],
        id                 : 'did:jwk:eyJhbGciOiJFZERTQSIsImNydiI6IkVkMjU1MTkiLCJrdHkiOiJPS1AiLCJ4IjoicnBLbkRQOEY0X2p3dlE3eERra3VLeDE2NU9Td2N5clF2bUVXbDJlaWdJVSJ9',
        verificationMethod : [
          {
            id           : 'did:jwk:eyJhbGciOiJFZERTQSIsImNydiI6IkVkMjU1MTkiLCJrdHkiOiJPS1AiLCJ4IjoicnBLbkRQOEY0X2p3dlE3eERra3VLeDE2NU9Td2N5clF2bUVXbDJlaWdJVSJ9#0',
            type         : 'JsonWebKey2020',
            controller   : 'did:jwk:eyJhbGciOiJFZERTQSIsImNydiI6IkVkMjU1MTkiLCJrdHkiOiJPS1AiLCJ4IjoicnBLbkRQOEY0X2p3dlE3eERra3VLeDE2NU9Td2N5clF2bUVXbDJlaWdJVSJ9',
            publicKeyJwk : {
              alg : 'EdDSA',
              crv : 'Ed25519',
              kty : 'OKP',
              x   : 'rpKnDP8F4_jwvQ7xDkkuKx165OSwcyrQvmEWl2eigIU'
            }
          }
        ],
        assertionMethod: [
          'did:jwk:eyJhbGciOiJFZERTQSIsImNydiI6IkVkMjU1MTkiLCJrdHkiOiJPS1AiLCJ4IjoicnBLbkRQOEY0X2p3dlE3eERra3VLeDE2NU9Td2N5clF2bUVXbDJlaWdJVSJ9#0'
        ],
        authentication: [
          'did:jwk:eyJhbGciOiJFZERTQSIsImNydiI6IkVkMjU1MTkiLCJrdHkiOiJPS1AiLCJ4IjoicnBLbkRQOEY0X2p3dlE3eERra3VLeDE2NU9Td2N5clF2bUVXbDJlaWdJVSJ9#0'
        ],
        capabilityDelegation: [
          'did:jwk:eyJhbGciOiJFZERTQSIsImNydiI6IkVkMjU1MTkiLCJrdHkiOiJPS1AiLCJ4IjoicnBLbkRQOEY0X2p3dlE3eERra3VLeDE2NU9Td2N5clF2bUVXbDJlaWdJVSJ9#0'
        ],
        capabilityInvocation: [
          'did:jwk:eyJhbGciOiJFZERTQSIsImNydiI6IkVkMjU1MTkiLCJrdHkiOiJPS1AiLCJ4IjoicnBLbkRQOEY0X2p3dlE3eERra3VLeDE2NU9Td2N5clF2bUVXbDJlaWdJVSJ9#0'
        ],
        keyAgreement: [
          'did:jwk:eyJhbGciOiJFZERTQSIsImNydiI6IkVkMjU1MTkiLCJrdHkiOiJPS1AiLCJ4IjoicnBLbkRQOEY0X2p3dlE3eERra3VLeDE2NU9Td2N5clF2bUVXbDJlaWdJVSJ9#0'
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
];

export const didJwkResolveTestVectors = [
  {
    id    : 'did:jwk.resolve.1',
    input : {
      didUrl: 'did:jwk:eyJjcnYiOiJYMjU1MTkiLCJrdHkiOiJPS1AiLCJ1c2UiOiJlbmMiLCJ4IjoiM3A3YmZYdDl3YlRUVzJIQzdPUTFOei1EUThoYmVHZE5yZngtRkctSUswOCJ9'
    },
    output: {
      '@context'  : 'https://w3id.org/did-resolution/v1',
      didDocument : {
        '@context': [
          'https://www.w3.org/ns/did/v1',
          'https://w3id.org/security/suites/jws-2020/v1'
        ],
        id                 : 'did:jwk:eyJjcnYiOiJYMjU1MTkiLCJrdHkiOiJPS1AiLCJ1c2UiOiJlbmMiLCJ4IjoiM3A3YmZYdDl3YlRUVzJIQzdPUTFOei1EUThoYmVHZE5yZngtRkctSUswOCJ9',
        verificationMethod : [
          {
            id           : 'did:jwk:eyJjcnYiOiJYMjU1MTkiLCJrdHkiOiJPS1AiLCJ1c2UiOiJlbmMiLCJ4IjoiM3A3YmZYdDl3YlRUVzJIQzdPUTFOei1EUThoYmVHZE5yZngtRkctSUswOCJ9#0',
            type         : 'JsonWebKey2020',
            controller   : 'did:jwk:eyJjcnYiOiJYMjU1MTkiLCJrdHkiOiJPS1AiLCJ1c2UiOiJlbmMiLCJ4IjoiM3A3YmZYdDl3YlRUVzJIQzdPUTFOei1EUThoYmVHZE5yZngtRkctSUswOCJ9',
            publicKeyJwk : {
              kty : 'OKP',
              crv : 'X25519',
              use : 'enc',
              x   : '3p7bfXt9wbTTW2HC7OQ1Nz-DQ8hbeGdNrfx-FG-IK08'
            }
          }
        ],
        keyAgreement: ['did:jwk:eyJjcnYiOiJYMjU1MTkiLCJrdHkiOiJPS1AiLCJ1c2UiOiJlbmMiLCJ4IjoiM3A3YmZYdDl3YlRUVzJIQzdPUTFOei1EUThoYmVHZE5yZngtRkctSUswOCJ9#0']
      },
      didDocumentMetadata   : {},
      didResolutionMetadata : {
        contentType : 'application/did+ld+json',
        did         : {
          didString        : 'did:jwk:eyJjcnYiOiJYMjU1MTkiLCJrdHkiOiJPS1AiLCJ1c2UiOiJlbmMiLCJ4IjoiM3A3YmZYdDl3YlRUVzJIQzdPUTFOei1EUThoYmVHZE5yZngtRkctSUswOCJ9',
          methodSpecificId : 'eyJjcnYiOiJYMjU1MTkiLCJrdHkiOiJPS1AiLCJ1c2UiOiJlbmMiLCJ4IjoiM3A3YmZYdDl3YlRUVzJIQzdPUTFOei1EUThoYmVHZE5yZngtRkctSUswOCJ9',
          method           : 'jwk'
        }
      }
    }
  },
];