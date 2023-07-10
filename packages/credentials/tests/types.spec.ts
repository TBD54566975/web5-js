import { expect } from 'chai';
import {getCurrentXmlSchema112Timestamp, getFutureXmlSchema112Timestamp} from '../src/utils.js';
import {VerifiableCredential, CredentialSubject, Issuer, CredentialStatus } from '../src/types.js';

describe('credential types', () => {
  it('creates a vc', () => {
    const credentialSubject: CredentialSubject = {
      id: 'did:example:ebfeb1f712ebc6f1c276e12ec21',
    };

    const issuer: Issuer = {
      id        : 'did:example:123456',
      otherProp : 'value', // Replace with actual properties as needed
    };

    const credentialStatus: CredentialStatus = {
      id   : 'http://example.com/status/123',
      type : 'CredentialStatusType1',
    };

    // Create the credential
    const credential: VerifiableCredential = {
      '@context'        : ['https://www.w3.org/2018/credentials/v1'],
      type              : ['VerifiableCredential'],
      issuer            : issuer,
      issuanceDate      : getCurrentXmlSchema112Timestamp(),
      credentialSubject : credentialSubject,
      credentialStatus  : credentialStatus,
      credentialSchema  : {
        id   : 'http://example.com/schema/123',
        type : 'SchemaType1',
      },
      id             : 'http://example.edu/credentials/3732',
      expirationDate : getFutureXmlSchema112Timestamp(60 * 60 * 24 * 365),
      name           : 'Credential Name',
      description    : 'Credential Description',
    // Include other properties here
    };

    // Check that credential has all the properties required for ICredential
    expect(credential).to.have.property('@context');
    expect(credential).to.have.property('type');
    expect(credential).to.have.property('issuer');
    expect(credential).to.have.property('issuanceDate');
    expect(credential).to.have.property('credentialSubject');
    expect(credential).to.have.property('credentialStatus');
    expect(credential).to.have.property('credentialSchema');
    expect(credential).to.have.property('id');
    expect(credential).to.have.property('expirationDate');
    expect(credential).to.have.property('name');
    expect(credential).to.have.property('description');
  });

  it('creates a minimum viable vc', () => {
    const credential: VerifiableCredential = {
      '@context'        : ['https://www.w3.org/2018/credentials/v1'],
      type              : ['VerifiableCredential'],
      issuer            : { id: 'did:example:123456' },
      issuanceDate      : getCurrentXmlSchema112Timestamp(),
      credentialSubject : { id: 'did:example:ebfeb1f712ebc6f1c276e12ec21' },
    };

    expect(credential).to.have.property('@context');
    expect(credential).to.have.property('type');
    expect(credential).to.have.property('issuer');
    expect(credential).to.have.property('issuanceDate');
    expect(credential).to.have.property('credentialSubject');
  });
});