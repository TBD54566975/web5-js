import { expect } from 'chai';
// import { VcJwt, VpJwt, VerifiableCredentialTypeV1, PresentationDefinition} from '../src/types.js';
// import {VerifiableCredential, VerifiablePresentation, CreateVcOptions, CreateVpOptions, SignOptions} from '../src/ssi.js';
import { VerifiableCredential, SignOptions } from '../src/verifiable-credential.js';
import { Ed25519, Jose } from '@web5/crypto';
import { DidKeyMethod } from '@web5/dids';
// import { getCurrentXmlSchema112Timestamp } from '../src/utils.js';

type Signer = (data: Uint8Array) => Promise<Uint8Array>;

describe('Verifiable Credential Tests', () => {
  let signer: Signer;
  let signOptions: SignOptions;

  class StreetCredibility {
    constructor(
      public localRespect: string,
      public legit: boolean
    ) {}
  }


  beforeEach(async () => {
    const alice = await DidKeyMethod.create();
    const [signingKeyPair] = alice.keySet.verificationMethodKeys!;
    const privateKey = (await Jose.jwkToKey({ key: signingKeyPair.privateKeyJwk!})).keyMaterial;
    signer = EdDsaSigner(privateKey);
    signOptions = {
      issuerDid  : alice.did,
      subjectDid : alice.did,
      kid        : alice.did + '#' + alice.did.split(':')[2],
      signer     : signer
    };
  });

  describe('Verifiable Credential (VC)', () => {
    it('create vc works', async () => {
      // const keyManager = new InMemoryKeyManager();
      const issuerDid = signOptions.issuerDid;
      const subjectDid = signOptions.subjectDid;

      const vc = VerifiableCredential.create(
        'StreetCred',
        issuerDid,
        subjectDid,
        new StreetCredibility('high', true),
      );

      expect(vc.issuer).to.equal(issuerDid);
      expect(vc.subject).to.equal(subjectDid);
      expect(vc.type).to.equal('StreetCred');
      expect(vc.vcDataModel.issuanceDate).to.not.be.undefined;
      expect(vc.vcDataModel.credentialSubject).to.deep.equal({ id: subjectDid, localRespect: 'high', legit: true });

    });


    it('signing vc works', async () => {
      const issuerDid = signOptions.issuerDid;
      const subjectDid = signOptions.subjectDid;

      const vc = VerifiableCredential.create(
        'StreetCred',
        issuerDid,
        subjectDid,
        new StreetCredibility('high', true),
      );

      const vcJwt = await vc.sign(signOptions);
      expect(vcJwt).to.not.be.null;
      expect(vcJwt).to.be.a('string');

      const parts = vcJwt.split('.');
      expect(parts.length).to.equal(3);
    });

    it('parseJwt throws ParseException if argument is not a valid JWT', () => {
      expect(() => {
        VerifiableCredential.parseJwt('hi');
      }).to.throw('Not a valid jwt');
    });

    it('verify fails with bad issuer did', async () => {
      const vc = VerifiableCredential.create(
        'StreetCred',
        'bad:did: invalidDid',
        signOptions.subjectDid,
        new StreetCredibility('high', true)
      );

      const badSignOptions = {
        issuerDid  : 'bad:did: invalidDid',
        subjectDid : signOptions.subjectDid,
        kid        : signOptions.issuerDid + '#' + signOptions.issuerDid.split(':')[2],
        signer     : signer
      };

      const vcJwt = await vc.sign(badSignOptions);

      await expectThrowsAsync(() =>  VerifiableCredential.verify(vcJwt), 'Unable to resolve DID');
    });

    it('parseJwt returns an instance of VerifiableCredential on success', async () => {
      const vc = VerifiableCredential.create(
        'StreetCred',
        signOptions.issuerDid,
        signOptions.subjectDid,
        new StreetCredibility('high', true)
      );

      const vcJwt = await vc.sign(signOptions);
      const parsedVc = VerifiableCredential.parseJwt(vcJwt);

      expect(parsedVc).to.not.be.null;
      expect(parsedVc.type).to.equal(vc.type);
      expect(parsedVc.issuer).to.equal(vc.issuer);
      expect(parsedVc.subject).to.equal(vc.subject);

      expect(vc.toString()).to.equal(parsedVc.toString());
    });

    it('fails to verify an invalid VC JWT', async () => {
      await expectThrowsAsync(() =>  VerifiableCredential.verify('invalid-jwt'), 'Not a valid jwt');
    });

    it('verify does not throw an exception with vaild vc', async () => {
      const vc = VerifiableCredential.create(
        'StreetCred',
        signOptions.issuerDid,
        signOptions.subjectDid,
        new StreetCredibility('high', true)
      );

      const vcJwt = await vc.sign(signOptions);

      await VerifiableCredential.verify(vcJwt);
    });
  });
});

function EdDsaSigner(privateKey: Uint8Array): Signer {
  return async (data: Uint8Array): Promise<Uint8Array> => {
    const signature = await Ed25519.sign({ data, key: privateKey});
    return signature;
  };
}

const expectThrowsAsync = async (method: any, errorMessage: string) => {
  let error: any = null;
  try {
    await method();
  }
  catch (err) {
    error = err;
  }
  expect(error).to.be.an('Error');
  if (errorMessage) {
    expect(error.message).to.contain(errorMessage);
  }
};