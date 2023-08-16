import { expect } from 'chai';
import { TestManagedAgent } from '@web5/agent';

import { DwnApi } from '../src/dwn-api.js';
import { TestUserAgent } from './utils/test-user-agent.js';
import emailProtocolDefinition from './fixtures/protocol-definitions/email.json' assert { type: 'json' };

// let dwnNodes: string[] = ['https://dwn.tbddev.org/dwn0'];
let dwnNodes: string[] = ['http://localhost:3000'];

describe('web5.dwn', () => {
  let dwn: DwnApi;
  let testAgent: TestManagedAgent;

  before(async () => {
    testAgent = await TestManagedAgent.create({
      agentClass  : TestUserAgent,
      agentStores : 'memory'
    });
  });

  beforeEach(async () => {
    await testAgent.clearStorage();

    // Create an Agent DID.
    await testAgent.createAgentDid();

    const services = [{
      id              : 'dwn',
      type            : 'DecentralizedWebNode',
      serviceEndpoint : {
        encryptionKeys : ['#dwn-enc'],
        nodes          : dwnNodes,
        signingKeys    : ['#dwn-sig']
      }
    }];

    // Creates a new Identity to author the DWN messages.
    const identity = await testAgent.agent.identityManager.create({
      name       : 'Alice',
      didMethod  : 'ion',
      didOptions : { services },
      kms        : 'local'
    });
    // Create a new Identity to author DWN messages.
    // const identity = await testAgent.agent.identityManager.create({
    //   name      : 'Test',
    //   didMethod : 'ion',
    //   kms       : 'local'
    // });

    // Instantiate DwnApi.
    dwn = new DwnApi({ agent: testAgent.agent, connectedDid: identity.did });
  });

  after(async () => {
    await testAgent.clearStorage();
    await testAgent.closeStorage();
  });

  describe('protocols', () => {
    describe('configure', () => {
      describe('agent', () => {
        it('writes a protocol definition', async () => {
          const response = await dwn.protocols.configure({
            message: {
              definition: emailProtocolDefinition
            }
          });

          expect(response.status.code).to.equal(202);
          expect(response.status.detail).to.equal('Accepted');
        });
      });

      describe('from: did', () => {
        xit('test needed');
      });
    });

    describe('query', () => {
      describe('agent', () => {
        it('should return protocols matching the query', async () => {
          // Write a protocols configure to the connected agent's DWN.
          const configureResponse = await dwn.protocols.configure({
            message: {
              definition: emailProtocolDefinition
            }
          });
          expect(configureResponse.status.code).to.equal(202);
          expect(configureResponse.status.detail).to.equal('Accepted');

          // Query for the protocol just configured.
          const queryResponse = await dwn.protocols.query({
            message: {
              filter: {
                protocol: emailProtocolDefinition.protocol
              }
            }
          });

          expect(queryResponse.status.code).to.equal(200);
          expect(queryResponse.protocols.length).to.equal(1);
          expect(queryResponse.protocols[0].definition).to.have.property('types');
          expect(queryResponse.protocols[0].definition).to.have.property('protocol');
          expect(queryResponse.protocols[0].definition.protocol).to.equal(emailProtocolDefinition.protocol);
          expect(queryResponse.protocols[0].definition).to.have.property('structure');
        });
      });

      describe('from: did', () => {
        xit('returns empty protocols array when no protocols match the filter provided', async () => {
          //     // Create a new DID to represent an external entity who has a remote DWN server defined in their DID document.
          //     const ionCreateOptions = await testProfile.ionCreateOptions.services.dwn.authorization.keys();
          //     const { id: bobDid } = await testAgent.didIon.create(ionCreateOptions);

          //     // Query for the protocol just configured.
          //     const response = await dwn.protocols.query({
          //       from    : bobDid,
          //       message : {
          //         filter: {
          //           protocol: 'https://doesnotexist.com/protocol'
          //         }
          //       }
          //     });

          //     expect(response.status.code).to.equal(200);
          //     expect(response.protocols).to.exist;
          //     expect(response.protocols.length).to.equal(0);
        });
      });
    });
  });

  describe('records', () => {
    describe('write', () => {
      describe('agent', () => {
        it('writes a record with string data', async () => {
          const dataString = 'Hello, world!Hello, world!';
          const result = await dwn.records.write({
            data    : dataString,
            message : {
              schema     : 'foo/bar',
              dataFormat : 'text/plain'
            }
          });

          expect(result.status.code).to.equal(202);
          expect(result.status.detail).to.equal('Accepted');
          expect(result.record).to.exist;
          expect(await result.record?.data.text()).to.equal(dataString);
        });

        it('writes a record with JSON data', async () => {
          const dataJson = { hello: 'world!'};
          const result = await dwn.records.write({
            data    : dataJson,
            message : {
              schema     : 'foo/bar',
              dataFormat : 'application/json'
            }
          });

          expect(result.status.code).to.equal(202);
          expect(result.status.detail).to.equal('Accepted');
          expect(result.record).to.exist;
          expect(await result.record?.data.json()).to.deep.equal(dataJson);
        });
      });

      describe('agent store: false', () => {
        it('does not persist record to agent DWN', async () => {
          const dataString = 'Hello, world!';
          const writeResult = await dwn.records.write({
            store   : false,
            data    : dataString,
            message : {
              schema     : 'foo/bar',
              dataFormat : 'text/plain'
            }
          });

          expect(writeResult.status.code).to.equal(202);
          expect(writeResult.status.detail).to.equal('Accepted');
          expect(writeResult.record).to.exist;
          expect(await writeResult.record?.data.text()).to.equal(dataString);

          const queryResult = await dwn.records.query({
            message: {
              filter: {
                schema: 'foo/bar'
              }
            }
          });

          expect(queryResult.status.code).to.equal(200);
          expect(queryResult.records).to.exist;
          expect(queryResult.records!.length).to.equal(0);
        });

        it('has no effect if `store: true`', async () => {
          const dataString = 'Hello, world!';
          const writeResult = await dwn.records.write({
            store   : true,
            data    : dataString,
            message : {
              schema     : 'foo/bar',
              dataFormat : 'text/plain'
            }
          });

          expect(writeResult.status.code).to.equal(202);
          expect(writeResult.status.detail).to.equal('Accepted');
          expect(writeResult.record).to.exist;
          expect(await writeResult.record?.data.text()).to.equal(dataString);

          const queryResult = await dwn.records.query({
            message: {
              filter: {
                schema: 'foo/bar'
              }
            }
          });

          expect(queryResult.status.code).to.equal(200);
          expect(queryResult.records).to.exist;
          expect(queryResult.records!.length).to.equal(1);
          expect(queryResult.records![0].id).to.equal(writeResult.record!.id);
          expect(await queryResult.records![0].data.text()).to.equal(dataString);
        });
      });
    });

    describe('query', () => {
      describe('agent', () => {
        it('returns an array of records that match the filter provided', async () => {
          const writeResult = await dwn.records.write({
            data    : 'Hello, world!',
            message : {
              schema     : 'foo/bar',
              dataFormat : 'text/plain'
            }
          });

          expect(writeResult.status.code).to.equal(202);
          expect(writeResult.status.detail).to.equal('Accepted');
          expect(writeResult.record).to.exist;

          const result = await dwn.records.query({
            message: {
              filter: {
                schema: 'foo/bar'
              }
            }
          });

          expect(result.status.code).to.equal(200);
          expect(result.records).to.exist;
          expect(result.records!.length).to.equal(1);
          expect(result.records![0].id).to.equal(writeResult.record!.id);
        });
      });

      describe('from: did', () => {
        xit('returns empty records array when no records match the filter provided', async () => {
          // // Create a new DID to represent an external entity who has a remote DWN server defined in their DID document.
          // const ionCreateOptions = await testProfile.ionCreateOptions.services.dwn.authorization.keys();
          // const { id: bobDid } = await testAgent.didIon.create(ionCreateOptions);

          // // Attempt to query Bob's DWN using the ID of a record that does not exist.
          // const result = await dwn.records.query({
          //   from    : bobDid,
          //   message : {
          //     filter: {
          //       recordId: 'abcd1234'
          //     }
          //   }
          // });

          // // Confirm that the record does not currently exist on Bob's DWN.
          // expect(result.status.code).to.equal(200);
          // expect(result.records).to.exist;
          // expect(result.records!.length).to.equal(0);
        });
      });
    });

    describe('read', () => {
      describe('agent', () => {
        it('returns a record', async () => {
          const writeResult = await dwn.records.write({
            data    : 'Hello, world!',
            message : {
              schema     : 'foo/bar',
              dataFormat : 'text/plain'
            }
          });

          expect(writeResult.status.code).to.equal(202);
          expect(writeResult.status.detail).to.equal('Accepted');
          expect(writeResult.record).to.exist;

          const result = await dwn.records.read({
            message: {
              recordId: writeResult.record!.id
            }
          });

          expect(result.status.code).to.equal(200);
          expect(result.record.id).to.equal(writeResult.record!.id);
        });

        it('returns a 404 when a record cannot be found', async () => {
          const writeResult = await dwn.records.write({
            data    : 'Hello, world!',
            message : {
              schema     : 'foo/bar',
              dataFormat : 'text/plain'
            }
          });

          expect(writeResult.status.code).to.equal(202);
          expect(writeResult.status.detail).to.equal('Accepted');
          expect(writeResult.record).to.exist;

          await writeResult.record!.delete();

          const result = await dwn.records.read({
            message: {
              recordId: writeResult.record!.id
            }
          });

          expect(result.status.code).to.equal(404);
          expect(result.record).to.not.exist;
        });
      });

      describe('from: did', () => {
        xit('returns undefined record when requested record does not exit', async () => {
          // // Generate a recordId that will not be present on the did endpoint being read from.
          // const { record, status } = await dwn.records.write({ data: 'hi' });
          // expect(status.code).to.equal(202);

          // // Create a new DID to represent an external entity who has a remote DWN server defined in their DID document.
          // const ionCreateOptions = await testProfile.ionCreateOptions.services.dwn.authorization.keys();
          // const { id: bobDid } = await testAgent.didIon.create(ionCreateOptions);

          // // Attempt to read a record from Bob's DWN using the ID of a record that only exists in the connected agent's DWN.
          // const result = await dwn.records.read({
          //   from    : bobDid,
          //   message : {
          //     recordId: record!.id
          //   }
          // });

          // // Confirm that the record does not currently exist on Bob's DWN.
          // expect(result.status.code).to.equal(404);
          // expect(result.record).to.be.undefined;
        });
      });
    });

    describe('delete', () => {
      describe('agent', () => {
        it('deletes a record', async () => {
          const writeResult = await dwn.records.write({
            data    : 'Hello, world!',
            message : {
              schema     : 'foo/bar',
              dataFormat : 'text/plain'
            }
          });

          expect(writeResult.status.code).to.equal(202);
          expect(writeResult.record).to.not.be.undefined;

          const deleteResult = await dwn.records.delete({
            message: {
              recordId: writeResult.record!.id
            }
          });

          expect(deleteResult.status.code).to.equal(202);
        });

        it('returns a 404 when the specified record does not exist', async () => {
          let deleteResult = await dwn.records.delete({
            message: {
              recordId: 'abcd1234'
            }
          });
          expect(deleteResult.status.code).to.equal(404);
        });
      });

      describe('from: did', () => {
        xit('returns a 401 when authentication or authorization fails', async () => {
          // // Create a new DID to represent an external entity who has a remote DWN server defined in their DID document.
          // const ionCreateOptions = await testProfile.ionCreateOptions.services.dwn.authorization.keys();
          // const { id: bobDid } = await testAgent.didIon.create(ionCreateOptions);

          // // Attempt to delete a record from Bob's DWN specifying a recordId that does not exist.
          // const deleteResult = await dwn.records.delete({
          //   from    : bobDid,
          //   message : {
          //     recordId: 'abcd1234'
          //   }
          // });

          // //! TODO: Once record.send() has been implemented, add another test to write a record
          // //!       and test a delete to confirm that authn/authz pass and a 202 is returned.
          // expect(deleteResult.status.code).to.equal(401);
        });
      });
    });
  });
});