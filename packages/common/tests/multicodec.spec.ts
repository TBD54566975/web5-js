import { expect } from 'chai';

import { Multicodec } from '../src/multicodec.js';

describe('Multicodec', () => {
  describe('addPrefix()', () => {
    it('returns Uint8Array with prefixed codec by code', () => {
      const mockEd25519PublicKey = new Uint8Array(32);
      const prefixedData = Multicodec.addPrefix({ code: 0xed, data: mockEd25519PublicKey });

      expect(prefixedData.byteLength).to.equal(2 + mockEd25519PublicKey.byteLength);
      expect(prefixedData.slice(0, 2)).to.deep.equal(Multicodec.codecs.get(0xed)?.codeBytes);
    });

    it('returns Uint8Array with prefixed codec by name', () => {
      const mockEd25519PublicKey = new Uint8Array(32);
      const prefixedData = Multicodec.addPrefix({ name: 'ed25519-pub', data: mockEd25519PublicKey });

      expect(prefixedData.byteLength).to.equal(2 + mockEd25519PublicKey.byteLength);
      const code = Multicodec.registry.get('ed25519-pub');
      expect(prefixedData.slice(0, 2)).to.deep.equal(Multicodec.codecs.get(code!)?.codeBytes);
    });

    it('throws an error when code and name input data missing', () => {
      expect(
        () => Multicodec.addPrefix({ data: new Uint8Array(0) })
      ).to.throw(Error, 'Required parameter missing');
    });

    it('throws an error when codec not found', () => {
      expect(
        () => Multicodec.addPrefix({ code: 0x99999, data: new Uint8Array(0) })
      ).to.throw(Error, 'Multicodec not found');

      expect(
        () => Multicodec.addPrefix({ name: 'non-existent', data: new Uint8Array(0) })
      ).to.throw(Error, 'Multicodec not found');
    });
  });
});