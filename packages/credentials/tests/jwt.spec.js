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
import { Convert } from '@web5/common';
import { Secp256k1 } from '@web5/crypto';
import { DidKeyMethod } from '@web5/dids';
import { Jwt } from '../src/jwt.js';
describe('Jwt', () => {
    describe('parse()', () => {
        it('throws error if JWT doesnt contain 3 parts', () => __awaiter(void 0, void 0, void 0, function* () {
            expect(() => Jwt.parse({ jwt: 'abcd123' })).to.throw('Malformed JWT. expected 3 parts');
        }));
        it('throws error if JWT header is not properly base64url encoded', () => __awaiter(void 0, void 0, void 0, function* () {
            expect(() => Jwt.parse({ jwt: 'abcd123.efgh.hijk' })).to.throw('Invalid base64url encoding for JWT header');
        }));
        it('throws error if JWT header is missing typ property', () => __awaiter(void 0, void 0, void 0, function* () {
            const header = { alg: 'ES256K', kid: 'whateva' };
            const base64UrlEncodedHeader = Convert.object(header).toBase64Url();
            expect(() => Jwt.parse({ jwt: `${base64UrlEncodedHeader}.efgh.hijk` })).to.throw('typ property set to JWT');
        }));
        it('throws error if JWT header typ property is not set to JWT', () => __awaiter(void 0, void 0, void 0, function* () {
            const header = { typ: 'hehe', alg: 'ES256K', kid: 'whateva' };
            const base64UrlEncodedHeader = Convert.object(header).toBase64Url();
            expect(() => Jwt.parse({ jwt: `${base64UrlEncodedHeader}.efgh.hijk` })).to.throw('typ property set to JWT');
        }));
        it('throws error if JWT header alg property is missing', () => __awaiter(void 0, void 0, void 0, function* () {
            // @ts-expect-error because alg is intentionally missing to trigger error.
            const header = { typ: 'JWT', kid: 'whateva' };
            const base64UrlEncodedHeader = Convert.object(header).toBase64Url();
            expect(() => Jwt.parse({ jwt: `${base64UrlEncodedHeader}.efgh.hijk` })).to.throw('to contain alg and kid');
        }));
        it('throws error if JWT header kid property is missing', () => __awaiter(void 0, void 0, void 0, function* () {
            const header = { typ: 'JWT', alg: 'ES256K' };
            const base64UrlEncodedHeader = Convert.object(header).toBase64Url();
            expect(() => Jwt.parse({ jwt: `${base64UrlEncodedHeader}.efgh.hijk` })).to.throw('to contain alg and kid');
        }));
        it('throws error if JWT payload is not properly base64url encoded', () => __awaiter(void 0, void 0, void 0, function* () {
            const header = { typ: 'JWT', alg: 'ES256K', kid: 'whateva' };
            const base64UrlEncodedHeader = Convert.object(header).toBase64Url();
            expect(() => Jwt.parse({ jwt: `${base64UrlEncodedHeader}.efgh.hijk` })).to.throw('Invalid base64url encoding for JWT payload');
        }));
    });
    describe('verify()', () => {
        it('throws error if JWT is expired', () => __awaiter(void 0, void 0, void 0, function* () {
            const did = yield DidKeyMethod.create({ keyAlgorithm: 'secp256k1' });
            const header = { typ: 'JWT', alg: 'ES256K', kid: did.document.verificationMethod[0].id };
            const base64UrlEncodedHeader = Convert.object(header).toBase64Url();
            const payload = { exp: Math.floor(Date.now() / 1000 - 1) };
            const base64UrlEncodedPayload = Convert.object(payload).toBase64Url();
            try {
                yield Jwt.verify({ jwt: `${base64UrlEncodedHeader}.${base64UrlEncodedPayload}.hijk` });
                expect.fail();
            }
            catch (e) {
                expect(e.message).to.include('JWT is expired');
            }
        }));
        it('throws error if JWT header kid does not dereference a verification method', () => __awaiter(void 0, void 0, void 0, function* () {
            const did = yield DidKeyMethod.create({ keyAlgorithm: 'secp256k1' });
            const header = { typ: 'JWT', alg: 'ES256K', kid: did.did };
            const base64UrlEncodedHeader = Convert.object(header).toBase64Url();
            const payload = { iat: Math.floor(Date.now() / 1000) };
            const base64UrlEncodedPayload = Convert.object(payload).toBase64Url();
            try {
                yield Jwt.verify({ jwt: `${base64UrlEncodedHeader}.${base64UrlEncodedPayload}.hijk` });
                expect.fail();
            }
            catch (e) {
                expect(e.message).to.include('dereference a DID Document Verification Method');
            }
        }));
        it('throws error if alg is not supported', () => __awaiter(void 0, void 0, void 0, function* () {
            const did = yield DidKeyMethod.create({ keyAlgorithm: 'secp256k1' });
            const header = { typ: 'JWT', alg: 'RS256', kid: did.document.verificationMethod[0].id };
            const base64UrlEncodedHeader = Convert.object(header).toBase64Url();
            const payload = { iat: Math.floor(Date.now() / 1000) };
            const base64UrlEncodedPayload = Convert.object(payload).toBase64Url();
            try {
                yield Jwt.verify({ jwt: `${base64UrlEncodedHeader}.${base64UrlEncodedPayload}.hijk` });
                expect.fail();
            }
            catch (e) {
                expect(e.message).to.include('not supported');
            }
        }));
        it('returns signer DID if verification succeeds', () => __awaiter(void 0, void 0, void 0, function* () {
            const did = yield DidKeyMethod.create({ keyAlgorithm: 'secp256k1' });
            const header = { typ: 'JWT', alg: 'ES256K', kid: did.document.verificationMethod[0].id };
            const base64UrlEncodedHeader = Convert.object(header).toBase64Url();
            const payload = { iat: Math.floor(Date.now() / 1000) };
            const base64UrlEncodedPayload = Convert.object(payload).toBase64Url();
            const toSign = `${base64UrlEncodedHeader}.${base64UrlEncodedPayload}`;
            const toSignBytes = Convert.string(toSign).toUint8Array();
            const privateKeyJwk = did.keySet.verificationMethodKeys[0].privateKeyJwk;
            const signatureBytes = yield Secp256k1.sign({ key: privateKeyJwk, data: toSignBytes });
            const base64UrlEncodedSignature = Convert.uint8Array(signatureBytes).toBase64Url();
            const jwt = `${toSign}.${base64UrlEncodedSignature}`;
            const verifyResult = yield Jwt.verify({ jwt });
            expect(verifyResult.header).to.deep.equal(header);
            expect(verifyResult.payload).to.deep.equal(payload);
        }));
    });
});
//# sourceMappingURL=jwt.spec.js.map