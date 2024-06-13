import express from 'express';
import cors from 'cors';
import { randomUuid } from '@web5/crypto/utils';

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
 * Endpoint that the connecting Client app pushes the Request Object to.
 */
app.post('/connect/par', (req, res) => {
  console.log('Received Pushed Authorization Request (PAR) request.');

  // Generate a request URI
  const requestId = randomUuid();
  const request_uri = `http://localhost:${port}/connect/${requestId}.jwt`;

  // Store the Request Object.
  const requestJwt = req.body.request;
  dataStore.set(`request:${requestId}`, requestJwt);

  console.log(`Request Object stored for ${requestId}`);

  res.status(201).json({
    request_uri,
    expires_in  : 600,  // The request URI is valid for 10 minutes.
  });
});

/**
 * Endpoint that the Identity Provider polls to check if the user has transmitted the Request Object.
 */
app.get('/connect/:requestId.jwt', (req, res) => {
  // Look up the request object based on the requestId.
  const requestId = req.params.requestId;
  const requestObjectJwt = dataStore.get(`request:${requestId}`);

  console.log(`Identity provider attempted to retrieve request object: ${requestId}`);

  if (!requestObjectJwt) {
    res.status(404).json({
      ok     : false,
      status : { code: 404, message: 'Not Found' }
    });
  } else {
    res.set('Content-Type', 'application/jwt');
    res.send(requestObjectJwt);

    // Delete the Request Object from the data store now that it has been retrieved.
    dataStore.delete(`request:${requestId}`);
  }
});

/**
 * Endpoint that the Identity Provider pushes the Authorization Response ID token to.
 */
app.post('/connect/sessions', (req, res) => {
  console.log('Identity Provider pushed response with ID token.');

  // Store the ID token.
  const idToken = req.body.id_token;
  const state = req.body.state;

  if (idToken && state) {
    dataStore.set(`response:${state}`, idToken);

    res.status(201).json({
      ok     : true,
      status : { code: 201, message: 'Created' }
    });

  } else {
    res.status(400).json({
      ok     : false,
      status : { code: 400, message: 'Bad Request' }
    });
  }
});

/**
 * Endpoint that the connecting Client app polls to check if the Identity Provider has posted the
 * ID token.
 */
app.get('/connect/sessions/:state.jwt', (req, res) => {
  console.log(`Client app attempted to retrieve ID token for state: ${req.params.state}`);

  // Look up the ID token.
  const state = req.params.state;
  const idToken = dataStore.get(`response:${state}`);

  if (!idToken) {
    res.status(404).json({
      ok     : false,
      status : { code: 404, message: 'Not Found' }
    });
  } else {
    res.set('Content-Type', 'application/jwt');
    res.send(idToken);

    // Delete the request object from the data store now that it has been retrieved.
    dataStore.delete(`response:${state}`);
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});