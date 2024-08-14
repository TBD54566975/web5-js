import { DataEncodedRecordsWriteMessage, DwnInterfaceName, DwnMethodName, Time } from '@tbd54566975/dwn-sdk-js';
import { DwnInterface, Web5PlatformAgent } from '../../src/index.js';

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
    const recordsWriteGrant = await grantorAgent.dwn.createGrant({
      delegated   : true,
      dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
      grantedFrom : grantor,
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
    const recordsWriteGrantReply = await granteeAgent.dwn.processRequest({
      author      : grantee,
      target      : grantee,
      messageType : DwnInterface.RecordsWrite,
      rawMessage  : recordsWriteGrant.recordsWrite.message,
      dataStream  : new Blob([ recordsWriteGrant.permissionGrantBytes ]),
      signAsOwner : true
    });

    if (recordsWriteGrantReply.reply.status.code !== 202) {
      throw new Error(`Failed to write RecordsWrite grant: ${recordsWriteGrantReply.reply.status.detail}`);
    }

    // RecordsDelete grant
    const recordsDeleteGrant = await grantorAgent.dwn.createGrant({
      delegated   : true,
      dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
      grantedFrom : grantor,
      grantedTo   : grantee,
      scope       : {
        interface : DwnInterfaceName.Records,
        method    : DwnMethodName.Delete,
        protocolPath,
        contextId,
        protocol,
      }
    });

    const recordsDeleteGrantReply = await granteeAgent.dwn.processRequest({
      author      : grantee,
      target      : grantee,
      messageType : DwnInterface.RecordsWrite,
      rawMessage  : recordsDeleteGrant.recordsWrite.message,
      dataStream  : new Blob([ recordsDeleteGrant.permissionGrantBytes ]),
      signAsOwner : true
    });

    if (recordsDeleteGrantReply.reply.status.code !== 202) {
      throw new Error(`Failed to write RecordsDelete grant: ${recordsDeleteGrantReply.reply.status.detail}`);
    }

    // RecordsRead grant
    const recordsReadGrant = await grantorAgent.dwn.createGrant({
      delegated   : true,
      dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
      grantedFrom : grantor,
      grantedTo   : grantee,
      scope       : {
        interface : DwnInterfaceName.Records,
        method    : DwnMethodName.Read,
        protocolPath,
        contextId,
        protocol,
      }
    });

    const recordsReadGrantReply = await granteeAgent.dwn.processRequest({
      author      : grantee,
      target      : grantee,
      messageType : DwnInterface.RecordsWrite,
      rawMessage  : recordsReadGrant.recordsWrite.message,
      dataStream  : new Blob([ recordsReadGrant.permissionGrantBytes ]),
      signAsOwner : true
    });

    if (recordsReadGrantReply.reply.status.code !== 202) {
      throw new Error(`Failed to write RecordsRead grant: ${recordsReadGrantReply.reply.status.detail}`);
    }

    // RecordsQuery grant
    const recordsQueryGrant = await grantorAgent.dwn.createGrant({
      delegated   : true,
      dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
      grantedFrom : grantor,
      grantedTo   : grantee,
      scope       : {
        interface : DwnInterfaceName.Records,
        method    : DwnMethodName.Query,
        protocol,
        protocolPath,
        contextId,
      }
    });

    const recordsQueryGrantReply = await granteeAgent.dwn.processRequest({
      author      : grantee,
      target      : grantee,
      messageType : DwnInterface.RecordsWrite,
      rawMessage  : recordsQueryGrant.recordsWrite.message,
      dataStream  : new Blob([ recordsQueryGrant.permissionGrantBytes ]),
      signAsOwner : true
    });

    if (recordsQueryGrantReply.reply.status.code !== 202) {
      throw new Error(`Failed to write RecordsQuery grant: ${recordsQueryGrantReply.reply.status.detail}`);
    }

    // RecordsSubscribe grant
    const recordsSubscribeGrant = await grantorAgent.dwn.createGrant({
      delegated   : true,
      dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
      grantedFrom : grantor,
      grantedTo   : grantee,
      scope       : {
        interface : DwnInterfaceName.Records,
        method    : DwnMethodName.Subscribe,
        protocolPath,
        contextId,
        protocol,
      }
    });

    const recordsSubscribeGrantReply = await granteeAgent.dwn.processRequest({
      author      : grantee,
      target      : grantee,
      messageType : DwnInterface.RecordsWrite,
      rawMessage  : recordsSubscribeGrant.recordsWrite.message,
      dataStream  : new Blob([ recordsSubscribeGrant.permissionGrantBytes ]),
      signAsOwner : true
    });

    if (recordsSubscribeGrantReply.reply.status.code !== 202) {
      throw new Error(`Failed to write RecordsSubscribe grant: ${recordsSubscribeGrantReply.reply.status.detail}`);
    }

    return {
      write     : recordsWriteGrant.dataEncodedMessage,
      delete    : recordsDeleteGrant.dataEncodedMessage,
      read      : recordsReadGrant.dataEncodedMessage,
      query     : recordsQueryGrant.dataEncodedMessage,
      subscribe : recordsSubscribeGrant.dataEncodedMessage,
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
    const messagesQueryGrant = await grantorAgent.dwn.createGrant({
      dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
      grantedFrom : grantor,
      grantedTo   : grantee,
      scope       : {
        interface : DwnInterfaceName.Messages,
        method    : DwnMethodName.Query,
        protocol,
      }
    });

    const messagesQueryReply = await granteeAgent.dwn.processRequest({
      author      : grantee,
      target      : grantee,
      messageType : DwnInterface.RecordsWrite,
      rawMessage  : messagesQueryGrant.recordsWrite.message,
      dataStream  : new Blob([ messagesQueryGrant.permissionGrantBytes ]),
      signAsOwner : true,
    });

    if (messagesQueryReply.reply.status.code !== 202) {
      throw new Error(`Failed to write MessagesQuery grant: ${messagesQueryReply.reply.status.detail}`);
    }

    // MessagesRead
    const messagesReadGrant = await grantorAgent.dwn.createGrant({
      dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
      grantedFrom : grantor,
      grantedTo   : grantee,
      scope       : {
        interface : DwnInterfaceName.Messages,
        method    : DwnMethodName.Read,
        protocol,
      }
    });

    const messagesReadReply = await granteeAgent.dwn.processRequest({
      author      : grantee,
      target      : grantee,
      messageType : DwnInterface.RecordsWrite,
      rawMessage  : messagesReadGrant.recordsWrite.message,
      dataStream  : new Blob([ messagesReadGrant.permissionGrantBytes ]),
      signAsOwner : true,
    });

    if (messagesReadReply.reply.status.code !== 202) {
      throw new Error(`Failed to write MessagesRead grant: ${messagesReadReply.reply.status.detail}`);
    }

    // MessagesSubscribe
    const messagesSubscribeGrant = await grantorAgent.dwn.createGrant({
      dateExpires : Time.createOffsetTimestamp({ seconds: 60 }),
      grantedFrom : grantor,
      grantedTo   : grantee,
      scope       : {
        interface : DwnInterfaceName.Messages,
        method    : DwnMethodName.Subscribe,
        protocol,
      }
    });

    const messagesSubscribeReply = await granteeAgent.dwn.processRequest({
      author      : grantee,
      target      : grantee,
      messageType : DwnInterface.RecordsWrite,
      rawMessage  : messagesSubscribeGrant.recordsWrite.message,
      dataStream  : new Blob([ messagesSubscribeGrant.permissionGrantBytes ]),
      signAsOwner : true,
    });

    if (messagesSubscribeReply.reply.status.code !== 202) {
      throw new Error(`Failed to write MessagesSubscribe grant: ${messagesSubscribeReply.reply.status.detail}`);
    }


    return {
      query     : messagesQueryGrant.dataEncodedMessage,
      read      : messagesReadGrant.dataEncodedMessage,
      subscribe : messagesSubscribeGrant.dataEncodedMessage,
    };
  };

}