import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const subscriptions = new Map();

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    const parsedMessage = JSON.parse(message);
    const { jsonrpc, method, params, id } = parsedMessage;

    if (jsonrpc !== '2.0' || !method || !id) {
      // Invalid JSON-RPC message, respond with an error
      ws.send(JSON.stringify({ jsonrpc: '2.0', error: { code: -32600, message: 'Invalid Request' }, id }));
      return;
    }

    switch (method) {
      case 'connect.subscribe': {
        const topic = params.uuid;
        if (topic) {
          if (!subscriptions.has(topic)) {
            subscriptions.set(topic, []);
          }
          subscriptions.get(topic).push(ws);
        }
        break;
      }

      case 'connect.authorizationRequest': {
        const topic = params.uuid;
        const update = params.update;
        const uuid = params.uuid;
        if (uuid && topic && update) {
          const fullTopic = `${topic}.${uuid}`;
          publishUpdate(fullTopic, update);
        }
        break;
      }

      default: {
        // Unsupported method, respond with an error
        ws.send(JSON.stringify({ jsonrpc: '2.0', error: { code: -32601, message: 'Method not found' }, id }));
        break;
      }
    }
  });

  ws.on('close', () => {
    // Remove client from all subscriptions
    subscriptions.forEach((clients, topic) => {
      subscriptions.set(topic, clients.filter(client => client !== ws));
    });
  });
});

function publishUpdate(fullTopic, update) {
  const subscribers = subscriptions.get(fullTopic) || [];
  subscribers.forEach(subscriber => {
    subscriber.send(JSON.stringify({ jsonrpc: '2.0', method: 'update', params: { topic: fullTopic, update } }));
  });
}

server.listen(8800, () => {
  console.log('Server is listening on port 8080');
});
