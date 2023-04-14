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

export const findWebSocket = async (startPort, endPort, path, userInitiatedAction = true, host = 'localhost') => {
  return new Promise((resolve, reject) => {
    function clearListeners(socket) {
      socket.removeEventListener('open', handleOpen);
      socket.removeEventListener('error', handleError);
      socket.removeEventListener('message', handleMessage);
    }

    function handleError(event) {
      const socket = event.target;
      socket.close();
      clearListeners(socket);
    }

    const handleMessage = async (event) => {
      const socket = event.target;
      // Resolve and complete connection only if the expected message is received from the agent.
      const message = parseJSON(event.data);
      if (message?.method === DIDConnectRPCMethods.Ready) {
        // Remove the temporary listeners used to find the listening port.
        clearListeners(socket);
        // Resolve and return the open socket back to the caller
        resolve(socket);
      } else {
        reject(new Error(`Unexpected message received: ${message}`));
      }
    };

    function handleOpen(event) {
      const socket = event.target;
      socket.addEventListener('message', handleMessage);
      if (userInitiatedAction) {
        triggerProtocolHandler(`web5://${path}`);
      }
    }

    for (let port = startPort; port <= endPort; port++) {
      const socket = new WebSocket(`ws://${host}:${port}/${path}`);
      socket.addEventListener('open', handleOpen, { once: true });
      socket.addEventListener('error', handleError);
    }
  });
};