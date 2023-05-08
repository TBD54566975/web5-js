import * as Sdk from '@tbd54566975/dwn-sdk-js';

import { Permissions } from './interfaces/permissions.js';
import { Protocols } from './interfaces/protocols.js';
import { Records } from './interfaces/records.js';
import { createWeakSingletonAccessor } from '../utils.js';

const sharedNode = createWeakSingletonAccessor(() => Sdk.Dwn.create());

export class Web5Dwn {
  #web5;

  #node;
  #permissions;
  #protocols;
  #records;

  constructor(web5, options = { }) {
    this.#web5 = web5;

    this.#node = options?.node ? Promise.resolve(options.node) : null;
    
    this.#permissions = new Permissions(this);

    this.#protocols = new Protocols(this);
    
    this.#records = new Records(this);
  }

  get sdk() {
    return Sdk;
  }

  get web5() {
    return this.#web5;
  }

  get permissions() {
    return this.#permissions;
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
