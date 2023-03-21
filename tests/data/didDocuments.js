export const ion = {
  noKeys: {
    didDocument: {
      id: 'did:ion:abcd1234',
    },
  },
  
  noServices: {
    didDocument: {
      id: 'did:ion:abcd1234',
    },
  },
  
  oneKey: {
    didDocument: {
      id: 'did:ion:EiDnouH_Q0pwfFJom6v1BLbVzKp9b6qSx6-Dbox6kD-vnA:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiJrZXktMSIsInB1YmxpY0tleUp3ayI6eyJjcnYiOiJzZWNwMjU2azEiLCJrdHkiOiJFQyIsIngiOiJ4c2ZFTi1iN0REdFBJTEpKTXhYeHlONVgwYmc1S011eFFwZjRVYnpFbE4wIiwieSI6Ik1DT3RMMmx3TkJfejQwX2hhYnBNcUxqRTVEMjNDUjJDS3JfNG5DRElCTEEifSwicHVycG9zZXMiOlsiYXV0aGVudGljYXRpb24iXSwidHlwZSI6Ikpzb25XZWJLZXkyMDIwIn1dLCJzZXJ2aWNlcyI6W3siaWQiOiJkd24iLCJzZXJ2aWNlRW5kcG9pbnQiOnsibm9kZXMiOlsiaHR0cDovL2xvY2FsaG9zdDo4MDg1L2R3biJdfSwidHlwZSI6IkRlY2VudHJhbGl6ZWRXZWJOb2RlIn1dfX1dLCJ1cGRhdGVDb21taXRtZW50IjoiRWlBc0Q0YVBnRlNKV25VNWExcGhpRnRTTHJZNF9uSnc5SnpFTWtNWjZab2VXQSJ9LCJzdWZmaXhEYXRhIjp7ImRlbHRhSGFzaCI6IkVpQTVuU2tPaWJ0blBjNHBnbVA4djZuRDdjc28zTzlsbE5oSjhoYTVwSVZxeHciLCJyZWNvdmVyeUNvbW1pdG1lbnQiOiJFaUJ3SFU2WEFsRkt0V3R6dk0wVmdHTlJVbHl4cFR5dlFBaEM0RFVyXzMzc2VnIn19',
      verificationMethod: [
        {
          id: '#someKeyId',
          controller: 'did:ion:EiClkZMDxPKqC9c-umQfTkR8vvZ9JPhl_xLDI9Nfk38w5w',
          type: 'EcdsaSecp256k1VerificationKey2019',
          publicKeyJwk: {
            kty: 'EC',
            crv: 'secp256k1',
            x: 'WfY7Px6AgH6x-_dgAoRbg8weYRJA36ON-gQiFnETrqw',
            y: 'IzFx3BUGztK0cyDStiunXbrZYYTtKbOUzx16SUK0sAY',
          },
        },
      ],
    },
  },
  
  oneService: {
    didDocument: {
      id: 'did:ion:EiDnouH_Q0pwfFJom6v1BLbVzKp9b6qSx6-Dbox6kD-vnA:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiJrZXktMSIsInB1YmxpY0tleUp3ayI6eyJjcnYiOiJzZWNwMjU2azEiLCJrdHkiOiJFQyIsIngiOiJ4c2ZFTi1iN0REdFBJTEpKTXhYeHlONVgwYmc1S011eFFwZjRVYnpFbE4wIiwieSI6Ik1DT3RMMmx3TkJfejQwX2hhYnBNcUxqRTVEMjNDUjJDS3JfNG5DRElCTEEifSwicHVycG9zZXMiOlsiYXV0aGVudGljYXRpb24iXSwidHlwZSI6Ikpzb25XZWJLZXkyMDIwIn1dLCJzZXJ2aWNlcyI6W3siaWQiOiJkd24iLCJzZXJ2aWNlRW5kcG9pbnQiOnsibm9kZXMiOlsiaHR0cDovL2xvY2FsaG9zdDo4MDg1L2R3biJdfSwidHlwZSI6IkRlY2VudHJhbGl6ZWRXZWJOb2RlIn1dfX1dLCJ1cGRhdGVDb21taXRtZW50IjoiRWlBc0Q0YVBnRlNKV25VNWExcGhpRnRTTHJZNF9uSnc5SnpFTWtNWjZab2VXQSJ9LCJzdWZmaXhEYXRhIjp7ImRlbHRhSGFzaCI6IkVpQTVuU2tPaWJ0blBjNHBnbVA4djZuRDdjc28zTzlsbE5oSjhoYTVwSVZxeHciLCJyZWNvdmVyeUNvbW1pdG1lbnQiOiJFaUJ3SFU2WEFsRkt0V3R6dk0wVmdHTlJVbHl4cFR5dlFBaEM0RFVyXzMzc2VnIn19',
      service: [
        {
          id: '#dwn',
          type: 'DecentralizedWebNode',
          serviceEndpoint: {
            nodes: ['http://localhost:8080/dwn'],
            origins: [],
          },
        },
      ],
    },
  },
};