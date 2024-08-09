import { DataEncodedRecordsWriteMessage, DwnInterfaceName, DwnMethodName, Time } from '@tbd54566975/dwn-sdk-js';
import { DwnInterface, Web5PlatformAgent } from '../../src/index.js';
import { Convert } from '@web5/common';

export type MessagesGrants = {
  query: DataEncodedRecordsWriteMessage;
  read: DataEncodedRecordsWriteMessage;
  subscribe: DataEncodedRecordsWriteMessage;
}

export type RecordsGrants = {
  write: DataEncodedRecordsWriteMessage;
  delete: DataEncodedRecordsWriteMessage;
  read: DataEncodedRecordsWriteMessage;
  query: DataEncodedRecordsWriteMessage;
  subscribe: DataEncodedRecordsWriteMessage;
}

export class GrantsUtil {

  /**
   * Creates a full set of `Records` interface delegated grants from `grantor` to `grantee`.
   * The grants are processed and stored by the `granteeAgent` so that they are available when the grantee attempts to use them.
   */
  static async createRecordsGrants({ grantorAgent, grantor, granteeAgent, grantee, protocol, contextId, protocolPath }: {
    grantorAgent: Web5PlatformAgent,
    grantor: string;
    granteeAgent: Web5PlatformAgent,
    grantee: string;
    protocol: string;
    contextId?: string;
    protocolPath?: string
  }): Promise<RecordsGrants> {

    // RecordsWrite grant
    const recordsWriteGrant = await grantorAgent.permissions.createGrant({
      delegated   : true,
      dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
      author      : grantor,
      grantedTo   : grantee,
      scope       : {
        interface : DwnInterfaceName.Records,
        method    : DwnMethodName.Write,
        protocolPath,
        contextId,
        protocol,
      }
    });

    // write the grant to the grantee's DWN
    const { encodedData: recordsWriteGrantEncodedData, ...recordsWriteGrantMessage } = recordsWriteGrant.message;
    const recordsWriteGrantData = Convert.base64Url(recordsWriteGrantEncodedData).toUint8Array();
    const recordsWriteGrantReply = await granteeAgent.dwn.processRequest({
      author      : grantee,
      target      : grantee,
      messageType : DwnInterface.RecordsWrite,
      rawMessage  : recordsWriteGrantMessage,
      dataStream  : new Blob([ recordsWriteGrantData ]),
      signAsOwner : true
    });

    if (recordsWriteGrantReply.reply.status.code !== 202) {
      throw new Error(`Failed to write RecordsWrite grant: ${recordsWriteGrantReply.reply.status.detail}`);
    }

    // RecordsDelete grant
    const recordsDeleteGrant = await grantorAgent.permissions.createGrant({
      delegated   : true,
      dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
      author      : grantor,
      grantedTo   : grantee,
      scope       : {
        interface : DwnInterfaceName.Records,
        method    : DwnMethodName.Delete,
        protocolPath,
        contextId,
        protocol,
      }
    });

    const { encodedData: recordsDeleteGrantEncodedData, ...recordsDeleteGrantMessage } = recordsDeleteGrant.message;
    const recordsDeleteGrantData = Convert.base64Url(recordsDeleteGrantEncodedData).toUint8Array();
    const recordsDeleteGrantReply = await granteeAgent.dwn.processRequest({
      author      : grantee,
      target      : grantee,
      messageType : DwnInterface.RecordsWrite,
      rawMessage  : recordsDeleteGrantMessage,
      dataStream  : new Blob([ recordsDeleteGrantData ]),
      signAsOwner : true
    });

    if (recordsDeleteGrantReply.reply.status.code !== 202) {
      throw new Error(`Failed to write RecordsDelete grant: ${recordsDeleteGrantReply.reply.status.detail}`);
    }

    // RecordsRead grant
    const recordsReadGrant = await grantorAgent.permissions.createGrant({
      delegated   : true,
      dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
      author      : grantor,
      grantedTo   : grantee,
      scope       : {
        interface : DwnInterfaceName.Records,
        method    : DwnMethodName.Read,
        protocolPath,
        contextId,
        protocol,
      }
    });

    const { encodedData: recordsReadGrantEncodedData, ...recordsReadGrantMessage } = recordsReadGrant.message;
    const recordsReadGrantData = Convert.base64Url(recordsReadGrantEncodedData).toUint8Array();
    const recordsReadGrantReply = await granteeAgent.dwn.processRequest({
      author      : grantee,
      target      : grantee,
      messageType : DwnInterface.RecordsWrite,
      rawMessage  : recordsReadGrantMessage,
      dataStream  : new Blob([ recordsReadGrantData ]),
      signAsOwner : true
    });

    if (recordsReadGrantReply.reply.status.code !== 202) {
      throw new Error(`Failed to write RecordsRead grant: ${recordsReadGrantReply.reply.status.detail}`);
    }

    // RecordsQuery grant
    const recordsQueryGrant = await grantorAgent.permissions.createGrant({
      delegated   : true,
      dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
      author      : grantor,
      grantedTo   : grantee,
      scope       : {
        interface : DwnInterfaceName.Records,
        method    : DwnMethodName.Query,
        protocol,
        protocolPath,
        contextId,
      }
    });

    const { encodedData: recordsQueryGrantEncodedData, ...recordsQueryGrantMessage } = recordsQueryGrant.message;
    const recordsQueryGrantData = Convert.base64Url(recordsQueryGrantEncodedData).toUint8Array();
    const recordsQueryGrantReply = await granteeAgent.dwn.processRequest({
      author      : grantee,
      target      : grantee,
      messageType : DwnInterface.RecordsWrite,
      rawMessage  : recordsQueryGrantMessage,
      dataStream  : new Blob([ recordsQueryGrantData ]),
      signAsOwner : true
    });

    if (recordsQueryGrantReply.reply.status.code !== 202) {
      throw new Error(`Failed to write RecordsQuery grant: ${recordsQueryGrantReply.reply.status.detail}`);
    }

    // RecordsSubscribe grant
    const recordsSubscribeGrant = await grantorAgent.permissions.createGrant({
      delegated   : true,
      dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
      author      : grantor,
      grantedTo   : grantee,
      scope       : {
        interface : DwnInterfaceName.Records,
        method    : DwnMethodName.Subscribe,
        protocolPath,
        contextId,
        protocol,
      }
    });

    const { encodedData: recordsSubscribeGrantEncodedData, ...recordsSubscribeGrantMessage } = recordsSubscribeGrant.message;
    const recordsSubscribeGrantData = Convert.base64Url(recordsSubscribeGrantEncodedData).toUint8Array();
    const recordsSubscribeGrantReply = await granteeAgent.dwn.processRequest({
      author      : grantee,
      target      : grantee,
      messageType : DwnInterface.RecordsWrite,
      rawMessage  : recordsSubscribeGrantMessage,
      dataStream  : new Blob([ recordsSubscribeGrantData ]),
      signAsOwner : true
    });

    if (recordsSubscribeGrantReply.reply.status.code !== 202) {
      throw new Error(`Failed to write RecordsSubscribe grant: ${recordsSubscribeGrantReply.reply.status.detail}`);
    }

    return {
      write     : recordsWriteGrant.message,
      delete    : recordsDeleteGrant.message,
      read      : recordsReadGrant.message,
      query     : recordsQueryGrant.message,
      subscribe : recordsSubscribeGrant.message,
    };
  };

  /**
   * Creates a full set of `Messages` interface permission grants from `grantor` to `grantee`.
   */
  static async createMessagesGrants ({ grantorAgent, grantor, granteeAgent, grantee, protocol }: {
    grantorAgent: Web5PlatformAgent,
    grantor: string;
    granteeAgent: Web5PlatformAgent,
    grantee: string;
    protocol?: string;
  }): Promise<MessagesGrants> {
    // MessagesQuery grant
    const messagesQueryGrant = await grantorAgent.permissions.createGrant({
      dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
      author      : grantor,
      grantedTo   : grantee,
      scope       : {
        interface : DwnInterfaceName.Messages,
        method    : DwnMethodName.Query,
        protocol,
      }
    });

    const { encodedData: messagesQueryGrantEncodedData, ...messagesQueryGrantMessage } = messagesQueryGrant.message;
    const messagesQueryGrantData = Convert.base64Url(messagesQueryGrantEncodedData).toUint8Array();
    const messagesQueryReply = await granteeAgent.dwn.processRequest({
      author      : grantee,
      target      : grantee,
      messageType : DwnInterface.RecordsWrite,
      rawMessage  : messagesQueryGrantMessage,
      dataStream  : new Blob([ messagesQueryGrantData ]),
      signAsOwner : true,
    });

    if (messagesQueryReply.reply.status.code !== 202) {
      throw new Error(`Failed to write MessagesQuery grant: ${messagesQueryReply.reply.status.detail}`);
    }

    // MessagesRead
    const messagesReadGrant = await grantorAgent.permissions.createGrant({
      dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
      author      : grantor,
      grantedTo   : grantee,
      scope       : {
        interface : DwnInterfaceName.Messages,
        method    : DwnMethodName.Read,
        protocol,
      }
    });

    const { encodedData: messagesReadGrantEncodedData, ...messagesReadGrantMessage } = messagesReadGrant.message;
    const messagesReadGrantData = Convert.base64Url(messagesReadGrantEncodedData).toUint8Array();
    const messagesReadReply = await granteeAgent.dwn.processRequest({
      author      : grantee,
      target      : grantee,
      messageType : DwnInterface.RecordsWrite,
      rawMessage  : messagesReadGrantMessage,
      dataStream  : new Blob([ messagesReadGrantData ]),
      signAsOwner : true,
    });

    if (messagesReadReply.reply.status.code !== 202) {
      throw new Error(`Failed to write MessagesRead grant: ${messagesReadReply.reply.status.detail}`);
    }

    // MessagesSubscribe
    const messagesSubscribeGrant = await grantorAgent.permissions.createGrant({
      dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
      author      : grantor,
      grantedTo   : grantee,
      scope       : {
        interface : DwnInterfaceName.Messages,
        method    : DwnMethodName.Subscribe,
        protocol,
      }
    });

    const { encodedData: messagesSubscribeGrantEncodedData, ...messagesSubscribeGrantMessage } = messagesSubscribeGrant.message;
    const messagesSubscribeGrantData = Convert.base64Url(messagesSubscribeGrantEncodedData).toUint8Array();
    const messagesSubscribeReply = await granteeAgent.dwn.processRequest({
      author      : grantee,
      target      : grantee,
      messageType : DwnInterface.RecordsWrite,
      rawMessage  : messagesSubscribeGrantMessage,
      dataStream  : new Blob([ messagesSubscribeGrantData ]),
      signAsOwner : true,
    });

    if (messagesSubscribeReply.reply.status.code !== 202) {
      throw new Error(`Failed to write MessagesSubscribe grant: ${messagesSubscribeReply.reply.status.detail}`);
    }


    return {
      query     : messagesQueryGrant.message,
      read      : messagesReadGrant.message,
      subscribe : messagesSubscribeGrant.message,
    };
  };

}