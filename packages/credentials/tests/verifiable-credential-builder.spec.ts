import { expect } from 'chai';

import type { CredentialSubject, Issuer } from '../src/types.js';
import {VerifiableCredentialBuilder}  from '../src/verifiable-credential-builder.js';
import { DidKeyApi } from '../../dids/src/did-key.js';


describe('VCBuilder', async () => {
  const didKey = new DidKeyApi();
  const did = await didKey.create();

  const credentialSubject: CredentialSubject = {
    id: did.id
  };

  const issuer: Issuer = {
    id: did.id
  };

  describe('VCBuilder builds VC()', () => {
    it('can build a valid vc', async () => {
      const vcBuilder = new VerifiableCredentialBuilder(credentialSubject, issuer);
      const vc = vcBuilder.build();

      expect(vc).to.exist;

      expect(vc['@context']).to.include('https://www.w3.org/2018/credentials/v1');
      expect(vc.credentialSubject).to.equal(credentialSubject);
      expect(vc.issuer).to.equal(issuer);
      expect(vc.type).to.include('VerifiableCredential');
      expect(vc.issuanceDate).to.exist;

      expect(vc.id).to.not.exist;
      expect(vc.credentialStatus).to.not.exist;
      expect(vc.expirationDate).to.not.exist;


    });

    it('can set the ID', () => {
      const vcBuilder = new VerifiableCredentialBuilder(credentialSubject, issuer);
      vcBuilder.setID('customID');
      const vc = vcBuilder.build();

      expect(vc.id).to.equal('customID');
    });

    it('throws an error when setting an empty ID', () => {
      const vcBuilder = new VerifiableCredentialBuilder(credentialSubject, issuer);

      expect(() => vcBuilder.setID('')).to.throw('id cannot be empty');
    });

    it('can add new context', () => {
      const vcBuilder = new VerifiableCredentialBuilder(credentialSubject, issuer);
      vcBuilder.addContext(['newContext']);
      const vc = vcBuilder.build();

      expect(vc['@context']).to.include('https://www.w3.org/2018/credentials/v1');
      expect(vc['@context']).to.include('newContext');
      expect(vc['@context'].length).to.equal(2);
    });

    it('can add new type', () => {
      const vcBuilder = new VerifiableCredentialBuilder(credentialSubject, issuer);
      vcBuilder.addType('newType');
      const vc = vcBuilder.build();

      expect(vc.type).to.include('newType');
      expect(vc.type).to.include('VerifiableCredential');
      expect(vc.type!.length).to.equal(2);
    });


    it('can set the issuer', () => {
      const vcBuilder = new VerifiableCredentialBuilder(credentialSubject, issuer);
      vcBuilder.setIssuer({ id: 'customIssuer' });
      const vc = vcBuilder.build();

      expect(vc.issuer).to.deep.equal({ id: 'customIssuer' });
    });

    it('throws an error when setting an empty issuer', () => {
      const vcBuilder = new VerifiableCredentialBuilder(credentialSubject, issuer);

      expect(() => vcBuilder.setIssuer({} as Issuer)).to.throw('issuer must be a non-empty object');
    });

    it('can set the issuance date', () => {
      const vcBuilder = new VerifiableCredentialBuilder(credentialSubject, issuer);
      vcBuilder.setIssuanceDate('2023-12-31T23:59:59Z');
      const vc = vcBuilder.build();

      expect(vc.issuanceDate).to.equal('2023-12-31T23:59:59Z');
    });

    it('throws an error when setting an empty issuance date', () => {
      const vcBuilder = new VerifiableCredentialBuilder(credentialSubject, issuer);

      expect(() => vcBuilder.setIssuanceDate('')).to.throw('issuanceDate cannot be empty');
    });

    it('throws an error when setting an invalid issuance date', () => {
      const vcBuilder = new VerifiableCredentialBuilder(credentialSubject, issuer);

      expect(() => vcBuilder.setIssuanceDate('not-a-date')).to.throw('issuanceDate is not a valid RFC3339 timestamp');
    });

    it('can set the expiration date', () => {
      const vcBuilder = new VerifiableCredentialBuilder(credentialSubject, issuer);
      vcBuilder.setExpirationDate('2024-12-31T23:59:59Z');
      const vc = vcBuilder.build();

      expect(vc.expirationDate).to.equal('2024-12-31T23:59:59Z');
    });

    it('throws an error when setting an empty expiration date', () => {
      const vcBuilder = new VerifiableCredentialBuilder(credentialSubject, issuer);

      expect(() => vcBuilder.setExpirationDate('')).to.throw('expirationDate cannot be empty');
    });

    it('throws an error when setting an invalid expiration date', () => {
      const vcBuilder = new VerifiableCredentialBuilder(credentialSubject, issuer);

      expect(() => vcBuilder.setExpirationDate('not-a-date')).to.throw('expirationDate is not a valid RFC3339 timestamp');
    });

  });
});
