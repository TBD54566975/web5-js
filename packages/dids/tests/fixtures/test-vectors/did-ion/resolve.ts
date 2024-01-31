import type { Jwk } from '@web5/crypto';

import type { DidResolutionResult } from '../../../../src/types/did-core.js';

type TestVector = {
  [key: string]: {
    didUri: string;
    privateKey: Jwk[];
    didResolutionResult: DidResolutionResult;
  };
};

export const vectors: TestVector = {
  publishedDid: {
    didUri              : 'did:ion:EiCab9QRUcUTKKIM-W2SMCwnOPxa4y0q7emoWJDSOSz3HQ',
    privateKey          : [],
    didResolutionResult : {
      '@context'  : 'https://w3id.org/did-resolution/v1',
      didDocument : {
        id         : 'did:ion:EiCab9QRUcUTKKIM-W2SMCwnOPxa4y0q7emoWJDSOSz3HQ',
        '@context' : [
          'https://www.w3.org/ns/did/v1',
          {
            '@base': 'did:ion:EiCab9QRUcUTKKIM-W2SMCwnOPxa4y0q7emoWJDSOSz3HQ',
          },
        ],
        service: [
        ],
        verificationMethod: [
          {
            id           : '#dwn-sig',
            controller   : 'did:ion:EiCab9QRUcUTKKIM-W2SMCwnOPxa4y0q7emoWJDSOSz3HQ',
            type         : 'JsonWebKey2020',
            publicKeyJwk : {
              crv : 'Ed25519',
              kty : 'OKP',
              x   : 'Sy0lk6pMXC10WyIh4g8sLz1loL8ImzLcqmFW2267IXc',
            },
          },
        ],
        authentication: [
          '#dwn-sig',
        ],
      },
      didDocumentMetadata: {
        method: {
          published          : true,
          recoveryCommitment : 'EiDzYFBF-EPcbt4sVdepmniqfg93wrh1dZTZY1ZI4m6enw',
          updateCommitment   : 'EiAp4ocUKXcYC3D-DaGiW2D01D3QVxqGegT1Fq42bDaPoQ',
        },
        canonicalId: 'did:ion:EiCab9QRUcUTKKIM-W2SMCwnOPxa4y0q7emoWJDSOSz3HQ',
      },
      didResolutionMetadata: {}
    }
  },
};