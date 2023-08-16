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

    console.log('SIMPLE AGENT receiveHTTP response:', response);

    // // All DWN MessageReply responses contain a `status` object.
    // // DWN RecordsQuery responses contain an `entries` array of query results.
    // // DWN RecordsRead responses contain a data property which is a Readable stream.
    // const { message, ...retainedResponse } = response;
    
    // ctx.body = retainedResponse;
    // ctx.status = retainedResponse?.status?.code;
    // ctx.statusText = retainedResponse?.status?.detail;
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