import { Web5 } from './packages/web5/dist/esm/main.mjs';
import { DidIonApi, DidKeyApi } from './packages/dids/dist/esm/main.mjs';

const DidIon = new DidIonApi();
const DidKey = new DidKeyApi();

const didKeyState = DidKey.create();
console.log('---------DID KEY-------------');
console.log(JSON.stringify(didKeyState, null, 2));

const didIonState = await DidIon.create();
console.log('---------DID ION-------------');
console.log(JSON.stringify(didIonState, null, 2));

//! NOTE: this only works in browser right now because storage is localStorage. will swap that out tomorrow
const { web5 } = await Web5.connect();
console.log(web5);