import type { ProtocolDefinition } from '@tbd54566975/dwn-sdk-js';

export const IdentityProtocolDefinition: ProtocolDefinition = {
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
    },
    delegatedIdentity: {
      schema      : 'https://identity.foundation/schemas/web5/delegated-identity',
      dataFormats : [
        'application/json'
      ]
    }
  },
  structure: {
    portableDid       : {},
    identityMetadata  : {},
    delegatedIdentity : {}
  }
};

export const JwkProtocolDefinition: ProtocolDefinition = {
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