import { expect } from 'chai';
import {getCurrentXmlSchema112Timestamp, getFutureXmlSchema112Timestamp} from '../src/utils.js';
import {VerifiableCredential, CredentialSubject, Issuer } from '../src/types.js';

describe('VerifiableCredentials', () => {
  it('creates a vc', () => {
    const credentialSubject: CredentialSubject = {
      id: 'did:example:ebfeb1f712ebc6f1c276e12ec21',
    };

    const issuer: Issuer = {
      id        : 'did:example:123456',
      otherProp : 'value',
    };

    // Create the credential
    const credential: VerifiableCredential = {
      '@context'        : ['https://www.w3.org/2018/credentials/v1'],
      type              : ['VerifiableCredential'],
      issuer            : issuer,
      issuanceDate      : getCurrentXmlSchema112Timestamp(),
      credentialSubject : credentialSubject,
      credentialSchema  : {
        id   : 'http://example.com/schema/123',
        type : 'SchemaType1',
      },
      id             : 'http://example.edu/credentials/3732',
      expirationDate : getFutureXmlSchema112Timestamp(60 * 60 * 24 * 365), // expires in 1 year
      name           : 'Credential Name',
      description    : 'Credential Description',
    };

    expect(credential).to.have.property('@context');
    expect(credential).to.have.property('type');
    expect(credential).to.have.property('issuer');
    expect(credential).to.have.property('issuanceDate');
    expect(credential).to.have.property('credentialSubject');
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