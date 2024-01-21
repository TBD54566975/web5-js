import { expect } from 'chai';

import { DidDht } from '../src/methods/did-dht.js';

describe.only('DidDht', () => {
  describe('create', () => {
    it('', async () => {
      const did = await DidDht.create({
        options: {
          services: [
            {
              id              : 'dwn-svc',
              type            : 'DIDCommMessaging',
              serviceEndpoint : 'https://example.com/endpoint',
            },
            {
              id              : 'dwn-svc-2',
              type            : 'DIDCommMessaging',
              serviceEndpoint : 'https://example.com/endpoint',
            }
          ]
        }
      });
      console.log(did);
    });

    it('accepts a custom controller for the Identity Key', async () => {
      const did = await DidDht.create({
        options: {
          verificationMethods: [
            {
              algorithm  : 'Ed25519',
              id         : '0',
              controller : 'did:example:1234',
            }
          ]
        }
      });

      const identityKeyVerificationMethod = did.didDocument?.verificationMethod?.find(
        (method) => method.id.endsWith('#0')
      );
      expect(identityKeyVerificationMethod).to.have.property('controller', 'did:example:1234');
    });

    it('creates a DID with additional verification methods, if given', async () => {
      const did = await DidDht.create({
        options: {
          verificationMethods: [
            {
              algorithm : 'Ed25519',
              id        : 'sig',
              purposes  : ['authentication', 'assertionMethod']
            },
            {
              algorithm : 'ES256K',
              id        : 'enc',
              purposes  : ['keyAgreement']
            }
          ]
        }
      });

      expect(did).to.have.property('didDocument');
      expect(did.didDocument).to.have.property('verificationMethod');
      expect(did.didDocument.verificationMethod).to.have.length(3);
      // expect(did.didDocument.verificationMethod[0]).to.have.property('id', 'dwn-sig');
      // expect(did.didDocument.verificationMethod[1]).to.have.property('id', 'dwn-auth');
    });

    it('returns a DID with a getSigner function that can sign and verify data', async () => {
      const did = await DidDht.create();

      const signer = await did.getSigner();
      const data = new Uint8Array([1, 2, 3]);
      const signature = await signer.sign({ data });
      const isValid = await signer.verify({ data, signature });

      expect(signature).to.have.length(64);
      expect(isValid).to.be.true;
    });

    it('throws an error if a verification method algorithm is not supported', async () => {
      try {
        await DidDht.create({
          options: {
            verificationMethods: [
              {
                algorithm : 'Ed25519',
                purposes  : ['authentication', 'assertionMethod']
              },
              {
                // @ts-expect-error - Testing invalid algorithm.
                algorithm : 'Ed448',
                id        : 'dwn-sig',
                purposes  : ['authentication', 'assertionMethod']
              }
            ]
          }
        });

        expect.fail('Expected an error to be thrown.');
      } catch (error: any) {
        expect(error.message).to.include('algorithms are not supported');
      }
    });
  });

  describe('toKeys()', () => {
    it('returns a single verification method for a DID', async () => {
      // Create a DID to use for the test.
      const did = await DidDht.create();

      const keySet = await DidDht.toKeys({ did });

      expect(keySet).to.have.property('verificationMethods');
      expect(keySet.verificationMethods).to.have.length(1);
      expect(keySet.verificationMethods![0]).to.have.property('publicKeyJwk');
      expect(keySet.verificationMethods![0]).to.have.property('privateKeyJwk');
      expect(keySet.verificationMethods![0]).to.have.property('purposes');
      expect(keySet.verificationMethods![0]).to.have.property('type');
      expect(keySet.verificationMethods![0]).to.have.property('id');
      expect(keySet.verificationMethods![0]).to.have.property('controller');
    });
  });
});