var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { expect } from 'chai';
import { DidKeyMethod } from '@web5/dids';
import { VerifiableCredential } from '../src/verifiable-credential.js';
import { PresentationExchange } from '../src/presentation-exchange.js';
import PresentationExchangeSelectCredentialsTestVector from '../../../test-vectors/presentation_exchange/select_credentials.json' assert { type: 'json' };
class BitcoinCredential {
    constructor(btcAddress) {
        this.btcAddress = btcAddress;
    }
}
class OtherCredential {
    constructor(otherthing) {
        this.otherthing = otherthing;
    }
}
describe('PresentationExchange', () => {
    describe('Full Presentation Exchange', () => {
        let issuerDid;
        let btcCredentialJwt;
        let presentationDefinition;
        before(() => __awaiter(void 0, void 0, void 0, function* () {
            issuerDid = yield DidKeyMethod.create();
            const vc = yield VerifiableCredential.create({
                type: 'StreetCred',
                issuer: issuerDid.did,
                subject: issuerDid.did,
                data: new BitcoinCredential('btcAddress123'),
            });
            btcCredentialJwt = yield vc.sign({ did: issuerDid });
            presentationDefinition = createPresentationDefinition();
        }));
        it('should evaluate credentials without any errors or warnings', () => __awaiter(void 0, void 0, void 0, function* () {
            PresentationExchange.satisfiesPresentationDefinition({
                vcJwts: [btcCredentialJwt],
                presentationDefinition
            });
        }));
        it('should return the selected verifiable credentials', () => {
            const actualSelectedVcJwts = PresentationExchange.selectCredentials({
                vcJwts: [btcCredentialJwt],
                presentationDefinition
            });
            expect(actualSelectedVcJwts).to.deep.equal([btcCredentialJwt]);
        });
        it('should return the only one verifiable credential', () => __awaiter(void 0, void 0, void 0, function* () {
            const vc = yield VerifiableCredential.create({
                type: 'StreetCred',
                issuer: issuerDid.did,
                subject: issuerDid.did,
                data: new OtherCredential('otherstuff'),
            });
            const otherCredJwt = yield vc.sign({ did: issuerDid });
            const actualSelectedVcJwts = PresentationExchange.selectCredentials({
                vcJwts: [btcCredentialJwt, otherCredJwt],
                presentationDefinition
            });
            expect(actualSelectedVcJwts).to.deep.equal([btcCredentialJwt]);
        }));
        it('should throw error for a credential that does not satisfy the presentation definition', () => __awaiter(void 0, void 0, void 0, function* () {
            const otherPresentationDefinition = {
                'id': 'test-pd-id',
                'name': 'simple PD',
                'purpose': 'pd for testing',
                'input_descriptors': [
                    {
                        'id': 'whatever',
                        'purpose': 'id for testing',
                        'constraints': {
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
            expect(() => PresentationExchange.satisfiesPresentationDefinition({
                vcJwts: [btcCredentialJwt],
                presentationDefinition: otherPresentationDefinition
            })).to.throw('Input candidate does not contain property');
        }));
        it('should successfully create a presentation from the given definition and credentials', () => __awaiter(void 0, void 0, void 0, function* () {
            const presentationResult = PresentationExchange.createPresentationFromCredentials({
                vcJwts: [btcCredentialJwt],
                presentationDefinition
            });
            expect(presentationResult).to.exist;
            expect(presentationResult.presentationSubmission.definition_id).to.equal(presentationDefinition.id);
        }));
        it('should throw error for invalid presentation definition', () => __awaiter(void 0, void 0, void 0, function* () {
            const invalidPresentationDefinition = {
                'id': 'test-pd-id',
                'name': 'simple PD',
                'purpose': 'pd for testing',
                'input_descriptors': [
                    {
                        'id': 'whatever',
                        'purpose': 'id for testing',
                        'constraints': {
                            'fields': [
                                {
                                    'path': [
                                        'not a valid path',
                                    ]
                                }
                            ]
                        }
                    }
                ]
            };
            expect(() => PresentationExchange.createPresentationFromCredentials({
                vcJwts: [btcCredentialJwt],
                presentationDefinition: invalidPresentationDefinition
            })).to.throw('Failed to pass validation check');
        }));
        it('should fail to create a presentation with vc that does not match presentation definition', () => __awaiter(void 0, void 0, void 0, function* () {
            const vc = yield VerifiableCredential.create({
                type: 'StreetCred',
                issuer: issuerDid.did,
                subject: issuerDid.did,
                data: new OtherCredential('otherstuff'),
            });
            const otherCredJwt = yield vc.sign({ did: issuerDid });
            expect(() => PresentationExchange.createPresentationFromCredentials({
                vcJwts: [otherCredJwt],
                presentationDefinition
            })).to.throw('Failed to create Verifiable Presentation JWT due to: Required Credentials Not Present');
        }));
        it('should successfully validate a presentation definition', () => {
            const result = PresentationExchange.validateDefinition({ presentationDefinition });
            expect(result).to.deep.equal([{ tag: 'root', status: 'info', message: 'ok' }]);
        });
        it('should successfully validate a submission', () => {
            const presentationResult = PresentationExchange.createPresentationFromCredentials({
                vcJwts: [btcCredentialJwt],
                presentationDefinition
            });
            const presentationSubmission = presentationResult.presentationSubmission;
            const result = PresentationExchange.validateSubmission({ presentationSubmission });
            expect(result).to.deep.equal([{ tag: 'root', status: 'info', message: 'ok' }]);
        });
        it('should evaluate the presentation without any errors or warnings', () => {
            const presentationResult = PresentationExchange.createPresentationFromCredentials({
                vcJwts: [btcCredentialJwt],
                presentationDefinition
            });
            const presentationEvaluationResults = PresentationExchange.evaluatePresentation({
                presentationDefinition,
                presentation: presentationResult.presentation
            });
            expect(presentationEvaluationResults.errors).to.deep.equal([]);
            expect(presentationEvaluationResults.warnings).to.deep.equal([]);
            const presentationSubmission = presentationResult.presentationSubmission;
            const result = PresentationExchange.validateSubmission({ presentationSubmission });
            expect(result).to.deep.equal([{ tag: 'root', status: 'info', message: 'ok' }]);
        });
        it('should successfully execute the complete presentation exchange flow', () => {
            const presentationResult = PresentationExchange.createPresentationFromCredentials({
                vcJwts: [btcCredentialJwt],
                presentationDefinition
            });
            expect(presentationResult).to.exist;
            expect(presentationResult.presentationSubmission.definition_id).to.equal(presentationDefinition.id);
            const { warnings, errors } = PresentationExchange.evaluatePresentation({
                presentationDefinition,
                presentation: presentationResult.presentation
            });
            expect(errors).to.be.an('array');
            expect(errors === null || errors === void 0 ? void 0 : errors.length).to.equal(0);
            expect(warnings).to.be.an('array');
            expect(warnings === null || warnings === void 0 ? void 0 : warnings.length).to.equal(0);
        });
    });
    describe('Web5TestVectorsPresentationExchange', () => {
        it('select_credentials', () => __awaiter(void 0, void 0, void 0, function* () {
            const vectors = PresentationExchangeSelectCredentialsTestVector.vectors;
            for (let i = 0; i < vectors.length; i++) {
                const input = vectors[i].input;
                const expectedOutput = vectors[i].output.selectedCredentials;
                const selectedCreds = PresentationExchange.selectCredentials({ vcJwts: input.credentialJwts, presentationDefinition: input.presentationDefinition });
                expect(selectedCreds).to.deep.equals(expectedOutput);
            }
        }));
    });
});
function createPresentationDefinition() {
    return {
        'id': 'test-pd-id',
        'name': 'simple PD',
        'purpose': 'pd for testing',
        'input_descriptors': [
            {
                'id': 'whatever',
                'purpose': 'id for testing',
                'constraints': {
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
//# sourceMappingURL=presentation-exchange.spec.js.map