export const ion = {
  notFound: {
    didDocument           : null,
    didDocumentMetadata   : {},
    didResolutionMetadata : {
      error: 'unable to resolve did:ion:invalid, got http status 404',
    },
  },

  noKeys: {
    didDocument: {
      '@context' : ['https://www.w3.org/ns/did/v1'],
      id         : 'did:ion:abcd1234',
    },
  },

  noServices: {
    didDocument: {
      '@context' : ['https://www.w3.org/ns/did/v1'],
      id         : 'did:ion:abcd1234',
    },
  },

  oneVerificationMethodJwk: {
    didDocument: {
      '@context'         : ['https://www.w3.org/ns/did/v1'],
      id                 : 'did:ion:EiDnouH_Q0pwfFJom6v1BLbVzKp9b6qSx6-Dbox6kD-vnA:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiJrZXktMSIsInB1YmxpY0tleUp3ayI6eyJjcnYiOiJzZWNwMjU2azEiLCJrdHkiOiJFQyIsIngiOiJ4c2ZFTi1iN0REdFBJTEpKTXhYeHlONVgwYmc1S011eFFwZjRVYnpFbE4wIiwieSI6Ik1DT3RMMmx3TkJfejQwX2hhYnBNcUxqRTVEMjNDUjJDS3JfNG5DRElCTEEifSwicHVycG9zZXMiOlsiYXV0aGVudGljYXRpb24iXSwidHlwZSI6Ikpzb25XZWJLZXkyMDIwIn1dLCJzZXJ2aWNlcyI6W3siaWQiOiJkd24iLCJzZXJ2aWNlRW5kcG9pbnQiOnsibm9kZXMiOlsiaHR0cDovL2xvY2FsaG9zdDo4MDg1L2R3biJdfSwidHlwZSI6IkRlY2VudHJhbGl6ZWRXZWJOb2RlIn1dfX1dLCJ1cGRhdGVDb21taXRtZW50IjoiRWlBc0Q0YVBnRlNKV25VNWExcGhpRnRTTHJZNF9uSnc5SnpFTWtNWjZab2VXQSJ9LCJzdWZmaXhEYXRhIjp7ImRlbHRhSGFzaCI6IkVpQTVuU2tPaWJ0blBjNHBnbVA4djZuRDdjc28zTzlsbE5oSjhoYTVwSVZxeHciLCJyZWNvdmVyeUNvbW1pdG1lbnQiOiJFaUJ3SFU2WEFsRkt0V3R6dk0wVmdHTlJVbHl4cFR5dlFBaEM0RFVyXzMzc2VnIn19',
      verificationMethod : [
        {
          id           : '#someKeyId',
          controller   : 'did:ion:EiClkZMDxPKqC9c-umQfTkR8vvZ9JPhl_xLDI9Nfk38w5w',
          type         : 'EcdsaSecp256k1VerificationKey2019',
          publicKeyJwk : {
            kty : 'EC',
            crv : 'secp256k1',
            x   : 'WfY7Px6AgH6x-_dgAoRbg8weYRJA36ON-gQiFnETrqw',
            y   : 'IzFx3BUGztK0cyDStiunXbrZYYTtKbOUzx16SUK0sAY',
          },
        },
      ],
    },
  },

  oneService: {
    didDocument: {
      '@context' : ['https://www.w3.org/ns/did/v1'],
      id         : 'did:ion:EiDnouH_Q0pwfFJom6v1BLbVzKp9b6qSx6-Dbox6kD-vnA:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiJrZXktMSIsInB1YmxpY0tleUp3ayI6eyJjcnYiOiJzZWNwMjU2azEiLCJrdHkiOiJFQyIsIngiOiJ4c2ZFTi1iN0REdFBJTEpKTXhYeHlONVgwYmc1S011eFFwZjRVYnpFbE4wIiwieSI6Ik1DT3RMMmx3TkJfejQwX2hhYnBNcUxqRTVEMjNDUjJDS3JfNG5DRElCTEEifSwicHVycG9zZXMiOlsiYXV0aGVudGljYXRpb24iXSwidHlwZSI6Ikpzb25XZWJLZXkyMDIwIn1dLCJzZXJ2aWNlcyI6W3siaWQiOiJkd24iLCJzZXJ2aWNlRW5kcG9pbnQiOnsibm9kZXMiOlsiaHR0cDovL2xvY2FsaG9zdDo4MDg1L2R3biJdfSwidHlwZSI6IkRlY2VudHJhbGl6ZWRXZWJOb2RlIn1dfX1dLCJ1cGRhdGVDb21taXRtZW50IjoiRWlBc0Q0YVBnRlNKV25VNWExcGhpRnRTTHJZNF9uSnc5SnpFTWtNWjZab2VXQSJ9LCJzdWZmaXhEYXRhIjp7ImRlbHRhSGFzaCI6IkVpQTVuU2tPaWJ0blBjNHBnbVA4djZuRDdjc28zTzlsbE5oSjhoYTVwSVZxeHciLCJyZWNvdmVyeUNvbW1pdG1lbnQiOiJFaUJ3SFU2WEFsRkt0V3R6dk0wVmdHTlJVbHl4cFR5dlFBaEM0RFVyXzMzc2VnIn19',
      service    : [
        {
          id              : '#dwn',
          type            : 'DecentralizedWebNode',
          serviceEndpoint : {
            nodes   : ['http://localhost:8080/dwn'],
            origins : [],
          },
        },
      ],
    },
  },

  dwnService: {
    twoAuthenticationReferencedKeysJwk: {
      didDocument: {
        '@context' : ['https://www.w3.org/ns/did/v1'],
        id         : 'did:ion:EiAp_JjfvetzRV033JTaIiBIzh7UxP0Q6bGosMuPpo_4xQ:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiJhdXRoeiIsInB1YmxpY0tleUp3ayI6eyJjcnYiOiJzZWNwMjU2azEiLCJrdHkiOiJFQyIsIngiOiJRMl9RSUR5NERxRHJ6SVFESDFnWmZyQlo5OHYtV2JQWXNoXzBJVWZzVGpRIiwieSI6IlVvNlNDTHNDeGFRVGlsa1dSeDZNUUY1TzByRS1qWnlwb2dtR01nb0NkY2cifSwicHVycG9zZXMiOlsiYXV0aGVudGljYXRpb24iXSwidHlwZSI6Ikpzb25XZWJLZXkyMDIwIn0seyJpZCI6ImVuYyIsInB1YmxpY0tleUp3ayI6eyJjcnYiOiJzZWNwMjU2azEiLCJrdHkiOiJFQyIsIngiOiJmU25ZWmVwa1NNWXhFRmFGM3Z4TWZIaWw3SWhxWTRKNkpkejdxUUNlRFI4IiwieSI6InVmNkNwZ1VCdWRyTkFCVmtUTExPRlE1SWFTQ3pFZGlUMkREYjVXdnRCcEEifSwicHVycG9zZXMiOlsia2V5QWdyZWVtZW50Il0sInR5cGUiOiJKc29uV2ViS2V5MjAyMCJ9XSwic2VydmljZXMiOlt7ImlkIjoiZHduIiwic2VydmljZUVuZHBvaW50Ijp7Im1lc3NhZ2VBdXRob3JpemF0aW9uS2V5cyI6WyIjYXV0aHoiXSwibm9kZXMiOlsiaHR0cHM6Ly9kd24taG9zdC5jb20iXSwicmVjb3JkRW5jcnlwdGlvbktleXMiOlsiI3dyb25nIl19LCJ0eXBlIjoiRGVjZW50cmFsaXplZFdlYk5vZGUifV19fV0sInVwZGF0ZUNvbW1pdG1lbnQiOiJFaUNiM2Y1bW4zaWl5S0lIZHVTZzJ4d2hDRURKejRKQ0tjT0JLYWNpNzN4dGt3In0sInN1ZmZpeERhdGEiOnsiZGVsdGFIYXNoIjoiRWlDZmVhTWNZRUhSRHdhb3BzbVE5aWxTWkQ3S3hXeHJScVVrUGRYa2c3VWh6QSIsInJlY292ZXJ5Q29tbWl0bWVudCI6IkVpQ3M5TXFQVng3X1NkZU5Lb2ZjaVF1WVdPcTc3MHJKSG1FeFpkMzFoZXpuREEifX0',
        service    : [
          {
            id              : '#dwn',
            type            : 'DecentralizedWebNode',
            serviceEndpoint : {
              messageAuthorizationKeys: [
                '#authz'
              ],
              nodes: [
                'https://dwn-host.com'
              ],
              recordEncryptionKeys: [
                '#enc'
              ]
            }
          }
        ],
        verificationMethod: [
          {
            id           : '#authz',
            controller   : 'did:ion:EiAp_JjfvetzRV033JTaIiBIzh7UxP0Q6bGosMuPpo_4xQ:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiJhdXRoeiIsInB1YmxpY0tleUp3ayI6eyJjcnYiOiJzZWNwMjU2azEiLCJrdHkiOiJFQyIsIngiOiJRMl9RSUR5NERxRHJ6SVFESDFnWmZyQlo5OHYtV2JQWXNoXzBJVWZzVGpRIiwieSI6IlVvNlNDTHNDeGFRVGlsa1dSeDZNUUY1TzByRS1qWnlwb2dtR01nb0NkY2cifSwicHVycG9zZXMiOlsiYXV0aGVudGljYXRpb24iXSwidHlwZSI6Ikpzb25XZWJLZXkyMDIwIn0seyJpZCI6ImVuYyIsInB1YmxpY0tleUp3ayI6eyJjcnYiOiJzZWNwMjU2azEiLCJrdHkiOiJFQyIsIngiOiJmU25ZWmVwa1NNWXhFRmFGM3Z4TWZIaWw3SWhxWTRKNkpkejdxUUNlRFI4IiwieSI6InVmNkNwZ1VCdWRyTkFCVmtUTExPRlE1SWFTQ3pFZGlUMkREYjVXdnRCcEEifSwicHVycG9zZXMiOlsia2V5QWdyZWVtZW50Il0sInR5cGUiOiJKc29uV2ViS2V5MjAyMCJ9XSwic2VydmljZXMiOlt7ImlkIjoiZHduIiwic2VydmljZUVuZHBvaW50Ijp7Im1lc3NhZ2VBdXRob3JpemF0aW9uS2V5cyI6WyIjYXV0aHoiXSwibm9kZXMiOlsiaHR0cHM6Ly9kd24taG9zdC5jb20iXSwicmVjb3JkRW5jcnlwdGlvbktleXMiOlsiI3dyb25nIl19LCJ0eXBlIjoiRGVjZW50cmFsaXplZFdlYk5vZGUifV19fV0sInVwZGF0ZUNvbW1pdG1lbnQiOiJFaUNiM2Y1bW4zaWl5S0lIZHVTZzJ4d2hDRURKejRKQ0tjT0JLYWNpNzN4dGt3In0sInN1ZmZpeERhdGEiOnsiZGVsdGFIYXNoIjoiRWlDZmVhTWNZRUhSRHdhb3BzbVE5aWxTWkQ3S3hXeHJScVVrUGRYa2c3VWh6QSIsInJlY292ZXJ5Q29tbWl0bWVudCI6IkVpQ3M5TXFQVng3X1NkZU5Lb2ZjaVF1WVdPcTc3MHJKSG1FeFpkMzFoZXpuREEifX0',
            type         : 'JsonWebKey2020',
            publicKeyJwk : {
              crv : 'secp256k1',
              kty : 'EC',
              x   : 'Q2_QIDy4DqDrzIQDH1gZfrBZ98v-WbPYsh_0IUfsTjQ',
              y   : 'Uo6SCLsCxaQTilkWRx6MQF5O0rE-jZypogmGMgoCdcg'
            }
          },
          {
            id           : '#enc',
            controller   : 'did:ion:EiAp_JjfvetzRV033JTaIiBIzh7UxP0Q6bGosMuPpo_4xQ:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiJhdXRoeiIsInB1YmxpY0tleUp3ayI6eyJjcnYiOiJzZWNwMjU2azEiLCJrdHkiOiJFQyIsIngiOiJRMl9RSUR5NERxRHJ6SVFESDFnWmZyQlo5OHYtV2JQWXNoXzBJVWZzVGpRIiwieSI6IlVvNlNDTHNDeGFRVGlsa1dSeDZNUUY1TzByRS1qWnlwb2dtR01nb0NkY2cifSwicHVycG9zZXMiOlsiYXV0aGVudGljYXRpb24iXSwidHlwZSI6Ikpzb25XZWJLZXkyMDIwIn0seyJpZCI6ImVuYyIsInB1YmxpY0tleUp3ayI6eyJjcnYiOiJzZWNwMjU2azEiLCJrdHkiOiJFQyIsIngiOiJmU25ZWmVwa1NNWXhFRmFGM3Z4TWZIaWw3SWhxWTRKNkpkejdxUUNlRFI4IiwieSI6InVmNkNwZ1VCdWRyTkFCVmtUTExPRlE1SWFTQ3pFZGlUMkREYjVXdnRCcEEifSwicHVycG9zZXMiOlsia2V5QWdyZWVtZW50Il0sInR5cGUiOiJKc29uV2ViS2V5MjAyMCJ9XSwic2VydmljZXMiOlt7ImlkIjoiZHduIiwic2VydmljZUVuZHBvaW50Ijp7Im1lc3NhZ2VBdXRob3JpemF0aW9uS2V5cyI6WyIjYXV0aHoiXSwibm9kZXMiOlsiaHR0cHM6Ly9kd24taG9zdC5jb20iXSwicmVjb3JkRW5jcnlwdGlvbktleXMiOlsiI3dyb25nIl19LCJ0eXBlIjoiRGVjZW50cmFsaXplZFdlYk5vZGUifV19fV0sInVwZGF0ZUNvbW1pdG1lbnQiOiJFaUNiM2Y1bW4zaWl5S0lIZHVTZzJ4d2hDRURKejRKQ0tjT0JLYWNpNzN4dGt3In0sInN1ZmZpeERhdGEiOnsiZGVsdGFIYXNoIjoiRWlDZmVhTWNZRUhSRHdhb3BzbVE5aWxTWkQ3S3hXeHJScVVrUGRYa2c3VWh6QSIsInJlY292ZXJ5Q29tbWl0bWVudCI6IkVpQ3M5TXFQVng3X1NkZU5Lb2ZjaVF1WVdPcTc3MHJKSG1FeFpkMzFoZXpuREEifX0',
            type         : 'JsonWebKey2020',
            publicKeyJwk : {
              crv : 'secp256k1',
              kty : 'EC',
              x   : 'fSnYZepkSMYxEFaF3vxMfHil7IhqY4J6Jdz7qQCeDR8',
              y   : 'uf6CpgUBudrNABVkTLLOFQ5IaSCzEdiT2DDb5WvtBpA'
            }
          }
        ],
        authentication: [
          '#authz'
        ],
        keyAgreement: [
          '#enc'
        ]
      }
    },

    twoAuthenticationReferencedKeysJwkKeyIdMismatch: {
      didDocument: {
        '@context' : ['https://www.w3.org/ns/did/v1'],
        id         : 'did:ion:EiAp_JjfvetzRV033JTaIiBIzh7UxP0Q6bGosMuPpo_4xQ:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiJhdXRoeiIsInB1YmxpY0tleUp3ayI6eyJjcnYiOiJzZWNwMjU2azEiLCJrdHkiOiJFQyIsIngiOiJRMl9RSUR5NERxRHJ6SVFESDFnWmZyQlo5OHYtV2JQWXNoXzBJVWZzVGpRIiwieSI6IlVvNlNDTHNDeGFRVGlsa1dSeDZNUUY1TzByRS1qWnlwb2dtR01nb0NkY2cifSwicHVycG9zZXMiOlsiYXV0aGVudGljYXRpb24iXSwidHlwZSI6Ikpzb25XZWJLZXkyMDIwIn0seyJpZCI6ImVuYyIsInB1YmxpY0tleUp3ayI6eyJjcnYiOiJzZWNwMjU2azEiLCJrdHkiOiJFQyIsIngiOiJmU25ZWmVwa1NNWXhFRmFGM3Z4TWZIaWw3SWhxWTRKNkpkejdxUUNlRFI4IiwieSI6InVmNkNwZ1VCdWRyTkFCVmtUTExPRlE1SWFTQ3pFZGlUMkREYjVXdnRCcEEifSwicHVycG9zZXMiOlsia2V5QWdyZWVtZW50Il0sInR5cGUiOiJKc29uV2ViS2V5MjAyMCJ9XSwic2VydmljZXMiOlt7ImlkIjoiZHduIiwic2VydmljZUVuZHBvaW50Ijp7Im1lc3NhZ2VBdXRob3JpemF0aW9uS2V5cyI6WyIjYXV0aHoiXSwibm9kZXMiOlsiaHR0cHM6Ly9kd24taG9zdC5jb20iXSwicmVjb3JkRW5jcnlwdGlvbktleXMiOlsiI3dyb25nIl19LCJ0eXBlIjoiRGVjZW50cmFsaXplZFdlYk5vZGUifV19fV0sInVwZGF0ZUNvbW1pdG1lbnQiOiJFaUNiM2Y1bW4zaWl5S0lIZHVTZzJ4d2hDRURKejRKQ0tjT0JLYWNpNzN4dGt3In0sInN1ZmZpeERhdGEiOnsiZGVsdGFIYXNoIjoiRWlDZmVhTWNZRUhSRHdhb3BzbVE5aWxTWkQ3S3hXeHJScVVrUGRYa2c3VWh6QSIsInJlY292ZXJ5Q29tbWl0bWVudCI6IkVpQ3M5TXFQVng3X1NkZU5Lb2ZjaVF1WVdPcTc3MHJKSG1FeFpkMzFoZXpuREEifX0',
        service    : [
          {
            id              : '#dwn',
            type            : 'DecentralizedWebNode',
            serviceEndpoint : {
              messageAuthorizationKeys: [
                '#authz'
              ],
              nodes: [
                'https://dwn-host.com'
              ],
              recordEncryptionKeys: [
                '#wrong'
              ]
            }
          }
        ],
        verificationMethod: [
          {
            id           : '#authz',
            controller   : 'did:ion:EiAp_JjfvetzRV033JTaIiBIzh7UxP0Q6bGosMuPpo_4xQ:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiJhdXRoeiIsInB1YmxpY0tleUp3ayI6eyJjcnYiOiJzZWNwMjU2azEiLCJrdHkiOiJFQyIsIngiOiJRMl9RSUR5NERxRHJ6SVFESDFnWmZyQlo5OHYtV2JQWXNoXzBJVWZzVGpRIiwieSI6IlVvNlNDTHNDeGFRVGlsa1dSeDZNUUY1TzByRS1qWnlwb2dtR01nb0NkY2cifSwicHVycG9zZXMiOlsiYXV0aGVudGljYXRpb24iXSwidHlwZSI6Ikpzb25XZWJLZXkyMDIwIn0seyJpZCI6ImVuYyIsInB1YmxpY0tleUp3ayI6eyJjcnYiOiJzZWNwMjU2azEiLCJrdHkiOiJFQyIsIngiOiJmU25ZWmVwa1NNWXhFRmFGM3Z4TWZIaWw3SWhxWTRKNkpkejdxUUNlRFI4IiwieSI6InVmNkNwZ1VCdWRyTkFCVmtUTExPRlE1SWFTQ3pFZGlUMkREYjVXdnRCcEEifSwicHVycG9zZXMiOlsia2V5QWdyZWVtZW50Il0sInR5cGUiOiJKc29uV2ViS2V5MjAyMCJ9XSwic2VydmljZXMiOlt7ImlkIjoiZHduIiwic2VydmljZUVuZHBvaW50Ijp7Im1lc3NhZ2VBdXRob3JpemF0aW9uS2V5cyI6WyIjYXV0aHoiXSwibm9kZXMiOlsiaHR0cHM6Ly9kd24taG9zdC5jb20iXSwicmVjb3JkRW5jcnlwdGlvbktleXMiOlsiI3dyb25nIl19LCJ0eXBlIjoiRGVjZW50cmFsaXplZFdlYk5vZGUifV19fV0sInVwZGF0ZUNvbW1pdG1lbnQiOiJFaUNiM2Y1bW4zaWl5S0lIZHVTZzJ4d2hDRURKejRKQ0tjT0JLYWNpNzN4dGt3In0sInN1ZmZpeERhdGEiOnsiZGVsdGFIYXNoIjoiRWlDZmVhTWNZRUhSRHdhb3BzbVE5aWxTWkQ3S3hXeHJScVVrUGRYa2c3VWh6QSIsInJlY292ZXJ5Q29tbWl0bWVudCI6IkVpQ3M5TXFQVng3X1NkZU5Lb2ZjaVF1WVdPcTc3MHJKSG1FeFpkMzFoZXpuREEifX0',
            type         : 'JsonWebKey2020',
            publicKeyJwk : {
              crv : 'secp256k1',
              kty : 'EC',
              x   : 'Q2_QIDy4DqDrzIQDH1gZfrBZ98v-WbPYsh_0IUfsTjQ',
              y   : 'Uo6SCLsCxaQTilkWRx6MQF5O0rE-jZypogmGMgoCdcg'
            }
          },
          {
            id           : '#enc',
            controller   : 'did:ion:EiAp_JjfvetzRV033JTaIiBIzh7UxP0Q6bGosMuPpo_4xQ:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiJhdXRoeiIsInB1YmxpY0tleUp3ayI6eyJjcnYiOiJzZWNwMjU2azEiLCJrdHkiOiJFQyIsIngiOiJRMl9RSUR5NERxRHJ6SVFESDFnWmZyQlo5OHYtV2JQWXNoXzBJVWZzVGpRIiwieSI6IlVvNlNDTHNDeGFRVGlsa1dSeDZNUUY1TzByRS1qWnlwb2dtR01nb0NkY2cifSwicHVycG9zZXMiOlsiYXV0aGVudGljYXRpb24iXSwidHlwZSI6Ikpzb25XZWJLZXkyMDIwIn0seyJpZCI6ImVuYyIsInB1YmxpY0tleUp3ayI6eyJjcnYiOiJzZWNwMjU2azEiLCJrdHkiOiJFQyIsIngiOiJmU25ZWmVwa1NNWXhFRmFGM3Z4TWZIaWw3SWhxWTRKNkpkejdxUUNlRFI4IiwieSI6InVmNkNwZ1VCdWRyTkFCVmtUTExPRlE1SWFTQ3pFZGlUMkREYjVXdnRCcEEifSwicHVycG9zZXMiOlsia2V5QWdyZWVtZW50Il0sInR5cGUiOiJKc29uV2ViS2V5MjAyMCJ9XSwic2VydmljZXMiOlt7ImlkIjoiZHduIiwic2VydmljZUVuZHBvaW50Ijp7Im1lc3NhZ2VBdXRob3JpemF0aW9uS2V5cyI6WyIjYXV0aHoiXSwibm9kZXMiOlsiaHR0cHM6Ly9kd24taG9zdC5jb20iXSwicmVjb3JkRW5jcnlwdGlvbktleXMiOlsiI3dyb25nIl19LCJ0eXBlIjoiRGVjZW50cmFsaXplZFdlYk5vZGUifV19fV0sInVwZGF0ZUNvbW1pdG1lbnQiOiJFaUNiM2Y1bW4zaWl5S0lIZHVTZzJ4d2hDRURKejRKQ0tjT0JLYWNpNzN4dGt3In0sInN1ZmZpeERhdGEiOnsiZGVsdGFIYXNoIjoiRWlDZmVhTWNZRUhSRHdhb3BzbVE5aWxTWkQ3S3hXeHJScVVrUGRYa2c3VWh6QSIsInJlY292ZXJ5Q29tbWl0bWVudCI6IkVpQ3M5TXFQVng3X1NkZU5Lb2ZjaVF1WVdPcTc3MHJKSG1FeFpkMzFoZXpuREEifX0',
            type         : 'JsonWebKey2020',
            publicKeyJwk : {
              crv : 'secp256k1',
              kty : 'EC',
              x   : 'fSnYZepkSMYxEFaF3vxMfHil7IhqY4J6Jdz7qQCeDR8',
              y   : 'uf6CpgUBudrNABVkTLLOFQ5IaSCzEdiT2DDb5WvtBpA'
            }
          }
        ],
        authentication: [
          '#authz'
        ],
        keyAgreement: [
          '#enc'
        ]
      }
    },
  }
};

export const key = {
  notFound: {
    didDocument           : null,
    didDocumentMetadata   : {},
    didResolutionMetadata : {
      error: 'invalidDid',
    },
  },

  malformed: {
    didDocument: {
      id: 'did:key:z6MkhvthBZDxVvLUswRey729CquxMiaoYXrT5SYbCAATc8V9',
    },
  },

  noVerificationMethods: {
    didDocument: {
      '@context': [
        'https://www.w3.org/ns/did/v1',
        'https://w3id.org/security/suites/jws-2020/v1',
        'https://w3id.org/security/suites/ed25519-2020/v1',
      ],
      id                 : 'did:ion:z6MkhvthBZDxVvLUswRey729CquxMiaoYXrT5SYbCAATc8V9',
      verificationMethod : [],
    },
  },

  oneVerificationMethodJwk: {
    didDocument: {
      '@context': [
        'https://www.w3.org/ns/did/v1',
        'https://w3id.org/security/suites/jws-2020/v1',
        'https://w3id.org/security/suites/ed25519-2020/v1',
      ],
      id                 : 'did:key:z6MkhvthBZDxVvLUswRey729CquxMiaoYXrT5SYbCAATc8V9',
      verificationMethod : [
        {
          id           : 'did:key:z6MkhvthBZDxVvLUswRey729CquxMiaoYXrT5SYbCAATc8V9#z6MkhvthBZDxVvLUswRey729CquxMiaoYXrT5SYbCAATc8V9',
          type         : 'JsonWebKey2020',
          controller   : 'did:key:z6MkhvthBZDxVvLUswRey729CquxMiaoYXrT5SYbCAATc8V9',
          publicKeyJwk : {
            alg : 'EdDSA',
            kty : 'OKP',
            crv : 'Ed25519',
            x   : 'M6cuSLXzNrcydvtfswnRxDhnictOvjyzXne6ljRVw9Q',
          },
        },
      ],
    },
  },

  oneVerificationMethodMultibase: {
    didDocument: {
      '@context': [
        'https://www.w3.org/ns/did/v1',
        'https://w3id.org/security/suites/ed25519-2020/v1',
      ],
      id                 : 'did:key:z6MkhvthBZDxVvLUswRey729CquxMiaoYXrT5SYbCAATc8V9',
      verificationMethod : [
        {
          id                 : 'did:key:z6MkhvthBZDxVvLUswRey729CquxMiaoYXrT5SYbCAATc8V9#z6MkhvthBZDxVvLUswRey729CquxMiaoYXrT5SYbCAATc8V9',
          type               : 'Ed25519VerificationKey2020',
          controller         : 'did:key:z6MkhvthBZDxVvLUswRey729CquxMiaoYXrT5SYbCAATc8V9',
          publicKeyMultibase : 'zH3C2AVvLMv6gmMNam3uVAjZpfkcJCwDwnZn6z3wXmqPV',
        },
      ],
    },
  },

  twoAuthenticationReferencedKeysJwk: {
    didDocument: {
      '@context': [
        'https://www.w3.org/ns/did/v1',
        'https://w3id.org/security/suites/jws-2020/v1',
        'https://w3id.org/security/suites/ed25519-2020/v1',
      ],
      id                 : 'did:key:z6MkhvthBZDxVvLUswRey729CquxMiaoYXrT5SYbCAATc8V9',
      verificationMethod : [
        {
          id           : 'did:key:z6MkhvthBZDxVvLUswRey729CquxMiaoYXrT5SYbCAATc8V9#key-1',
          type         : 'JsonWebKey2020',
          controller   : 'did:key:z6MkhvthBZDxVvLUswRey729CquxMiaoYXrT5SYbCAATc8V9',
          publicKeyJwk : {
            alg : 'EdDSA',
            kty : 'OKP',
            crv : 'Ed25519',
            x   : 'M6cuSLXzNrcydvtfswnRxDhnictOvjyzXne6ljRVw9Q',
          },
        },
        {
          id           : 'did:key:z6MkhvthBZDxVvLUswRey729CquxMiaoYXrT5SYbCAATc8V9#key-2',
          type         : 'JsonWebKey2020',
          controller   : 'did:key:z6MkhvthBZDxVvLUswRey729CquxMiaoYXrT5SYbCAATc8V9',
          publicKeyJwk : {
            alg : 'EdDSA',
            kty : 'OKP',
            crv : 'Ed25519',
            x   : 'M6cuSLXzNrcydvtfswnRxDhnictOvjyzXne6ljRVw9Q',
          },
        },
      ],
      'authentication': [
        'did:key:z6MkhvthBZDxVvLUswRey729CquxMiaoYXrT5SYbCAATc8V9#key-1',
        'did:key:z6MkhvthBZDxVvLUswRey729CquxMiaoYXrT5SYbCAATc8V9#key-2',
      ],
    },
  },

  manyVerificationMethodsJwk: {
    didDocument: {
      '@context': [
        'https://www.w3.org/ns/did/v1',
        'https://w3id.org/security/suites/jws-2020/v1',
        'https://w3id.org/security/suites/ed25519-2020/v1',
      ],
      id                 : 'did:key:z6MkhvthBZDxVvLUswRey729CquxMiaoYXrT5SYbCAATc8V9',
      verificationMethod : [
        {
          id           : 'did:key:z6MkhvthBZDxVvLUswRey729CquxMiaoYXrT5SYbCAATc8V9#key-1',
          type         : 'JsonWebKey2020',
          controller   : 'did:key:z6MkhvthBZDxVvLUswRey729CquxMiaoYXrT5SYbCAATc8V9',
          publicKeyJwk : {
            alg : 'EdDSA',
            kty : 'OKP',
            crv : 'Ed25519',
            x   : 'M6cuSLXzNrcydvtfswnRxDhnictOvjyzXne6ljRVw9Q',
          },
        },
        {
          id           : 'did:key:z6MkhvthBZDxVvLUswRey729CquxMiaoYXrT5SYbCAATc8V9#key-2',
          type         : 'JsonWebKey2020',
          controller   : 'did:key:z6MkhvthBZDxVvLUswRey729CquxMiaoYXrT5SYbCAATc8V9',
          publicKeyJwk : {
            alg : 'EdDSA',
            kty : 'OKP',
            crv : 'Ed25519',
            x   : 'M6cuSLXzNrcydvtfswnRxDhnictOvjyzXne6ljRVw9Q',
          },
        },
      ],
      'authentication': [
        'did:key:z6MkhvthBZDxVvLUswRey729CquxMiaoYXrT5SYbCAATc8V9#key-1',
        {
          id           : 'did:key:z6MkhvthBZDxVvLUswRey729CquxMiaoYXrT5SYbCAATc8V9#key-3',
          type         : 'Ed25519VerificationKey2020',
          controller   : 'did:key:z6MkhvthBZDxVvLUswRey729CquxMiaoYXrT5SYbCAATc8V9',
          publicKeyJwk : {
            alg : 'EdDSA',
            kty : 'OKP',
            crv : 'Ed25519',
            x   : 'M6cuSLXzNrcydvtfswnRxDhnictOvjyzXne6ljRVw9Q',
          },
        },
        {
          id           : 'did:key:z6MkhvthBZDxVvLUswRey729CquxMiaoYXrT5SYbCAATc8V9#key-4',
          type         : 'Ed25519VerificationKey2020',
          controller   : 'did:key:z6MkhvthBZDxVvLUswRey729CquxMiaoYXrT5SYbCAATc8V9',
          publicKeyJwk : {
            alg : 'EdDSA',
            kty : 'OKP',
            crv : 'Ed25519',
            x   : 'M6cuSLXzNrcydvtfswnRxDhnictOvjyzXne6ljRVw9Q',
          },
        },
      ],
      'keyAgreement': [
        {
          id           : 'did:key:z6MkhvthBZDxVvLUswRey729CquxMiaoYXrT5SYbCAATc8V9#key-5',
          type         : 'X25519KeyAgreementKey2020',
          controller   : 'did:key:z6MkhvthBZDxVvLUswRey729CquxMiaoYXrT5SYbCAATc8V9',
          publicKeyJwk : {
            alg : 'EdDSA',
            kty : 'OKP',
            crv : 'Ed25519',
            x   : 'M6cuSLXzNrcydvtfswnRxDhnictOvjyzXne6ljRVw9Q',
          },
        },
        {
          id           : 'did:key:z6MkhvthBZDxVvLUswRey729CquxMiaoYXrT5SYbCAATc8V9#key-6',
          type         : 'X25519KeyAgreementKey2020',
          controller   : 'did:key:z6MkhvthBZDxVvLUswRey729CquxMiaoYXrT5SYbCAATc8V9',
          publicKeyJwk : {
            alg : 'EdDSA',
            kty : 'OKP',
            crv : 'Ed25519',
            x   : 'M6cuSLXzNrcydvtfswnRxDhnictOvjyzXne6ljRVw9Q',
          },
        },
      ],
      'assertionMethod': [
        'did:key:z6MkhvthBZDxVvLUswRey729CquxMiaoYXrT5SYbCAATc8V9#key-2',
        {
          id           : 'did:key:z6MkhvthBZDxVvLUswRey729CquxMiaoYXrT5SYbCAATc8V9#key-7',
          type         : 'Ed25519VerificationKey2020',
          controller   : 'did:key:z6MkhvthBZDxVvLUswRey729CquxMiaoYXrT5SYbCAATc8V9',
          publicKeyJwk : {
            alg : 'EdDSA',
            kty : 'OKP',
            crv : 'Ed25519',
            x   : 'M6cuSLXzNrcydvtfswnRxDhnictOvjyzXne6ljRVw9Q',
          },
        },
        {
          id           : 'did:key:z6MkhvthBZDxVvLUswRey729CquxMiaoYXrT5SYbCAATc8V9#key-8',
          type         : 'Ed25519VerificationKey2020',
          controller   : 'did:key:z6MkhvthBZDxVvLUswRey729CquxMiaoYXrT5SYbCAATc8V9',
          publicKeyJwk : {
            alg : 'EdDSA',
            kty : 'OKP',
            crv : 'Ed25519',
            x   : 'M6cuSLXzNrcydvtfswnRxDhnictOvjyzXne6ljRVw9Q',
          },
        },
      ],
    },
  },

  manyVerificationMethodsMultibase: {
    didDocument: {
      '@context': [
        'https://www.w3.org/ns/did/v1',
        'https://w3id.org/security/suites/ed25519-2020/v1',
      ],
      id                 : 'did:key:z6MkhvthBZDxVvLUswRey729CquxMiaoYXrT5SYbCAATc8V9',
      verificationMethod : [
        {
          id                 : 'did:key:z6MkhvthBZDxVvLUswRey729CquxMiaoYXrT5SYbCAATc8V9#key-1',
          type               : 'Ed25519VerificationKey2020',
          controller         : 'did:key:z6MkhvthBZDxVvLUswRey729CquxMiaoYXrT5SYbCAATc8V9',
          publicKeyMultibase : 'zH3C2AVvLMv6gmMNam3uVAjZpfkcJCwDwnZn6z3wXmqPV',
        },
        {
          id                 : 'did:key:z6MkhvthBZDxVvLUswRey729CquxMiaoYXrT5SYbCAATc8V9#key-2',
          type               : 'Ed25519VerificationKey2020',
          controller         : 'did:key:z6MkhvthBZDxVvLUswRey729CquxMiaoYXrT5SYbCAATc8V9',
          publicKeyMultibase : 'zH3C2AVvLMv6gmMNam3uVAjZpfkcJCwDwnZn6z3wXmqPV',
        },
      ],
      'authentication': [
        'did:key:z6MkhvthBZDxVvLUswRey729CquxMiaoYXrT5SYbCAATc8V9#key-1',
        {
          id                 : 'did:key:z6MkhvthBZDxVvLUswRey729CquxMiaoYXrT5SYbCAATc8V9#key-3',
          type               : 'Ed25519VerificationKey2020',
          controller         : 'did:key:z6MkhvthBZDxVvLUswRey729CquxMiaoYXrT5SYbCAATc8V9',
          publicKeyMultibase : 'zH3C2AVvLMv6gmMNam3uVAjZpfkcJCwDwnZn6z3wXmqPV',
        },
        {
          id                 : 'did:key:z6MkhvthBZDxVvLUswRey729CquxMiaoYXrT5SYbCAATc8V9#key-4',
          type               : 'Ed25519VerificationKey2020',
          controller         : 'did:key:z6MkhvthBZDxVvLUswRey729CquxMiaoYXrT5SYbCAATc8V9',
          publicKeyMultibase : 'zH3C2AVvLMv6gmMNam3uVAjZpfkcJCwDwnZn6z3wXmqPV',
        },
      ],
      'keyAgreement': [
        {
          id                 : 'did:key:z6MkhvthBZDxVvLUswRey729CquxMiaoYXrT5SYbCAATc8V9#key-5',
          type               : 'X25519KeyAgreementKey2020',
          controller         : 'did:key:z6MkhvthBZDxVvLUswRey729CquxMiaoYXrT5SYbCAATc8V9',
          publicKeyMultibase : 'zH3C2AVvLMv6gmMNam3uVAjZpfkcJCwDwnZn6z3wXmqPV',
        },
        {
          id                 : 'did:key:z6MkhvthBZDxVvLUswRey729CquxMiaoYXrT5SYbCAATc8V9#key-6',
          type               : 'X25519KeyAgreementKey2020',
          controller         : 'did:key:z6MkhvthBZDxVvLUswRey729CquxMiaoYXrT5SYbCAATc8V9',
          publicKeyMultibase : 'zH3C2AVvLMv6gmMNam3uVAjZpfkcJCwDwnZn6z3wXmqPV',
        },
      ],
      'assertionMethod': [
        'did:key:z6MkhvthBZDxVvLUswRey729CquxMiaoYXrT5SYbCAATc8V9#key-2',
        {
          id                 : 'did:key:z6MkhvthBZDxVvLUswRey729CquxMiaoYXrT5SYbCAATc8V9#key-7',
          type               : 'Ed25519VerificationKey2020',
          controller         : 'did:key:z6MkhvthBZDxVvLUswRey729CquxMiaoYXrT5SYbCAATc8V9',
          publicKeyMultibase : 'zH3C2AVvLMv6gmMNam3uVAjZpfkcJCwDwnZn6z3wXmqPV',
        },
        {
          id                 : 'did:key:z6MkhvthBZDxVvLUswRey729CquxMiaoYXrT5SYbCAATc8V9#key-8',
          type               : 'Ed25519VerificationKey2020',
          controller         : 'did:key:z6MkhvthBZDxVvLUswRey729CquxMiaoYXrT5SYbCAATc8V9',
          publicKeyMultibase : 'zH3C2AVvLMv6gmMNam3uVAjZpfkcJCwDwnZn6z3wXmqPV',
        },
      ],
    },
  },
};