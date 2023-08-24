import { expect } from 'chai';
import { VcJwt, VpJwt, EvaluationResults} from '../src/types.js';
import {VC, VP, CreateVcOptions, CreateVpOptions} from '../src/ssi.js';

describe('SSI Tests', () => {

  describe('Full Presentation Exchange', () => {
    it('does full Presentation Exchange', async() => {

      const signer = { kid: 'kid123', sign: (data: Uint8Array) => { return data; }};
      const subjectIssuerDid = 'abc:123';
      const vcCreateOptions = {credentialSubject: {id: subjectIssuerDid, btcAddress: 'abc123'}, issuer: {id: subjectIssuerDid}, signer: signer} as CreateVcOptions;
      const vcJwt:VcJwt = await VC.createVerifiableCredentialJwt(vcCreateOptions);

      const vpCreateOptions = {presentationDefinition: getPresentationDefinition(), verifiableCredentialJwts: [vcJwt], signer: signer} as CreateVpOptions;
      const vpJwt:VpJwt = await VP.createVerifiablePresentationJwt(vpCreateOptions);

      const result: EvaluationResults = VP.evaluatePresentation(getPresentationDefinition(), VP.decodeJwt(vpJwt).payload.vp);

    //   expect(vpJwt).to.exist;
    //   expect(VP.verify(vpJwt)).to.be.true;
    //   expect(vcJwt).to.exist;
    //   expect(VC.verify(vcJwt)).to.be.true;
    //   expect(result.errors).to.be.an('array');
    //   expect(result.errors.length).to.equal(0);
    });
  });
});

function getPresentationDefinition() {
  return {
    'id'                : 'test-pd-id',
    'name'              : 'simple PD',
    'purpose'           : 'pd for testing',
    'input_descriptors' : [
      {
        'id'          : 'whatever',
        'purpose'     : 'id for testing',
        'constraints' : {
          'fields': [
            {
              'path': [
                '$.credentialSubject.btcAddress',
              ]
            }
          ]
        }
      }
    ]
  };
}