import { Web5 } from '@tbd54566975/web5';
import { DidIonApi } from '@tbd54566975/dids';
import { Web5 as OldWeb5 } from './packages/old/dist/esm/index.mjs'

const oldWeb5 = new OldWeb5();
await oldWeb5.did.create('ion');

const DidIon = new DidIonApi();

const did = await DidIon.create();
console.log(did);

const drr = await DidIon.resolve(did.id);
console.log(JSON.stringify(drr, null, 2));

//! NOTE: this only works in browser right now because storage is localStorage. will swap that out tomorrow
// const { web5 } = await Web5.connect();
// console.log(web5);