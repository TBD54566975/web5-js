import { expect } from 'chai';

import { Did } from '../src/did.js';

describe('Did', () => {
  it('constructor', () => {
    const didUriComponents = {
      method   : 'example',
      id       : '123',
      path     : '/path',
      query    : 'versionId=1',
      fragment : 'key1',
      params   : { versionId: '1' },
    };

    const didUri = new Did(didUriComponents);

    expect(didUri).to.deep.equal({ ...didUriComponents, uri: 'did:example:123' });
  });

  describe('parse()', () => {
    it('parses a basic DID URI', () => {
      const didUri = Did.parse('did:example:123');

      expect(didUri).to.deep.equal({
        uri    : 'did:example:123',
        method : 'example',
        id     : '123',
      });
    });

    it('parses a DID URI with unusual identifier characters', () => {
      let didUri = Did.parse('did:123:test::test2');
      expect(didUri).to.deep.equal({
        method : '123',
        id     : 'test::test2',
        uri    : 'did:123:test::test2',
      });

      didUri = Did.parse('did:method:%12%AF');
      expect(didUri).to.deep.equal({
        method : 'method',
        id     : '%12%AF',
        uri    : 'did:method:%12%AF',
      });

      didUri = Did.parse('did:web:example.com%3A8443');
      expect(didUri).to.deep.equal({
        uri    : 'did:web:example.com%3A8443',
        method : 'web',
        id     : 'example.com%3A8443',
      });

      didUri = Did.parse('did:web:example.com:path:some%2Bsubpath');
      expect(didUri).to.deep.equal({
        uri    : 'did:web:example.com:path:some%2Bsubpath',
        method : 'web',
        id     : 'example.com:path:some%2Bsubpath',
      });
    });

    it('parses a DID URI with a path', () => {
      const didUri = Did.parse('did:example:123/path');

      expect(didUri).to.deep.equal({
        uri    : 'did:example:123',
        method : 'example',
        id     : '123',
        path   : '/path',
      });
    });

    it('parses a DID URI with a query', () => {
      const didUri = Did.parse('did:example:123?versionId=1');

      expect(didUri).to.deep.equal({
        uri    : 'did:example:123',
        method : 'example',
        id     : '123',
        query  : 'versionId=1',
        params : { versionId: '1' },
      });
    });

    it('parses a DID URI with a fragment', () => {
      const didUri = Did.parse('did:example:123#key-1');

      expect(didUri).to.deep.equal({
        uri      : 'did:example:123',
        method   : 'example',
        id       : '123',
        fragment : 'key-1',
      });
    });

    it('parses a DID URI with an identifier containing an underscore', () => {
      const didUri = Did.parse('did:example:abcdefg_123456790');

      expect(didUri).to.deep.equal({
        uri    : 'did:example:abcdefg_123456790',
        method : 'example',
        id     : 'abcdefg_123456790',
      });
    });

    it('parses a complex DID URI with all components', () => {
      const didUri = Did.parse('did:example:123/some/path?versionId=1#key1');

      expect(didUri).to.deep.equal({
        uri      : 'did:example:123',
        method   : 'example',
        id       : '123',
        path     : '/some/path',
        query    : 'versionId=1',
        fragment : 'key1',
        params   : { versionId: '1' },
      });
    });

    it('parses DID URIs with various combinations of components', () => {
      expect(
        Did.parse('did:uport:123/some/path#fragment=123')
      ).to.deep.equal({
        uri      : 'did:uport:123',
        method   : 'uport',
        id       : '123',
        path     : '/some/path',
        fragment : 'fragment=123',
      });

      expect(
        Did.parse('did:example:123?service=agent&relativeRef=/credentials#degree')
      ).to.deep.equal({
        uri      : 'did:example:123',
        method   : 'example',
        id       : '123',
        query    : 'service=agent&relativeRef=/credentials',
        fragment : 'degree',
        params   : {
          service     : 'agent',
          relativeRef : '/credentials',
        },
      });

      expect(
        Did.parse('did:example:test:123/some/path?versionId=1#key1')
      ).to.deep.equal({
        uri      : 'did:example:test:123',
        method   : 'example',
        id       : 'test:123',
        path     : '/some/path',
        query    : 'versionId=1',
        fragment : 'key1',
        params   : { versionId: '1' },
      });
    });

    it('extracts ION DID long form identifier from a DID URI', async () => {
      const { uri } = Did.parse(
        'did:ion:EiAi68p2irCNQIzaui8gTjGDeOqSUusZS8jWVHfseSWZ5g:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiJrZXktMSIsInB1YmxpY0tleUp3ayI6eyJjcnYiOiJzZWNwMjU2azEiLCJrdHkiOiJFQyIsIngiOiI2MWlQWXVHZWZ4b3R6QmRRWnREdnY2Y1dIWm1YclRUc2NZLXU3WTJwRlpjIiwieSI6Ijg4blBDVkxmckFZOWktd2c1T1Jjd1ZiSFdDX3RiZUFkMUpFMmUwY28wbFUifSwicHVycG9zZXMiOlsiYXV0aGVudGljYXRpb24iXSwidHlwZSI6IkVjZHNhU2VjcDI1NmsxVmVyaWZpY2F0aW9uS2V5MjAxOSJ9XSwic2VydmljZXMiOlt7ImlkIjoiZHduIiwic2VydmljZUVuZHBvaW50Ijp7Im5vZGVzIjpbImh0dHA6Ly9sb2NhbGhvc3Q6ODA4NSJdfSwidHlwZSI6IkRlY2VudHJhbGl6ZWRXZWJOb2RlIn1dfX1dLCJ1cGRhdGVDb21taXRtZW50IjoiRWlCb1c2dGs4WlZRTWs3YjFubkF2R3F3QTQ2amlaaUc2dWNYemxyNTZDWWFiUSJ9LCJzdWZmaXhEYXRhIjp7ImRlbHRhSGFzaCI6IkVpQ3Y2cUhEMFV4TTBadmZlTHU4dDR4eU5DVjNscFBSaTl6a3paU3h1LW8wWUEiLCJyZWNvdmVyeUNvbW1pdG1lbnQiOiJFaUN0STM0ckdGNU9USkJETXRUYm14a1lQeC0ydFd3MldZLTU2UTVPNHR0WWJBIn19'
      ) ?? {};

      expect(uri).to.equal('did:ion:EiAi68p2irCNQIzaui8gTjGDeOqSUusZS8jWVHfseSWZ5g:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiJrZXktMSIsInB1YmxpY0tleUp3ayI6eyJjcnYiOiJzZWNwMjU2azEiLCJrdHkiOiJFQyIsIngiOiI2MWlQWXVHZWZ4b3R6QmRRWnREdnY2Y1dIWm1YclRUc2NZLXU3WTJwRlpjIiwieSI6Ijg4blBDVkxmckFZOWktd2c1T1Jjd1ZiSFdDX3RiZUFkMUpFMmUwY28wbFUifSwicHVycG9zZXMiOlsiYXV0aGVudGljYXRpb24iXSwidHlwZSI6IkVjZHNhU2VjcDI1NmsxVmVyaWZpY2F0aW9uS2V5MjAxOSJ9XSwic2VydmljZXMiOlt7ImlkIjoiZHduIiwic2VydmljZUVuZHBvaW50Ijp7Im5vZGVzIjpbImh0dHA6Ly9sb2NhbGhvc3Q6ODA4NSJdfSwidHlwZSI6IkRlY2VudHJhbGl6ZWRXZWJOb2RlIn1dfX1dLCJ1cGRhdGVDb21taXRtZW50IjoiRWlCb1c2dGs4WlZRTWs3YjFubkF2R3F3QTQ2amlaaUc2dWNYemxyNTZDWWFiUSJ9LCJzdWZmaXhEYXRhIjp7ImRlbHRhSGFzaCI6IkVpQ3Y2cUhEMFV4TTBadmZlTHU4dDR4eU5DVjNscFBSaTl6a3paU3h1LW8wWUEiLCJyZWNvdmVyeUNvbW1pdG1lbnQiOiJFaUN0STM0ckdGNU9USkJETXRUYm14a1lQeC0ydFd3MldZLTU2UTVPNHR0WWJBIn19');
    });

    it('extracts ION DID long form identifier from a DID URI with query and fragment', async () => {
      const { uri } = Did.parse(
        'did:ion:EiAi68p2irCNQIzaui8gTjGDeOqSUusZS8jWVHfseSWZ5g:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiJrZXktMSIsInB1YmxpY0tleUp3ayI6eyJjcnYiOiJzZWNwMjU2azEiLCJrdHkiOiJFQyIsIngiOiI2MWlQWXVHZWZ4b3R6QmRRWnREdnY2Y1dIWm1YclRUc2NZLXU3WTJwRlpjIiwieSI6Ijg4blBDVkxmckFZOWktd2c1T1Jjd1ZiSFdDX3RiZUFkMUpFMmUwY28wbFUifSwicHVycG9zZXMiOlsiYXV0aGVudGljYXRpb24iXSwidHlwZSI6IkVjZHNhU2VjcDI1NmsxVmVyaWZpY2F0aW9uS2V5MjAxOSJ9XSwic2VydmljZXMiOlt7ImlkIjoiZHduIiwic2VydmljZUVuZHBvaW50Ijp7Im5vZGVzIjpbImh0dHA6Ly9sb2NhbGhvc3Q6ODA4NSJdfSwidHlwZSI6IkRlY2VudHJhbGl6ZWRXZWJOb2RlIn1dfX1dLCJ1cGRhdGVDb21taXRtZW50IjoiRWlCb1c2dGs4WlZRTWs3YjFubkF2R3F3QTQ2amlaaUc2dWNYemxyNTZDWWFiUSJ9LCJzdWZmaXhEYXRhIjp7ImRlbHRhSGFzaCI6IkVpQ3Y2cUhEMFV4TTBadmZlTHU4dDR4eU5DVjNscFBSaTl6a3paU3h1LW8wWUEiLCJyZWNvdmVyeUNvbW1pdG1lbnQiOiJFaUN0STM0ckdGNU9USkJETXRUYm14a1lQeC0ydFd3MldZLTU2UTVPNHR0WWJBIn19?service=files&relativeRef=/credentials#degree'
      ) ?? {};

      expect(uri).to.equal('did:ion:EiAi68p2irCNQIzaui8gTjGDeOqSUusZS8jWVHfseSWZ5g:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiJrZXktMSIsInB1YmxpY0tleUp3ayI6eyJjcnYiOiJzZWNwMjU2azEiLCJrdHkiOiJFQyIsIngiOiI2MWlQWXVHZWZ4b3R6QmRRWnREdnY2Y1dIWm1YclRUc2NZLXU3WTJwRlpjIiwieSI6Ijg4blBDVkxmckFZOWktd2c1T1Jjd1ZiSFdDX3RiZUFkMUpFMmUwY28wbFUifSwicHVycG9zZXMiOlsiYXV0aGVudGljYXRpb24iXSwidHlwZSI6IkVjZHNhU2VjcDI1NmsxVmVyaWZpY2F0aW9uS2V5MjAxOSJ9XSwic2VydmljZXMiOlt7ImlkIjoiZHduIiwic2VydmljZUVuZHBvaW50Ijp7Im5vZGVzIjpbImh0dHA6Ly9sb2NhbGhvc3Q6ODA4NSJdfSwidHlwZSI6IkRlY2VudHJhbGl6ZWRXZWJOb2RlIn1dfX1dLCJ1cGRhdGVDb21taXRtZW50IjoiRWlCb1c2dGs4WlZRTWs3YjFubkF2R3F3QTQ2amlaaUc2dWNYemxyNTZDWWFiUSJ9LCJzdWZmaXhEYXRhIjp7ImRlbHRhSGFzaCI6IkVpQ3Y2cUhEMFV4TTBadmZlTHU4dDR4eU5DVjNscFBSaTl6a3paU3h1LW8wWUEiLCJyZWNvdmVyeUNvbW1pdG1lbnQiOiJFaUN0STM0ckdGNU9USkJETXRUYm14a1lQeC0ydFd3MldZLTU2UTVPNHR0WWJBIn19');
    });

    it('returns null for an invalid DID URI', () => {
      expect(Did.parse('')).to.equal(null);
      expect(Did.parse('not-a-did-uri')).to.equal(null);
      expect(Did.parse('did:')).to.equal(null);
      expect(Did.parse('did:uport')).to.equal(null);
      expect(Did.parse('did:uport:')).to.equal(null);
      expect(Did.parse('did:uport:1234_12313***')).to.equal(null);
      expect(Did.parse('123')).to.equal(null);
      expect(Did.parse('did:method:%12%1')).to.equal(null);
      expect(Did.parse('did:method:%1233%Ay')).to.equal(null);
      expect(Did.parse('did:CAP:id')).to.equal(null);
      expect(Did.parse('did:method:id::anotherid%r9')).to.equal(null);
    });
  });
});