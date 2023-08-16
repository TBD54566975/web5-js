import { expect } from 'chai';

import {
  getVerificationMethodIds,
  getVerificationMethodTypes,
  parseDid,
} from '../src/utils.js';
import { didDocumentIdTestVectors, didDocumentTypeTestVectors } from './fixtures/test-vectors/did-utils.js';

describe('DID Utils', () => {
  describe('getVerificationMethodIds()', () => {
    for (const vector of didDocumentIdTestVectors) {
      it(`passes test vector ${vector.id}`, () => {
        const methodIds = getVerificationMethodIds(vector.input as any);
        expect(methodIds).to.deep.equal(vector.output);
      });
    }
  });

  describe('getTypesFromDocument()', () => {
    for (const vector of didDocumentTypeTestVectors) {
      it(`passes test vector ${vector.id}`, () => {
        const types = getVerificationMethodTypes(vector.input);
        expect(types).to.deep.equal(vector.output);
      });
    }
  });

  describe('parseDid()', () => {
    it('extracts ION DID long form identifier from DID URL', async () => {
      const { did } = parseDid({
        didUrl: 'did:ion:EiAi68p2irCNQIzaui8gTjGDeOqSUusZS8jWVHfseSWZ5g:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiJrZXktMSIsInB1YmxpY0tleUp3ayI6eyJjcnYiOiJzZWNwMjU2azEiLCJrdHkiOiJFQyIsIngiOiI2MWlQWXVHZWZ4b3R6QmRRWnREdnY2Y1dIWm1YclRUc2NZLXU3WTJwRlpjIiwieSI6Ijg4blBDVkxmckFZOWktd2c1T1Jjd1ZiSFdDX3RiZUFkMUpFMmUwY28wbFUifSwicHVycG9zZXMiOlsiYXV0aGVudGljYXRpb24iXSwidHlwZSI6IkVjZHNhU2VjcDI1NmsxVmVyaWZpY2F0aW9uS2V5MjAxOSJ9XSwic2VydmljZXMiOlt7ImlkIjoiZHduIiwic2VydmljZUVuZHBvaW50Ijp7Im5vZGVzIjpbImh0dHA6Ly9sb2NhbGhvc3Q6ODA4NSJdfSwidHlwZSI6IkRlY2VudHJhbGl6ZWRXZWJOb2RlIn1dfX1dLCJ1cGRhdGVDb21taXRtZW50IjoiRWlCb1c2dGs4WlZRTWs3YjFubkF2R3F3QTQ2amlaaUc2dWNYemxyNTZDWWFiUSJ9LCJzdWZmaXhEYXRhIjp7ImRlbHRhSGFzaCI6IkVpQ3Y2cUhEMFV4TTBadmZlTHU4dDR4eU5DVjNscFBSaTl6a3paU3h1LW8wWUEiLCJyZWNvdmVyeUNvbW1pdG1lbnQiOiJFaUN0STM0ckdGNU9USkJETXRUYm14a1lQeC0ydFd3MldZLTU2UTVPNHR0WWJBIn19'
      }) ?? {};

      expect(did).to.equal('did:ion:EiAi68p2irCNQIzaui8gTjGDeOqSUusZS8jWVHfseSWZ5g:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiJrZXktMSIsInB1YmxpY0tleUp3ayI6eyJjcnYiOiJzZWNwMjU2azEiLCJrdHkiOiJFQyIsIngiOiI2MWlQWXVHZWZ4b3R6QmRRWnREdnY2Y1dIWm1YclRUc2NZLXU3WTJwRlpjIiwieSI6Ijg4blBDVkxmckFZOWktd2c1T1Jjd1ZiSFdDX3RiZUFkMUpFMmUwY28wbFUifSwicHVycG9zZXMiOlsiYXV0aGVudGljYXRpb24iXSwidHlwZSI6IkVjZHNhU2VjcDI1NmsxVmVyaWZpY2F0aW9uS2V5MjAxOSJ9XSwic2VydmljZXMiOlt7ImlkIjoiZHduIiwic2VydmljZUVuZHBvaW50Ijp7Im5vZGVzIjpbImh0dHA6Ly9sb2NhbGhvc3Q6ODA4NSJdfSwidHlwZSI6IkRlY2VudHJhbGl6ZWRXZWJOb2RlIn1dfX1dLCJ1cGRhdGVDb21taXRtZW50IjoiRWlCb1c2dGs4WlZRTWs3YjFubkF2R3F3QTQ2amlaaUc2dWNYemxyNTZDWWFiUSJ9LCJzdWZmaXhEYXRhIjp7ImRlbHRhSGFzaCI6IkVpQ3Y2cUhEMFV4TTBadmZlTHU4dDR4eU5DVjNscFBSaTl6a3paU3h1LW8wWUEiLCJyZWNvdmVyeUNvbW1pdG1lbnQiOiJFaUN0STM0ckdGNU9USkJETXRUYm14a1lQeC0ydFd3MldZLTU2UTVPNHR0WWJBIn19');
    });

    it('extracts ION DID long form identifier from DID URL with query and fragment', async () => {
      const { did } = parseDid({
        didUrl: 'did:ion:EiAi68p2irCNQIzaui8gTjGDeOqSUusZS8jWVHfseSWZ5g:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiJrZXktMSIsInB1YmxpY0tleUp3ayI6eyJjcnYiOiJzZWNwMjU2azEiLCJrdHkiOiJFQyIsIngiOiI2MWlQWXVHZWZ4b3R6QmRRWnREdnY2Y1dIWm1YclRUc2NZLXU3WTJwRlpjIiwieSI6Ijg4blBDVkxmckFZOWktd2c1T1Jjd1ZiSFdDX3RiZUFkMUpFMmUwY28wbFUifSwicHVycG9zZXMiOlsiYXV0aGVudGljYXRpb24iXSwidHlwZSI6IkVjZHNhU2VjcDI1NmsxVmVyaWZpY2F0aW9uS2V5MjAxOSJ9XSwic2VydmljZXMiOlt7ImlkIjoiZHduIiwic2VydmljZUVuZHBvaW50Ijp7Im5vZGVzIjpbImh0dHA6Ly9sb2NhbGhvc3Q6ODA4NSJdfSwidHlwZSI6IkRlY2VudHJhbGl6ZWRXZWJOb2RlIn1dfX1dLCJ1cGRhdGVDb21taXRtZW50IjoiRWlCb1c2dGs4WlZRTWs3YjFubkF2R3F3QTQ2amlaaUc2dWNYemxyNTZDWWFiUSJ9LCJzdWZmaXhEYXRhIjp7ImRlbHRhSGFzaCI6IkVpQ3Y2cUhEMFV4TTBadmZlTHU4dDR4eU5DVjNscFBSaTl6a3paU3h1LW8wWUEiLCJyZWNvdmVyeUNvbW1pdG1lbnQiOiJFaUN0STM0ckdGNU9USkJETXRUYm14a1lQeC0ydFd3MldZLTU2UTVPNHR0WWJBIn19?service=agent&relativeRef=/credentials#degree'
      }) ?? {};

      expect(did).to.equal('did:ion:EiAi68p2irCNQIzaui8gTjGDeOqSUusZS8jWVHfseSWZ5g:eyJkZWx0YSI6eyJwYXRjaGVzIjpbeyJhY3Rpb24iOiJyZXBsYWNlIiwiZG9jdW1lbnQiOnsicHVibGljS2V5cyI6W3siaWQiOiJrZXktMSIsInB1YmxpY0tleUp3ayI6eyJjcnYiOiJzZWNwMjU2azEiLCJrdHkiOiJFQyIsIngiOiI2MWlQWXVHZWZ4b3R6QmRRWnREdnY2Y1dIWm1YclRUc2NZLXU3WTJwRlpjIiwieSI6Ijg4blBDVkxmckFZOWktd2c1T1Jjd1ZiSFdDX3RiZUFkMUpFMmUwY28wbFUifSwicHVycG9zZXMiOlsiYXV0aGVudGljYXRpb24iXSwidHlwZSI6IkVjZHNhU2VjcDI1NmsxVmVyaWZpY2F0aW9uS2V5MjAxOSJ9XSwic2VydmljZXMiOlt7ImlkIjoiZHduIiwic2VydmljZUVuZHBvaW50Ijp7Im5vZGVzIjpbImh0dHA6Ly9sb2NhbGhvc3Q6ODA4NSJdfSwidHlwZSI6IkRlY2VudHJhbGl6ZWRXZWJOb2RlIn1dfX1dLCJ1cGRhdGVDb21taXRtZW50IjoiRWlCb1c2dGs4WlZRTWs3YjFubkF2R3F3QTQ2amlaaUc2dWNYemxyNTZDWWFiUSJ9LCJzdWZmaXhEYXRhIjp7ImRlbHRhSGFzaCI6IkVpQ3Y2cUhEMFV4TTBadmZlTHU4dDR4eU5DVjNscFBSaTl6a3paU3h1LW8wWUEiLCJyZWNvdmVyeUNvbW1pdG1lbnQiOiJFaUN0STM0ckdGNU9USkJETXRUYm14a1lQeC0ydFd3MldZLTU2UTVPNHR0WWJBIn19');
    });

    it('extracts query and fragment from DID URL', () => {
      const { fragment, query } = parseDid({
        didUrl: 'did:example:123?service=agent&relativeRef=/credentials#degree'
      }) ?? {};

      expect(fragment).to.equal('degree');
      expect(query).to.equal('service=agent&relativeRef=/credentials');
    });
  });
});