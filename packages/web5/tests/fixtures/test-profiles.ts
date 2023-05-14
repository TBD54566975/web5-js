import type { DidIonCreateOptions, KeyOption } from '@tbd54566975/dids';
import type { TestProfileOptions } from '../test-utils/test-user-agent.js';

import { generateKeyPair } from '@decentralized-identity/ion-tools';

export const keyIds = {
  did: {
    service: {
      dwn: {
        attestation   : 'attest',
        authorization : 'authz',
        encryption    : 'encr',
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
                      nodes                    : ['https://dwn.tbddev.org/dwn0'],
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

        keys: async (): Promise<DidIonCreateOptions> => {
          let profileKeys: KeyOption[] = [];
          profileKeys.push(await keys.secp256k1.jwk.authorization());

          return {
            keys     : profileKeys,
            services : [{
              id              : 'dwn',
              type            : 'DecentralizedWebNode',
              serviceEndpoint : {
                nodes                  : ['https://dwn.tbddev.org/dwn0'],
                messageAttestationKeys : [`#${keyIds.did.service.dwn.attestation}`],
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