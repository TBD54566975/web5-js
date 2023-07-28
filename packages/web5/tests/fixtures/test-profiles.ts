import type { DidIonCreateOptions, KeyOption } from '@tbd54566975/dids';
import type { TestProfileOptions } from '../test-utils/test-user-agent.js';

import { generateKeyPair } from '@decentralized-identity/ion-tools';

// const dwnNodes = ['https://dwn.tbddev.org/dwn0'];
const dwnNodes = ['http://localhost:3000'];

export const keyIds = {
  did: {
    service: {
      dwn: {
        attestation   : 'attest',
        authorization : 'authz',
        encryption    : 'enc',
      }
    }
  }
};

export const keys = {
  secp256k1: {
    jwk: {
      attestation: async (): Promise<KeyOption> => {
        return {
          id       : keyIds.did.service.dwn.attestation,
          type     : 'JsonWebKey2020',
          keyPair  : await generateKeyPair('secp256k1'),
          purposes : ['authentication'],
        };
      },

      authorization: async (): Promise<KeyOption> => {
        return {
          id       : keyIds.did.service.dwn.authorization,
          type     : 'JsonWebKey2020',
          keyPair  : await generateKeyPair('secp256k1'),
          purposes : ['authentication'],
        };
      },

      encryption: async (): Promise<KeyOption> => {
        return {
          id       : keyIds.did.service.dwn.encryption,
          type     : 'JsonWebKey2020',
          keyPair  : await generateKeyPair('secp256k1'),
          purposes : ['keyAgreement'],
        };
      }
    }
  }
};

export const ionCreateOptions = {
  services: {
    dwn: {
      authorization: {
        encryption: {
          attestation: {

            // Authorization, Encryption, and Attestation keys.
            keys: async (): Promise<DidIonCreateOptions> => {
              let profileKeys: KeyOption[] = [];
              profileKeys.push(await keys.secp256k1.jwk.attestation());
              profileKeys.push(await keys.secp256k1.jwk.authorization());
              profileKeys.push(await keys.secp256k1.jwk.encryption());
              return {
                keys     : profileKeys,
                services : [
                  {
                    id              : 'dwn',
                    type            : 'DecentralizedWebNode',
                    serviceEndpoint : {
                      nodes                    : dwnNodes,
                      messageAttestationKeys   : [`#${keyIds.did.service.dwn.attestation}`],
                      messageAuthorizationKeys : [`#${keyIds.did.service.dwn.authorization}`],
                      recordEncryptionKeys     : [`#${keyIds.did.service.dwn.encryption}`]
                    }
                  }
                ]
              };
            }
          }
        },

        // Authorization and Encryption keys.
        keys: async (): Promise<DidIonCreateOptions> => {
          let profileKeys: KeyOption[] = [];
          profileKeys.push(await keys.secp256k1.jwk.authorization());
          return {
            keys     : profileKeys,
            services : [{
              id              : 'dwn',
              type            : 'DecentralizedWebNode',
              serviceEndpoint : {
                nodes                    : dwnNodes,
                messageAuthorizationKeys : [`#${keyIds.did.service.dwn.authorization}`],
              }
            }]
          };
        }
      }
    }
  }
};

export const ion = {
  with: {
    dwn: {
      service: {
        and: {
          authorization: {
            encryption: {
              attestation: {
                keys: async (): Promise<TestProfileOptions> => {
                  return {
                    profileDidOptions: await ionCreateOptions.services.dwn.authorization.encryption.attestation.keys()
                  };
                }
              }
            },

            keys: async (): Promise<TestProfileOptions> => {
              return {
                profileDidOptions: await ionCreateOptions.services.dwn.authorization.keys()
              };
            }
          }
        }
      }
    }
  }
};