import type { ProtocolDefinition } from '@tbd54566975/dwn-sdk-js';

import { DwnDataStore } from './store-data.js';
import { Jwk } from '@web5/crypto';

export class IdentityProtocolStore<TStoreObject extends Record<string, any>> extends DwnDataStore<TStoreObject> {
  protected _recordProtocolDefinition: ProtocolDefinition = {
    protocol  : 'http://identity.foundation/protocols/web5/identity-store',
    published : false,
    types     : {
      portableDid: {
        schema      : 'https://identity.foundation/schemas/web5/portable-did',
        dataFormats : [
          'application/json'
        ]
      },
      identityMetadata: {
        schema      : 'https://identity.foundation/schemas/web5/identity-metadata',
        dataFormats : [
          'application/json'
        ]
      }
    },
    structure: {
      portableDid      : {},
      identityMetadata : {}
    }
  };
}

export class JWKProtocolStore<TStoreObject extends Record<string, any> = Jwk> extends  DwnDataStore<TStoreObject> {
  protected _recordProtocolDefinition: ProtocolDefinition = {
    protocol  : 'http://identity.foundation/protocols/web5/jwk-store',
    published : false,
    types     : {
      privateJwk: {
        schema      : 'https://identity.foundation/schemas/web5/private-jwk',
        dataFormats : [
          'application/json'
        ]
      },
    },
    structure: {
      privateJwk: {}
    }
  };
}