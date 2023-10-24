export const didIonCreateTestVectors = [
  {
    id    : 'did.create.1',
    input : {
      keySet: {
        recoveryKey: {
          privateKeyJwk: {
            alg     : 'ES256K',
            crv     : 'secp256k1',
            d       : 'cy4EzFT9K0sdCcz0gnctkcPq0szOP-d8smA9Hvp5ejo',
            ext     : 'true',
            key_ops : ['sign'],
            kid     : 'ion-recovery-1',
            kty     : 'EC',
            x       : 'vLvKcPjYVnJi6dZpq15PrJqdxBERuvL8EqvTh1_0ikg',
            y       : 'AsQstiUIt5tGyAyM7LzytsbdVbsb-5oWVNYIUEjOePs'
          },
          publicKeyJwk: {
            alg     : 'ES256K',
            crv     : 'secp256k1',
            ext     : 'true',
            key_ops : ['verify'],
            kid     : 'ion-recovery-1',
            kty     : 'EC',
            x       : 'vLvKcPjYVnJi6dZpq15PrJqdxBERuvL8EqvTh1_0ikg',
            y       : 'AsQstiUIt5tGyAyM7LzytsbdVbsb-5oWVNYIUEjOePs'
          },
        },
        updateKey: {
          privateKeyJwk: {
            alg     : 'ES256K',
            crv     : 'secp256k1',
            d       : 'j4VcN2I5uw5kwPC5e8rxDaA7OxkmrJ-2BgdyKwayO9E',
            ext     : 'true',
            key_ops : ['sign'],
            kid     : 'ion-update-1',
            kty     : 'EC',
            x       : '4Z9Tt1tuFlI3YwJfT3eS72r0sa9UxdtalgW14gep2DQ',
            y       : 'FIAtUW8B54L0Y-0e9n_rc1GJhxMIkZ3iYGnMQufgT_s'
          },
          publicKeyJwk: {
            alg     : 'ES256K',
            crv     : 'secp256k1',
            ext     : 'true',
            key_ops : ['verify'],
            kid     : 'ion-update-1',
            kty     : 'EC',
            x       : '4Z9Tt1tuFlI3YwJfT3eS72r0sa9UxdtalgW14gep2DQ',
            y       : 'FIAtUW8B54L0Y-0e9n_rc1GJhxMIkZ3iYGnMQufgT_s'
          }
        },
        verificationMethodKeys: [{
          publicKeyJwk: {
            alg : 'EdDSA',
            crv : 'Ed25519',
            kid : 'dwn-sig',
            kty : 'OKP',
            x   : 'rpKnDP8F4_jwvQ7xDkkuKx165OSwcyrQvmEWl2eigIU'
          },
          relationships: ['authentication', 'assertionMethod']
        }],
      },
      keyAlgorithm: 'Ed25519'
    },
    output: {
      canonicalId : 'did:ion:EiBQ2C_wJSZsraZWjktLfUNKlSP0nnm_Jqay5h_0GRvb1Q',
      did         : 'did:ion:EiBQ2C_wJSZsraZWjktLfUNKlSP0nnm_Jqay5h_0GRvb1Q:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiJkd24tc2lnIiwicHVibGljS2V5SndrIjp7ImNydiI6IkVkMjU1MTkiLCJrdHkiOiJPS1AiLCJ4IjoicnBLbkRQOEY0X2p3dlE3eERra3VLeDE2NU9Td2N5clF2bUVXbDJlaWdJVSJ9LCJwdXJwb3NlcyI6WyJhdXRoZW50aWNhdGlvbiIsImFzc2VydGlvbk1ldGhvZCJdLCJ0eXBlIjoiSnNvbldlYktleTIwMjAifV0sInNlcnZpY2VzIjpbXX19XSwidXBkYXRlQ29tbWl0bWVudCI6IkVpRFZyOHUzVWxvOGtNVUx3WEh6VUdSMFdGdy1ROU14el8zRGQyQXEwVF9KR3cifSwic3VmZml4RGF0YSI6eyJkZWx0YUhhc2giOiJFaUNULVcyM0VZcFN1RDhBcG9qbTUyODFPLWF2OFlXVmRNUExvTGNBYU9LWDV3IiwicmVjb3ZlcnlDb21taXRtZW50IjoiRWlEOEQtdjlsVjdqTzZ3ajVjSXVsRXRwZEFqaHE5NEFnTm54SlozWThVUnlrZyJ9fQ',
      document    : {
        '@context': [
          'https://www.w3.org/ns/did/v1',
          {
            '@base': 'did:ion:EiBQ2C_wJSZsraZWjktLfUNKlSP0nnm_Jqay5h_0GRvb1Q:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiJkd24tc2lnIiwicHVibGljS2V5SndrIjp7ImNydiI6IkVkMjU1MTkiLCJrdHkiOiJPS1AiLCJ4IjoicnBLbkRQOEY0X2p3dlE3eERra3VLeDE2NU9Td2N5clF2bUVXbDJlaWdJVSJ9LCJwdXJwb3NlcyI6WyJhdXRoZW50aWNhdGlvbiIsImFzc2VydGlvbk1ldGhvZCJdLCJ0eXBlIjoiSnNvbldlYktleTIwMjAifV0sInNlcnZpY2VzIjpbXX19XSwidXBkYXRlQ29tbWl0bWVudCI6IkVpRFZyOHUzVWxvOGtNVUx3WEh6VUdSMFdGdy1ROU14el8zRGQyQXEwVF9KR3cifSwic3VmZml4RGF0YSI6eyJkZWx0YUhhc2giOiJFaUNULVcyM0VZcFN1RDhBcG9qbTUyODFPLWF2OFlXVmRNUExvTGNBYU9LWDV3IiwicmVjb3ZlcnlDb21taXRtZW50IjoiRWlEOEQtdjlsVjdqTzZ3ajVjSXVsRXRwZEFqaHE5NEFnTm54SlozWThVUnlrZyJ9fQ'
          },
        ],
        id                   : 'did:ion:EiBQ2C_wJSZsraZWjktLfUNKlSP0nnm_Jqay5h_0GRvb1Q:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiJkd24tc2lnIiwicHVibGljS2V5SndrIjp7ImNydiI6IkVkMjU1MTkiLCJrdHkiOiJPS1AiLCJ4IjoicnBLbkRQOEY0X2p3dlE3eERra3VLeDE2NU9Td2N5clF2bUVXbDJlaWdJVSJ9LCJwdXJwb3NlcyI6WyJhdXRoZW50aWNhdGlvbiIsImFzc2VydGlvbk1ldGhvZCJdLCJ0eXBlIjoiSnNvbldlYktleTIwMjAifV0sInNlcnZpY2VzIjpbXX19XSwidXBkYXRlQ29tbWl0bWVudCI6IkVpRFZyOHUzVWxvOGtNVUx3WEh6VUdSMFdGdy1ROU14el8zRGQyQXEwVF9KR3cifSwic3VmZml4RGF0YSI6eyJkZWx0YUhhc2giOiJFaUNULVcyM0VZcFN1RDhBcG9qbTUyODFPLWF2OFlXVmRNUExvTGNBYU9LWDV3IiwicmVjb3ZlcnlDb21taXRtZW50IjoiRWlEOEQtdjlsVjdqTzZ3ajVjSXVsRXRwZEFqaHE5NEFnTm54SlozWThVUnlrZyJ9fQ',
        'verificationMethod' : [
          {
            id           : '#dwn-sig',
            type         : 'JsonWebKey2020',
            controller   : 'did:ion:EiBQ2C_wJSZsraZWjktLfUNKlSP0nnm_Jqay5h_0GRvb1Q:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiJkd24tc2lnIiwicHVibGljS2V5SndrIjp7ImNydiI6IkVkMjU1MTkiLCJrdHkiOiJPS1AiLCJ4IjoicnBLbkRQOEY0X2p3dlE3eERra3VLeDE2NU9Td2N5clF2bUVXbDJlaWdJVSJ9LCJwdXJwb3NlcyI6WyJhdXRoZW50aWNhdGlvbiIsImFzc2VydGlvbk1ldGhvZCJdLCJ0eXBlIjoiSnNvbldlYktleTIwMjAifV0sInNlcnZpY2VzIjpbXX19XSwidXBkYXRlQ29tbWl0bWVudCI6IkVpRFZyOHUzVWxvOGtNVUx3WEh6VUdSMFdGdy1ROU14el8zRGQyQXEwVF9KR3cifSwic3VmZml4RGF0YSI6eyJkZWx0YUhhc2giOiJFaUNULVcyM0VZcFN1RDhBcG9qbTUyODFPLWF2OFlXVmRNUExvTGNBYU9LWDV3IiwicmVjb3ZlcnlDb21taXRtZW50IjoiRWlEOEQtdjlsVjdqTzZ3ajVjSXVsRXRwZEFqaHE5NEFnTm54SlozWThVUnlrZyJ9fQ',
            publicKeyJwk : {
              crv : 'Ed25519',
              kty : 'OKP',
              x   : 'rpKnDP8F4_jwvQ7xDkkuKx165OSwcyrQvmEWl2eigIU'
            }
          }
        ],
        authentication: [
          '#dwn-sig'
        ],
        assertionMethod: [
          '#dwn-sig'
        ],
        service: []
      },
      keySet: {
        recoveryKey: {
          privateKeyJwk: {
            alg     : 'ES256K',
            crv     : 'secp256k1',
            d       : 'cy4EzFT9K0sdCcz0gnctkcPq0szOP-d8smA9Hvp5ejo',
            ext     : 'true',
            key_ops : ['sign'],
            kid     : 'ion-recovery-1',
            kty     : 'EC',
            x       : 'vLvKcPjYVnJi6dZpq15PrJqdxBERuvL8EqvTh1_0ikg',
            y       : 'AsQstiUIt5tGyAyM7LzytsbdVbsb-5oWVNYIUEjOePs'
          },
          publicKeyJwk: {
            alg     : 'ES256K',
            crv     : 'secp256k1',
            ext     : 'true',
            key_ops : ['verify'],
            kid     : 'ion-recovery-1',
            kty     : 'EC',
            x       : 'vLvKcPjYVnJi6dZpq15PrJqdxBERuvL8EqvTh1_0ikg',
            y       : 'AsQstiUIt5tGyAyM7LzytsbdVbsb-5oWVNYIUEjOePs'
          },
        },
        updateKey: {
          privateKeyJwk: {
            alg     : 'ES256K',
            crv     : 'secp256k1',
            d       : 'j4VcN2I5uw5kwPC5e8rxDaA7OxkmrJ-2BgdyKwayO9E',
            ext     : 'true',
            key_ops : ['sign'],
            kid     : 'ion-update-1',
            kty     : 'EC',
            x       : '4Z9Tt1tuFlI3YwJfT3eS72r0sa9UxdtalgW14gep2DQ',
            y       : 'FIAtUW8B54L0Y-0e9n_rc1GJhxMIkZ3iYGnMQufgT_s'
          },
          publicKeyJwk: {
            alg     : 'ES256K',
            crv     : 'secp256k1',
            ext     : 'true',
            key_ops : ['verify'],
            kid     : 'ion-update-1',
            kty     : 'EC',
            x       : '4Z9Tt1tuFlI3YwJfT3eS72r0sa9UxdtalgW14gep2DQ',
            y       : 'FIAtUW8B54L0Y-0e9n_rc1GJhxMIkZ3iYGnMQufgT_s'
          }
        },
        verificationMethodKeys: [{
          publicKeyJwk: {
            alg : 'EdDSA',
            crv : 'Ed25519',
            kid : 'dwn-sig',
            kty : 'OKP',
            x   : 'rpKnDP8F4_jwvQ7xDkkuKx165OSwcyrQvmEWl2eigIU'
          },
          relationships: ['authentication', 'assertionMethod']
        }],
      },
    }
  },
  {
    id    : 'did.create.2',
    input : {
      keySet: {
        recoveryKey: {
          privateKeyJwk: {
            alg     : 'ES256K',
            crv     : 'secp256k1',
            d       : 'cy4EzFT9K0sdCcz0gnctkcPq0szOP-d8smA9Hvp5ejo',
            ext     : 'true',
            key_ops : ['sign'],
            kty     : 'EC',
            x       : 'vLvKcPjYVnJi6dZpq15PrJqdxBERuvL8EqvTh1_0ikg',
            y       : 'AsQstiUIt5tGyAyM7LzytsbdVbsb-5oWVNYIUEjOePs'
          },
          publicKeyJwk: {
            alg     : 'ES256K',
            crv     : 'secp256k1',
            ext     : 'true',
            key_ops : ['verify'],
            kty     : 'EC',
            x       : 'vLvKcPjYVnJi6dZpq15PrJqdxBERuvL8EqvTh1_0ikg',
            y       : 'AsQstiUIt5tGyAyM7LzytsbdVbsb-5oWVNYIUEjOePs'
          },
        },
        updateKey: {
          privateKeyJwk: {
            alg     : 'ES256K',
            crv     : 'secp256k1',
            d       : 'j4VcN2I5uw5kwPC5e8rxDaA7OxkmrJ-2BgdyKwayO9E',
            ext     : 'true',
            key_ops : ['sign'],
            kty     : 'EC',
            x       : '4Z9Tt1tuFlI3YwJfT3eS72r0sa9UxdtalgW14gep2DQ',
            y       : 'FIAtUW8B54L0Y-0e9n_rc1GJhxMIkZ3iYGnMQufgT_s'
          },
          publicKeyJwk: {
            alg     : 'ES256K',
            crv     : 'secp256k1',
            ext     : 'true',
            key_ops : ['verify'],
            kty     : 'EC',
            x       : '4Z9Tt1tuFlI3YwJfT3eS72r0sa9UxdtalgW14gep2DQ',
            y       : 'FIAtUW8B54L0Y-0e9n_rc1GJhxMIkZ3iYGnMQufgT_s'
          }
        },
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
      keyAlgorithm: 'Ed25519'
    },
    output: {
      canonicalId : 'did:ion:EiBP6JaGhwYye4zz-wdeXR2JWl1JclaVDPA7FDgpzM8-ig',
      did         : 'did:ion:EiBP6JaGhwYye4zz-wdeXR2JWl1JclaVDPA7FDgpzM8-ig:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiJPQVBqN09ickVKRmdWTkEycnJrUE01QS12WVZzSF9seXo0TGdPVWRKQmE4IiwicHVibGljS2V5SndrIjp7ImNydiI6IkVkMjU1MTkiLCJrdHkiOiJPS1AiLCJ4IjoicnBLbkRQOEY0X2p3dlE3eERra3VLeDE2NU9Td2N5clF2bUVXbDJlaWdJVSJ9LCJwdXJwb3NlcyI6WyJhdXRoZW50aWNhdGlvbiJdLCJ0eXBlIjoiSnNvbldlYktleTIwMjAifV0sInNlcnZpY2VzIjpbXX19XSwidXBkYXRlQ29tbWl0bWVudCI6IkVpRFZyOHUzVWxvOGtNVUx3WEh6VUdSMFdGdy1ROU14el8zRGQyQXEwVF9KR3cifSwic3VmZml4RGF0YSI6eyJkZWx0YUhhc2giOiJFaUNUMEh4ZGNTRHkwQ0t5eHV4VkZ3d3A3N3YteEJkSkVRLUVtSXhZUGR4VnV3IiwicmVjb3ZlcnlDb21taXRtZW50IjoiRWlEOEQtdjlsVjdqTzZ3ajVjSXVsRXRwZEFqaHE5NEFnTm54SlozWThVUnlrZyJ9fQ',
      document    : {
        '@context': [
          'https://www.w3.org/ns/did/v1',
          {
            '@base': 'did:ion:EiBP6JaGhwYye4zz-wdeXR2JWl1JclaVDPA7FDgpzM8-ig:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiJPQVBqN09ickVKRmdWTkEycnJrUE01QS12WVZzSF9seXo0TGdPVWRKQmE4IiwicHVibGljS2V5SndrIjp7ImNydiI6IkVkMjU1MTkiLCJrdHkiOiJPS1AiLCJ4IjoicnBLbkRQOEY0X2p3dlE3eERra3VLeDE2NU9Td2N5clF2bUVXbDJlaWdJVSJ9LCJwdXJwb3NlcyI6WyJhdXRoZW50aWNhdGlvbiJdLCJ0eXBlIjoiSnNvbldlYktleTIwMjAifV0sInNlcnZpY2VzIjpbXX19XSwidXBkYXRlQ29tbWl0bWVudCI6IkVpRFZyOHUzVWxvOGtNVUx3WEh6VUdSMFdGdy1ROU14el8zRGQyQXEwVF9KR3cifSwic3VmZml4RGF0YSI6eyJkZWx0YUhhc2giOiJFaUNUMEh4ZGNTRHkwQ0t5eHV4VkZ3d3A3N3YteEJkSkVRLUVtSXhZUGR4VnV3IiwicmVjb3ZlcnlDb21taXRtZW50IjoiRWlEOEQtdjlsVjdqTzZ3ajVjSXVsRXRwZEFqaHE5NEFnTm54SlozWThVUnlrZyJ9fQ'
          },
        ],
        id                   : 'did:ion:EiBP6JaGhwYye4zz-wdeXR2JWl1JclaVDPA7FDgpzM8-ig:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiJPQVBqN09ickVKRmdWTkEycnJrUE01QS12WVZzSF9seXo0TGdPVWRKQmE4IiwicHVibGljS2V5SndrIjp7ImNydiI6IkVkMjU1MTkiLCJrdHkiOiJPS1AiLCJ4IjoicnBLbkRQOEY0X2p3dlE3eERra3VLeDE2NU9Td2N5clF2bUVXbDJlaWdJVSJ9LCJwdXJwb3NlcyI6WyJhdXRoZW50aWNhdGlvbiJdLCJ0eXBlIjoiSnNvbldlYktleTIwMjAifV0sInNlcnZpY2VzIjpbXX19XSwidXBkYXRlQ29tbWl0bWVudCI6IkVpRFZyOHUzVWxvOGtNVUx3WEh6VUdSMFdGdy1ROU14el8zRGQyQXEwVF9KR3cifSwic3VmZml4RGF0YSI6eyJkZWx0YUhhc2giOiJFaUNUMEh4ZGNTRHkwQ0t5eHV4VkZ3d3A3N3YteEJkSkVRLUVtSXhZUGR4VnV3IiwicmVjb3ZlcnlDb21taXRtZW50IjoiRWlEOEQtdjlsVjdqTzZ3ajVjSXVsRXRwZEFqaHE5NEFnTm54SlozWThVUnlrZyJ9fQ',
        'verificationMethod' : [
          {
            id           : '#OAPj7ObrEJFgVNA2rrkPM5A-vYVsH_lyz4LgOUdJBa8',
            type         : 'JsonWebKey2020',
            controller   : 'did:ion:EiBP6JaGhwYye4zz-wdeXR2JWl1JclaVDPA7FDgpzM8-ig:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiJPQVBqN09ickVKRmdWTkEycnJrUE01QS12WVZzSF9seXo0TGdPVWRKQmE4IiwicHVibGljS2V5SndrIjp7ImNydiI6IkVkMjU1MTkiLCJrdHkiOiJPS1AiLCJ4IjoicnBLbkRQOEY0X2p3dlE3eERra3VLeDE2NU9Td2N5clF2bUVXbDJlaWdJVSJ9LCJwdXJwb3NlcyI6WyJhdXRoZW50aWNhdGlvbiJdLCJ0eXBlIjoiSnNvbldlYktleTIwMjAifV0sInNlcnZpY2VzIjpbXX19XSwidXBkYXRlQ29tbWl0bWVudCI6IkVpRFZyOHUzVWxvOGtNVUx3WEh6VUdSMFdGdy1ROU14el8zRGQyQXEwVF9KR3cifSwic3VmZml4RGF0YSI6eyJkZWx0YUhhc2giOiJFaUNUMEh4ZGNTRHkwQ0t5eHV4VkZ3d3A3N3YteEJkSkVRLUVtSXhZUGR4VnV3IiwicmVjb3ZlcnlDb21taXRtZW50IjoiRWlEOEQtdjlsVjdqTzZ3ajVjSXVsRXRwZEFqaHE5NEFnTm54SlozWThVUnlrZyJ9fQ',
            publicKeyJwk : {
              crv : 'Ed25519',
              kty : 'OKP',
              x   : 'rpKnDP8F4_jwvQ7xDkkuKx165OSwcyrQvmEWl2eigIU'
            }
          }
        ],
        authentication: [
          '#OAPj7ObrEJFgVNA2rrkPM5A-vYVsH_lyz4LgOUdJBa8'
        ],
        service: []
      },
      keySet: {
        recoveryKey: {
          privateKeyJwk: {
            alg     : 'ES256K',
            crv     : 'secp256k1',
            d       : 'cy4EzFT9K0sdCcz0gnctkcPq0szOP-d8smA9Hvp5ejo',
            ext     : 'true',
            key_ops : ['sign'],
            kid     : 'AEOG_sxXHhCA1Fel8fpheyLxAcW89D7V86lMcJXc500',
            kty     : 'EC',
            x       : 'vLvKcPjYVnJi6dZpq15PrJqdxBERuvL8EqvTh1_0ikg',
            y       : 'AsQstiUIt5tGyAyM7LzytsbdVbsb-5oWVNYIUEjOePs'
          },
          publicKeyJwk: {
            alg     : 'ES256K',
            crv     : 'secp256k1',
            ext     : 'true',
            key_ops : ['verify'],
            kid     : 'AEOG_sxXHhCA1Fel8fpheyLxAcW89D7V86lMcJXc500',
            kty     : 'EC',
            x       : 'vLvKcPjYVnJi6dZpq15PrJqdxBERuvL8EqvTh1_0ikg',
            y       : 'AsQstiUIt5tGyAyM7LzytsbdVbsb-5oWVNYIUEjOePs'
          },
        },
        updateKey: {
          privateKeyJwk: {
            alg     : 'ES256K',
            crv     : 'secp256k1',
            d       : 'j4VcN2I5uw5kwPC5e8rxDaA7OxkmrJ-2BgdyKwayO9E',
            ext     : 'true',
            key_ops : ['sign'],
            kid     : '_1CySHVtk6tNXke3t_7NLI2nvaVlH5GFyuO9HjQCRKs',
            kty     : 'EC',
            x       : '4Z9Tt1tuFlI3YwJfT3eS72r0sa9UxdtalgW14gep2DQ',
            y       : 'FIAtUW8B54L0Y-0e9n_rc1GJhxMIkZ3iYGnMQufgT_s'
          },
          publicKeyJwk: {
            alg     : 'ES256K',
            crv     : 'secp256k1',
            ext     : 'true',
            key_ops : ['verify'],
            kid     : '_1CySHVtk6tNXke3t_7NLI2nvaVlH5GFyuO9HjQCRKs',
            kty     : 'EC',
            x       : '4Z9Tt1tuFlI3YwJfT3eS72r0sa9UxdtalgW14gep2DQ',
            y       : 'FIAtUW8B54L0Y-0e9n_rc1GJhxMIkZ3iYGnMQufgT_s'
          }
        },
        verificationMethodKeys: [{
          publicKeyJwk: {
            alg : 'EdDSA',
            crv : 'Ed25519',
            kid : 'OAPj7ObrEJFgVNA2rrkPM5A-vYVsH_lyz4LgOUdJBa8',
            kty : 'OKP',
            x   : 'rpKnDP8F4_jwvQ7xDkkuKx165OSwcyrQvmEWl2eigIU'
          },
          relationships: ['authentication']
        }],
      },
    }
  },
  {
    id    : 'did.create.3',
    input : {
      keySet: {
        recoveryKey: {
          privateKeyJwk: {
            alg     : 'ES256K',
            crv     : 'secp256k1',
            d       : 'cy4EzFT9K0sdCcz0gnctkcPq0szOP-d8smA9Hvp5ejo',
            ext     : 'true',
            key_ops : ['sign'],
            kty     : 'EC',
            x       : 'vLvKcPjYVnJi6dZpq15PrJqdxBERuvL8EqvTh1_0ikg',
            y       : 'AsQstiUIt5tGyAyM7LzytsbdVbsb-5oWVNYIUEjOePs'
          },
          publicKeyJwk: {
            alg     : 'ES256K',
            crv     : 'secp256k1',
            ext     : 'true',
            key_ops : ['verify'],
            kty     : 'EC',
            x       : 'vLvKcPjYVnJi6dZpq15PrJqdxBERuvL8EqvTh1_0ikg',
            y       : 'AsQstiUIt5tGyAyM7LzytsbdVbsb-5oWVNYIUEjOePs'
          },
        },
        updateKey: {
          privateKeyJwk: {
            alg     : 'ES256K',
            crv     : 'secp256k1',
            d       : 'j4VcN2I5uw5kwPC5e8rxDaA7OxkmrJ-2BgdyKwayO9E',
            ext     : 'true',
            key_ops : ['sign'],
            kty     : 'EC',
            x       : '4Z9Tt1tuFlI3YwJfT3eS72r0sa9UxdtalgW14gep2DQ',
            y       : 'FIAtUW8B54L0Y-0e9n_rc1GJhxMIkZ3iYGnMQufgT_s'
          },
          publicKeyJwk: {
            alg     : 'ES256K',
            crv     : 'secp256k1',
            ext     : 'true',
            key_ops : ['verify'],
            kty     : 'EC',
            x       : '4Z9Tt1tuFlI3YwJfT3eS72r0sa9UxdtalgW14gep2DQ',
            y       : 'FIAtUW8B54L0Y-0e9n_rc1GJhxMIkZ3iYGnMQufgT_s'
          }
        },
        verificationMethodKeys: [{
          publicKeyJwk: {
            alg : 'ES256K',
            crv : 'secp256k1',
            kty : 'EC',
            x   : 'gdpQnpSlWSJXQEJJjVnNEi6-5H1L-jwNCDchM_JHDZQ',
            y   : 'SnEwisOamyUA7HYh8NKwYwgAR6_0CvHXWG26tXJa4RU'
          },
          relationships: ['authentication']
        }],
      },
      keyAlgorithm: 'secp256k1'
    },
    output: {
      canonicalId : 'did:ion:EiAeqx3f9VMGhk35znqsCEZuELryh8mXUyhnou1Zf6YpDw',
      did         : 'did:ion:EiAeqx3f9VMGhk35znqsCEZuELryh8mXUyhnou1Zf6YpDw:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiJLNkJwQW9xSU1La2d1Z2xGV0hNT01Xam5VM1BzeUhfQzBSZVJzUDZqRW0wIiwicHVibGljS2V5SndrIjp7ImNydiI6InNlY3AyNTZrMSIsImt0eSI6IkVDIiwieCI6ImdkcFFucFNsV1NKWFFFSkpqVm5ORWk2LTVIMUwtandOQ0RjaE1fSkhEWlEiLCJ5IjoiU25Fd2lzT2FteVVBN0hZaDhOS3dZd2dBUjZfMEN2SFhXRzI2dFhKYTRSVSJ9LCJwdXJwb3NlcyI6WyJhdXRoZW50aWNhdGlvbiJdLCJ0eXBlIjoiSnNvbldlYktleTIwMjAifV0sInNlcnZpY2VzIjpbXX19XSwidXBkYXRlQ29tbWl0bWVudCI6IkVpRFZyOHUzVWxvOGtNVUx3WEh6VUdSMFdGdy1ROU14el8zRGQyQXEwVF9KR3cifSwic3VmZml4RGF0YSI6eyJkZWx0YUhhc2giOiJFaUI0SzdZNHJtVEZTUjFWVUVlOEE1blQ0UnRpa1B6R3NTYjluOWl0SzJQWlhnIiwicmVjb3ZlcnlDb21taXRtZW50IjoiRWlEOEQtdjlsVjdqTzZ3ajVjSXVsRXRwZEFqaHE5NEFnTm54SlozWThVUnlrZyJ9fQ',
      document    : {
        '@context': [
          'https://www.w3.org/ns/did/v1',
          {
            '@base': 'did:ion:EiAeqx3f9VMGhk35znqsCEZuELryh8mXUyhnou1Zf6YpDw:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiJLNkJwQW9xSU1La2d1Z2xGV0hNT01Xam5VM1BzeUhfQzBSZVJzUDZqRW0wIiwicHVibGljS2V5SndrIjp7ImNydiI6InNlY3AyNTZrMSIsImt0eSI6IkVDIiwieCI6ImdkcFFucFNsV1NKWFFFSkpqVm5ORWk2LTVIMUwtandOQ0RjaE1fSkhEWlEiLCJ5IjoiU25Fd2lzT2FteVVBN0hZaDhOS3dZd2dBUjZfMEN2SFhXRzI2dFhKYTRSVSJ9LCJwdXJwb3NlcyI6WyJhdXRoZW50aWNhdGlvbiJdLCJ0eXBlIjoiSnNvbldlYktleTIwMjAifV0sInNlcnZpY2VzIjpbXX19XSwidXBkYXRlQ29tbWl0bWVudCI6IkVpRFZyOHUzVWxvOGtNVUx3WEh6VUdSMFdGdy1ROU14el8zRGQyQXEwVF9KR3cifSwic3VmZml4RGF0YSI6eyJkZWx0YUhhc2giOiJFaUI0SzdZNHJtVEZTUjFWVUVlOEE1blQ0UnRpa1B6R3NTYjluOWl0SzJQWlhnIiwicmVjb3ZlcnlDb21taXRtZW50IjoiRWlEOEQtdjlsVjdqTzZ3ajVjSXVsRXRwZEFqaHE5NEFnTm54SlozWThVUnlrZyJ9fQ'
          },
        ],
        id                   : 'did:ion:EiAeqx3f9VMGhk35znqsCEZuELryh8mXUyhnou1Zf6YpDw:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiJLNkJwQW9xSU1La2d1Z2xGV0hNT01Xam5VM1BzeUhfQzBSZVJzUDZqRW0wIiwicHVibGljS2V5SndrIjp7ImNydiI6InNlY3AyNTZrMSIsImt0eSI6IkVDIiwieCI6ImdkcFFucFNsV1NKWFFFSkpqVm5ORWk2LTVIMUwtandOQ0RjaE1fSkhEWlEiLCJ5IjoiU25Fd2lzT2FteVVBN0hZaDhOS3dZd2dBUjZfMEN2SFhXRzI2dFhKYTRSVSJ9LCJwdXJwb3NlcyI6WyJhdXRoZW50aWNhdGlvbiJdLCJ0eXBlIjoiSnNvbldlYktleTIwMjAifV0sInNlcnZpY2VzIjpbXX19XSwidXBkYXRlQ29tbWl0bWVudCI6IkVpRFZyOHUzVWxvOGtNVUx3WEh6VUdSMFdGdy1ROU14el8zRGQyQXEwVF9KR3cifSwic3VmZml4RGF0YSI6eyJkZWx0YUhhc2giOiJFaUI0SzdZNHJtVEZTUjFWVUVlOEE1blQ0UnRpa1B6R3NTYjluOWl0SzJQWlhnIiwicmVjb3ZlcnlDb21taXRtZW50IjoiRWlEOEQtdjlsVjdqTzZ3ajVjSXVsRXRwZEFqaHE5NEFnTm54SlozWThVUnlrZyJ9fQ',
        'verificationMethod' : [
          {
            id           : '#K6BpAoqIMKkguglFWHMOMWjnU3PsyH_C0ReRsP6jEm0',
            type         : 'JsonWebKey2020',
            controller   : 'did:ion:EiAeqx3f9VMGhk35znqsCEZuELryh8mXUyhnou1Zf6YpDw:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiJLNkJwQW9xSU1La2d1Z2xGV0hNT01Xam5VM1BzeUhfQzBSZVJzUDZqRW0wIiwicHVibGljS2V5SndrIjp7ImNydiI6InNlY3AyNTZrMSIsImt0eSI6IkVDIiwieCI6ImdkcFFucFNsV1NKWFFFSkpqVm5ORWk2LTVIMUwtandOQ0RjaE1fSkhEWlEiLCJ5IjoiU25Fd2lzT2FteVVBN0hZaDhOS3dZd2dBUjZfMEN2SFhXRzI2dFhKYTRSVSJ9LCJwdXJwb3NlcyI6WyJhdXRoZW50aWNhdGlvbiJdLCJ0eXBlIjoiSnNvbldlYktleTIwMjAifV0sInNlcnZpY2VzIjpbXX19XSwidXBkYXRlQ29tbWl0bWVudCI6IkVpRFZyOHUzVWxvOGtNVUx3WEh6VUdSMFdGdy1ROU14el8zRGQyQXEwVF9KR3cifSwic3VmZml4RGF0YSI6eyJkZWx0YUhhc2giOiJFaUI0SzdZNHJtVEZTUjFWVUVlOEE1blQ0UnRpa1B6R3NTYjluOWl0SzJQWlhnIiwicmVjb3ZlcnlDb21taXRtZW50IjoiRWlEOEQtdjlsVjdqTzZ3ajVjSXVsRXRwZEFqaHE5NEFnTm54SlozWThVUnlrZyJ9fQ',
            publicKeyJwk : {
              crv : 'secp256k1',
              kty : 'EC',
              x   : 'gdpQnpSlWSJXQEJJjVnNEi6-5H1L-jwNCDchM_JHDZQ',
              y   : 'SnEwisOamyUA7HYh8NKwYwgAR6_0CvHXWG26tXJa4RU'
            }
          }
        ],
        authentication: [
          '#K6BpAoqIMKkguglFWHMOMWjnU3PsyH_C0ReRsP6jEm0'
        ],
        service: []
      },
      keySet: {
        recoveryKey: {
          privateKeyJwk: {
            alg     : 'ES256K',
            crv     : 'secp256k1',
            d       : 'cy4EzFT9K0sdCcz0gnctkcPq0szOP-d8smA9Hvp5ejo',
            ext     : 'true',
            key_ops : ['sign'],
            kid     : 'AEOG_sxXHhCA1Fel8fpheyLxAcW89D7V86lMcJXc500',
            kty     : 'EC',
            x       : 'vLvKcPjYVnJi6dZpq15PrJqdxBERuvL8EqvTh1_0ikg',
            y       : 'AsQstiUIt5tGyAyM7LzytsbdVbsb-5oWVNYIUEjOePs'
          },
          publicKeyJwk: {
            alg     : 'ES256K',
            crv     : 'secp256k1',
            ext     : 'true',
            key_ops : ['verify'],
            kid     : 'AEOG_sxXHhCA1Fel8fpheyLxAcW89D7V86lMcJXc500',
            kty     : 'EC',
            x       : 'vLvKcPjYVnJi6dZpq15PrJqdxBERuvL8EqvTh1_0ikg',
            y       : 'AsQstiUIt5tGyAyM7LzytsbdVbsb-5oWVNYIUEjOePs'
          },
        },
        updateKey: {
          privateKeyJwk: {
            alg     : 'ES256K',
            crv     : 'secp256k1',
            d       : 'j4VcN2I5uw5kwPC5e8rxDaA7OxkmrJ-2BgdyKwayO9E',
            ext     : 'true',
            key_ops : ['sign'],
            kid     : '_1CySHVtk6tNXke3t_7NLI2nvaVlH5GFyuO9HjQCRKs',
            kty     : 'EC',
            x       : '4Z9Tt1tuFlI3YwJfT3eS72r0sa9UxdtalgW14gep2DQ',
            y       : 'FIAtUW8B54L0Y-0e9n_rc1GJhxMIkZ3iYGnMQufgT_s'
          },
          publicKeyJwk: {
            alg     : 'ES256K',
            crv     : 'secp256k1',
            ext     : 'true',
            key_ops : ['verify'],
            kid     : '_1CySHVtk6tNXke3t_7NLI2nvaVlH5GFyuO9HjQCRKs',
            kty     : 'EC',
            x       : '4Z9Tt1tuFlI3YwJfT3eS72r0sa9UxdtalgW14gep2DQ',
            y       : 'FIAtUW8B54L0Y-0e9n_rc1GJhxMIkZ3iYGnMQufgT_s'
          }
        },
        verificationMethodKeys: [{
          publicKeyJwk: {
            alg : 'ES256K',
            crv : 'secp256k1',
            kid : 'K6BpAoqIMKkguglFWHMOMWjnU3PsyH_C0ReRsP6jEm0',
            kty : 'EC',
            x   : 'gdpQnpSlWSJXQEJJjVnNEi6-5H1L-jwNCDchM_JHDZQ',
            y   : 'SnEwisOamyUA7HYh8NKwYwgAR6_0CvHXWG26tXJa4RU'
          },
          relationships: ['authentication']
        }],
      },
    }
  }
];