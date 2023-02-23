import Koa from 'koa';
import serve from 'koa-static';

const app = new Koa();

// GET /index.html
app.use(serve('.'));

// GET /web5-sdk.js
app.use(serve('../dist'));

app.listen(8080);
 
console.log('listening on port 8080');
