import * as SDK from '@tbd54566975/dwn-sdk-js';

import { Protocols } from './interface/Protocols.js';
import { Records } from './interface/Records.js';
import { createWeakSingletonAccessor } from '../utils.js';

const sharedNode = createWeakSingletonAccessor(() => SDK.Dwn.create());

class Web5DWN {
  #web5;

  #protocols;
  #records;
  #node;

  constructor(web5, options = { }) {
    this.#web5 = web5;

    this.#protocols = new Protocols(this);

    this.#records = new Records(this);

    this.#node = options?.node ? Promise.resolve(options.node) : null;
  }

  get SDK() {
    return SDK;
  }

  get web5() {
    return this.#web5;
  }

  get protocols() {
    return this.#protocols;
  }

  get records() {
    return this.#records;
  }

  get node() {
    return this.#node ??= sharedNode();
  }
}

export {
  Web5DWN,
};
