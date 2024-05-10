import { Level } from 'level';

const db = new Level('mytest/watermark');

let syncState = {
  did       : 'did:ion:EiC2pe3',
  dwnUrl    : 'http://localhost:3000',
  watermark : undefined
};

let syncOperations = [];

let messageCid = 'bafyreifzzzylq3f4kgnr7ofafxd6v6ekunua36c2gtpv67gdrdheo4s2nm';
let operationKey = `${syncState.did}~${syncState.dwnUrl}~${messageCid}`;
let watermark = '01H90K0J23FJE8C7G95E2VSH6G';
let operation = {
  type  : 'put',
  key   : operationKey,
  value : watermark
};

console.log(`Adding ${operationKey} - ${watermark}`);
syncOperations.push(operation);

/** ------------------------------------------------------------------------------------------------ */

messageCid = 'bafyreieieydnxq32mvyclcmne3ft5jnlemhyio3heusqts7wxjuogbbzj4';
operationKey = `${syncState.did}~${syncState.dwnUrl}~${messageCid}`;
watermark = '01H90K0JCRRSAS8RXZCDEBZRTC';
operation = {
  type  : 'put',
  key   : operationKey,
  value : watermark
};

console.log(`Adding ${operationKey} - ${watermark}`);
syncOperations.push(operation);

/** ------------------------------------------------------------------------------------------------ */

messageCid = 'bafyreib5q3dyhzhafagxa3oslnei54gvre7pbpozgu5j6lvtr2o3xr3j2e';
operationKey = `${syncState.did}~${syncState.dwnUrl}~${messageCid}`;
watermark = '01H90K0JRYK9NXGFGCV52CVWG4';
operation = {
  type  : 'put',
  key   : operationKey,
  value : watermark
};

console.log(`Adding ${operationKey} - ${watermark}`);
syncOperations.push(operation);

/** ------------------------------------------------------------------------------------------------ */

const pushQueue = db.sublevel('pushQueue');
await pushQueue.batch(syncOperations);

let pushJobs = await pushQueue.iterator().all();
for (let job of pushJobs) {
  const [key, watermark] = job;
  const [did, dwnUrl, messageCid] = key.split('~');

  console.log(`Sync push job: ${did} - ${messageCid} - ${watermark} - ${dwnUrl}`);
}

/** ------------------------------------------------------------------------------------------------ */

await pushQueue.clear();

syncOperations = [
  { type: 'put', key: 'c', value: '3' },
  { type: 'put', key: 'a', value: '1' },
  { type: 'put', key: 'b', value: '2' }
];

await pushQueue.batch(syncOperations);

pushJobs = await pushQueue.iterator().all();
for (let job of pushJobs) {
  const [key, value] = job;

  console.log(`${key} - ${value}`);
}

db.clear();
db.close();