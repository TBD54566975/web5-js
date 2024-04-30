import type { BearerDid } from '@web5/dids';
import type { PresentationSubmission } from '@sphereon/pex-models';

import { expect } from 'chai';
import { DidKey } from '@web5/dids';

import { Jwt } from '../src/jwt.js';
import { VerifiablePresentation } from '../src/verifiable-presentation.js';

const validVcJwt = 'eyJraWQiOiJkaWQ6a2V5OnpRM3NoZ0NqVmZucldxOUw3cjFRc3oxcmlRUldvb3pid2dKYkptTGdxRFB2OXNnNGIjelEzc' +
'2hnQ2pWZm5yV3E5TDdyMVFzejFyaVFSV29vemJ3Z0piSm1MZ3FEUHY5c2c0YiIsInR5cCI6IkpXVCIsImFsZyI6IkVTMjU2SyJ9.eyJpc3Mi' +
'OiJkaWQ6a2V5OnpRM3NoZ0NqVmZucldxOUw3cjFRc3oxcmlRUldvb3pid2dKYkptTGdxRFB2OXNnNGIiLCJzdWIiOiJkaWQ6a2V5OnpRM3No' +
'd2Q0eVVBZldnZkdFUnFVazQ3eEc5NXFOVXNpc0Q3NzZKTHVaN3l6OW5RaWoiLCJpYXQiOjE3MDQ5MTgwODMsInZjIjp7IkBjb250ZXh0Ijpb' +
'Imh0dHBzOi8vd3d3LnczLm9yZy8yMDE4L2NyZWRlbnRpYWxzL3YxIl0sInR5cGUiOlsiVmVyaWZpYWJsZUNyZWRlbnRpYWwiLCJTdHJlZXRD' +
'cmVkIl0sImlkIjoidXJuOnV1aWQ6NTU2OGQyZTEtYjA0NS00MTQ3LTkxNjUtZTU3YTIxMGM2ZGVlIiwiaXNzdWVyIjoiZGlkOmtleTp6UTNz' +
'aGdDalZmbnJXcTlMN3IxUXN6MXJpUVJXb296YndnSmJKbUxncURQdjlzZzRiIiwiaXNzdWFuY2VEYXRlIjoiMjAyNC0wMS0xMFQyMDoyMToy' +
'M1oiLCJjcmVkZW50aWFsU3ViamVjdCI6eyJpZCI6ImRpZDprZXk6elEzc2h3ZDR5VUFmV2dmR0VScVVrNDd4Rzk1cU5Vc2lzRDc3NkpMdVo3' +
'eXo5blFpaiIsImxvY2FsUmVzcGVjdCI6ImhpZ2giLCJsZWdpdCI6dHJ1ZX19fQ.Bx0JrQERWRLpYeg3TnfrOIo4zexo3q1exPZ-Ej6j0T0YO' +
'BVZaZ9-RqpiAM-fHKrdGUzVyXr77pOl7yGgwIO90g';

describe('Verifiable Credential Tests', () => {
  let holderDid: BearerDid;

  beforeEach(async () => {
    holderDid = await DidKey.create();
  });

  describe('Verifiable Presentation (VP)', () => {
    it('create simple vp', async () => {
      const vcJwts = ['vcjwt1'];

      const vp = await VerifiablePresentation.create({
        holder : holderDid.uri,
        vcJwts : vcJwts
      });

      expect(vp.holder).to.equal(holderDid.uri);
      expect(vp.type).to.equal('VerifiablePresentation');
      expect(vp.vpDataModel.verifiableCredential).to.not.be.undefined;
      expect(vp.vpDataModel.verifiableCredential).to.deep.equal(vcJwts);
    });

    it('create and sign vp with did:key', async () => {
      const vp = await VerifiablePresentation.create({
        holder : holderDid.uri,
        vcJwts : [validVcJwt]
      });

      const vpJwt = await vp.sign({ did: holderDid });

      await VerifiablePresentation.verify({ vpJwt });

      const parsedVp = await VerifiablePresentation.parseJwt({ vpJwt });

      expect(vpJwt).to.not.be.undefined;
      expect(parsedVp.holder).to.equal(holderDid.uri);
      expect(parsedVp.type).to.equal('VerifiablePresentation');
      expect(parsedVp.vpDataModel.verifiableCredential).to.not.be.undefined;
      expect(parsedVp.vpDataModel.verifiableCredential).to.deep.equal([validVcJwt]);
    });

    it('create and sign presentatin submission vp', async () => {
      const presentationSubmission: PresentationSubmission = {
        id             : 'presentationSubmissionId',
        definition_id  : 'definitionId',
        descriptor_map : [
          {
            id     : 'descriptorId',
            format : 'format',
            path   : 'path'
          }
        ]
      };

      const vp = await VerifiablePresentation.create({
        holder         : holderDid.uri,
        vcJwts         : [validVcJwt],
        additionalData : {
          presentation_submission: presentationSubmission
        },
        type: 'PresentationSubmission'
      });

      const vpJwt = await vp.sign({ did: holderDid });

      await VerifiablePresentation.verify({ vpJwt });

      const parsedVp = await VerifiablePresentation.parseJwt({ vpJwt });

      expect(vpJwt).to.not.be.undefined;
      expect(parsedVp.holder).to.equal(holderDid.uri);
      expect(parsedVp.type).to.equal('PresentationSubmission');
      expect(parsedVp.vpDataModel.verifiableCredential).to.not.be.undefined;
      expect(parsedVp.vpDataModel.verifiableCredential).to.deep.equal([validVcJwt]);
    });

    it('parseJwt throws ParseException if argument is not a valid JWT', async () => {
      expect(() =>
        VerifiablePresentation.parseJwt({ vpJwt: 'hi' })
      ).to.throw('Malformed JWT');
    });

    it('parseJwt checks if missing vp property', async () => {
      const did = await DidKey.create();
      const jwt = await Jwt.sign({
        signerDid : did,
        payload   : {
          iss : did.uri,
          sub : did.uri
        }
      });

      expect(() =>
        VerifiablePresentation.parseJwt({ vpJwt: jwt })
      ).to.throw('Jwt payload missing vp property');
    });

    it('should throw an error if holder is not defined', async () => {
      try {
        await VerifiablePresentation.create({
          holder : '',
          vcJwts : [validVcJwt]
        });

        expect.fail();
      } catch(e: any) {
        expect(e.message).to.include('Holder must be defined');
      }
    });

    it('should throw an error if holder is not a string', async () => {
      const anyTypeHolder: any = DidKey.create();

      try {
        await VerifiablePresentation.create({
          holder : anyTypeHolder,
          vcJwts : [validVcJwt]
        });

        expect.fail();
      } catch(e: any) {
        expect(e.message).to.include('Holder must be of type string');
      }
    });
  });
});