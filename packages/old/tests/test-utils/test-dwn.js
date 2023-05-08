import { Dwn, DataStoreLevel, DidResolver, EventLogLevel, MessageStoreLevel } from '@tbd54566975/dwn-sdk-js';

export class TestDwn {
  didResolver;
  dataStore;
  eventLog;
  messageStore;
  node;

  constructor(options) {
    this.node = options.node;
    this.didResolver = options.didResolver;
    this.dataStore = options.dataStore;
    this.eventLog = options.eventLog;
    this.messageStore = options.messageStore;
  }

  static async create() {
    const didResolver = new DidResolver();
    const dataStore = new DataStoreLevel({
      blockstoreLocation : 'test-data/DATASTORE',
    });
    const eventLog = new EventLogLevel({
      location           : 'test-data/EVENTLOG',
    });
    const messageStore = new MessageStoreLevel({
      blockstoreLocation : 'test-data/MESSAGESTORE',
      indexLocation      : 'test-data/INDEX',
    });
    const node = await Dwn.create({ dataStore, didResolver, eventLog, messageStore });
    return new TestDwn({ dataStore, didResolver, eventLog, messageStore, node });
  }

  async clear() {
    await this.dataStore.clear();
    await this.eventLog.clear();
    await this.messageStore.clear();
  }

  async close() {
    await this.node.close();
  }

  async open() {
    await this.node.open();
  }
}
