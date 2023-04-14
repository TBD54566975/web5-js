import { parseJSON, triggerProtocolHandler } from '../../utils.js';

export const DIDConnectRPCMethods = {
  Ready: 'didconnect.ready',
  Initiation: 'didconnect.initiation',
  Delegation: 'didconnect.delegation',
};

export const JSONRPCErrorCodes = {
  // JSON-RPC 2.0 pre-defined errors
  InvalidRequest: -32600,
  MethodNotFound: -32601,
  InvalidParams: -32602,
  InternalError: -32603,
  ParseError: -32700,

  // Web5 Agent defined errors
  BadRequest: -50400, // equivalent to HTTP Status 400
  Unauthorized: -50401, // equivalent to HTTP Status 401
  Forbidden: -50403, // equivalent to HTTP Status 403
};

export const DIDConnectStep = {
  Initiation: 'Initiation',
  Verification: 'Verification',
  Delegation: 'Delegation',
  Authorized: 'Authorized',
  Blocked: 'Blocked',
};

/**
 * Sequentially attempt to connect to a listening WebSocket server in the specified range of ports, and return the
 * open socket, if successful.
 * 
 * @param {number} startPort First port in the range to attempt to connect to
 * @param {number} endPort Last port in the range to attempt to connect to
 * @param {string} path URL path to connect to
 * @param {boolean} userInitiatedAction If true, trigger custom URL scheme and require user interaction before proceeding
 * @param {string} host IP address or DNS name of the host to connect to
 * @param {number} connectionAttemptDelay Milliseconds to pause between connection attempts so JS event loop can keep up
 * @returns {Promise<WebSocket | void>} Returns open socket on successfully connection or throws an Error
 */
export async function findWebSocketListener(
  startPort,
  endPort,
  path,
  userInitiatedAction = true,
  host = 'localhost',
  connectionAttemptDelay = 5) {
  const tryConnect = (port) => {
    return new Promise((resolve, reject) => {
      const socket = new WebSocket(`ws://${host}:${port}/${path}`);
  
      const handleError = () => {
        clearListeners(socket);
        socket.close();
        reject(new Error(`Connection failed on port ${port}`));
      };
  
      const handleMessage = (event) => {
        // Remove the temporary listeners used to find the listening port.
        clearListeners(socket);
  
        // Resolve and complete connection only if the expected message is received from the agent.
        const message = parseJSON(event.data);
        if (message?.method === DIDConnectRPCMethods.Ready) {
          // Resolve and return the open socket back to the caller
          resolve(socket);
        } else {
          reject(new Error(`Unexpected message received while finding open socket: ${message}`));
        }
      };
  
      const handleOpen = () => {
        socket.addEventListener('message', handleMessage, { once: true });
        if (userInitiatedAction) {
          triggerProtocolHandler(`web5://${path}`);
        }
      };

      const clearListeners = () => {
        socket.removeEventListener('open', handleOpen);
        socket.removeEventListener('error', handleError);
        socket.removeEventListener('message', handleMessage);
      };

      socket.addEventListener('open', handleOpen, { once: true });
      socket.addEventListener('error', handleError, { once: true });
    });
  };

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  for (let port = startPort; port <= endPort; port++) {
    try {
      return await tryConnect(port);
    } catch (error) {
      console.error(error.message);
      if (port !== endPort) {
        await wait(connectionAttemptDelay); // Wait between socket connection attempts
      } else {
        throw new Error(`Failed to connect to a WebSocket between ports ${startPort} and ${endPort}`);
      }
    }
  }
}