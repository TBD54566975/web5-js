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
import { BearerIdentity, DwnInterface, DwnMessage, DwnProtocolDefinition,  WalletConnect } from '../src/index.js';
import { RecordsPermissionScope } from '@tbd54566975/dwn-sdk-js';
import { DwnInterfaceName, DwnMethodName } from '@tbd54566975/dwn-sdk-js';

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

  let permissionGrants: any[] = [
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

  const protocolDefinition: DwnProtocolDefinition = {
    protocol  : 'http://profile-protocol.xyz',
    published : true,
    types     : {
      profile: {
        schema      : 'http://profile-protocol.xyz/schema/profile',
        dataFormats : ['application/json'],
      },
    },
    structure: {
      profile: {
        $actions: [
          {
            who : 'anyone',
            can : ['create', 'update'],
          },
        ],
      },
    },
  };

  const permissionScopes: RecordsPermissionScope[] = [
    {
      interface : 'Records' as any,
      method    : 'Write' as any,
      protocol  : 'http://profile-protocol.xyz',
    },
    {
      interface : 'Records' as any,
      method    : 'Query' as any,
      protocol  : 'http://profile-protocol.xyz',
    },
    {
      interface : 'Records' as any,
      method    : 'Read' as any,
      protocol  : 'http://profile-protocol.xyz',
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

    delegateBearerDid = await DidJwk.create();
    delegatePortableDid = await delegateBearerDid.export();
  });

  after(async () => {
    sinon.restore();
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
        permissionRequests : [{ protocolDefinition, permissionScopes }],
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
        testHarness.agent,
        permissionScopes
      );
      const scopesRequested = permissionScopes.length;
      expect(results).to.have.lengthOf(scopesRequested);
      expect(results[0]).to.be.a('object');
    });

    it('should create the authresponse which includes the permissionGrants, nonce, private key material', async () => {
      const options = {
        iss            : providerIdentity.did.uri,
        sub            : delegateBearerDid.uri,
        aud            : authRequest.client_id,
        nonce          : authRequest.nonce,
        delegateGrants : permissionGrants,
        delegatePortableDid,
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
      sinon.stub(Oidc, 'createPermissionGrants').resolves(permissionGrants as any);
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
        testHarness.agent
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
      expect(results?.delegatePortableDid).to.be.an('object');
    });
  });

  describe('submitAuthResponse', () => {
    it('should not attempt to configure the protocol if it already exists', async () => {
      // scenario: the wallet gets a request for a protocol that it already has configured
      // the wallet should not attempt to re-configure, but instead ensure that the protocol is
      // sent to the remote DWN for the requesting client to be able to sync it down later

      sinon.stub(Oidc, 'createPermissionGrants').resolves(permissionGrants as any);
      sinon.stub(CryptoUtils, 'randomBytes').returns(encryptionNonce);
      sinon.stub(DidJwk, 'create').resolves(delegateBearerDid);

      const callbackUrl = Oidc.buildOidcUrl({
        baseURL  : 'http://localhost:3000',
        endpoint : 'callback',
      });

      const options = {
        client_id          : clientEphemeralPortableDid.uri,
        scope              : 'openid did:jwk',
        // code_challenge        : Convert.uint8Array(codeChallenge).toBase64Url(),
        // code_challenge_method : 'S256' as const,
        permissionRequests : [{ protocolDefinition, permissionScopes }],
        redirect_uri       : callbackUrl,
      };
      authRequest = await Oidc.createAuthRequest(options);

      // stub the processDwnRequest method to return a protocol entry
      const protocolMessage = {} as DwnMessage[DwnInterface.ProtocolsConfigure];

      // spy send request
      const sendRequestSpy = sinon.stub(testHarness.agent, 'sendDwnRequest').resolves({
        messageCid : '',
        reply      : { status: { code: 202, detail: 'OK' } }
      });

      const processDwnRequestStub = sinon
        .stub(testHarness.agent, 'processDwnRequest')
        .resolves({ messageCid: '', reply: { status: { code: 200, detail: 'OK' }, entries: [ protocolMessage ]} });

      // call submitAuthResponse
      await Oidc.submitAuthResponse(
        providerIdentity.did.uri,
        authRequest,
        randomPin,
        testHarness.agent
      );

      // expect the process request to only be called once for ProtocolsQuery
      expect(processDwnRequestStub.callCount).to.equal(1);
      expect(processDwnRequestStub.firstCall.args[0].messageType).to.equal(DwnInterface.ProtocolsQuery);

      // send request should be called once as a ProtocolsConfigure
      expect(sendRequestSpy.callCount).to.equal(1);
      expect(sendRequestSpy.firstCall.args[0].messageType).to.equal(DwnInterface.ProtocolsConfigure);
    });

    it('should configure the protocol if it does not exist', async () => {
      // scenario: the wallet gets a request for a protocol that it does not have configured
      // the wallet should attempt to configure the protocol and then send the protocol to the remote DWN

      // looks for a response of 404, empty entries array or missing entries array

      sinon.stub(Oidc, 'createPermissionGrants').resolves(permissionGrants as any);
      sinon.stub(CryptoUtils, 'randomBytes').returns(encryptionNonce);
      sinon.stub(DidJwk, 'create').resolves(delegateBearerDid);

      const callbackUrl = Oidc.buildOidcUrl({
        baseURL  : 'http://localhost:3000',
        endpoint : 'callback',
      });

      const options = {
        client_id          : clientEphemeralPortableDid.uri,
        scope              : 'openid did:jwk',
        // code_challenge        : Convert.uint8Array(codeChallenge).toBase64Url(),
        // code_challenge_method : 'S256' as const,
        permissionRequests : [{ protocolDefinition, permissionScopes }],
        redirect_uri       : callbackUrl,
      };
      authRequest = await Oidc.createAuthRequest(options);

      // spy send request
      const sendRequestSpy = sinon.stub(testHarness.agent, 'sendDwnRequest').resolves({
        messageCid : '',
        reply      : { status: { code: 202, detail: 'OK' } }
      });

      const processDwnRequestStub = sinon
        .stub(testHarness.agent, 'processDwnRequest')
        .resolves({ messageCid: '', reply: { status: { code: 200, detail: 'OK' }, entries: [ ] } });

      // call submitAuthResponse
      await Oidc.submitAuthResponse(
        providerIdentity.did.uri,
        authRequest,
        randomPin,
        testHarness.agent
      );

      // expect the process request to be called for query and configure
      expect(processDwnRequestStub.callCount).to.equal(2);
      expect(processDwnRequestStub.firstCall.args[0].messageType).to.equal(DwnInterface.ProtocolsQuery);
      expect(processDwnRequestStub.secondCall.args[0].messageType).to.equal(DwnInterface.ProtocolsConfigure);

      // send request should be called once as a ProtocolsConfigure
      expect(sendRequestSpy.callCount).to.equal(1);
      expect(sendRequestSpy.firstCall.args[0].messageType).to.equal(DwnInterface.ProtocolsConfigure);

      // reset the spys
      processDwnRequestStub.resetHistory();
      sendRequestSpy.resetHistory();

      // processDwnRequestStub should resolve a 200 with no entires
      processDwnRequestStub.resolves({ messageCid: '', reply: { status: { code: 200, detail: 'OK' } } });

      // call submitAuthResponse
      await Oidc.submitAuthResponse(
        providerIdentity.did.uri,
        authRequest,
        randomPin,
        testHarness.agent
      );

      // expect the process request to be called for query and configure
      expect(processDwnRequestStub.callCount).to.equal(2);
      expect(processDwnRequestStub.firstCall.args[0].messageType).to.equal(DwnInterface.ProtocolsQuery);
      expect(processDwnRequestStub.secondCall.args[0].messageType).to.equal(DwnInterface.ProtocolsConfigure);

      // send request should be called once as a ProtocolsConfigure
      expect(sendRequestSpy.callCount).to.equal(1);
      expect(sendRequestSpy.firstCall.args[0].messageType).to.equal(DwnInterface.ProtocolsConfigure);
    });

    it('should fail if the send request fails for newly configured protocol', async () => {
      sinon.stub(Oidc, 'createPermissionGrants').resolves(permissionGrants as any);
      sinon.stub(CryptoUtils, 'randomBytes').returns(encryptionNonce);
      sinon.stub(DidJwk, 'create').resolves(delegateBearerDid);

      const callbackUrl = Oidc.buildOidcUrl({
        baseURL  : 'http://localhost:3000',
        endpoint : 'callback',
      });

      const options = {
        client_id          : clientEphemeralPortableDid.uri,
        scope              : 'openid did:jwk',
        // code_challenge        : Convert.uint8Array(codeChallenge).toBase64Url(),
        // code_challenge_method : 'S256' as const,
        permissionRequests : [{ protocolDefinition, permissionScopes }],
        redirect_uri       : callbackUrl,
      };
      authRequest = await Oidc.createAuthRequest(options);

      // spy send request
      const sendRequestSpy = sinon.stub(testHarness.agent, 'sendDwnRequest').resolves({
        reply      : { status: { code: 500, detail: 'Internal Server Error' } },
        messageCid : ''
      });

      // return without any entries
      const processDwnRequestStub = sinon
        .stub(testHarness.agent, 'processDwnRequest')
        .resolves({ messageCid: '', reply: { status: { code: 200, detail: 'OK' } } });

      try {
        // call submitAuthResponse
        await Oidc.submitAuthResponse(
          providerIdentity.did.uri,
          authRequest,
          randomPin,
          testHarness.agent
        );

        expect.fail('should have thrown an error');
      } catch (error: any) {
        expect(error.message).to.equal('Could not send protocol: Internal Server Error');
        expect(sendRequestSpy.callCount).to.equal(1);
      }
    });

    it('should fail if the send request fails for existing protocol', async () => {
      sinon.stub(Oidc, 'createPermissionGrants').resolves(permissionGrants as any);
      sinon.stub(CryptoUtils, 'randomBytes').returns(encryptionNonce);
      sinon.stub(DidJwk, 'create').resolves(delegateBearerDid);

      const callbackUrl = Oidc.buildOidcUrl({
        baseURL  : 'http://localhost:3000',
        endpoint : 'callback',
      });

      const options = {
        client_id          : clientEphemeralPortableDid.uri,
        scope              : 'openid did:jwk',
        // code_challenge        : Convert.uint8Array(codeChallenge).toBase64Url(),
        // code_challenge_method : 'S256' as const,
        permissionRequests : [{ protocolDefinition, permissionScopes }],
        redirect_uri       : callbackUrl,
      };
      authRequest = await Oidc.createAuthRequest(options);

      // stub the processDwnRequest method to return a protocol entry
      const protocolMessage = {} as DwnMessage[DwnInterface.ProtocolsConfigure];

      // spy send request
      const sendRequestSpy = sinon.stub(testHarness.agent, 'sendDwnRequest').resolves({
        reply      : { status: { code: 500, detail: 'Internal Server Error' } },
        messageCid : ''
      });

      // mock returning the protocol entry
      const processDwnRequestStub = sinon
        .stub(testHarness.agent, 'processDwnRequest')
        .resolves({ messageCid: '', reply: { status: { code: 200, detail: 'OK' }, entries: [ protocolMessage ] } });

      try {
        // call submitAuthResponse
        await Oidc.submitAuthResponse(
          providerIdentity.did.uri,
          authRequest,
          randomPin,
          testHarness.agent
        );

        expect.fail('should have thrown an error');
      } catch (error: any) {
        expect(error.message).to.equal('Could not send protocol: Internal Server Error');
        expect(processDwnRequestStub.callCount).to.equal(1);
        expect(sendRequestSpy.callCount).to.equal(1);
      }
    });

    it('should throw if protocol could not be fetched at all', async () => {
      sinon.stub(Oidc, 'createPermissionGrants').resolves(permissionGrants as any);
      sinon.stub(CryptoUtils, 'randomBytes').returns(encryptionNonce);
      sinon.stub(DidJwk, 'create').resolves(delegateBearerDid);

      const callbackUrl = Oidc.buildOidcUrl({
        baseURL  : 'http://localhost:3000',
        endpoint : 'callback',
      });

      const options = {
        client_id          : clientEphemeralPortableDid.uri,
        scope              : 'openid did:jwk',
        // code_challenge        : Convert.uint8Array(codeChallenge).toBase64Url(),
        // code_challenge_method : 'S256' as const,
        permissionRequests : [{ protocolDefinition, permissionScopes }],
        redirect_uri       : callbackUrl,
      };
      authRequest = await Oidc.createAuthRequest(options);

      // spy send request
      const sendRequestSpy = sinon.stub(testHarness.agent, 'sendDwnRequest').resolves({
        reply      : { status: { code: 500, detail: 'Internal Server Error' } },
        messageCid : ''
      });

      // mock returning the protocol entry
      const processDwnRequestStub = sinon
        .stub(testHarness.agent, 'processDwnRequest')
        .resolves({ messageCid: '', reply: { status: { code: 500, detail: 'Some Error'}, } });

      try {
        // call submitAuthResponse
        await Oidc.submitAuthResponse(
          providerIdentity.did.uri,
          authRequest,
          randomPin,
          testHarness.agent
        );

        expect.fail('should have thrown an error');
      } catch (error: any) {
        expect(error.message).to.equal('Could not fetch protocol: Some Error');
        expect(processDwnRequestStub.callCount).to.equal(1);
        expect(sendRequestSpy.callCount).to.equal(0);
      }
    });

    it('should throw if a grant that is included in the request does not match the protocol definition', async () => {
      sinon.stub(Oidc, 'createPermissionGrants').resolves(permissionGrants as any);
      sinon.stub(CryptoUtils, 'randomBytes').returns(encryptionNonce);
      sinon.stub(DidJwk, 'create').resolves(delegateBearerDid);

      const callbackUrl = Oidc.buildOidcUrl({
        baseURL  : 'http://localhost:3000',
        endpoint : 'callback',
      });

      const mismatchedScopes = [...permissionScopes];
      mismatchedScopes[0].protocol = 'http://profile-protocol.xyz/other';

      const options = {
        client_id          : clientEphemeralPortableDid.uri,
        scope              : 'openid did:jwk',
        // code_challenge        : Convert.uint8Array(codeChallenge).toBase64Url(),
        // code_challenge_method : 'S256' as const,
        permissionRequests : [{ protocolDefinition, permissionScopes }],
        redirect_uri       : callbackUrl,
      };
      authRequest = await Oidc.createAuthRequest(options);

      try {
        // call submitAuthResponse
        await Oidc.submitAuthResponse(
          providerIdentity.did.uri,
          authRequest,
          randomPin,
          testHarness.agent
        );

        expect.fail('should have thrown an error');
      } catch (error: any) {
        expect(error.message).to.equal('All permission scopes must match the protocol uri they are provided with.');
      }
    });
  });

  describe('createPermissionRequestForProtocol', () => {
    it('should add sync permissions to all requests', async () => {
      const protocol:DwnProtocolDefinition = {
        published : true,
        protocol  : 'https://exmaple.org/protocols/social',
        types     : {
          note: {
            schema      : 'https://example.org/schemas/note',
            dataFormats : [ 'application/json', 'text/plain' ],
          }
        },
        structure: {
          note: {}
        }
      };

      const permissionRequests = WalletConnect.createPermissionRequestForProtocol({
        definition: protocol, permissions: []
      });

      expect(permissionRequests.protocolDefinition).to.deep.equal(protocol);
      expect(permissionRequests.permissionScopes.length).to.equal(4); // only includes the sync permissions + protocol query permission
      expect(permissionRequests.permissionScopes.find(scope => scope.interface === DwnInterfaceName.Messages && scope.method === DwnMethodName.Read)).to.not.be.undefined;
      expect(permissionRequests.permissionScopes.find(scope => scope.interface === DwnInterfaceName.Messages && scope.method === DwnMethodName.Query)).to.not.be.undefined;
      expect(permissionRequests.permissionScopes.find(scope => scope.interface === DwnInterfaceName.Messages && scope.method === DwnMethodName.Subscribe)).to.not.be.undefined;
      expect(permissionRequests.permissionScopes.find(scope => scope.interface === DwnInterfaceName.Protocols && scope.method === DwnMethodName.Query)).to.not.be.undefined;
    });

    it('should add requested permissions to the request', async () => {
      const protocol:DwnProtocolDefinition = {
        published : true,
        protocol  : 'https://exmaple.org/protocols/social',
        types     : {
          note: {
            schema      : 'https://example.org/schemas/note',
            dataFormats : [ 'application/json', 'text/plain' ],
          }
        },
        structure: {
          note: {}
        }
      };

      const permissionRequests = WalletConnect.createPermissionRequestForProtocol({
        definition: protocol, permissions: ['write', 'read']
      });

      expect(permissionRequests.protocolDefinition).to.deep.equal(protocol);

      // the 3 sync permissions plus the 2 requested permissions, and a protocol query permission
      expect(permissionRequests.permissionScopes.length).to.equal(6);
      expect(permissionRequests.permissionScopes.find(scope => scope.interface === DwnInterfaceName.Records && scope.method === DwnMethodName.Read)).to.not.be.undefined;
      expect(permissionRequests.permissionScopes.find(scope => scope.interface === DwnInterfaceName.Records && scope.method === DwnMethodName.Write)).to.not.be.undefined;
    });

    it('supports requesting `read`, `write`, `delete`, `query`, `subscribe` and `configure` permissions', async () => {
      const protocol:DwnProtocolDefinition = {
        published : true,
        protocol  : 'https://exmaple.org/protocols/social',
        types     : {
          note: {
            schema      : 'https://example.org/schemas/note',
            dataFormats : [ 'application/json', 'text/plain' ],
          }
        },
        structure: {
          note: {}
        }
      };

      const permissionRequests = WalletConnect.createPermissionRequestForProtocol({
        definition: protocol, permissions: ['write', 'read', 'delete', 'query', 'subscribe', 'configure']
      });

      expect(permissionRequests.protocolDefinition).to.deep.equal(protocol);

      // the 3 sync permissions plus the 5 requested permissions
      expect(permissionRequests.permissionScopes.length).to.equal(10);
      expect(permissionRequests.permissionScopes.find(scope => scope.interface === DwnInterfaceName.Records && scope.method === DwnMethodName.Read)).to.not.be.undefined;
      expect(permissionRequests.permissionScopes.find(scope => scope.interface === DwnInterfaceName.Records && scope.method === DwnMethodName.Write)).to.not.be.undefined;
      expect(permissionRequests.permissionScopes.find(scope => scope.interface === DwnInterfaceName.Records && scope.method === DwnMethodName.Delete)).to.not.be.undefined;
      expect(permissionRequests.permissionScopes.find(scope => scope.interface === DwnInterfaceName.Records && scope.method === DwnMethodName.Query)).to.not.be.undefined;
      expect(permissionRequests.permissionScopes.find(scope => scope.interface === DwnInterfaceName.Records && scope.method === DwnMethodName.Subscribe)).to.not.be.undefined;
      expect(permissionRequests.permissionScopes.find(scope => scope.interface === DwnInterfaceName.Protocols && scope.method === DwnMethodName.Query)).to.not.be.undefined;
      expect(permissionRequests.permissionScopes.find(scope => scope.interface === DwnInterfaceName.Protocols && scope.method === DwnMethodName.Configure)).to.not.be.undefined;
    });
  });
});
