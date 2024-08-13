import { expect } from 'chai';
import sinon from 'sinon';
import { CryptoUtils } from '@web5/crypto';
import { type BearerDid, DidDht, DidJwk, PortableDid } from '@web5/dids';
import { Convert } from '@web5/common';
import {
  Oidc,
  type Web5ConnectAuthRequest,
  type Web5ConnectAuthResponse,
} from '../src/oidc.js';
import { PlatformAgentTestHarness } from '../src/test-harness.js';
import { TestAgent } from './utils/test-agent.js';
import { testDwnUrl } from './utils/test-config.js';
import { BearerIdentity, DwnResponse, WalletConnect } from '../src/index.js';

describe('web5 connect', function () {
  this.timeout(20000);

  /** The temporary DID that web5 connect created on behalf of the client */
  let clientEphemeralBearerDid: BearerDid;
  let clientEphemeralPortableDid: PortableDid;

  /** The real tenant (identity) of the DWN that the provider had chosen to connect */
  let providerIdentity: BearerIdentity;

  /** The new DID created for the delegate which it will impersonate in the future */
  let delegateBearerDid: BearerDid;
  let delegatePortableDid: PortableDid;

  /** The real tenant (identity) of the DWN that the provider is using and selecting */
  let providerIdentityBearerDid: BearerDid;
  const providerIdentityPortableDid = {
    uri      : 'did:dht:ksbkpsjytbm7kh6hnt3xi91t6to98zndtrrxzsqz9y87m5qztyqo',
    document : {
      '@context'         : 'https://www.w3.org/ns/did/v1',
      id                 : 'did:dht:ksbkpsjytbm7kh6hnt3xi91t6to98zndtrrxzsqz9y87m5qztyqo',
      verificationMethod : [
        {
          id   : 'did:dht:ksbkpsjytbm7kh6hnt3xi91t6to98zndtrrxzsqz9y87m5qztyqo#0',
          type : 'JsonWebKey',
          controller:
            'did:dht:ksbkpsjytbm7kh6hnt3xi91t6to98zndtrrxzsqz9y87m5qztyqo',
          publicKeyJwk: {
            crv : 'Ed25519',
            kty : 'OKP' as const,
            x   : 'VYKm2SCIV9Vz3BRy-v5R9GHz3EOJCPvZ1_gP1e3XiB0',
            kid : 'cyvOypa6k-4ffsRWcza37s5XVOh1kO9ICUeo1ZxHVM8',
            alg : 'EdDSA',
          },
        },
      ],
      authentication: [
        'did:dht:ksbkpsjytbm7kh6hnt3xi91t6to98zndtrrxzsqz9y87m5qztyqo#0',
      ],
      assertionMethod: [
        'did:dht:ksbkpsjytbm7kh6hnt3xi91t6to98zndtrrxzsqz9y87m5qztyqo#0',
      ],
      capabilityDelegation: [
        'did:dht:ksbkpsjytbm7kh6hnt3xi91t6to98zndtrrxzsqz9y87m5qztyqo#0',
      ],
      capabilityInvocation: [
        'did:dht:ksbkpsjytbm7kh6hnt3xi91t6to98zndtrrxzsqz9y87m5qztyqo#0',
      ],
    },
    metadata    : {},
    privateKeys : [
      {
        crv : 'Ed25519',
        d   : 'hdSIwbQwVD-fNOVEgt-k3mMl44Ip1iPi58Ex6VDGxqY',
        kty : 'OKP' as const,
        x   : 'VYKm2SCIV9Vz3BRy-v5R9GHz3EOJCPvZ1_gP1e3XiB0',
        kid : 'cyvOypa6k-4ffsRWcza37s5XVOh1kO9ICUeo1ZxHVM8',
        alg : 'EdDSA',
      },
    ],
  };

  let permissionGrants: DwnResponse<any>[] = [
    {
      reply   : { status: { code: 202, detail: 'Accepted' } },
      message : {
        recordId   : 'bafyreifzveddv32ea3tzybpgphxvdvmk2qtgdi7ykt5atgo76m426jqp3m',
        descriptor : {
          interface    : 'Records',
          method       : 'Write',
          protocol     : 'https://tbd.website/dwn/permissions',
          protocolPath : 'grant',
          recipient:
            'did:dht:pfm8f6w57srtci1k3spp73dqgk5eo3afkimtyi4zcqc5hg1ui5mo',
          dataCid:
            'bafkreibesnbudco6hhuj5m4lc3jktvd2pd4ew4uypsiq66xxuaec4jwt7e',
          dataSize         : 156,
          dateCreated      : '2024-08-02T06:36:37.675594Z',
          messageTimestamp : '2024-08-02T06:36:37.675594Z',
          dataFormat       : 'application/json',
        },
        contextId:
          'bafyreifzveddv32ea3tzybpgphxvdvmk2qtgdi7ykt5atgo76m426jqp3m',
        authorization: {
          signature: {
            payload:
              'eyJyZWNvcmRJZCI6ImJhZnlyZWlmenZlZGR2MzJlYTN0enlicGdwaHh2ZHZtazJxdGdkaTd5a3Q1YXRnbzc2bTQyNmpxcDNtIiwiZGVzY3JpcHRvckNpZCI6ImJhZnlyZWlid3Y1ajVhbHlmbmV0Mmh6NTNoYWRsZnF6eG1vNzVsZHYyeml5cGp4enlmN2ZuZWMyYnV1IiwiY29udGV4dElkIjoiYmFmeXJlaWZ6dmVkZHYzMmVhM3R6eWJwZ3BoeHZkdm1rMnF0Z2RpN3lrdDVhdGdvNzZtNDI2anFwM20ifQ',
            signatures: [
              {
                protected:
                  'eyJraWQiOiJkaWQ6ZGh0OjFxbmdkZ2RlMzE2NHB1MTU3eDRyZWlqcWlzYm1yN2R4OG5raWNpOXltdG56ZWsxaWJpMXkjMCIsImFsZyI6IkVkRFNBIn0',
                signature:
                  '7xiNZGsb8dlom2tCSdjUQgkBsAm6XSRt6i4cNS6NDDSkCGjVr79TB7tF5VQdtwMJCrDpKtSmXQ0eEN4j2dWMAQ',
              },
            ],
          },
        },
      },
      messageCid: 'bafyreievjytxn2qbfwg4fthnsrjnob3mm2j2haar6revl723v7q2up5g5i',
    },
  ];

  let testHarness: PlatformAgentTestHarness;

  let authRequest: Web5ConnectAuthRequest;
  let authRequestJwt: string;
  let authRequestJwe: string;

  let authResponse: Web5ConnectAuthResponse;
  let authResponseJwt: string;
  let authResponseJwe: string;

  let sharedECDHPrivateKey: Uint8Array;

  const authRequestEncryptionKey = CryptoUtils.randomBytes(32);
  const encryptionNonce = CryptoUtils.randomBytes(24);
  const randomPin = '9999';

  before(async () => {
    providerIdentityBearerDid = await DidDht.import({
      portableDid: providerIdentityPortableDid,
    });
    sinon.stub(DidDht, 'create').resolves(providerIdentityBearerDid);
    testHarness = await PlatformAgentTestHarness.setup({
      agentClass  : TestAgent,
      agentStores : 'memory',
    });
    await testHarness.createAgentDid();
    sinon.restore();

    providerIdentity = await testHarness.createIdentity({
      name        : 'MrProvider',
      testDwnUrls : [testDwnUrl],
    });

    clientEphemeralBearerDid = await DidJwk.create();
    clientEphemeralPortableDid = await clientEphemeralBearerDid.export();

    // sinon.stub(DidDht, 'resolve').resolves({
    //   didDocument           : clientEphemeralPortableDid!.document,
    //   didDocumentMetadata   : clientEphemeralPortableDid!.metadata,
    //   didResolutionMetadata : clientEphemeralPortableDid!.metadata,
    // });
    // clientEphemeralBearerDid = await DidDht.import({
    //   portableDid: clientEphemeralPortableDid,
    // });
    // sinon.restore();

    delegateBearerDid = await DidJwk.create();
    delegatePortableDid = await delegateBearerDid.export();

    // sinon.stub(DidDht, 'resolve').resolves({
    //   didDocument           : delegatePortableDid!.document,
    //   didDocumentMetadata   : delegatePortableDid!.metadata,
    //   didResolutionMetadata : delegatePortableDid!.metadata,
    // });
    // delegateBearerDid = await DidDht.import({
    //   portableDid: delegatePortableDid,
    // });
    // sinon.restore();
  });

  after(async () => {
    await testHarness.clearStorage();
    await testHarness.closeStorage();
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('client authrequest phase', function () {
    // it('should create a code challenge', async () => {
    //   const result = await Oidc.generateCodeChallenge();
    //   expect(result.codeChallengeBytes).to.be.instanceOf(Uint8Array);
    //   expect(result.codeChallengeBase64Url).to.be.a('string');
    // });

    it('should create an authrequest with the code challenge and client did', async () => {
      const randomBytesStub = sinon
        .stub(CryptoUtils, 'randomBytes')
        .returns(authRequestEncryptionKey);

      const callbackUrl = Oidc.buildOidcUrl({
        baseURL  : 'http://localhost:3000',
        endpoint : 'callback',
      });

      const options = {
        client_id          : clientEphemeralPortableDid.uri,
        scope              : 'openid did:jwk',
        // code_challenge        : Convert.uint8Array(codeChallenge).toBase64Url(),
        // code_challenge_method : 'S256' as const,
        permissionRequests : {} as any, // TODO: use a better mock once DWN stuff is in place,
        redirect_uri       : callbackUrl,
      };
      authRequest = await Oidc.createAuthRequest(options);
      expect(authRequest).to.include(options);
      expect(authRequest.nonce).to.be.a('string');
      expect(authRequest.state).to.be.a('string');
      expect(authRequest.redirect_uri).to.equal(
        'http://localhost:3000/callback'
      );
    });

    it('should construct a signed jwt of an authrequest', async () => {
      authRequestJwt = await Oidc.signJwt({
        did  : clientEphemeralBearerDid,
        data : authRequest,
      });
      expect(authRequestJwt).to.be.a('string');
    });

    it('should encrypt an authrequest using the code challenge', async () => {
      authRequestJwe = await Oidc.encryptAuthRequest({
        jwt           : authRequestJwt,
        encryptionKey : authRequestEncryptionKey
      });
      expect(authRequestJwe).to.be.a('string');
      expect(authRequestJwe.split('.')).to.have.lengthOf(5);
    });
  });

  describe('provider authresponse phase', function () {
    it('should get authrequest from server, decrypt and verify the jwt', async () => {
      const fetchStub = sinon
        .stub(globalThis, 'fetch')
        .onFirstCall()
        .resolves({
          text: sinon.stub().resolves(authRequestJwe),
        } as any);
      fetchStub.callThrough();

      const authorizeUrl = Oidc.buildOidcUrl({
        baseURL   : 'http://localhost:3000',
        endpoint  : 'authorize',
        authParam : '12345',
      });
      expect(authorizeUrl).to.equal(
        'http://localhost:3000/authorize/12345.jwt'
      );

      const result = await Oidc.getAuthRequest(
        authorizeUrl,
        Convert.uint8Array(authRequestEncryptionKey).toBase64Url()
      );
      expect(result).to.deep.equal(authRequest);
    });

    // TODO: waiting for DWN feature complete
    it('should create permission grants for each selected did', async () => {
      const results = await Oidc.createPermissionGrants(
        providerIdentity.did.uri,
        delegateBearerDid,
        testHarness.agent.dwn
      );
      expect(results).to.have.lengthOf(1);
      expect(results[0]).to.be.a('object');
    });

    it('should create the authresponse which includes the permissionGrants, nonce, private key material', async () => {
      const options = {
        iss            : providerIdentity.did.uri,
        sub            : delegateBearerDid.uri,
        aud            : authRequest.client_id,
        nonce          : authRequest.nonce,
        delegateGrants : permissionGrants,
        delegateDid    : delegatePortableDid,
      };
      authResponse = await Oidc.createResponseObject(options);

      expect(authResponse).to.include(options);
      expect(authResponse.iat).to.be.a('number');
      expect(authResponse.exp).to.be.a('number');
      expect(authResponse.exp - authResponse.iat).to.equal(600);
    });

    it('should sign the authresponse with its provider did', async () => {
      authResponseJwt = await Oidc.signJwt({
        did  : delegateBearerDid,
        data : authResponse,
      });
      expect(authResponseJwt).to.be.a('string');
    });

    it('should derive a valid ECDH private key for both provider and client which is identical', async () => {
      const providerECDHDerivedPrivateKey = await Oidc.deriveSharedKey(
        delegateBearerDid,
        clientEphemeralBearerDid.document
      );
      const clientECDHDerivedPrivateKey = await Oidc.deriveSharedKey(
        clientEphemeralBearerDid,
        delegateBearerDid.document
      );

      expect(providerECDHDerivedPrivateKey).to.be.instanceOf(Uint8Array);
      expect(providerECDHDerivedPrivateKey.length).to.be.greaterThan(0);

      expect(clientECDHDerivedPrivateKey).to.be.instanceOf(Uint8Array);
      expect(clientECDHDerivedPrivateKey.length).to.be.greaterThan(0);
      expect(
        Convert.uint8Array(providerECDHDerivedPrivateKey).toHex()
      ).to.equal(Convert.uint8Array(clientECDHDerivedPrivateKey).toHex());

      // doesnt matter client and provider are the same
      sharedECDHPrivateKey = clientECDHDerivedPrivateKey;
    });

    it('should encrypt the jwt authresponse to pass back to the client', async () => {
      const randomBytesStub = sinon
        .stub(CryptoUtils, 'randomBytes')
        .returns(encryptionNonce);
      authResponseJwe = Oidc.encryptAuthResponse({
        jwt              : authResponseJwt,
        encryptionKey    : sharedECDHPrivateKey,
        randomPin,
        delegateDidKeyId : delegateBearerDid.document.verificationMethod![0].id,
      });
      expect(authResponseJwe).to.be.a('string');
      expect(randomBytesStub.calledOnce).to.be.true;
    });

    it('should send the encrypted jwe authresponse to the server', async () => {
      sinon.stub(Oidc, 'createPermissionGrants').resolves(permissionGrants);
      sinon.stub(CryptoUtils, 'randomBytes').returns(encryptionNonce);
      sinon.stub(DidJwk, 'create').resolves(delegateBearerDid);

      const formEncodedRequest = new URLSearchParams({
        id_token : authResponseJwe,
        state    : authRequest.state,
      }).toString();

      const callbackUrl = Oidc.buildOidcUrl({
        baseURL  : 'http://localhost:3000',
        endpoint : 'callback',
      });
      expect(callbackUrl).to.equal('http://localhost:3000/callback');

      const fetchSpy = sinon.spy(globalThis, 'fetch').withArgs(
        callbackUrl,
        sinon.match({
          method  : 'POST',
          headers : {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formEncodedRequest,
        })
      );

      const selectedDid = providerIdentity.did.uri;
      await Oidc.submitAuthResponse(
        selectedDid,
        authRequest,
        randomPin,
        testHarness.agent.dwn
      );
      expect(fetchSpy.calledOnce).to.be.true;
    });
  });

  describe('client pin entry final phase', function () {
    it('should get the authresponse from server and decrypt the jwe using the pin', async () => {
      const result = await Oidc.decryptAuthResponse(
        clientEphemeralBearerDid,
        authResponseJwe,
        randomPin
      );
      expect(result).to.be.a('string');
      expect(result).to.equal(authResponseJwt);
    });

    it('should fail decrypting the jwe if the wrong pin is entered', async () => {
      try {
        await Oidc.decryptAuthResponse(
          clientEphemeralBearerDid,
          authResponseJwe,
          '87383837583757835737537734783'
        );
      } catch (e: any) {
        expect(e).to.be.instanceOf(Error);
        expect(e.message).to.include('invalid tag');
      }
    });

    it('should validate the jwt and parse it into an object', async () => {
      const result = (await Oidc.verifyJwt({
        jwt: authResponseJwt,
      })) as Web5ConnectAuthResponse;
      expect(result).to.be.a('object');
      expect(result.delegateGrants).to.have.length.above(0);
    });
  });

  describe('end to end client test', function () {
    it('should complete the whole connect flow with the correct pin', async function () {
      const fetchStub = sinon.stub(globalThis, 'fetch');
      const onWalletUriReadySpy = sinon.spy();
      sinon.stub(DidJwk, 'create').resolves(clientEphemeralBearerDid);

      const par = {
        expires_in  : 3600000,
        request_uri : 'http://localhost:3000/connect/authorize/xyz.jwt',
      };

      const parResponse = new Response(JSON.stringify(par), {
        status  : 200,
        headers : { 'Content-type': 'application/json' },
      });

      const authResponse = new Response(authResponseJwe, {
        status  : 200,
        headers : { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      fetchStub.onFirstCall().resolves(parResponse);
      fetchStub.callThrough();
      fetchStub.onThirdCall().resolves(authResponse);
      fetchStub.callThrough();

      const results = await WalletConnect.initClient({
        walletUri          : 'http://localhost:3000/',
        connectServerUrl   : 'http://localhost:3000/connect',
        permissionRequests : [
          {
            protocolDefinition : {} as any,
            permissionScopes   : {} as any,
          },
        ],
        onWalletUriReady : (uri) => onWalletUriReadySpy(uri),
        validatePin      : async () => randomPin,
      });

      expect(fetchStub.firstCall.args[0]).to.equal(
        'http://localhost:3000/connect/par'
      );
      expect(onWalletUriReadySpy.calledOnce).to.be.true;
      expect(onWalletUriReadySpy.firstCall.args[0]).to.match(
        new RegExp(
          'http:\\/\\/[\\w.-]+:\\d+\\/\\?request_uri=http%3A%2F%2F[\\w.-]+%3A(\\d+|%24%7Bport%7D)%2Fconnect%2Fauthorize%2F[\\w.-]+\\.jwt&encryption_key=.+',
          'i'
        )
      );
      expect(fetchStub.thirdCall.args[0]).to.match(
        new RegExp('^http:\\/\\/localhost:3000\\/connect\\/token\\/.+\\.jwt$')
      );

      expect(results).to.be.an('object');
      expect(results?.delegateGrants).to.be.an('array');
      expect(results?.delegateDid).to.be.an('object');
    });
  });
});
