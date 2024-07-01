import express from 'express';
import cors from 'cors';

const dataStore = new Map();

const app = express();
const port = 8080;

app.use(express.json());
app.use(cors());

app.post('/connect', async (req, res) => {
  console.log(`Received ${req.body.method} request`);

  if (
    (req.body.method === 'connect.authorizationRequest')
    ||
    (req.body.method === 'connect.authorizationResponse')
  ) {

    const { messageType, payload, uuid } = JSON.parse(req.body.params.data);

    const key = `${uuid}.${messageType}`;

    /** Each unique session (by UUID) should only receive one authorizationRequest from the
     * connecting Client and one authorizationResponse from the Identity Provider. If a second
     * message is received for any session, return a 409 Conflict error indicating an unexpected
     * duplicate. */
    if (dataStore.has(key)) {
      const response = createJsonRpcErrorResponse(req.body.id, {
        code    : JsonRpcErrorCodes.Conflict,
        message : 'Conflict',
        data    : {
          ok     : false,
          status : { code: 409, message: `Duplicate ${messageType} received for ${uuid}`
          }}
      });
      res.json(response);

    } else {
      dataStore.set(key, { messageType, payload, uuid });
      console.log(`(${uuid}) ${messageType} received`);
      const response = createJsonRpcSuccessResponse(req.body.id, {
        ok     : true,
        status : { code: 200, message: 'OK' }
      });
      res.json(response);
    }
  }

  else if (
    (req.body.method === 'connect.getAuthorizationRequest')
    ||
    (req.body.method === 'connect.getAuthorizationResponse')
  ) {

    const { messageType, uuid } = JSON.parse(req.body.params.data);

    const key = `${uuid}.${messageType}`;

    if (dataStore.has(key)) {
      const data = dataStore.get(key);
      const response = createJsonRpcSuccessResponse(req.body.id, {
        ok     : true,
        data   : JSON.stringify(data),
        status : { code: 200, message: 'OK' }
      });
      res.json(response);

      // Now that the message has been retrieved, delete it from the store.
      console.log(`Deleting message from store: (${uuid}) ${messageType}`);
      dataStore.delete(key);

    } else {
      const response = createJsonRpcSuccessResponse(req.body.id, {
        ok     : false,
        status : { code: 404, message: 'Not Found' }
      });
      res.json(response);
    }
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

const createJsonRpcSuccessResponse = (
  id,
  result
) => {
  return {
    jsonrpc : '2.0',
    id,
    result  : result ?? null,
  };
};

const createJsonRpcErrorResponse = (id, code, message, data) => {
  const error = { code, message };
  if (data != undefined) {
    error.data = data;
  }
  return {
    jsonrpc: '2.0',
    id,
    error,
  };
};

const JsonRpcErrorCodes  = {
  // JSON-RPC 2.0 pre-defined errors
  InvalidRequest : -32600,
  MethodNotFound : -32601,
  InvalidParams  : -32602,
  InternalError  : -32603,
  ParseError     : -32700,
  TransportError : -32300,

  // App defined errors
  BadRequest   : -50400, // equivalent to HTTP Status 400
  Unauthorized : -50401, // equivalent to HTTP Status 401
  Forbidden    : -50403, // equivalent to HTTP Status 403
  Conflict     : -50409, // equivalent to HTTP Status 409
};