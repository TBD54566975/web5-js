import { expect } from 'chai';
import sinon from 'sinon';

import { Encoder } from '@tbd54566975/dwn-sdk-js';
import { base64UrlToString } from '../../src/utils.js';
import { Web5 } from '../../src/web5.js';
import { Web5Did } from '../../src/did/web5-did.js';
import * as didDocuments from '../data/did-documents.js';

describe('Web5Did', async () => {
  let web5did;

  beforeEach(function () {
    web5did = new Web5Did();
  });

  before(function () {
    this.clock = sinon.useFakeTimers();
  });

  after(function () {
    this.clock.restore();
  });

  describe('decrypt', () => {
    let web5;

    beforeEach(function () {
      web5 = new Web5();
    });

    it('should be able to decrypt data encrypted using the default algorithm', async () => {
      // Create a DID for the recipient so that we have a private key to test decryption
      const recipientDid = await web5.did.create('key');
      
      const inputString = 'Hello, world!';
      const payload = new TextEncoder().encode(inputString);
      const encryptionResult = await web5.did.encrypt({
        did: recipientDid.id,
        payload,
      });
      
      const decryptionResult = await web5.did.decrypt({
        did: recipientDid.id,
        privateKey: recipientDid.keys[0].keyPair.privateKeyJwk.d,
        payload: encryptionResult,
      });

      const decryptedString = new TextDecoder().decode(decryptionResult);
      expect(decryptedString).to.equal(inputString);
    });
  });

  describe('encrypt', () => {
    let web5;

    beforeEach(function () {
      web5 = new Web5();
    });

    it('should default to ECDH XS20P encryption algorithm', async () => {
      const payload = new TextEncoder().encode('Hello, world!');
      const result = await web5.did.encrypt({
        did: 'did:key:z6MkhvthBZDxVvLUswRey729CquxMiaoYXrT5SYbCAATc8V9',
        payload,
      });
      
      const header = Encoder.base64UrlToObject(result.header);
      expect(header).to.have.property('alg', 'x25519-xsalsa20-poly1305');
    });

    it('should accept Uint8Array or ArrayBuffer payload', async () => {
      const uint8Array = new TextEncoder().encode('Hello, world!');
      const arrayBuffer = uint8Array.buffer.slice(uint8Array.byteOffset, uint8Array.byteOffset + uint8Array.byteLength);
      const result = await web5.did.encrypt({
        did: 'did:key:z6MkhvthBZDxVvLUswRey729CquxMiaoYXrT5SYbCAATc8V9',
        payload: arrayBuffer,
      });
      
      expect(result).to.have.property('ciphertext');
      expect(result).to.have.property('header');
    });

    it('should use a different nonce for every operation', async () => {
      const payload = new TextEncoder().encode('Hello, world!');

      const result1 = await web5.did.encrypt({
        did: 'did:key:z6MkhvthBZDxVvLUswRey729CquxMiaoYXrT5SYbCAATc8V9',
        payload,
      });

      const result2 = await web5.did.encrypt({
        did: 'did:key:z6MkhvthBZDxVvLUswRey729CquxMiaoYXrT5SYbCAATc8V9',
        payload,
      });
      
      const nonce1 = base64UrlToString(result1.nonce);
      const nonce2 = base64UrlToString(result2.nonce);
      expect(nonce1).to.not.equal(nonce2);
    });

    it('should use different ephemeral public key for every operation', async () => {
      const payload = new TextEncoder().encode('Hello, world!');

      const result1 = await web5.did.encrypt({
        did: 'did:key:z6MkhvthBZDxVvLUswRey729CquxMiaoYXrT5SYbCAATc8V9',
        payload,
      });

      const result2 = await web5.did.encrypt({
        did: 'did:key:z6MkhvthBZDxVvLUswRey729CquxMiaoYXrT5SYbCAATc8V9',
        payload,
      });
      
      const ephemeralPublicKey1 = base64UrlToString(result1.ephemeralPublicKey);
      const ephemeralPublicKey2 = base64UrlToString(result2.ephemeralPublicKey);
      expect(ephemeralPublicKey1).to.not.equal(ephemeralPublicKey2);
    });
  });

  describe('getKeys', async () => {
    it('should return one key when one verification method is defined in DID document', async () => {
      sinon.stub(web5did, 'resolve').resolves(didDocuments.ion.oneVerificationMethodJwk);

      const didKeys = await web5did.getKeys('response-stubbed');

      expect(didKeys).to.have.lengthOf(1);
      expect(didKeys[0]).to.have.property('type', 'EcdsaSecp256k1VerificationKey2019');
    });

    it('should return eight keys when eight verification methods are defined in DID document', async () => {
      sinon.stub(web5did, 'resolve').resolves(didDocuments.key.manyVerificationMethodsJwk);

      const didKeys = await web5did.getKeys('response-stubbed');

      expect(didKeys).to.have.lengthOf(8);
      expect(didKeys[0]).to.have.property('type', 'JsonWebKey2020');
    });

    it('should return empty array when keys not defined DID document', async () => {
      sinon.stub(web5did, 'resolve').resolves(didDocuments.ion.noKeys);

      const didKeys = await web5did.getKeys('response-stubbed');

      expect(didKeys).to.be.null;
    });
  });


  describe('manager', async () => {
    it('should never expire managed DIDs', async function () {
      let resolved;
      const did = 'did:ion:abcd1234';
      const didData = {
        connected: true,
        endpoint: 'http://localhost:55500',
      };
  
      await web5did.manager.set(did, didData);
  
      resolved = await web5did.resolve(did);
      expect(resolved).to.not.be.undefined;
      expect(resolved).to.equal(didData);
  
      this.clock.tick(2147483647); // Time travel 23.85 days
  
      resolved = await web5did.resolve(did);
      expect(resolved).to.not.be.undefined;
      expect(resolved).to.equal(didData);
    });

    it('should return object with keys undefined if key data not provided', async () => {
      const did = 'did:ion:abcd1234';
      const didData = {
        connected: true,
        endpoint: 'http://localhost:55500',
      };
  
      await web5did.manager.set(did, didData);
  
      const resolved = await web5did.resolve(did);
      expect(resolved.keys).to.be.undefined;
    });
  });
});