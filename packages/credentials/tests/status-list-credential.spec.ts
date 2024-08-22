import type { BearerDid } from '@web5/dids';

import { expect } from 'chai';
import { DidJwk } from '@web5/dids';

import { VerifiableCredential } from '../src/verifiable-credential.js';
import { StatusList2021Entry, StatusListCredential, StatusPurpose } from '../src/status-list-credential.js';

describe('Status List Credential Tests', () => {
  let issuerDid: BearerDid;
  let holderDid: BearerDid;

  class StreetCredibility {
    constructor(
      public localRespect: string,
      public legit: boolean
    ) {}
  }

  beforeEach(async () => {
    issuerDid = await DidJwk.create();
    holderDid = await DidJwk.create();
  });

  describe('Status List Credential', () => {
    it('create status list credential works', async () => {
      const subjectDid = issuerDid;

      const credentialStatus: StatusList2021Entry = {
        id                   : 'cred-with-status-id',
        type                 : 'StatusList2021Entry',
        statusPurpose        : 'revocation',
        statusListIndex      : '94567',
        statusListCredential : 'https://statuslistcred.com/123',
      };

      const credWithCredStatus = await VerifiableCredential.create({
        type             : 'StreetCred',
        issuer           : issuerDid.uri,
        subject          : subjectDid.uri,
        data             : new StreetCredibility('high', true),
        credentialStatus : credentialStatus
      });

      const credWithStatusContexts = credWithCredStatus.vcDataModel['@context'] as string[];

      expect(credWithStatusContexts.some(context => context.includes('https://w3id.org/vc/status-list/2021/v1'))).to.be.true;
      expect(credWithStatusContexts.some(context => context.includes('https://www.w3.org/2018/credentials/v1'))).to.be.true;

      expect(credWithCredStatus.vcDataModel.credentialStatus).to.deep.equal(credentialStatus);

      const statusListCred = StatusListCredential.create({
        statusListCredentialId : 'https://statuslistcred.com/123',
        issuer                 : issuerDid.uri,
        statusPurpose          : StatusPurpose.revocation,
        credentialsToDisable   : [credWithCredStatus]
      });

      const statusListCredContexts = statusListCred.vcDataModel['@context'];

      expect(statusListCred.vcDataModel.id).to.equal('https://statuslistcred.com/123');
      expect(statusListCredContexts).to.include('https://www.w3.org/2018/credentials/v1');
      expect(statusListCredContexts).to.include('https://w3id.org/vc/status-list/2021/v1');
      expect(statusListCred.type).to.include('StatusList2021Credential');
      expect(statusListCred.issuer).to.equal(issuerDid.uri);

      const statusListCredSubject = statusListCred.vcDataModel.credentialSubject as any;
      expect(statusListCredSubject['id']).to.equal('https://statuslistcred.com/123');
      expect(statusListCredSubject['type']).to.equal('StatusList2021');
      expect(statusListCredSubject['statusPurpose']).to.equal(StatusPurpose.revocation);

      expect(statusListCredSubject['encodedList']).to.equal('H4sIAAAAAAAAA-3OMQ0AAAgDsOHfNBp2kZBWQRMAAAAAAAAAAAAAAL6Z6wAAAAAAtQVQdb5gAEAAAA');
    });

    it('should generate StatusListCredential from multiple revoked VerifiableCredentials', async () => {
      const credentialStatus1 = {
        id                   : 'cred-with-status-id',
        type                 : 'StatusList2021Entry',
        statusPurpose        : 'revocation',
        statusListIndex      : '123',
        statusListCredential : 'https://example.com/credentials/status/3'
      };

      const vc1 = await VerifiableCredential.create({
        type             : 'StreetCred',
        issuer           : issuerDid.uri,
        subject          : holderDid.uri,
        data             : new StreetCredibility('high', true),
        credentialStatus : credentialStatus1
      });

      const credentialStatus2 = {
        id                   : 'cred-with-status-id',
        type                 : 'StatusList2021Entry',
        statusPurpose        : 'revocation',
        statusListIndex      : '124',
        statusListCredential : 'https://example.com/credentials/status/3'
      };

      const vc2 = await VerifiableCredential.create({
        type             : 'StreetCred',
        issuer           : issuerDid.uri,
        subject          : holderDid.uri,
        data             : new StreetCredibility('high', true),
        credentialStatus : credentialStatus2
      });


      const credentialStatus3 = {
        id                   : 'cred-with-status-id',
        type                 : 'StatusList2021Entry',
        statusPurpose        : 'revocation',
        statusListIndex      : '1247',
        statusListCredential : 'https://example.com/credentials/status/3'
      };

      const vc3 = await VerifiableCredential.create({
        type             : 'StreetCred',
        issuer           : issuerDid.uri,
        subject          : holderDid.uri,
        data             : new StreetCredibility('high', true),
        credentialStatus : credentialStatus3
      });

      const statusListCredential = await StatusListCredential.create({
        statusListCredentialId : 'revocation-id',
        issuer                 : issuerDid.uri,
        statusPurpose          : StatusPurpose.revocation,
        credentialsToDisable   : [vc1, vc2]
      });

      expect(statusListCredential).not.be.undefined;
      expect(statusListCredential.subject).to.equal('revocation-id');

      const credentialSubject = statusListCredential.vcDataModel.credentialSubject as any;
      expect(credentialSubject['type']).to.equal('StatusList2021');
      expect(credentialSubject['statusPurpose']).to.equal('revocation');

      // TODO: Check encoding across other sdks and spec - https://github.com/TBD54566975/web5-kt/issues/52
      expect(credentialSubject['encodedList']).to.equal('H4sIAAAAAAAAA-3BMQEAAAjAoMWwf1JvC3gBdUwAAAAAAAAAAAAAAAAAAADAuwUYSEbMAEAAAA');

      expect(StatusListCredential.validateCredentialInStatusList(vc1, statusListCredential)).to.be.true;
      expect(StatusListCredential.validateCredentialInStatusList(vc2, statusListCredential)).to.be.true;
      expect(StatusListCredential.validateCredentialInStatusList(vc3, statusListCredential)).to.be.false;
    });

    it('should fail when generating StatusListCredential with duplicate indexes', async () => {
      const subjectDid = issuerDid;

      const credentialStatus = {
        id                   : 'cred-with-status-id',
        type                 : 'StatusList2021Entry',
        statusPurpose        : 'revocation',
        statusListIndex      : '94567',
        statusListCredential : 'https://statuslistcred.com/123',
      };

      const credWithCredStatus = await VerifiableCredential.create({
        type             : 'StreetCred',
        issuer           : issuerDid.uri,
        subject          : subjectDid.uri,
        data             : new StreetCredibility('high', true),
        credentialStatus : credentialStatus
      });

      expect(() =>
        StatusListCredential.create({
          statusListCredentialId : 'https://statuslistcred.com/123',
          issuer                 : issuerDid.uri,
          statusPurpose          : StatusPurpose.revocation,
          credentialsToDisable   : [credWithCredStatus, credWithCredStatus]
        })
      ).to.throw('duplicate entry found with index: 94567');
    });

    it('should fail when generating StatusListCredential with negative index', async () => {
      const subjectDid = issuerDid;

      const credentialStatus = {
        id                   : 'cred-with-status-id',
        type                 : 'StatusList2021Entry',
        statusPurpose        : 'revocation',
        statusListIndex      : '-3',
        statusListCredential : 'https://statuslistcred.com/123',
      };

      const credWithCredStatus = await VerifiableCredential.create({
        type             : 'StreetCred',
        issuer           : issuerDid.uri,
        subject          : subjectDid.uri,
        data             : new StreetCredibility('high', true),
        credentialStatus : credentialStatus
      });

      expect(() =>
        StatusListCredential.create({
          statusListCredentialId : 'https://statuslistcred.com/123',
          issuer                 : issuerDid.uri,
          statusPurpose          : StatusPurpose.revocation,
          credentialsToDisable   : [credWithCredStatus]
        })
      ).to.throw('status list index cannot be negative');
    });

    it('should fail when generating StatusListCredential with an index larger than maximum size', async () => {
      const subjectDid = issuerDid;

      const credentialStatus = {
        id                   : 'cred-with-status-id',
        type                 : 'StatusList2021Entry',
        statusPurpose        : 'revocation',
        statusListIndex      : Number.MAX_SAFE_INTEGER.toString(),
        statusListCredential : 'https://statuslistcred.com/123',
      };

      const credWithCredStatus = await VerifiableCredential.create({
        type             : 'StreetCred',
        issuer           : issuerDid.uri,
        subject          : subjectDid.uri,
        data             : new StreetCredibility('high', true),
        credentialStatus : credentialStatus
      });

      expect(() =>
        StatusListCredential.create({
          statusListCredentialId : 'https://statuslistcred.com/123',
          issuer                 : issuerDid.uri,
          statusPurpose          : StatusPurpose.revocation,
          credentialsToDisable   : [credWithCredStatus]
        })
      ).to.throw('status list index is larger than the bitset size');
    });
  });

  // TODO: Add tests for validateCredentialInStatusList once we create new vectors - https://github.com/TBD54566975/web5-spec/issues/169
  // describe('Web5TestVectorsStatusListCredentials', () => {
  //   it('create', async () => {
  //     const vectors = StatusListCredentialsCreateTestVector.vectors;

  //     for (const vector of vectors) {
  //       const { input, output } = vector;

  //       const vcWithCredStatus = await VerifiableCredential.create({
  //         type             : input.credential.type,
  //         issuer           : input.credential.issuer,
  //         subject          : input.credential.subject,
  //         data             : input.credential.credentialSubject,
  //         credentialStatus : input.credential.credentialStatus
  //       });

  //       const statusListCred = StatusListCredential.create({
  //         statusListCredentialId : input.statusListCredential.statusListCredentialId,
  //         issuer                 : input.statusListCredential.issuer,
  //         statusPurpose          : input.statusListCredential.statusPurpose as StatusPurpose,
  //         credentialsToDisable   : [vcWithCredStatus]
  //       });

  //       expect(StatusListCredential.validateCredentialInStatusList(vcWithCredStatus, statusListCred)).to.be.true;

  //       const statusListCredSubject = statusListCred.vcDataModel.credentialSubject as any;
  //       expect(statusListCredSubject['type']).to.equal('StatusList2021');
  //       expect(statusListCredSubject['statusPurpose']).to.equal(input.statusListCredential.statusPurpose);
  //       expect(statusListCredSubject['encodedList']).to.equal(output.encodedList);
  //     }
  //   });
  // });
});