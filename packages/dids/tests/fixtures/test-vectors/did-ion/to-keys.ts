import type { Jwk, LocalKeyManager } from '@web5/crypto';

import sinon from 'sinon';

import type { BearerDid } from '../../../../src/bearer-did.js';

type TestVector = {
  [key: string]: {
    did: BearerDid;
    privateKey: Jwk[];
  };
};

export const vectors: TestVector = {
  oneMethodNoServices: {
    did: {
      didDocument: {
        id         : 'did:ion:EiAXe1c857XIc7F3tvrxV_tsmn2zMqrgILwvrMkEgfuuSQ:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiJyV3hhU2ZWWlVfZWJsWjAzRFk1RXo4TkxkRlA4c200cFVYenJNRjR2d0xVIiwicHVibGljS2V5SndrIjp7ImNydiI6IkVkMjU1MTkiLCJrdHkiOiJPS1AiLCJ4Ijoid0t6MUg3SnNqbmlhV0dka1I0akcxT19pWVlnWDFyV29TRVZSXy1sS1VZRSJ9LCJwdXJwb3NlcyI6WyJhdXRoZW50aWNhdGlvbiIsImFzc2VydGlvbk1ldGhvZCJdLCJ0eXBlIjoiSnNvbldlYktleTIwMjAifV0sInNlcnZpY2VzIjpbXX19XSwidXBkYXRlQ29tbWl0bWVudCI6IkVpQ1IwcDk3UGZHYW9LMV9fdlV4ZlhLcW0xN29RY0RtSEM4dk1WeFFZWUhzTlEifSwic3VmZml4RGF0YSI6eyJkZWx0YUhhc2giOiJFaUNxSjlyMEtTUmVsUHFNTXE2Q0gwRm13SUtiWkVEUjhuWmVzNGllTW03X1J3IiwicmVjb3ZlcnlDb21taXRtZW50IjoiRWlELVUyRDh1bE1VUjVkSWduWkY3YnJCNUpvWkdlY29HS2FpNGNuQ1gzSnNlZyJ9fQ',
        '@context' : [
          'https://www.w3.org/ns/did/v1',
          {
            '@base': 'did:ion:EiAXe1c857XIc7F3tvrxV_tsmn2zMqrgILwvrMkEgfuuSQ:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiJyV3hhU2ZWWlVfZWJsWjAzRFk1RXo4TkxkRlA4c200cFVYenJNRjR2d0xVIiwicHVibGljS2V5SndrIjp7ImNydiI6IkVkMjU1MTkiLCJrdHkiOiJPS1AiLCJ4Ijoid0t6MUg3SnNqbmlhV0dka1I0akcxT19pWVlnWDFyV29TRVZSXy1sS1VZRSJ9LCJwdXJwb3NlcyI6WyJhdXRoZW50aWNhdGlvbiIsImFzc2VydGlvbk1ldGhvZCJdLCJ0eXBlIjoiSnNvbldlYktleTIwMjAifV0sInNlcnZpY2VzIjpbXX19XSwidXBkYXRlQ29tbWl0bWVudCI6IkVpQ1IwcDk3UGZHYW9LMV9fdlV4ZlhLcW0xN29RY0RtSEM4dk1WeFFZWUhzTlEifSwic3VmZml4RGF0YSI6eyJkZWx0YUhhc2giOiJFaUNxSjlyMEtTUmVsUHFNTXE2Q0gwRm13SUtiWkVEUjhuWmVzNGllTW03X1J3IiwicmVjb3ZlcnlDb21taXRtZW50IjoiRWlELVUyRDh1bE1VUjVkSWduWkY3YnJCNUpvWkdlY29HS2FpNGNuQ1gzSnNlZyJ9fQ',
          },
        ],
        service: [
        ],
        verificationMethod: [
          {
            id           : '#rWxaSfVZU_eblZ03DY5Ez8NLdFP8sm4pUXzrMF4vwLU',
            controller   : 'did:ion:EiAXe1c857XIc7F3tvrxV_tsmn2zMqrgILwvrMkEgfuuSQ:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiJyV3hhU2ZWWlVfZWJsWjAzRFk1RXo4TkxkRlA4c200cFVYenJNRjR2d0xVIiwicHVibGljS2V5SndrIjp7ImNydiI6IkVkMjU1MTkiLCJrdHkiOiJPS1AiLCJ4Ijoid0t6MUg3SnNqbmlhV0dka1I0akcxT19pWVlnWDFyV29TRVZSXy1sS1VZRSJ9LCJwdXJwb3NlcyI6WyJhdXRoZW50aWNhdGlvbiIsImFzc2VydGlvbk1ldGhvZCJdLCJ0eXBlIjoiSnNvbldlYktleTIwMjAifV0sInNlcnZpY2VzIjpbXX19XSwidXBkYXRlQ29tbWl0bWVudCI6IkVpQ1IwcDk3UGZHYW9LMV9fdlV4ZlhLcW0xN29RY0RtSEM4dk1WeFFZWUhzTlEifSwic3VmZml4RGF0YSI6eyJkZWx0YUhhc2giOiJFaUNxSjlyMEtTUmVsUHFNTXE2Q0gwRm13SUtiWkVEUjhuWmVzNGllTW03X1J3IiwicmVjb3ZlcnlDb21taXRtZW50IjoiRWlELVUyRDh1bE1VUjVkSWduWkY3YnJCNUpvWkdlY29HS2FpNGNuQ1gzSnNlZyJ9fQ',
            type         : 'JsonWebKey2020',
            publicKeyJwk : {
              crv : 'Ed25519',
              kty : 'OKP',
              x   : 'wKz1H7JsjniaWGdkR4jG1O_iYYgX1rWoSEVR_-lKUYE',
            },
          },
        ],
        authentication: [
          '#rWxaSfVZU_eblZ03DY5Ez8NLdFP8sm4pUXzrMF4vwLU',
        ],
        assertionMethod: [
          '#rWxaSfVZU_eblZ03DY5Ez8NLdFP8sm4pUXzrMF4vwLU',
        ],
      },
      getSigner  : sinon.stub(),
      keyManager : sinon.stub() as unknown as LocalKeyManager,
      metadata   : {
        canonicalId : 'did:ion:EiAXe1c857XIc7F3tvrxV_tsmn2zMqrgILwvrMkEgfuuSQ',
        recoveryKey : {
          kty : 'EC',
          crv : 'secp256k1',
          x   : 'EdmqCQJjJycUhxz52kCxLR7v1cIpWnbgVOVXDn73sMI',
          y   : 'a4kbkoG7t5yYYzUqSuSLv9gp8Rumw4wPmCDsQWaLKQQ',
          kid : 'cv5f7CxO3H8FVqDuU5b48WP1Y8vfhkcmjOAOFhQDByU',
          alg : 'ES256K',
        },
        updateKey: {
          kty : 'EC',
          crv : 'secp256k1',
          x   : 'p1edwKgrvFZ4XxXcqM8j_ZStWZ0DuWzdhr8JUI42BmA',
          y   : 'KK_s4WG6vyDeJ4kMyDaAygU3G-Fiixi6Hf7cgFe-HcM',
          kid : 'mKJbR4wHIJIeyUITRhddkPFqL-jbpGtSnu4MB6WrYzg',
          alg : 'ES256K',
        },
        published: true,
      },
      uri: 'did:ion:EiAXe1c857XIc7F3tvrxV_tsmn2zMqrgILwvrMkEgfuuSQ:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiJyV3hhU2ZWWlVfZWJsWjAzRFk1RXo4TkxkRlA4c200cFVYenJNRjR2d0xVIiwicHVibGljS2V5SndrIjp7ImNydiI6IkVkMjU1MTkiLCJrdHkiOiJPS1AiLCJ4Ijoid0t6MUg3SnNqbmlhV0dka1I0akcxT19pWVlnWDFyV29TRVZSXy1sS1VZRSJ9LCJwdXJwb3NlcyI6WyJhdXRoZW50aWNhdGlvbiIsImFzc2VydGlvbk1ldGhvZCJdLCJ0eXBlIjoiSnNvbldlYktleTIwMjAifV0sInNlcnZpY2VzIjpbXX19XSwidXBkYXRlQ29tbWl0bWVudCI6IkVpQ1IwcDk3UGZHYW9LMV9fdlV4ZlhLcW0xN29RY0RtSEM4dk1WeFFZWUhzTlEifSwic3VmZml4RGF0YSI6eyJkZWx0YUhhc2giOiJFaUNxSjlyMEtTUmVsUHFNTXE2Q0gwRm13SUtiWkVEUjhuWmVzNGllTW03X1J3IiwicmVjb3ZlcnlDb21taXRtZW50IjoiRWlELVUyRDh1bE1VUjVkSWduWkY3YnJCNUpvWkdlY29HS2FpNGNuQ1gzSnNlZyJ9fQ',
    },
    privateKey: [
      {
        crv : 'Ed25519',
        d   : 'tMxiGuJDL1dukJT8xfMwanLHv3ScDTVJH1jtS01Xm-g',
        kty : 'OKP',
        x   : 'wKz1H7JsjniaWGdkR4jG1O_iYYgX1rWoSEVR_-lKUYE',
        kid : 'rWxaSfVZU_eblZ03DY5Ez8NLdFP8sm4pUXzrMF4vwLU',
        alg : 'EdDSA',
      }
    ],
  },
};