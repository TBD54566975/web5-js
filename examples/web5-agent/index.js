import Koa from 'koa';
import serve from 'koa-static';

const app = new Koa();
const port = 8080;

// GET /desktop-agent.html
app.use(serve('.'));

// GET /browser.mjs
app.use(serve('../../dist'));

app.listen(port);

console.log(`listening on port ${port}`);
