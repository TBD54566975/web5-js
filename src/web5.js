import { Web5Did } from './did/web5-did.js';
import { Web5Dwn } from './dwn/web5-dwn.js';
import { AppTransport } from './transport/app-transport.js';
import { HttpTransport } from './transport/http-transport.js';
import { isUnsignedMessage, parseUrl } from './utils.js';

export class Web5 extends EventTarget {
  #dwn;
  #did;
  #transports;

  constructor(options = { }) {
    super();

    this.#dwn = new Web5Dwn(this, options?.dwn);
    this.#did = new Web5Did(this);
    this.#transports = {
      app: new AppTransport(this),
      http: new HttpTransport(this),
      https: new HttpTransport(this),
    };
  }

  get dwn() {
    return this.#dwn;
  }

  get did() {
    return this.#did;
  }

  get transports() {
    return this.#transports;
  }

  /**
   * @param {string} target The DID to send the message to.
   * @param {object} request - Object containing the request parameters.
   * @param {string} request.author - The DID of the author of the message.
   * @param {*} request.data - The message data (if any).
   * @param {object} request.message - The DWeb message.
   * @returns Promise
   */
  async send(target, request) {
    let { author, data, message } = request;

    if (isUnsignedMessage(message)) {
      const resolvedAuthor = await this.#did.resolve(author);

      // If keys are not available to sign messages, transport the message to the specified agent.
      if (!resolvedAuthor?.keys) {
        if (resolvedAuthor?.connected) {
          return this.#send([resolvedAuthor.endpoint], { author, data, message, target });
        }
  
        // TODO: Is this sufficient or might we improve how the calling app can respond by initiating a connect/re-connect flow?
        return { status: { code: 401, detail: 'Local keys not available and remote agent not connected' } };
      }
      
      message = await this.#createSignedMessage(author, resolvedAuthor, message, data);
    }

    const resolvedTarget = await this.#did.resolve(target);

    if (resolvedTarget?.connected) {
      return this.#send([resolvedTarget.endpoint], { author, data, message, target });
    } else if (resolvedTarget?.didDocument) {
      // Resolve the DWN endpoint(s) of the target and send using the endpoint's transport protocol (e.g., HTTP).
      const dwnServices = await this.#did.getServices(target, { cache: true, type: 'DecentralizedWebNode' });
      const dwnNodes = dwnServices[0]?.serviceEndpoint?.nodes;
      if (dwnNodes) {
        return this.#send(dwnNodes, { author, data, message, target });
      }
      return { status: { code: 422, detail: 'No DWN endpoints present in DID document. Request cannot be sent.' } };
    }

    return { status: { code: 400, detail: 'Target DID could not be resolved' } };
  }

  async #createSignedMessage(author, resolvedAuthor, message, data) {
    const keyId = '#dwn';
    const authorizationSignatureInput = this.#dwn.sdk.Jws.createSignatureInput({
      keyId: author + keyId,
      keyPair: resolvedAuthor.keys[keyId].keyPair,
    });
    const signedMessage = await this.#dwn.sdk[message.interface + message.method].create({
      ...message,
      authorizationSignatureInput,
      data,
    });
    delete signedMessage.data;
    return signedMessage;
  }

  /**
   * @typedef {Object} Web5SendResponseMessage
   * @property {ProtocolsConfigureDescriptor | ProtocolsQueryDescriptor | RecordsQueryDescriptor | RecordsReadDescriptor | RecordsWriteDescriptor} message
   */

  /**
   * @typedef {MessageReplyOptions | Web5SendResponseMessage} Web5SendResponse
   */

  /**
   * Sends the message to one or more endpoint URIs
   * 
   * If more than one endpoint is passed, each endpoint is tried serially until one succeeds or all fail.
   * 
   * This strategy is used to account for cases like attempting to write large data streams to
   * the DWN endpoints listed in a DID document. It would be inefficient to attempt to write data to
   * multiple endpoints in parallel until the first one completes. Instead, we only try the next DWN if
   * there is a failure.  Additionally, per the DWN Specification, implementers SHOULD select from the
   * Service Endpoint URIs in the nodes array in index order, so this function makes that approach easy.
   * 
   * @param {string[]} endpoints - An array of one or more endpoints to send the message to.
   * @param {object} request - Object containing the request parameters.
   * @param {string} request.author - The DID of the author of the message.
   * @param {*} request.data - The message data (if any).
   * @param {object} request.message - The DWeb message.
   * @param {string} request.target - The DID to send the message to.
   * @returns {Promise<Web5SendResponse>}
   */
  async #send(endpoints, request) {
    let response;
    for (let endpoint of endpoints) {
      try {
        const url = parseUrl(endpoint);
        response = await this.#transports[url?.protocol?.slice(0, -1)]?.send(url.href, request);
      } catch (error) {
        console.error(error);
        // Intentionally ignore exception and try the next endpoint.
      }
      if (response) break; // Stop looping and return after the first endpoint successfully responds.
    }

    if (response && !isUnsignedMessage(request.message)) {
      // If the message is signed return the `descriptor`, and if present, `recordId`.
      const { recordId = null, descriptor } = request.message.message;
      response.message = { recordId, descriptor };
    }

    response ??= { status: { code: 503, detail: 'Service Unavailable' } };

    return response;
  }
}
