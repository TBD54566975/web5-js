import { expect } from 'chai';
import { DidKeyMethod } from '@web5/dids';
import { Ed25519, Jose } from '@web5/crypto';
import { PresentationExchange, Validated, PresentationDefinitionV2 } from '../src/presentation-exchange.js';
import { VerifiableCredential, SignOptions } from '../src/verifiable-credential.js';

type Signer = (data: Uint8Array) => Promise<Uint8Array>;

class BitcoinCredential {
  constructor(
    public btcAddress: string
  ) {}
}

describe('PresentationExchange', () => {
  describe('Full Presentation Exchange', () => {
    let signOptions: SignOptions;
    let btcCredentialJwt: string;
    let presentationDefinition: PresentationDefinitionV2;

    before(async () => {
      const alice = await DidKeyMethod.create();
      const [signingKeyPair] = alice.keySet.verificationMethodKeys!;
      const privateKey = (await Jose.jwkToKey({ key: signingKeyPair.privateKeyJwk!})).keyMaterial;
      const signer = EdDsaSigner(privateKey);
      signOptions = {
        issuerDid  : alice.did,
        subjectDid : alice.did,
        kid        : alice.did + '#' + alice.did.split(':')[2],
        signer     : signer
      };

      const vc = VerifiableCredential.create(
        'StreetCred',
        alice.did,
        alice.did,
        new BitcoinCredential('btcAddress123'),
      );

      btcCredentialJwt = await vc.sign(signOptions);
      presentationDefinition = createPresentationDefinition();
    });

    it('should evaluate credentials without any errors or warnings', async () => {
      PresentationExchange.satisfiesPresentationDefinition([btcCredentialJwt], presentationDefinition);
    });

    it('should evaluate that the credential does not satisfy the presentation definition', async () => {
      const incorrectPresentationDefinition = {
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
                    '$.credentialSubject.doesNotExist',
                  ]
                }
              ]
            }
          }
        ]
      };

      await expectThrowsAsync(() =>  PresentationExchange.satisfiesPresentationDefinition([btcCredentialJwt], incorrectPresentationDefinition), 'Input candidate does not contain property');
    });

    it('should successfully create a presentation from the given definition and credentials', () => {
      const presentationResult = PresentationExchange.createPresentationFromCredentials([btcCredentialJwt], presentationDefinition);
      expect(presentationResult).to.exist;
      expect(presentationResult.presentationSubmission.definition_id).to.equal(presentationDefinition.id);
    });

    it('should successfully validate a presentation definition', () => {
      const result:Validated = PresentationExchange.validateDefinition(presentationDefinition);
      expect(result).to.deep.equal([{ tag: 'root', status: 'info', message: 'ok' }]);
    });

    it('should successfully validate a submission', () => {
      const presentationResult = PresentationExchange.createPresentationFromCredentials([btcCredentialJwt], presentationDefinition);
      const result:Validated = PresentationExchange.validateSubmission(presentationResult.presentationSubmission);
      expect(result).to.deep.equal([{ tag: 'root', status: 'info', message: 'ok' }]);
    });

    it('should evaluate the presentation without any errors or warnings', async () => {
      const presentationResult = PresentationExchange.createPresentationFromCredentials([btcCredentialJwt], presentationDefinition);

      const presentationEvaluationResults = PresentationExchange.evaluatePresentation(presentationDefinition,  presentationResult.presentation );
      expect(presentationEvaluationResults.errors).to.deep.equal([]);
      expect(presentationEvaluationResults.warnings).to.deep.equal([]);

      const result:Validated = PresentationExchange.validateSubmission(presentationResult.presentationSubmission);
      expect(result).to.deep.equal([{ tag: 'root', status: 'info', message: 'ok' }]);
    });

    it('should successfully execute the complete presentation exchange flow', async () => {
      const presentationResult = PresentationExchange.createPresentationFromCredentials([btcCredentialJwt], presentationDefinition);

      expect(presentationResult).to.exist;
      expect(presentationResult.presentationSubmission.definition_id).to.equal(presentationDefinition.id);

      const { warnings, errors } = PresentationExchange.evaluatePresentation(presentationDefinition,  presentationResult.presentation );

      expect(errors).to.be.an('array');
      expect(errors?.length).to.equal(0);

      expect(warnings).to.be.an('array');
      expect(warnings?.length).to.equal(0);
    });
  });
});

function createPresentationDefinition(): PresentationDefinitionV2 {
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