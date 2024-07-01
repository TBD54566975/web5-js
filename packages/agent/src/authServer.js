import express from "express";
import cors from "cors";
import { randomUuid } from "@web5/crypto/utils";

const dataStore = new Map();

const app = express();
const port = 8080;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

/**
 * 1. Endpoint allows a Client app (RP) to submit an authorization request.
 * The request is stored on the server, and a unique `request_uri` is returned to the Client app.
 * The Client app can then provide this `request_uri` to the Provider app (wallet).
 * The Provider app uses the `request_uri` to retrieve the stored authorization request.
 */
app.post("/connect/par", (req, res) => {
  try {
    console.log("Received Pushed Authorization Request (PAR) request.");

    // TODO: Add validation for rquest too large HTTP 413
    // TODO: Add validation for too many requests HTTP 429 (Too Many Requests) status code.

    // Validate that something was provided
    if (!req.body.request) {
      return res.status(400).json({
        ok: false,
        status: {
          code: 400,
          message: "Bad Request: Missing 'request' parameter",
        },
      });
    }

    // Validate that `request_uri` was NOT provided
    if (req.body?.request?.request_uri) {
      return res.status(400).json({
        ok: false,
        status: {
          code: 400,
          message: "Bad Request: 'request_uri' parameter is not allowed in PAR",
        },
      });
    }

    // Generate a request URI
    const requestId = randomUuid();
    const request_uri = `http://localhost:${port}/connect/authorize/${requestId}.jwt`;

    // Store the SIOPv2 Auth Request JWT
    const requestJwt = req.body.request;
    dataStore.set(`request:${requestId}`, requestJwt);

    console.log(`Request Object stored for ${requestId}`);

    res.status(201).json({
      request_uri,
      expires_in: 600, // The request URI is valid for 10 minutes.
    });
  } catch (error) {
    console.error(`Error processing PAR request: ${error.message}`);
    res.status(500).json({
      ok: false,
      status: { code: 500, message: "Internal Server Error" },
    });
  }
});

/**
 * 2. Endpoint for the Provider to retrieve the auth request from the request_uri
 */
app.get("/connect/authorize/:requestId.jwt", (req, res) => {
  try {
    // Look up the request object based on the requestId.
    const requestId = req.params.requestId;
    const requestObjectJwt = dataStore.get(`request:${requestId}`);

    console.log(
      `Identity provider attempted to retrieve request object: ${requestId}`
    );

    if (!requestObjectJwt) {
      return res.status(404).json({
        ok: false,
        status: { code: 404, message: "Not Found" },
      });
    } else {
      res.set("Content-Type", "application/jwt");
      res.send(requestObjectJwt);

      // Delete the Request Object from the data store now that it has been retrieved.
      dataStore.delete(`request:${requestId}`);
    }
  } catch (error) {
    console.error(`Error retrieving request object: ${error.message}`);
    res.status(500).json({
      ok: false,
      status: { code: 500, message: "Internal Server Error" },
    });
  }
});

/**
 * 3. Endpoint that the Provider sends the Authorization Response to.
 */
app.post("/connect/callback", (req, res) => {
  console.log("Identity Provider pushed response with ID token.");

  // Store the ID token.
  const idToken = req.body.id_token;
  const state = req.body.state;

  if (idToken && state) {
    dataStore.set(`response:${state}`, idToken);

    res.status(201).json({
      ok: true,
      status: { code: 201, message: "Created" },
    });
  } else {
    res.status(400).json({
      ok: false,
      status: { code: 400, message: "Bad Request" },
    });
  }
});

/**
 * 4. Endpoint for the connecting Client to retrieve the Authorization Response.
 */
app.get("/connect/token/:state.jwt", (req, res) => {
  console.log(
    `Client app attempted to retrieve ID token for state: ${req.params.state}`
  );

  // Look up the ID token.
  const state = req.params.state;
  const idToken = dataStore.get(`response:${state}`);

  if (!idToken) {
    res.status(404).json({
      ok: false,
      status: { code: 404, message: "Not Found" },
    });
  } else {
    res.set("Content-Type", "application/jwt");
    res.send(idToken);

    // Delete the request object from the data store now that it has been retrieved.
    dataStore.delete(`response:${state}`);
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
