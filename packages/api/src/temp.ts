import { DwnDataEncodedRecordsWriteMessage } from '@web5/agent';
import { WalletConnectOptions } from './web5.js';
import { PortableDid } from '@web5/dids';


/**
 * Placeholder for WalletConnect integration.
 *
 * TODO: Temporary Class to mock WalletConnect integration
 */
export class ConnectPlaceholder {
  /** initialize a connect flow */
  static async initClient(_walletConnectOptions: WalletConnectOptions): Promise<{
    /** grants provided to the grantee for use with the app */
    delegateGrants: DwnDataEncodedRecordsWriteMessage[];
    /** The DID used as the grantee to act on behalf of the connectedDid */
    delegateDid: PortableDid;
    /** the logical owner of the tenant */
    connectedDid: string;
  }> {
    return {
      delegateGrants : [],
      connectedDid   : '',
      delegateDid    : {
        uri      : '',
        document : {
          '@context'           : 'https://www.w3.org/ns/did/v1',
          id                   : '',
          verificationMethod   : [],
          authentication       : [],
          assertionMethod      : [],
          capabilityDelegation : [],
          capabilityInvocation : [],
          keyAgreement         : [],
          service              : []
        },
        metadata: {}
      }
    };
  }
}
