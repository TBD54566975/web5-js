import type { SignatureInput, PrivateJwk as DwnPrivateKeyJwk } from '@tbd54566975/dwn-sdk-js';
import type { Web5Agent, DwnRequest, DwnResponse } from '@tbd54566975/web5-agent';

import type { ProfileManager } from './profile-manager.js';

import { ProfileApi } from './profile-api.js';
import {
  Dwn,
  EventsGet,
  RecordsRead,
  MessagesGet,
  RecordsWrite,
  RecordsQuery,
  RecordsDelete,
  DwnMethodName,
  ProtocolsQuery,
  DwnInterfaceName,
  ProtocolsConfigure
} from '@tbd54566975/dwn-sdk-js';


export type Web5UserAgentOptions = {
  dwn: Dwn;
  profileManager: ProfileManager;
};

const dwnMessageCreators = {
  [DwnInterfaceName.Events + DwnMethodName.Get]          : EventsGet,
  [DwnInterfaceName.Messages + DwnMethodName.Get]        : MessagesGet,
  [DwnInterfaceName.Records + DwnMethodName.Read]        : RecordsRead,
  [DwnInterfaceName.Records + DwnMethodName.Query]       : RecordsQuery,
  [DwnInterfaceName.Records + DwnMethodName.Write]       : RecordsWrite,
  [DwnInterfaceName.Records + DwnMethodName.Delete]      : RecordsDelete,
  [DwnInterfaceName.Protocols + DwnMethodName.Query]     : ProtocolsQuery,
  [DwnInterfaceName.Protocols + DwnMethodName.Configure] : ProtocolsConfigure,
};

export class Web5UserAgent implements Web5Agent {
  private dwn: Dwn;
  private profileManager: ProfileManager;

  constructor(options: Web5UserAgentOptions) {
    this.dwn = options.dwn;
    this.profileManager = options.profileManager;
  }

  static async create(options: Partial<Web5UserAgentOptions>) {
    options.dwn ||= await Dwn.create();
    options.profileManager ||= new ProfileApi();

    return new Web5UserAgent(options as Web5UserAgentOptions);
  }

  async processDwnRequest(message: DwnRequest): Promise<DwnResponse> {
    // TODO: find profile
    const profile = await this.profileManager.getProfile(message.author);

    if (!profile) {
      throw new Error('profile not found for author.');
    }

    const { keys } = profile.did;
    const [ key ] = keys;
    const { privateKeyJwk } = key;

    // TODO: make far less naive
    const kidFragment = privateKeyJwk.kid || key.id;
    const kid = `${profile.did.id}#${kidFragment}`;

    const dwnSignatureInput: SignatureInput = {
      privateJwk      : <DwnPrivateKeyJwk>privateKeyJwk,
      protectedHeader : { alg: privateKeyJwk.crv, kid }
    };

    // TODO: if we ever find time, figure out how to narrow this type. may have figured something out in `web5.DidInterface`
    const messageCreateInput = {
      ...<any>message.messageOptions,
      authorizationSignatureInput: dwnSignatureInput
    };

    const messageCreator = dwnMessageCreators[message.messageType];
    const dwnMessage = await messageCreator.create(messageCreateInput as any);

    const reply = await this.dwn.processMessage(message.target, dwnMessage.toJSON(), message.dataStream);

    return {
      reply,
      message: dwnMessage.toJSON()
    };
  }
}