import { Dwn } from '@tbd54566975/dwn-sdk-js';

let dwn;
async function sharedDwn() {
  return dwn ||= await Dwn.create();
}

export {
  sharedDwn
};
