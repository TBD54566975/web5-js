import { DwnRecordSubscriptionHandler, getRecordAuthor, PermissionsApi, Web5Agent } from '@web5/agent';
import { RecordsSubscribeRequest } from './dwn-api.js';
import { Record } from './record.js';

/**
 * Utility class for dealing with subscriptions.
 */
export class SubscriptionUtil {
  /**
   * Creates a record subscription handler that can be used to process incoming {Record} messages.
   */
  static recordSubscriptionHandler({ agent, connectedDid, request, delegateDid, permissionsApi }:{
    agent: Web5Agent;
    connectedDid: string;
    delegateDid?: string;
    permissionsApi?: PermissionsApi;
    request: RecordsSubscribeRequest;
  }): DwnRecordSubscriptionHandler {
    const { subscriptionHandler, from: remoteOrigin } = request;

    return async (event) => {
      const { message, initialWrite } = event;
      const author = getRecordAuthor(message);
      const recordOptions = {
        author,
        connectedDid,
        remoteOrigin,
        initialWrite
      };

      const record = new Record(agent, {
        ...message,
        ...recordOptions,
        delegateDid: delegateDid,
      }, permissionsApi);

      subscriptionHandler(record);
    };
  }
}