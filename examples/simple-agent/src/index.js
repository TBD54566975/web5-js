import Koa from 'koa';
import Router from '@koa/router';
import { koaBody } from 'koa-body';
import cors from '@koa/cors';
import {
  getPort,
  initializeProtocols,
  loadConfig,
  receiveHttp,
} from './utils.js';

await loadConfig();
await initializeProtocols();

const port = await getPort(process.argv);
const router = new Router();
const server = new Koa();

router.post('/dwn', async (ctx, _next) => {
  try {
    const response = await receiveHttp(ctx);

    // Normalize DWN MessageReply and HTTP Reponse
    ctx.status = response?.status?.code ?? response?.status;
    ctx.statusText = response?.status?.detail ?? response?.statusText;
    ctx.body = 'entries' in response ? { entries: response.entries } : response.body;
  }
  catch(err) {
    console.error(err);
    ctx.status = 400;
    ctx.body = err;
    return;
  }
  return;
});

server
  .use(cors())
  .use(koaBody({
    multipart: true,
  }))
  .use(router.routes())
  .use(router.allowedMethods());


server.listen(port);

console.log(`listening on port ${port}`);