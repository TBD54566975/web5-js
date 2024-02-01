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
  oneMethodNoServices: {
    didUri     : 'did:ion:EiAzB7K-xDIKc1csXo5HX2eNBoemK9feNhL3cKwfukYOug:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiJFN1kyUUt1Zm9HUHhqWXJZSFl6MG51b1VtaEQxM1ctWGYxOVotdl9sTGNVIiwicHVibGljS2V5SndrIjp7ImNydiI6IkVkMjU1MTkiLCJrdHkiOiJPS1AiLCJ4IjoibU9MYkxWVDQwR0lhTk13bjFqd05pdFhad05NTllIdmg5c0FOb0xvTjY5QSJ9LCJwdXJwb3NlcyI6WyJhdXRoZW50aWNhdGlvbiIsImFzc2VydGlvbk1ldGhvZCJdLCJ0eXBlIjoiSnNvbldlYktleTIwMjAifV0sInNlcnZpY2VzIjpbXX19XSwidXBkYXRlQ29tbWl0bWVudCI6IkVpRDlSN0M2enloakFFS25uT3RiRW1DU1d0RGJwQXFxbE1uMW4tNS04dlltYUEifSwic3VmZml4RGF0YSI6eyJkZWx0YUhhc2giOiJFaUNOazhJRHJkWHdMNng5Z1ZicHdvOEZpNDNTZUVzQjMxSm1UNzN5ODNOZ25BIiwicmVjb3ZlcnlDb21taXRtZW50IjoiRWlCUUNPclZBeVNHcXF2YVMzRU15c2RlNVhkUHhGTzFDZzlDN2lqOUs2NjhzQSJ9fQ',
    privateKey : [
      {
        crv : 'Ed25519',
        d   : 'kxXp_AYrMbkVvaWS_nDLIK1INI6Y_CpmUiZQemVCWI0',
        kty : 'OKP',
        x   : 'mOLbLVT40GIaNMwn1jwNitXZwNMNYHvh9sANoLoN69A',
        kid : 'E7Y2QKufoGPxjYrYHYz0nuoUmhD13W-Xf19Z-v_lLcU',
        alg : 'EdDSA',
      }
    ],
    didResolutionResult: {
      didDocument: {
        id         : 'did:ion:EiAzB7K-xDIKc1csXo5HX2eNBoemK9feNhL3cKwfukYOug:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiJFN1kyUUt1Zm9HUHhqWXJZSFl6MG51b1VtaEQxM1ctWGYxOVotdl9sTGNVIiwicHVibGljS2V5SndrIjp7ImNydiI6IkVkMjU1MTkiLCJrdHkiOiJPS1AiLCJ4IjoibU9MYkxWVDQwR0lhTk13bjFqd05pdFhad05NTllIdmg5c0FOb0xvTjY5QSJ9LCJwdXJwb3NlcyI6WyJhdXRoZW50aWNhdGlvbiIsImFzc2VydGlvbk1ldGhvZCJdLCJ0eXBlIjoiSnNvbldlYktleTIwMjAifV0sInNlcnZpY2VzIjpbXX19XSwidXBkYXRlQ29tbWl0bWVudCI6IkVpRDlSN0M2enloakFFS25uT3RiRW1DU1d0RGJwQXFxbE1uMW4tNS04dlltYUEifSwic3VmZml4RGF0YSI6eyJkZWx0YUhhc2giOiJFaUNOazhJRHJkWHdMNng5Z1ZicHdvOEZpNDNTZUVzQjMxSm1UNzN5ODNOZ25BIiwicmVjb3ZlcnlDb21taXRtZW50IjoiRWlCUUNPclZBeVNHcXF2YVMzRU15c2RlNVhkUHhGTzFDZzlDN2lqOUs2NjhzQSJ9fQ',
        '@context' : [
          'https://www.w3.org/ns/did/v1',
          {
            '@base': 'did:ion:EiAzB7K-xDIKc1csXo5HX2eNBoemK9feNhL3cKwfukYOug:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiJFN1kyUUt1Zm9HUHhqWXJZSFl6MG51b1VtaEQxM1ctWGYxOVotdl9sTGNVIiwicHVibGljS2V5SndrIjp7ImNydiI6IkVkMjU1MTkiLCJrdHkiOiJPS1AiLCJ4IjoibU9MYkxWVDQwR0lhTk13bjFqd05pdFhad05NTllIdmg5c0FOb0xvTjY5QSJ9LCJwdXJwb3NlcyI6WyJhdXRoZW50aWNhdGlvbiIsImFzc2VydGlvbk1ldGhvZCJdLCJ0eXBlIjoiSnNvbldlYktleTIwMjAifV0sInNlcnZpY2VzIjpbXX19XSwidXBkYXRlQ29tbWl0bWVudCI6IkVpRDlSN0M2enloakFFS25uT3RiRW1DU1d0RGJwQXFxbE1uMW4tNS04dlltYUEifSwic3VmZml4RGF0YSI6eyJkZWx0YUhhc2giOiJFaUNOazhJRHJkWHdMNng5Z1ZicHdvOEZpNDNTZUVzQjMxSm1UNzN5ODNOZ25BIiwicmVjb3ZlcnlDb21taXRtZW50IjoiRWlCUUNPclZBeVNHcXF2YVMzRU15c2RlNVhkUHhGTzFDZzlDN2lqOUs2NjhzQSJ9fQ',
          },
        ],
        service: [
        ],
        verificationMethod: [
          {
            id           : '#E7Y2QKufoGPxjYrYHYz0nuoUmhD13W-Xf19Z-v_lLcU',
            controller   : 'did:ion:EiAzB7K-xDIKc1csXo5HX2eNBoemK9feNhL3cKwfukYOug:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiJFN1kyUUt1Zm9HUHhqWXJZSFl6MG51b1VtaEQxM1ctWGYxOVotdl9sTGNVIiwicHVibGljS2V5SndrIjp7ImNydiI6IkVkMjU1MTkiLCJrdHkiOiJPS1AiLCJ4IjoibU9MYkxWVDQwR0lhTk13bjFqd05pdFhad05NTllIdmg5c0FOb0xvTjY5QSJ9LCJwdXJwb3NlcyI6WyJhdXRoZW50aWNhdGlvbiIsImFzc2VydGlvbk1ldGhvZCJdLCJ0eXBlIjoiSnNvbldlYktleTIwMjAifV0sInNlcnZpY2VzIjpbXX19XSwidXBkYXRlQ29tbWl0bWVudCI6IkVpRDlSN0M2enloakFFS25uT3RiRW1DU1d0RGJwQXFxbE1uMW4tNS04dlltYUEifSwic3VmZml4RGF0YSI6eyJkZWx0YUhhc2giOiJFaUNOazhJRHJkWHdMNng5Z1ZicHdvOEZpNDNTZUVzQjMxSm1UNzN5ODNOZ25BIiwicmVjb3ZlcnlDb21taXRtZW50IjoiRWlCUUNPclZBeVNHcXF2YVMzRU15c2RlNVhkUHhGTzFDZzlDN2lqOUs2NjhzQSJ9fQ',
            type         : 'JsonWebKey2020',
            publicKeyJwk : {
              crv : 'Ed25519',
              kty : 'OKP',
              x   : 'mOLbLVT40GIaNMwn1jwNitXZwNMNYHvh9sANoLoN69A',
            },
          },
        ],
        authentication: [
          '#E7Y2QKufoGPxjYrYHYz0nuoUmhD13W-Xf19Z-v_lLcU',
        ],
        assertionMethod: [
          '#E7Y2QKufoGPxjYrYHYz0nuoUmhD13W-Xf19Z-v_lLcU',
        ],
      },
      didDocumentMetadata: {
        method: {
          published          : false,
          recoveryCommitment : 'EiBQCOrVAySGqqvaS3EMysde5XdPxFO1Cg9C7ij9K668sA',
          updateCommitment   : 'EiD9R7C6zyhjAEKnnOtbEmCSWtDbpAqqlMn1n-5-8vYmaA',
        },
        equivalentId: [
          'did:ion:EiAzB7K-xDIKc1csXo5HX2eNBoemK9feNhL3cKwfukYOug',
        ],
      },
      didResolutionMetadata: {}
    }
  },

  twoMethodsNoServices: {
    didUri     : 'did:ion:EiBya40LM6p4aaMyp2NtImm3yvtUOSXmmHNgcCt6JudUHQ:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiJJZ2wwUE1Cam9tWDVyeHRCeUJZdDh4ZWpRbF9XQktCaXZaak9ydnhjVFAwIiwicHVibGljS2V5SndrIjp7ImNydiI6IkVkMjU1MTkiLCJrdHkiOiJPS1AiLCJ4IjoiOE1jWGdDN25ydjY3RTZBSG9SN2lDcjVaY0xRdml5aHo4M2NmSm5YLVY5MCJ9LCJwdXJwb3NlcyI6WyJhdXRoZW50aWNhdGlvbiIsImFzc2VydGlvbk1ldGhvZCJdLCJ0eXBlIjoiSnNvbldlYktleTIwMjAifSx7ImlkIjoib0dTS1p6LUdZYW5CMTg4SnlPcXI4dmcxU0dIdzRHVnBBVWpkbGNKdmJvUSIsInB1YmxpY0tleUp3ayI6eyJjcnYiOiJzZWNwMjU2azEiLCJrdHkiOiJFQyIsIngiOiJLT1lkNjRjaHBUZEc0bEtZczJlTXYtVkIzZ2E2b1FLcnFfYWFZdGtlWGZVIiwieSI6IkN2N3BfQnlCSHprZElja2gtcEUxSDZqcDFNVmJDUE9GMC1WQWVzZGN3dmMifSwicHVycG9zZXMiOlsiYXV0aGVudGljYXRpb24iLCJhc3NlcnRpb25NZXRob2QiXSwidHlwZSI6Ikpzb25XZWJLZXkyMDIwIn1dLCJzZXJ2aWNlcyI6W119fV0sInVwZGF0ZUNvbW1pdG1lbnQiOiJFaUR2VjUtYjhDMEQ4NEZxMzh2M2ZxbEFBM2NZMUk5Q2RrU0NuZ1BTTU8zSnlnIn0sInN1ZmZpeERhdGEiOnsiZGVsdGFIYXNoIjoiRWlDRzNFSTVSeFlwRDBuYjdzR3hVdTBUWlBVTC02akJNdnFQNFZpd2p0TmF4dyIsInJlY292ZXJ5Q29tbWl0bWVudCI6IkVpQnB1UWQ0S1JwR0J0cC1Xb01oaGZGQnRpakptSDZhWklQaFI2a3oyRjFMamcifX0',
    privateKey : [
      {
        crv : 'Ed25519',
        d   : 'mXkHN5G6TRMBTVruPZ7iPbpyrq5-_wodVwxDKEVetCM',
        kty : 'OKP',
        x   : '8McXgC7nrv67E6AHoR7iCr5ZcLQviyhz83cfJnX-V90',
        kid : 'Igl0PMBjomX5rxtByBYt8xejQl_WBKBivZjOrvxcTP0',
        alg : 'EdDSA',
      },
      {
        kty : 'EC',
        crv : 'secp256k1',
        d   : 'HLFBI4JwQc8-kLP-3Yr5lsPz39XaGanOFi81MmixAXw',
        x   : 'KOYd64chpTdG4lKYs2eMv-VB3ga6oQKrq_aaYtkeXfU',
        y   : 'Cv7p_ByBHzkdIckh-pE1H6jp1MVbCPOF0-VAesdcwvc',
        kid : 'oGSKZz-GYanB188JyOqr8vg1SGHw4GVpAUjdlcJvboQ',
        alg : 'ES256K',
      }
    ],
    didResolutionResult: {
      didDocument: {
        id         : 'did:ion:EiBya40LM6p4aaMyp2NtImm3yvtUOSXmmHNgcCt6JudUHQ:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiJJZ2wwUE1Cam9tWDVyeHRCeUJZdDh4ZWpRbF9XQktCaXZaak9ydnhjVFAwIiwicHVibGljS2V5SndrIjp7ImNydiI6IkVkMjU1MTkiLCJrdHkiOiJPS1AiLCJ4IjoiOE1jWGdDN25ydjY3RTZBSG9SN2lDcjVaY0xRdml5aHo4M2NmSm5YLVY5MCJ9LCJwdXJwb3NlcyI6WyJhdXRoZW50aWNhdGlvbiIsImFzc2VydGlvbk1ldGhvZCJdLCJ0eXBlIjoiSnNvbldlYktleTIwMjAifSx7ImlkIjoib0dTS1p6LUdZYW5CMTg4SnlPcXI4dmcxU0dIdzRHVnBBVWpkbGNKdmJvUSIsInB1YmxpY0tleUp3ayI6eyJjcnYiOiJzZWNwMjU2azEiLCJrdHkiOiJFQyIsIngiOiJLT1lkNjRjaHBUZEc0bEtZczJlTXYtVkIzZ2E2b1FLcnFfYWFZdGtlWGZVIiwieSI6IkN2N3BfQnlCSHprZElja2gtcEUxSDZqcDFNVmJDUE9GMC1WQWVzZGN3dmMifSwicHVycG9zZXMiOlsiYXV0aGVudGljYXRpb24iLCJhc3NlcnRpb25NZXRob2QiXSwidHlwZSI6Ikpzb25XZWJLZXkyMDIwIn1dLCJzZXJ2aWNlcyI6W119fV0sInVwZGF0ZUNvbW1pdG1lbnQiOiJFaUR2VjUtYjhDMEQ4NEZxMzh2M2ZxbEFBM2NZMUk5Q2RrU0NuZ1BTTU8zSnlnIn0sInN1ZmZpeERhdGEiOnsiZGVsdGFIYXNoIjoiRWlDRzNFSTVSeFlwRDBuYjdzR3hVdTBUWlBVTC02akJNdnFQNFZpd2p0TmF4dyIsInJlY292ZXJ5Q29tbWl0bWVudCI6IkVpQnB1UWQ0S1JwR0J0cC1Xb01oaGZGQnRpakptSDZhWklQaFI2a3oyRjFMamcifX0',
        '@context' : [
          'https://www.w3.org/ns/did/v1',
          {
            '@base': 'did:ion:EiBya40LM6p4aaMyp2NtImm3yvtUOSXmmHNgcCt6JudUHQ:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiJJZ2wwUE1Cam9tWDVyeHRCeUJZdDh4ZWpRbF9XQktCaXZaak9ydnhjVFAwIiwicHVibGljS2V5SndrIjp7ImNydiI6IkVkMjU1MTkiLCJrdHkiOiJPS1AiLCJ4IjoiOE1jWGdDN25ydjY3RTZBSG9SN2lDcjVaY0xRdml5aHo4M2NmSm5YLVY5MCJ9LCJwdXJwb3NlcyI6WyJhdXRoZW50aWNhdGlvbiIsImFzc2VydGlvbk1ldGhvZCJdLCJ0eXBlIjoiSnNvbldlYktleTIwMjAifSx7ImlkIjoib0dTS1p6LUdZYW5CMTg4SnlPcXI4dmcxU0dIdzRHVnBBVWpkbGNKdmJvUSIsInB1YmxpY0tleUp3ayI6eyJjcnYiOiJzZWNwMjU2azEiLCJrdHkiOiJFQyIsIngiOiJLT1lkNjRjaHBUZEc0bEtZczJlTXYtVkIzZ2E2b1FLcnFfYWFZdGtlWGZVIiwieSI6IkN2N3BfQnlCSHprZElja2gtcEUxSDZqcDFNVmJDUE9GMC1WQWVzZGN3dmMifSwicHVycG9zZXMiOlsiYXV0aGVudGljYXRpb24iLCJhc3NlcnRpb25NZXRob2QiXSwidHlwZSI6Ikpzb25XZWJLZXkyMDIwIn1dLCJzZXJ2aWNlcyI6W119fV0sInVwZGF0ZUNvbW1pdG1lbnQiOiJFaUR2VjUtYjhDMEQ4NEZxMzh2M2ZxbEFBM2NZMUk5Q2RrU0NuZ1BTTU8zSnlnIn0sInN1ZmZpeERhdGEiOnsiZGVsdGFIYXNoIjoiRWlDRzNFSTVSeFlwRDBuYjdzR3hVdTBUWlBVTC02akJNdnFQNFZpd2p0TmF4dyIsInJlY292ZXJ5Q29tbWl0bWVudCI6IkVpQnB1UWQ0S1JwR0J0cC1Xb01oaGZGQnRpakptSDZhWklQaFI2a3oyRjFMamcifX0',
          },
        ],
        service: [
        ],
        verificationMethod: [
          {
            id           : '#Igl0PMBjomX5rxtByBYt8xejQl_WBKBivZjOrvxcTP0',
            controller   : 'did:ion:EiBya40LM6p4aaMyp2NtImm3yvtUOSXmmHNgcCt6JudUHQ:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiJJZ2wwUE1Cam9tWDVyeHRCeUJZdDh4ZWpRbF9XQktCaXZaak9ydnhjVFAwIiwicHVibGljS2V5SndrIjp7ImNydiI6IkVkMjU1MTkiLCJrdHkiOiJPS1AiLCJ4IjoiOE1jWGdDN25ydjY3RTZBSG9SN2lDcjVaY0xRdml5aHo4M2NmSm5YLVY5MCJ9LCJwdXJwb3NlcyI6WyJhdXRoZW50aWNhdGlvbiIsImFzc2VydGlvbk1ldGhvZCJdLCJ0eXBlIjoiSnNvbldlYktleTIwMjAifSx7ImlkIjoib0dTS1p6LUdZYW5CMTg4SnlPcXI4dmcxU0dIdzRHVnBBVWpkbGNKdmJvUSIsInB1YmxpY0tleUp3ayI6eyJjcnYiOiJzZWNwMjU2azEiLCJrdHkiOiJFQyIsIngiOiJLT1lkNjRjaHBUZEc0bEtZczJlTXYtVkIzZ2E2b1FLcnFfYWFZdGtlWGZVIiwieSI6IkN2N3BfQnlCSHprZElja2gtcEUxSDZqcDFNVmJDUE9GMC1WQWVzZGN3dmMifSwicHVycG9zZXMiOlsiYXV0aGVudGljYXRpb24iLCJhc3NlcnRpb25NZXRob2QiXSwidHlwZSI6Ikpzb25XZWJLZXkyMDIwIn1dLCJzZXJ2aWNlcyI6W119fV0sInVwZGF0ZUNvbW1pdG1lbnQiOiJFaUR2VjUtYjhDMEQ4NEZxMzh2M2ZxbEFBM2NZMUk5Q2RrU0NuZ1BTTU8zSnlnIn0sInN1ZmZpeERhdGEiOnsiZGVsdGFIYXNoIjoiRWlDRzNFSTVSeFlwRDBuYjdzR3hVdTBUWlBVTC02akJNdnFQNFZpd2p0TmF4dyIsInJlY292ZXJ5Q29tbWl0bWVudCI6IkVpQnB1UWQ0S1JwR0J0cC1Xb01oaGZGQnRpakptSDZhWklQaFI2a3oyRjFMamcifX0',
            type         : 'JsonWebKey2020',
            publicKeyJwk : {
              crv : 'Ed25519',
              kty : 'OKP',
              x   : '8McXgC7nrv67E6AHoR7iCr5ZcLQviyhz83cfJnX-V90',
            },
          },
          {
            id           : '#oGSKZz-GYanB188JyOqr8vg1SGHw4GVpAUjdlcJvboQ',
            controller   : 'did:ion:EiBya40LM6p4aaMyp2NtImm3yvtUOSXmmHNgcCt6JudUHQ:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiJJZ2wwUE1Cam9tWDVyeHRCeUJZdDh4ZWpRbF9XQktCaXZaak9ydnhjVFAwIiwicHVibGljS2V5SndrIjp7ImNydiI6IkVkMjU1MTkiLCJrdHkiOiJPS1AiLCJ4IjoiOE1jWGdDN25ydjY3RTZBSG9SN2lDcjVaY0xRdml5aHo4M2NmSm5YLVY5MCJ9LCJwdXJwb3NlcyI6WyJhdXRoZW50aWNhdGlvbiIsImFzc2VydGlvbk1ldGhvZCJdLCJ0eXBlIjoiSnNvbldlYktleTIwMjAifSx7ImlkIjoib0dTS1p6LUdZYW5CMTg4SnlPcXI4dmcxU0dIdzRHVnBBVWpkbGNKdmJvUSIsInB1YmxpY0tleUp3ayI6eyJjcnYiOiJzZWNwMjU2azEiLCJrdHkiOiJFQyIsIngiOiJLT1lkNjRjaHBUZEc0bEtZczJlTXYtVkIzZ2E2b1FLcnFfYWFZdGtlWGZVIiwieSI6IkN2N3BfQnlCSHprZElja2gtcEUxSDZqcDFNVmJDUE9GMC1WQWVzZGN3dmMifSwicHVycG9zZXMiOlsiYXV0aGVudGljYXRpb24iLCJhc3NlcnRpb25NZXRob2QiXSwidHlwZSI6Ikpzb25XZWJLZXkyMDIwIn1dLCJzZXJ2aWNlcyI6W119fV0sInVwZGF0ZUNvbW1pdG1lbnQiOiJFaUR2VjUtYjhDMEQ4NEZxMzh2M2ZxbEFBM2NZMUk5Q2RrU0NuZ1BTTU8zSnlnIn0sInN1ZmZpeERhdGEiOnsiZGVsdGFIYXNoIjoiRWlDRzNFSTVSeFlwRDBuYjdzR3hVdTBUWlBVTC02akJNdnFQNFZpd2p0TmF4dyIsInJlY292ZXJ5Q29tbWl0bWVudCI6IkVpQnB1UWQ0S1JwR0J0cC1Xb01oaGZGQnRpakptSDZhWklQaFI2a3oyRjFMamcifX0',
            type         : 'JsonWebKey2020',
            publicKeyJwk : {
              crv : 'secp256k1',
              kty : 'EC',
              x   : 'KOYd64chpTdG4lKYs2eMv-VB3ga6oQKrq_aaYtkeXfU',
              y   : 'Cv7p_ByBHzkdIckh-pE1H6jp1MVbCPOF0-VAesdcwvc',
            },
          },
        ],
        authentication: [
          '#Igl0PMBjomX5rxtByBYt8xejQl_WBKBivZjOrvxcTP0',
          '#oGSKZz-GYanB188JyOqr8vg1SGHw4GVpAUjdlcJvboQ',
        ],
        assertionMethod: [
          '#Igl0PMBjomX5rxtByBYt8xejQl_WBKBivZjOrvxcTP0',
          '#oGSKZz-GYanB188JyOqr8vg1SGHw4GVpAUjdlcJvboQ',
        ],
      },
      didDocumentMetadata: {
        method: {
          published          : false,
          recoveryCommitment : 'EiBpuQd4KRpGBtp-WoMhhfFBtijJmH6aZIPhR6kz2F1Ljg',
          updateCommitment   : 'EiDvV5-b8C0D84Fq38v3fqlAA3cY1I9CdkSCngPSMO3Jyg',
        },
        equivalentId: [
          'did:ion:EiBya40LM6p4aaMyp2NtImm3yvtUOSXmmHNgcCt6JudUHQ',
        ],
      },
      didResolutionMetadata: {}
    }
  },

  oneMethodOneService: {
    didUri     : 'did:ion:EiDO7yuqY5ChgRW1BnsNlPlwcu2KQp_ZlroqbICLujPi7w:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiJOTEJYZTdQbUloREVuamdWTHllamp2UTRrNmxHNzlIa0xtRS16N0xRcWZBIiwicHVibGljS2V5SndrIjp7ImNydiI6IkVkMjU1MTkiLCJrdHkiOiJPS1AiLCJ4IjoiaHBlYkRpYk82dDRUOVBybEZGU0NMUFQyYlhwMFRTY1VobzFvRk81bGRGcyJ9LCJwdXJwb3NlcyI6WyJhdXRoZW50aWNhdGlvbiIsImFzc2VydGlvbk1ldGhvZCJdLCJ0eXBlIjoiSnNvbldlYktleTIwMjAifV0sInNlcnZpY2VzIjpbeyJpZCI6ImR3biIsInNlcnZpY2VFbmRwb2ludCI6Imh0dHBzOi8vZXhhbXBsZS5jb20vZHduIiwidHlwZSI6IkRlY2VudHJhbGl6ZWRXZWJOb2RlIn1dfX1dLCJ1cGRhdGVDb21taXRtZW50IjoiRWlDQ3cxcVYwYVk1Y2oydzNyQlhCWWVzOFRPN21aUHl3VzJZTXFTdHM3ZEVOdyJ9LCJzdWZmaXhEYXRhIjp7ImRlbHRhSGFzaCI6IkVpQzhfN3VIcXpra2FBSVBlaDBLLURTVnVaOGd6dWVPNVB6WEpyM2R0VlBVSFEiLCJyZWNvdmVyeUNvbW1pdG1lbnQiOiJFaUJWTDFxX0xlaXJfekFGV0l0M2pCRlhOSG5DU2hPU0Z6Z21xb0dzS2hjQkFnIn19',
    privateKey : [
      {
        crv : 'Ed25519',
        d   : 'cllAz3W1a3MnCFR3anZt6cZygIcRTHmSO2SJyKJzmQM',
        kty : 'OKP',
        x   : 'hpebDibO6t4T9PrlFFSCLPT2bXp0TScUho1oFO5ldFs',
        kid : 'NLBXe7PmIhDEnjgVLyejjvQ4k6lG79HkLmE-z7LQqfA',
        alg : 'EdDSA',
      }
    ],
    didResolutionResult: {
      didDocument: {
        id         : 'did:ion:EiDO7yuqY5ChgRW1BnsNlPlwcu2KQp_ZlroqbICLujPi7w:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiJOTEJYZTdQbUloREVuamdWTHllamp2UTRrNmxHNzlIa0xtRS16N0xRcWZBIiwicHVibGljS2V5SndrIjp7ImNydiI6IkVkMjU1MTkiLCJrdHkiOiJPS1AiLCJ4IjoiaHBlYkRpYk82dDRUOVBybEZGU0NMUFQyYlhwMFRTY1VobzFvRk81bGRGcyJ9LCJwdXJwb3NlcyI6WyJhdXRoZW50aWNhdGlvbiIsImFzc2VydGlvbk1ldGhvZCJdLCJ0eXBlIjoiSnNvbldlYktleTIwMjAifV0sInNlcnZpY2VzIjpbeyJpZCI6ImR3biIsInNlcnZpY2VFbmRwb2ludCI6Imh0dHBzOi8vZXhhbXBsZS5jb20vZHduIiwidHlwZSI6IkRlY2VudHJhbGl6ZWRXZWJOb2RlIn1dfX1dLCJ1cGRhdGVDb21taXRtZW50IjoiRWlDQ3cxcVYwYVk1Y2oydzNyQlhCWWVzOFRPN21aUHl3VzJZTXFTdHM3ZEVOdyJ9LCJzdWZmaXhEYXRhIjp7ImRlbHRhSGFzaCI6IkVpQzhfN3VIcXpra2FBSVBlaDBLLURTVnVaOGd6dWVPNVB6WEpyM2R0VlBVSFEiLCJyZWNvdmVyeUNvbW1pdG1lbnQiOiJFaUJWTDFxX0xlaXJfekFGV0l0M2pCRlhOSG5DU2hPU0Z6Z21xb0dzS2hjQkFnIn19',
        '@context' : [
          'https://www.w3.org/ns/did/v1',
          {
            '@base': 'did:ion:EiDO7yuqY5ChgRW1BnsNlPlwcu2KQp_ZlroqbICLujPi7w:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiJOTEJYZTdQbUloREVuamdWTHllamp2UTRrNmxHNzlIa0xtRS16N0xRcWZBIiwicHVibGljS2V5SndrIjp7ImNydiI6IkVkMjU1MTkiLCJrdHkiOiJPS1AiLCJ4IjoiaHBlYkRpYk82dDRUOVBybEZGU0NMUFQyYlhwMFRTY1VobzFvRk81bGRGcyJ9LCJwdXJwb3NlcyI6WyJhdXRoZW50aWNhdGlvbiIsImFzc2VydGlvbk1ldGhvZCJdLCJ0eXBlIjoiSnNvbldlYktleTIwMjAifV0sInNlcnZpY2VzIjpbeyJpZCI6ImR3biIsInNlcnZpY2VFbmRwb2ludCI6Imh0dHBzOi8vZXhhbXBsZS5jb20vZHduIiwidHlwZSI6IkRlY2VudHJhbGl6ZWRXZWJOb2RlIn1dfX1dLCJ1cGRhdGVDb21taXRtZW50IjoiRWlDQ3cxcVYwYVk1Y2oydzNyQlhCWWVzOFRPN21aUHl3VzJZTXFTdHM3ZEVOdyJ9LCJzdWZmaXhEYXRhIjp7ImRlbHRhSGFzaCI6IkVpQzhfN3VIcXpra2FBSVBlaDBLLURTVnVaOGd6dWVPNVB6WEpyM2R0VlBVSFEiLCJyZWNvdmVyeUNvbW1pdG1lbnQiOiJFaUJWTDFxX0xlaXJfekFGV0l0M2pCRlhOSG5DU2hPU0Z6Z21xb0dzS2hjQkFnIn19',
          },
        ],
        service: [
          {
            id              : '#dwn',
            type            : 'DecentralizedWebNode',
            serviceEndpoint : 'https://example.com/dwn',
          },
        ],
        verificationMethod: [
          {
            id           : '#NLBXe7PmIhDEnjgVLyejjvQ4k6lG79HkLmE-z7LQqfA',
            controller   : 'did:ion:EiDO7yuqY5ChgRW1BnsNlPlwcu2KQp_ZlroqbICLujPi7w:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiJOTEJYZTdQbUloREVuamdWTHllamp2UTRrNmxHNzlIa0xtRS16N0xRcWZBIiwicHVibGljS2V5SndrIjp7ImNydiI6IkVkMjU1MTkiLCJrdHkiOiJPS1AiLCJ4IjoiaHBlYkRpYk82dDRUOVBybEZGU0NMUFQyYlhwMFRTY1VobzFvRk81bGRGcyJ9LCJwdXJwb3NlcyI6WyJhdXRoZW50aWNhdGlvbiIsImFzc2VydGlvbk1ldGhvZCJdLCJ0eXBlIjoiSnNvbldlYktleTIwMjAifV0sInNlcnZpY2VzIjpbeyJpZCI6ImR3biIsInNlcnZpY2VFbmRwb2ludCI6Imh0dHBzOi8vZXhhbXBsZS5jb20vZHduIiwidHlwZSI6IkRlY2VudHJhbGl6ZWRXZWJOb2RlIn1dfX1dLCJ1cGRhdGVDb21taXRtZW50IjoiRWlDQ3cxcVYwYVk1Y2oydzNyQlhCWWVzOFRPN21aUHl3VzJZTXFTdHM3ZEVOdyJ9LCJzdWZmaXhEYXRhIjp7ImRlbHRhSGFzaCI6IkVpQzhfN3VIcXpra2FBSVBlaDBLLURTVnVaOGd6dWVPNVB6WEpyM2R0VlBVSFEiLCJyZWNvdmVyeUNvbW1pdG1lbnQiOiJFaUJWTDFxX0xlaXJfekFGV0l0M2pCRlhOSG5DU2hPU0Z6Z21xb0dzS2hjQkFnIn19',
            type         : 'JsonWebKey2020',
            publicKeyJwk : {
              crv : 'Ed25519',
              kty : 'OKP',
              x   : 'hpebDibO6t4T9PrlFFSCLPT2bXp0TScUho1oFO5ldFs',
            },
          },
        ],
        authentication: [
          '#NLBXe7PmIhDEnjgVLyejjvQ4k6lG79HkLmE-z7LQqfA',
        ],
        assertionMethod: [
          '#NLBXe7PmIhDEnjgVLyejjvQ4k6lG79HkLmE-z7LQqfA',
        ],
      },
      didDocumentMetadata: {
        method: {
          published          : false,
          recoveryCommitment : 'EiBVL1q_Leir_zAFWIt3jBFXNHnCShOSFzgmqoGsKhcBAg',
          updateCommitment   : 'EiCCw1qV0aY5cj2w3rBXBYes8TO7mZPywW2YMqSts7dENw',
        },
        equivalentId: [
          'did:ion:EiDO7yuqY5ChgRW1BnsNlPlwcu2KQp_ZlroqbICLujPi7w',
        ],
      },
      didResolutionMetadata: {}
    }
  },

  oneMethodTwoServices: {
    didUri     : 'did:ion:EiCBB3nlRtUcqBY8-vm3WLP12elafIJIbXeVh6CBjeAV8Q:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiJoZENsb0lmQWM5TWpDYlhQTVF3RThOajREQzBPWDlqQUNuLVNsa2hldzU4IiwicHVibGljS2V5SndrIjp7ImNydiI6IkVkMjU1MTkiLCJrdHkiOiJPS1AiLCJ4IjoiZjN5SUxDNmd0dHRlTDAyZG5rVTBoT0FNbHV5V0dnRjJKcFpfUUV6bmM5QSJ9LCJwdXJwb3NlcyI6WyJhdXRoZW50aWNhdGlvbiIsImFzc2VydGlvbk1ldGhvZCJdLCJ0eXBlIjoiSnNvbldlYktleTIwMjAifV0sInNlcnZpY2VzIjpbeyJpZCI6ImR3biIsInNlcnZpY2VFbmRwb2ludCI6Imh0dHBzOi8vZXhhbXBsZS5jb20vZHduIiwidHlwZSI6IkRlY2VudHJhbGl6ZWRXZWJOb2RlIn0seyJpZCI6Im9pZDR2Y2kiLCJzZXJ2aWNlRW5kcG9pbnQiOiJodHRwczovL2lzc3Vlci5leGFtcGxlLmNvbSIsInR5cGUiOiJPSUQ0VkNJIn1dfX1dLCJ1cGRhdGVDb21taXRtZW50IjoiRWlCLS1HU0I1TXVFWUFPVE5MZHZoVFpTbkE0SVc2NHZOc2VlS09PUmd6TU1OUSJ9LCJzdWZmaXhEYXRhIjp7ImRlbHRhSGFzaCI6IkVpQXVuN3F1QUF0d3lCQWJXNk54SG5rbTZhXzJWNDhfMGRnTW9fMWpvSmRzT0EiLCJyZWNvdmVyeUNvbW1pdG1lbnQiOiJFaUFjWGlFTi0tVGdzWVdwaWt0NjFmeHNlVzZpTHVMOFp4d2RmYjRNVzNES2RBIn19',
    privateKey : [
      {
        crv : 'Ed25519',
        d   : 'ADvv3DFjfZsezjo5W20UxUWUzVmUAwTI7HZg96l4rrY',
        kty : 'OKP',
        x   : 'f3yILC6gttteL02dnkU0hOAMluyWGgF2JpZ_QEznc9A',
        kid : 'hdCloIfAc9MjCbXPMQwE8Nj4DC0OX9jACn-Slkhew58',
        alg : 'EdDSA',
      }
    ],
    didResolutionResult: {
      didDocument: {
        id         : 'did:ion:EiCBB3nlRtUcqBY8-vm3WLP12elafIJIbXeVh6CBjeAV8Q:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiJoZENsb0lmQWM5TWpDYlhQTVF3RThOajREQzBPWDlqQUNuLVNsa2hldzU4IiwicHVibGljS2V5SndrIjp7ImNydiI6IkVkMjU1MTkiLCJrdHkiOiJPS1AiLCJ4IjoiZjN5SUxDNmd0dHRlTDAyZG5rVTBoT0FNbHV5V0dnRjJKcFpfUUV6bmM5QSJ9LCJwdXJwb3NlcyI6WyJhdXRoZW50aWNhdGlvbiIsImFzc2VydGlvbk1ldGhvZCJdLCJ0eXBlIjoiSnNvbldlYktleTIwMjAifV0sInNlcnZpY2VzIjpbeyJpZCI6ImR3biIsInNlcnZpY2VFbmRwb2ludCI6Imh0dHBzOi8vZXhhbXBsZS5jb20vZHduIiwidHlwZSI6IkRlY2VudHJhbGl6ZWRXZWJOb2RlIn0seyJpZCI6Im9pZDR2Y2kiLCJzZXJ2aWNlRW5kcG9pbnQiOiJodHRwczovL2lzc3Vlci5leGFtcGxlLmNvbSIsInR5cGUiOiJPSUQ0VkNJIn1dfX1dLCJ1cGRhdGVDb21taXRtZW50IjoiRWlCLS1HU0I1TXVFWUFPVE5MZHZoVFpTbkE0SVc2NHZOc2VlS09PUmd6TU1OUSJ9LCJzdWZmaXhEYXRhIjp7ImRlbHRhSGFzaCI6IkVpQXVuN3F1QUF0d3lCQWJXNk54SG5rbTZhXzJWNDhfMGRnTW9fMWpvSmRzT0EiLCJyZWNvdmVyeUNvbW1pdG1lbnQiOiJFaUFjWGlFTi0tVGdzWVdwaWt0NjFmeHNlVzZpTHVMOFp4d2RmYjRNVzNES2RBIn19',
        '@context' : [
          'https://www.w3.org/ns/did/v1',
          {
            '@base': 'did:ion:EiCBB3nlRtUcqBY8-vm3WLP12elafIJIbXeVh6CBjeAV8Q:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiJoZENsb0lmQWM5TWpDYlhQTVF3RThOajREQzBPWDlqQUNuLVNsa2hldzU4IiwicHVibGljS2V5SndrIjp7ImNydiI6IkVkMjU1MTkiLCJrdHkiOiJPS1AiLCJ4IjoiZjN5SUxDNmd0dHRlTDAyZG5rVTBoT0FNbHV5V0dnRjJKcFpfUUV6bmM5QSJ9LCJwdXJwb3NlcyI6WyJhdXRoZW50aWNhdGlvbiIsImFzc2VydGlvbk1ldGhvZCJdLCJ0eXBlIjoiSnNvbldlYktleTIwMjAifV0sInNlcnZpY2VzIjpbeyJpZCI6ImR3biIsInNlcnZpY2VFbmRwb2ludCI6Imh0dHBzOi8vZXhhbXBsZS5jb20vZHduIiwidHlwZSI6IkRlY2VudHJhbGl6ZWRXZWJOb2RlIn0seyJpZCI6Im9pZDR2Y2kiLCJzZXJ2aWNlRW5kcG9pbnQiOiJodHRwczovL2lzc3Vlci5leGFtcGxlLmNvbSIsInR5cGUiOiJPSUQ0VkNJIn1dfX1dLCJ1cGRhdGVDb21taXRtZW50IjoiRWlCLS1HU0I1TXVFWUFPVE5MZHZoVFpTbkE0SVc2NHZOc2VlS09PUmd6TU1OUSJ9LCJzdWZmaXhEYXRhIjp7ImRlbHRhSGFzaCI6IkVpQXVuN3F1QUF0d3lCQWJXNk54SG5rbTZhXzJWNDhfMGRnTW9fMWpvSmRzT0EiLCJyZWNvdmVyeUNvbW1pdG1lbnQiOiJFaUFjWGlFTi0tVGdzWVdwaWt0NjFmeHNlVzZpTHVMOFp4d2RmYjRNVzNES2RBIn19',
          },
        ],
        service: [
          {
            id              : '#dwn',
            type            : 'DecentralizedWebNode',
            serviceEndpoint : 'https://example.com/dwn',
          },
          {
            id              : '#oid4vci',
            type            : 'OID4VCI',
            serviceEndpoint : 'https://issuer.example.com',
          },
        ],
        verificationMethod: [
          {
            id           : '#hdCloIfAc9MjCbXPMQwE8Nj4DC0OX9jACn-Slkhew58',
            controller   : 'did:ion:EiCBB3nlRtUcqBY8-vm3WLP12elafIJIbXeVh6CBjeAV8Q:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiJoZENsb0lmQWM5TWpDYlhQTVF3RThOajREQzBPWDlqQUNuLVNsa2hldzU4IiwicHVibGljS2V5SndrIjp7ImNydiI6IkVkMjU1MTkiLCJrdHkiOiJPS1AiLCJ4IjoiZjN5SUxDNmd0dHRlTDAyZG5rVTBoT0FNbHV5V0dnRjJKcFpfUUV6bmM5QSJ9LCJwdXJwb3NlcyI6WyJhdXRoZW50aWNhdGlvbiIsImFzc2VydGlvbk1ldGhvZCJdLCJ0eXBlIjoiSnNvbldlYktleTIwMjAifV0sInNlcnZpY2VzIjpbeyJpZCI6ImR3biIsInNlcnZpY2VFbmRwb2ludCI6Imh0dHBzOi8vZXhhbXBsZS5jb20vZHduIiwidHlwZSI6IkRlY2VudHJhbGl6ZWRXZWJOb2RlIn0seyJpZCI6Im9pZDR2Y2kiLCJzZXJ2aWNlRW5kcG9pbnQiOiJodHRwczovL2lzc3Vlci5leGFtcGxlLmNvbSIsInR5cGUiOiJPSUQ0VkNJIn1dfX1dLCJ1cGRhdGVDb21taXRtZW50IjoiRWlCLS1HU0I1TXVFWUFPVE5MZHZoVFpTbkE0SVc2NHZOc2VlS09PUmd6TU1OUSJ9LCJzdWZmaXhEYXRhIjp7ImRlbHRhSGFzaCI6IkVpQXVuN3F1QUF0d3lCQWJXNk54SG5rbTZhXzJWNDhfMGRnTW9fMWpvSmRzT0EiLCJyZWNvdmVyeUNvbW1pdG1lbnQiOiJFaUFjWGlFTi0tVGdzWVdwaWt0NjFmeHNlVzZpTHVMOFp4d2RmYjRNVzNES2RBIn19',
            type         : 'JsonWebKey2020',
            publicKeyJwk : {
              crv : 'Ed25519',
              kty : 'OKP',
              x   : 'f3yILC6gttteL02dnkU0hOAMluyWGgF2JpZ_QEznc9A',
            },
          },
        ],
        authentication: [
          '#hdCloIfAc9MjCbXPMQwE8Nj4DC0OX9jACn-Slkhew58',
        ],
        assertionMethod: [
          '#hdCloIfAc9MjCbXPMQwE8Nj4DC0OX9jACn-Slkhew58',
        ],
      },
      didDocumentMetadata: {
        method: {
          published          : false,
          recoveryCommitment : 'EiAcXiEN--TgsYWpikt61fxseW6iLuL8Zxwdfb4MW3DKdA',
          updateCommitment   : 'EiB--GSB5MuEYAOTNLdvhTZSnA4IW64vNseeKOORgzMMNQ',
        },
        equivalentId: [
          'did:ion:EiCBB3nlRtUcqBY8-vm3WLP12elafIJIbXeVh6CBjeAV8Q',
        ],
      },
      didResolutionMetadata: {}
    }
  },

  oneMethodCustomId: {
    didUri     : 'did:ion:EiDZjHxyHf-0llvciVAXm7BtYUIImm8WsDP2Wbfp737PvA:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiIxIiwicHVibGljS2V5SndrIjp7ImNydiI6IkVkMjU1MTkiLCJrdHkiOiJPS1AiLCJ4IjoiaVV6SE8wMXlkYVk0Rmt5bjlmcDNYNWQ5cDR5TGtKaHJEcGpOU0VrcEVUZyJ9LCJwdXJwb3NlcyI6WyJhdXRoZW50aWNhdGlvbiIsImFzc2VydGlvbk1ldGhvZCJdLCJ0eXBlIjoiSnNvbldlYktleTIwMjAifV0sInNlcnZpY2VzIjpbXX19XSwidXBkYXRlQ29tbWl0bWVudCI6IkVpRGhoZDdCUkd3UmRReU05d1FOQlBHNVVtS3FGMmRaZFFaS3V6ekRtMFlSUmcifSwic3VmZml4RGF0YSI6eyJkZWx0YUhhc2giOiJFaUF3QUVNcTJGXzlIUDMwbkp6Rmp0V1NQMC10RlVwMHcxYzh4SG9NR2ZIY1JRIiwicmVjb3ZlcnlDb21taXRtZW50IjoiRWlERWJJQ1N6QU92ZWF1SVhMY1JpNURqbFpIRlhEaXQzRWNrT3FadWZRMUFTUSJ9fQ',
    privateKey : [
      {
        crv : 'Ed25519',
        d   : 'X0JFysSWp4eFAv9fk4ah8qVg3ClFNSiCy_Mdawz9ibo',
        kty : 'OKP',
        x   : 'iUzHO01ydaY4Fkyn9fp3X5d9p4yLkJhrDpjNSEkpETg',
        kid : 'HtE0w2iPtJOf4X3tOMci6FxidN5gsUDId_gIQ7X3iWU',
        alg : 'EdDSA',
      }
    ],
    didResolutionResult: {
      didDocument: {
        id         : 'did:ion:EiDZjHxyHf-0llvciVAXm7BtYUIImm8WsDP2Wbfp737PvA:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiIxIiwicHVibGljS2V5SndrIjp7ImNydiI6IkVkMjU1MTkiLCJrdHkiOiJPS1AiLCJ4IjoiaVV6SE8wMXlkYVk0Rmt5bjlmcDNYNWQ5cDR5TGtKaHJEcGpOU0VrcEVUZyJ9LCJwdXJwb3NlcyI6WyJhdXRoZW50aWNhdGlvbiIsImFzc2VydGlvbk1ldGhvZCJdLCJ0eXBlIjoiSnNvbldlYktleTIwMjAifV0sInNlcnZpY2VzIjpbXX19XSwidXBkYXRlQ29tbWl0bWVudCI6IkVpRGhoZDdCUkd3UmRReU05d1FOQlBHNVVtS3FGMmRaZFFaS3V6ekRtMFlSUmcifSwic3VmZml4RGF0YSI6eyJkZWx0YUhhc2giOiJFaUF3QUVNcTJGXzlIUDMwbkp6Rmp0V1NQMC10RlVwMHcxYzh4SG9NR2ZIY1JRIiwicmVjb3ZlcnlDb21taXRtZW50IjoiRWlERWJJQ1N6QU92ZWF1SVhMY1JpNURqbFpIRlhEaXQzRWNrT3FadWZRMUFTUSJ9fQ',
        '@context' : [
          'https://www.w3.org/ns/did/v1',
          {
            '@base': 'did:ion:EiDZjHxyHf-0llvciVAXm7BtYUIImm8WsDP2Wbfp737PvA:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiIxIiwicHVibGljS2V5SndrIjp7ImNydiI6IkVkMjU1MTkiLCJrdHkiOiJPS1AiLCJ4IjoiaVV6SE8wMXlkYVk0Rmt5bjlmcDNYNWQ5cDR5TGtKaHJEcGpOU0VrcEVUZyJ9LCJwdXJwb3NlcyI6WyJhdXRoZW50aWNhdGlvbiIsImFzc2VydGlvbk1ldGhvZCJdLCJ0eXBlIjoiSnNvbldlYktleTIwMjAifV0sInNlcnZpY2VzIjpbXX19XSwidXBkYXRlQ29tbWl0bWVudCI6IkVpRGhoZDdCUkd3UmRReU05d1FOQlBHNVVtS3FGMmRaZFFaS3V6ekRtMFlSUmcifSwic3VmZml4RGF0YSI6eyJkZWx0YUhhc2giOiJFaUF3QUVNcTJGXzlIUDMwbkp6Rmp0V1NQMC10RlVwMHcxYzh4SG9NR2ZIY1JRIiwicmVjb3ZlcnlDb21taXRtZW50IjoiRWlERWJJQ1N6QU92ZWF1SVhMY1JpNURqbFpIRlhEaXQzRWNrT3FadWZRMUFTUSJ9fQ',
          },
        ],
        service: [
        ],
        verificationMethod: [
          {
            id           : '#1',
            controller   : 'did:ion:EiDZjHxyHf-0llvciVAXm7BtYUIImm8WsDP2Wbfp737PvA:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiIxIiwicHVibGljS2V5SndrIjp7ImNydiI6IkVkMjU1MTkiLCJrdHkiOiJPS1AiLCJ4IjoiaVV6SE8wMXlkYVk0Rmt5bjlmcDNYNWQ5cDR5TGtKaHJEcGpOU0VrcEVUZyJ9LCJwdXJwb3NlcyI6WyJhdXRoZW50aWNhdGlvbiIsImFzc2VydGlvbk1ldGhvZCJdLCJ0eXBlIjoiSnNvbldlYktleTIwMjAifV0sInNlcnZpY2VzIjpbXX19XSwidXBkYXRlQ29tbWl0bWVudCI6IkVpRGhoZDdCUkd3UmRReU05d1FOQlBHNVVtS3FGMmRaZFFaS3V6ekRtMFlSUmcifSwic3VmZml4RGF0YSI6eyJkZWx0YUhhc2giOiJFaUF3QUVNcTJGXzlIUDMwbkp6Rmp0V1NQMC10RlVwMHcxYzh4SG9NR2ZIY1JRIiwicmVjb3ZlcnlDb21taXRtZW50IjoiRWlERWJJQ1N6QU92ZWF1SVhMY1JpNURqbFpIRlhEaXQzRWNrT3FadWZRMUFTUSJ9fQ',
            type         : 'JsonWebKey2020',
            publicKeyJwk : {
              crv : 'Ed25519',
              kty : 'OKP',
              x   : 'iUzHO01ydaY4Fkyn9fp3X5d9p4yLkJhrDpjNSEkpETg',
            },
          },
        ],
        authentication: [
          '#1',
        ],
        assertionMethod: [
          '#1',
        ],
      },
      didDocumentMetadata: {
        method: {
          published          : false,
          recoveryCommitment : 'EiDEbICSzAOveauIXLcRi5DjlZHFXDit3EckOqZufQ1ASQ',
          updateCommitment   : 'EiDhhd7BRGwRdQyM9wQNBPG5UmKqF2dZdQZKuzzDm0YRRg',
        },
        equivalentId: [
          'did:ion:EiDZjHxyHf-0llvciVAXm7BtYUIImm8WsDP2Wbfp737PvA',
        ],
      },
      didResolutionMetadata: {}
    }
  },

  dwnService: {
    didUri     : 'did:ion:EiB9tsHcL4lXyGIZ71yZFoYl7FOUYpfUU0OHu0Auf2-AXg:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiJzaWciLCJwdWJsaWNLZXlKd2siOnsiY3J2IjoiRWQyNTUxOSIsImt0eSI6Ik9LUCIsIngiOiJyOXVGMjRDYVZyZjhtLS1odkRsejEzX1otTWU1Q3VMaVNOUzE5bUM2SnVNIn0sInB1cnBvc2VzIjpbImF1dGhlbnRpY2F0aW9uIiwiYXNzZXJ0aW9uTWV0aG9kIl0sInR5cGUiOiJKc29uV2ViS2V5MjAyMCJ9LHsiaWQiOiJlbmMiLCJwdWJsaWNLZXlKd2siOnsiY3J2Ijoic2VjcDI1NmsxIiwia3R5IjoiRUMiLCJ4IjoiRGtBWlB4OEJUTzFjNHQ4ZHQzN0Y1VldWdTNxd19tTnNReVVMaEo0a056dyIsInkiOiJUMm9INFhJRk53SmR3UmlDRURSX1VIckxRX3AxY3FHRzBHbnpoLVNONjJ3In0sInB1cnBvc2VzIjpbImtleUFncmVlbWVudCJdLCJ0eXBlIjoiSnNvbldlYktleTIwMjAifV0sInNlcnZpY2VzIjpbeyJpZCI6ImR3biIsInNlcnZpY2VFbmRwb2ludCI6eyJlbmNyeXB0aW9uS2V5cyI6WyIjZW5jIl0sIm5vZGVzIjpbImh0dHBzOi8vZXhhbXBsZS5jb20vZHduMCIsImh0dHBzOi8vZXhhbXBsZS5jb20vZHduMSJdLCJzaWduaW5nS2V5cyI6WyIjc2lnIl19LCJ0eXBlIjoiRGVjZW50cmFsaXplZFdlYk5vZGUifV19fV0sInVwZGF0ZUNvbW1pdG1lbnQiOiJFaURHdVJGOUVJS1RLWFEzeUk5T3h4UVBZZXBwVElwMUdLaFNwdDhsT0YzcW1BIn0sInN1ZmZpeERhdGEiOnsiZGVsdGFIYXNoIjoiRWlDb3F3TDF1NFRCM1RUQ09vb0lySnlJbGw0ZkNTcUFGZlBnWUM2NmlwSUVfUSIsInJlY292ZXJ5Q29tbWl0bWVudCI6IkVpQ3MtaE5oajVxc3pWNVFPUXVuYkk2azdvTkdUZ0c1b2ZpTGcxR0RYb3p3VXcifX0',
    privateKey : [
      {
        crv : 'Ed25519',
        d   : 'ViSHL7fNc4IbltHb3wCGkxmXCL9DzVV9WL0NLvlMcAo',
        kty : 'OKP',
        x   : 'r9uF24CaVrf8m--hvDlz13_Z-Me5CuLiSNS19mC6JuM',
        kid : 'PRbAT8qKgVnVEaqqy5XOON5iu7EZIdKOBW1aG62J9GE',
        alg : 'EdDSA',
      },
      {
        kty : 'EC',
        crv : 'secp256k1',
        d   : 'VkaWP07BcUfcTKiK47l1WBYEq5QzakPcD4d1KCqWi_U',
        x   : 'DkAZPx8BTO1c4t8dt37F5VWVu3qw_mNsQyULhJ4kNzw',
        y   : 'T2oH4XIFNwJdwRiCEDR_UHrLQ_p1cqGG0Gnzh-SN62w',
        kid : 'q514UkY8uFn9BeYykg2YyDMzewX2SQ1Gkqu-ceVpYOM',
        alg : 'ES256K',
      }
    ],
    didResolutionResult: {
      didDocument: {
        id         : 'did:ion:EiB9tsHcL4lXyGIZ71yZFoYl7FOUYpfUU0OHu0Auf2-AXg:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiJzaWciLCJwdWJsaWNLZXlKd2siOnsiY3J2IjoiRWQyNTUxOSIsImt0eSI6Ik9LUCIsIngiOiJyOXVGMjRDYVZyZjhtLS1odkRsejEzX1otTWU1Q3VMaVNOUzE5bUM2SnVNIn0sInB1cnBvc2VzIjpbImF1dGhlbnRpY2F0aW9uIiwiYXNzZXJ0aW9uTWV0aG9kIl0sInR5cGUiOiJKc29uV2ViS2V5MjAyMCJ9LHsiaWQiOiJlbmMiLCJwdWJsaWNLZXlKd2siOnsiY3J2Ijoic2VjcDI1NmsxIiwia3R5IjoiRUMiLCJ4IjoiRGtBWlB4OEJUTzFjNHQ4ZHQzN0Y1VldWdTNxd19tTnNReVVMaEo0a056dyIsInkiOiJUMm9INFhJRk53SmR3UmlDRURSX1VIckxRX3AxY3FHRzBHbnpoLVNONjJ3In0sInB1cnBvc2VzIjpbImtleUFncmVlbWVudCJdLCJ0eXBlIjoiSnNvbldlYktleTIwMjAifV0sInNlcnZpY2VzIjpbeyJpZCI6ImR3biIsInNlcnZpY2VFbmRwb2ludCI6eyJlbmNyeXB0aW9uS2V5cyI6WyIjZW5jIl0sIm5vZGVzIjpbImh0dHBzOi8vZXhhbXBsZS5jb20vZHduMCIsImh0dHBzOi8vZXhhbXBsZS5jb20vZHduMSJdLCJzaWduaW5nS2V5cyI6WyIjc2lnIl19LCJ0eXBlIjoiRGVjZW50cmFsaXplZFdlYk5vZGUifV19fV0sInVwZGF0ZUNvbW1pdG1lbnQiOiJFaURHdVJGOUVJS1RLWFEzeUk5T3h4UVBZZXBwVElwMUdLaFNwdDhsT0YzcW1BIn0sInN1ZmZpeERhdGEiOnsiZGVsdGFIYXNoIjoiRWlDb3F3TDF1NFRCM1RUQ09vb0lySnlJbGw0ZkNTcUFGZlBnWUM2NmlwSUVfUSIsInJlY292ZXJ5Q29tbWl0bWVudCI6IkVpQ3MtaE5oajVxc3pWNVFPUXVuYkk2azdvTkdUZ0c1b2ZpTGcxR0RYb3p3VXcifX0',
        '@context' : [
          'https://www.w3.org/ns/did/v1',
          {
            '@base': 'did:ion:EiB9tsHcL4lXyGIZ71yZFoYl7FOUYpfUU0OHu0Auf2-AXg:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiJzaWciLCJwdWJsaWNLZXlKd2siOnsiY3J2IjoiRWQyNTUxOSIsImt0eSI6Ik9LUCIsIngiOiJyOXVGMjRDYVZyZjhtLS1odkRsejEzX1otTWU1Q3VMaVNOUzE5bUM2SnVNIn0sInB1cnBvc2VzIjpbImF1dGhlbnRpY2F0aW9uIiwiYXNzZXJ0aW9uTWV0aG9kIl0sInR5cGUiOiJKc29uV2ViS2V5MjAyMCJ9LHsiaWQiOiJlbmMiLCJwdWJsaWNLZXlKd2siOnsiY3J2Ijoic2VjcDI1NmsxIiwia3R5IjoiRUMiLCJ4IjoiRGtBWlB4OEJUTzFjNHQ4ZHQzN0Y1VldWdTNxd19tTnNReVVMaEo0a056dyIsInkiOiJUMm9INFhJRk53SmR3UmlDRURSX1VIckxRX3AxY3FHRzBHbnpoLVNONjJ3In0sInB1cnBvc2VzIjpbImtleUFncmVlbWVudCJdLCJ0eXBlIjoiSnNvbldlYktleTIwMjAifV0sInNlcnZpY2VzIjpbeyJpZCI6ImR3biIsInNlcnZpY2VFbmRwb2ludCI6eyJlbmNyeXB0aW9uS2V5cyI6WyIjZW5jIl0sIm5vZGVzIjpbImh0dHBzOi8vZXhhbXBsZS5jb20vZHduMCIsImh0dHBzOi8vZXhhbXBsZS5jb20vZHduMSJdLCJzaWduaW5nS2V5cyI6WyIjc2lnIl19LCJ0eXBlIjoiRGVjZW50cmFsaXplZFdlYk5vZGUifV19fV0sInVwZGF0ZUNvbW1pdG1lbnQiOiJFaURHdVJGOUVJS1RLWFEzeUk5T3h4UVBZZXBwVElwMUdLaFNwdDhsT0YzcW1BIn0sInN1ZmZpeERhdGEiOnsiZGVsdGFIYXNoIjoiRWlDb3F3TDF1NFRCM1RUQ09vb0lySnlJbGw0ZkNTcUFGZlBnWUM2NmlwSUVfUSIsInJlY292ZXJ5Q29tbWl0bWVudCI6IkVpQ3MtaE5oajVxc3pWNVFPUXVuYkk2azdvTkdUZ0c1b2ZpTGcxR0RYb3p3VXcifX0',
          },
        ],
        service: [
          {
            id              : '#dwn',
            type            : 'DecentralizedWebNode',
            serviceEndpoint : {
              encryptionKeys: [
                '#enc',
              ],
              nodes: [
                'https://example.com/dwn0',
                'https://example.com/dwn1',
              ],
              signingKeys: [
                '#sig',
              ],
            },
          },
        ],
        verificationMethod: [
          {
            id           : '#sig',
            controller   : 'did:ion:EiB9tsHcL4lXyGIZ71yZFoYl7FOUYpfUU0OHu0Auf2-AXg:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiJzaWciLCJwdWJsaWNLZXlKd2siOnsiY3J2IjoiRWQyNTUxOSIsImt0eSI6Ik9LUCIsIngiOiJyOXVGMjRDYVZyZjhtLS1odkRsejEzX1otTWU1Q3VMaVNOUzE5bUM2SnVNIn0sInB1cnBvc2VzIjpbImF1dGhlbnRpY2F0aW9uIiwiYXNzZXJ0aW9uTWV0aG9kIl0sInR5cGUiOiJKc29uV2ViS2V5MjAyMCJ9LHsiaWQiOiJlbmMiLCJwdWJsaWNLZXlKd2siOnsiY3J2Ijoic2VjcDI1NmsxIiwia3R5IjoiRUMiLCJ4IjoiRGtBWlB4OEJUTzFjNHQ4ZHQzN0Y1VldWdTNxd19tTnNReVVMaEo0a056dyIsInkiOiJUMm9INFhJRk53SmR3UmlDRURSX1VIckxRX3AxY3FHRzBHbnpoLVNONjJ3In0sInB1cnBvc2VzIjpbImtleUFncmVlbWVudCJdLCJ0eXBlIjoiSnNvbldlYktleTIwMjAifV0sInNlcnZpY2VzIjpbeyJpZCI6ImR3biIsInNlcnZpY2VFbmRwb2ludCI6eyJlbmNyeXB0aW9uS2V5cyI6WyIjZW5jIl0sIm5vZGVzIjpbImh0dHBzOi8vZXhhbXBsZS5jb20vZHduMCIsImh0dHBzOi8vZXhhbXBsZS5jb20vZHduMSJdLCJzaWduaW5nS2V5cyI6WyIjc2lnIl19LCJ0eXBlIjoiRGVjZW50cmFsaXplZFdlYk5vZGUifV19fV0sInVwZGF0ZUNvbW1pdG1lbnQiOiJFaURHdVJGOUVJS1RLWFEzeUk5T3h4UVBZZXBwVElwMUdLaFNwdDhsT0YzcW1BIn0sInN1ZmZpeERhdGEiOnsiZGVsdGFIYXNoIjoiRWlDb3F3TDF1NFRCM1RUQ09vb0lySnlJbGw0ZkNTcUFGZlBnWUM2NmlwSUVfUSIsInJlY292ZXJ5Q29tbWl0bWVudCI6IkVpQ3MtaE5oajVxc3pWNVFPUXVuYkk2azdvTkdUZ0c1b2ZpTGcxR0RYb3p3VXcifX0',
            type         : 'JsonWebKey2020',
            publicKeyJwk : {
              crv : 'Ed25519',
              kty : 'OKP',
              x   : 'r9uF24CaVrf8m--hvDlz13_Z-Me5CuLiSNS19mC6JuM',
            },
          },
          {
            id           : '#enc',
            controller   : 'did:ion:EiB9tsHcL4lXyGIZ71yZFoYl7FOUYpfUU0OHu0Auf2-AXg:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiJzaWciLCJwdWJsaWNLZXlKd2siOnsiY3J2IjoiRWQyNTUxOSIsImt0eSI6Ik9LUCIsIngiOiJyOXVGMjRDYVZyZjhtLS1odkRsejEzX1otTWU1Q3VMaVNOUzE5bUM2SnVNIn0sInB1cnBvc2VzIjpbImF1dGhlbnRpY2F0aW9uIiwiYXNzZXJ0aW9uTWV0aG9kIl0sInR5cGUiOiJKc29uV2ViS2V5MjAyMCJ9LHsiaWQiOiJlbmMiLCJwdWJsaWNLZXlKd2siOnsiY3J2Ijoic2VjcDI1NmsxIiwia3R5IjoiRUMiLCJ4IjoiRGtBWlB4OEJUTzFjNHQ4ZHQzN0Y1VldWdTNxd19tTnNReVVMaEo0a056dyIsInkiOiJUMm9INFhJRk53SmR3UmlDRURSX1VIckxRX3AxY3FHRzBHbnpoLVNONjJ3In0sInB1cnBvc2VzIjpbImtleUFncmVlbWVudCJdLCJ0eXBlIjoiSnNvbldlYktleTIwMjAifV0sInNlcnZpY2VzIjpbeyJpZCI6ImR3biIsInNlcnZpY2VFbmRwb2ludCI6eyJlbmNyeXB0aW9uS2V5cyI6WyIjZW5jIl0sIm5vZGVzIjpbImh0dHBzOi8vZXhhbXBsZS5jb20vZHduMCIsImh0dHBzOi8vZXhhbXBsZS5jb20vZHduMSJdLCJzaWduaW5nS2V5cyI6WyIjc2lnIl19LCJ0eXBlIjoiRGVjZW50cmFsaXplZFdlYk5vZGUifV19fV0sInVwZGF0ZUNvbW1pdG1lbnQiOiJFaURHdVJGOUVJS1RLWFEzeUk5T3h4UVBZZXBwVElwMUdLaFNwdDhsT0YzcW1BIn0sInN1ZmZpeERhdGEiOnsiZGVsdGFIYXNoIjoiRWlDb3F3TDF1NFRCM1RUQ09vb0lySnlJbGw0ZkNTcUFGZlBnWUM2NmlwSUVfUSIsInJlY292ZXJ5Q29tbWl0bWVudCI6IkVpQ3MtaE5oajVxc3pWNVFPUXVuYkk2azdvTkdUZ0c1b2ZpTGcxR0RYb3p3VXcifX0',
            type         : 'JsonWebKey2020',
            publicKeyJwk : {
              crv : 'secp256k1',
              kty : 'EC',
              x   : 'DkAZPx8BTO1c4t8dt37F5VWVu3qw_mNsQyULhJ4kNzw',
              y   : 'T2oH4XIFNwJdwRiCEDR_UHrLQ_p1cqGG0Gnzh-SN62w',
            },
          },
        ],
        authentication: [
          '#sig',
        ],
        assertionMethod: [
          '#sig',
        ],
        keyAgreement: [
          '#enc',
        ],
      },
      didDocumentMetadata: {
        method: {
          published          : false,
          recoveryCommitment : 'EiCs-hNhj5qszV5QOQunbI6k7oNGTgG5ofiLg1GDXozwUw',
          updateCommitment   : 'EiDGuRF9EIKTKXQ3yI9OxxQPYeppTIp1GKhSpt8lOF3qmA',
        },
        equivalentId: [
          'did:ion:EiB9tsHcL4lXyGIZ71yZFoYl7FOUYpfUU0OHu0Auf2-AXg',
        ],
      },
      didResolutionMetadata: {}
    }
  },
};