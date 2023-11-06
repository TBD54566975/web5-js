import type { RecordsWriteMessage, RecordsWriteOptions } from '@tbd54566975/dwn-sdk-js';

import { utils as cryptoUtils } from '@web5/crypto';
import { Convert, removeEmptyObjects, removeUndefinedProperties } from '@web5/common';

import type { DwnResponse, Web5ManagedAgent } from './types/agent.js';
import type {
  ManagedKey,
  ManagedKeyPair,
  ManagedKeyStore,
  ManagedPrivateKey
} from './types/managed-key.js';

import { isManagedKeyPair } from './utils.js';

type EncodedPrivateKey = Omit<ManagedPrivateKey, 'material'> & {
  // Key material, encoded as Base64Url.
  material: string;
}

type EncodedKey = Omit<ManagedKey, 'material'> & {
  // Key material, encoded as Base64Url.
  material?: string;
}

type EncodedKeyPair = {
  privateKey: EncodedKey;
  publicKey: EncodedKey;
}

/**
 * An implementation of `ManagedKeyStore` that stores key metadata and
 * public key material in a DWN.
 *
 * An instance of this class can be used by `KeyManager` or
 * an implementation of `KeyManagementSystem`.
 */
export class KeyStoreDwn implements ManagedKeyStore<string, ManagedKey | ManagedKeyPair> {
  private _keyRecordProperties = {
    dataFormat : 'application/json',
    schema     : 'https://identity.foundation/schemas/web5/managed-key'
  };

  constructor(options?: { schema: string }) {
    const { schema } = options ?? {};
    if (schema) {
      this._keyRecordProperties.schema = schema;
    }
  }

  async deleteKey(options: {
    agent: Web5ManagedAgent,
    context?: string,
    id: string
  }): Promise<boolean> {
    const { agent, context, id } = options;

    // Determine which DID to use to author DWN messages.
    const authorDid = await this.getAuthor({ agent, context });

    // Query the DWN for all stored key objects.
    const { reply: queryReply} = await this.getKeyRecords(agent, context);

    // Loop through all of the entries and try to find a match.
    let matchingRecordId: string | undefined;
    for (const record of queryReply.entries ?? []) {
      if (record.encodedData) {
        const storedKey = this.decodeKey(record.encodedData);
        const storedKeyId = isManagedKeyPair(storedKey) ? storedKey.publicKey.id : storedKey.id;
        if (storedKey && storedKeyId === id) {
          matchingRecordId = (record as RecordsWriteMessage).recordId ;
          break;
        }
      }
    }

    // Return undefined if the specified key was not found in the store.
    if (!matchingRecordId) return false;

    // If a record for the specified key was found, attempt to delete it.
    const { reply: { status } } = await agent.dwnManager.processRequest({
      author         : authorDid,
      target         : authorDid,
      messageType    : 'RecordsDelete',
      messageOptions : {
        recordId: matchingRecordId
      }
    });

    // If the key was successfully deleted, return true;
    if (status.code === 202) return true;

    // If the key could not be deleted, return false;
    return false;
  }

  async findKey(options: { id: string, agent: Web5ManagedAgent, context?: string }): Promise<ManagedKey | ManagedKeyPair | undefined>;
  async findKey(options: { alias: string, agent: Web5ManagedAgent, context?: string }): Promise<ManagedKey | ManagedKeyPair | undefined>;
  async findKey(options: { agent: Web5ManagedAgent, alias?: string, context?: string, id?: string }): Promise<ManagedKey | ManagedKeyPair | undefined> {
    const { agent, alias, context, id } = options;

    // Query the DWN for all stored managed key objects.
    const { reply: queryReply} = await this.getKeyRecords(agent, context);

    // Loop through all of the entries and return a match, if found.
    for (const record of queryReply.entries ?? []) {
      if (record.encodedData) {
        const storedKey = this.decodeKey(record.encodedData);
        if (isManagedKeyPair(storedKey)) {
          if (storedKey.publicKey.id === id) return storedKey;
          if (storedKey.publicKey.alias === alias) return storedKey;
        } else {
          if (storedKey.id === id) return storedKey;
          if (storedKey.alias === alias) return storedKey;
        }
      }
    }

    // Return undefined if no matches were found.
    return undefined;
  }

  async getKey(options: {
    agent: Web5ManagedAgent,
    context?: string,
    id: string
  }): Promise<ManagedKey | ManagedKeyPair | undefined> {
    const { agent, context, id } = options;

    // Query the DWN for all stored managed key objects.
    const { reply: queryReply} = await this.getKeyRecords(agent, context);

    // Loop through all of the entries and return a match, if found.
    for (const record of queryReply.entries ?? []) {
      if (record.encodedData) {
        const storedKey = this.decodeKey(record.encodedData);
        const storedKeyId = isManagedKeyPair(storedKey) ? storedKey.publicKey.id : storedKey.id;
        if (storedKeyId === id) return storedKey;
      }
    }

    // Return undefined if no matches were found.
    return undefined;
  }

  async importKey(options: {
    agent: Web5ManagedAgent,
    context?: string,
    key: ManagedKey | ManagedKeyPair
  }): Promise<string> {
    const { agent, context, key } = options;

    let keyId: string;
    if (isManagedKeyPair(key)) {
      keyId = key.publicKey.id;
    } else {
      // If an ID wasn't specified, generate one.
      if (!key.id) {
        key.id = cryptoUtils.randomUuid();
      }
      keyId = key.id;
    }

    // Determine which DID to use to author DWN messages.
    const authorDid = await this.getAuthor({ agent, context });

    // Check if the key being imported is already present in the store.
    const duplicateFound = await this.getKey({ agent, context, id: keyId });
    if (duplicateFound) {
      throw new Error(`KeyStoreDwn: Key with ID already exists: '${keyId}'`);
    }

    // Encode the managed key or key pair as bytes.
    const encodedKey = this.encodeKey(key);

    const { reply: { status } } = await agent.dwnManager.processRequest({
      author         : authorDid,
      target         : authorDid,
      messageType    : 'RecordsWrite',
      messageOptions : { ...this._keyRecordProperties },
      dataStream     : new Blob([encodedKey])
    });

    // If the write fails, throw an error.
    if (status.code !== 202) {
      throw new Error('DidStoreDwn: Failed to write imported DID to store.');
    }

    return keyId;
  }

  async listKeys(options: {
    agent: Web5ManagedAgent,
    context?: string
  }): Promise<(ManagedKey | ManagedKeyPair)[]> {
    const { agent, context } = options;

    // Query the DWN for all stored managed key objects.
    const { reply: queryReply} = await this.getKeyRecords(agent, context);

    // Loop through all of the entries and accumulate the key objects.
    let storedKeys: (ManagedKey | ManagedKeyPair)[] = [];
    for (const record of queryReply.entries ?? []) {
      if (record.encodedData) {
        const storedKey = this.decodeKey(record.encodedData);
        storedKeys.push(storedKey);
      }
    }

    return storedKeys;
  }

  async updateKey(options: {
    agent: Web5ManagedAgent,
    context?: string
  } & Pick<ManagedKey, 'id' | 'alias' | 'metadata'>): Promise<boolean> {
    const { agent, context, id } = options;
    const propertyUpdates = { alias: options.alias, metadata: options.metadata };

    // Determine which DID to use to author DWN messages.
    const authorDid = await this.getAuthor({ agent, context });

    // Query the DWN for all stored managed key objects.
    const { reply: queryReply} = await this.getKeyRecords(agent, context);

    // Confirm the key being updated is already present in the store.
    let keyToUpdate: ManagedKey | ManagedKeyPair | undefined;
    let recordToUpdate: RecordsWriteMessage | undefined;
    for (const entry of queryReply.entries ?? []) {
      const { encodedData, ...record } = entry;
      if (encodedData) {
        const storedKey = this.decodeKey(encodedData);
        const storedKeyId = isManagedKeyPair(storedKey) ? storedKey.publicKey.id : storedKey.id;
        if (storedKey && storedKeyId === id) {
          keyToUpdate = storedKey;
          recordToUpdate = record as RecordsWriteMessage ;
          break;
        }
      }
    }

    // Key with given ID not present so update operation cannot proceed.
    if (!recordToUpdate || !keyToUpdate) return false;

    // Make a deep copy of the update properties to ensure all nested objects do not share references.
    removeUndefinedProperties(propertyUpdates);
    removeEmptyObjects(propertyUpdates);
    const clonedUpdates = structuredClone(propertyUpdates);

    // Update the given properties of the key.
    if (isManagedKeyPair(keyToUpdate)) {
      keyToUpdate.privateKey = { ...keyToUpdate.privateKey, ...clonedUpdates };
      keyToUpdate.publicKey = { ...keyToUpdate.publicKey, ...clonedUpdates };
    } else {
      keyToUpdate = { ...keyToUpdate, ...clonedUpdates };
    }

    // Encode the updated key or key pair as bytes.
    const updatedKeyBytes = this.encodeKey(keyToUpdate);

    // Assemble the update messsage, including record ID and context ID, if any.
    let messageOptions = { ...recordToUpdate.descriptor } as Partial<RecordsWriteOptions>;
    messageOptions.contextId = recordToUpdate.contextId;
    messageOptions.recordId = recordToUpdate.recordId;

    /** Remove properties from the update messageOptions to let the DWN SDK
     * auto-fill.  Otherwisse, you will get 409 Conflict errors. */
    delete messageOptions.dataCid;
    delete messageOptions.dataSize;
    delete messageOptions.data;
    delete messageOptions.messageTimestamp;

    // Overwrite the entry in the store with the updated object.
    const { reply: { status } } = await agent.dwnManager.processRequest({
      author      : authorDid,
      target      : authorDid,
      messageType : 'RecordsWrite',
      messageOptions,
      dataStream  : new Blob([updatedKeyBytes])
    });

    // If the write fails, throw an error.
    if (status.code !== 202) {
      throw new Error('DidStoreDwn: Failed to write updated key to store.');
    }

    return true;
  }

  private decodeKey(keyEncodedData: string): ManagedKey | ManagedKeyPair {
    const encodedKey = Convert.base64Url(keyEncodedData).toObject() as EncodedKey | EncodedKeyPair;

    if ('publicKey' in encodedKey) {
      const privateKeyMaterial = encodedKey.privateKey.material
        ? Convert.base64Url(encodedKey.privateKey.material).toUint8Array()
        : undefined;

      const publicKeyMaterial = encodedKey.publicKey.material
        ? Convert.base64Url(encodedKey.publicKey.material).toUint8Array()
        : undefined;

      const managedKeyPair = {
        privateKey : { ...encodedKey.privateKey, material: privateKeyMaterial },
        publicKey  : { ...encodedKey.publicKey, material: publicKeyMaterial}
      } as ManagedKeyPair;

      return managedKeyPair;

    } else {
      const material = encodedKey.material
        ? Convert.base64Url(encodedKey.material).toUint8Array()
        : undefined;

      const managedKey = { ...encodedKey, material } as ManagedKey;

      return managedKey;
    }
  }

  private encodeKey(managedKey: ManagedKey | ManagedKeyPair): Uint8Array {
    let encodedKey: EncodedKey | EncodedKeyPair;

    if (isManagedKeyPair(managedKey)) {
      const privateKeyMaterial = managedKey.privateKey.material
        ? Convert.uint8Array(managedKey.privateKey.material).toBase64Url()
        : undefined;

      const publicKeyMaterial = managedKey.publicKey.material
        ? Convert.uint8Array(managedKey.publicKey.material).toBase64Url()
        : undefined;

      encodedKey = {
        privateKey : { ...managedKey.privateKey, material: privateKeyMaterial },
        publicKey  : { ...managedKey.publicKey, material: publicKeyMaterial }
      };

    } else {
      const material = managedKey.material
        ? Convert.uint8Array(managedKey.material).toBase64Url()
        : undefined;

      encodedKey = { ...managedKey, material };
    }

    const keyBytes = Convert.object(encodedKey).toUint8Array();

    return keyBytes;
  }

  private async getAuthor(options: {
    agent: Web5ManagedAgent,
    context?: string
  }): Promise<string> {
    const { agent, context } = options;

    // If `context` is specified, DWN messages will be signed by this DID.
    if (context) return context;

    // If Agent has an agentDid, use it to sign DWN messages.
    if (agent.agentDid) return agent.agentDid;

    // If `context` and `agent.agentDid`are undefined, throw error.
    throw new Error(`KeyStoreDwn: Agent property 'agentDid' is undefined and no context was specified.`);
  }

  private async getKeyRecords(agent: Web5ManagedAgent, context?: string): Promise<DwnResponse> {
    // Determine which DID to use to author DWN messages.
    const authorDid = await this.getAuthor({ agent, context });

    const dwnResponse = await agent.dwnManager.processRequest({
      author         : authorDid,
      target         : authorDid,
      messageType    : 'RecordsQuery',
      messageOptions : {
        filter: { ...this._keyRecordProperties }
      }
    });

    return dwnResponse;
  }
}

/**
 * An implementation of `ManagedKeyStore` that stores key metadata and
 * public key material in memory.
 *
 * An instance of this class can be used by `KeyManager` or
 * an implementation of `KeyManagementSystem`.
 */
export class KeyStoreMemory implements ManagedKeyStore<string, ManagedKey | ManagedKeyPair> {
  /**
   * A private field that contains the Map used as the in-memory key-value store.
   */
  private store: Map<string, ManagedKey | ManagedKeyPair> = new Map();

  async deleteKey({ id }: { id: string }): Promise<boolean> {
    if (this.store.has(id)) {
      // Key with given ID exists so proceed with delete.
      this.store.delete(id);
      return true;
    }

    // Key with given ID not present so delete operation not possible.
    return false;
  }

  async findKey(options: { id: string }): Promise<ManagedKey | ManagedKeyPair | undefined>;
  async findKey(options: { alias: string }): Promise<ManagedKey | ManagedKeyPair | undefined>;
  async findKey(options: { alias?: string, id?: string }): Promise<ManagedKey | ManagedKeyPair | undefined> {
    let { alias, id } = options;

    // Get key by ID.
    if (id) return this.store.get(id);

    if (alias) {
      // Search through the store to find a matching entry.
      for (const key of await this.listKeys()) {
        if ('alias' in key && key.alias === alias) return key;
        if ('publicKey' in key && key.publicKey.alias === alias) return key;
      }
    }

    return undefined;
  }

  async getKey({ id }: { id: string }): Promise<ManagedKey | ManagedKeyPair | undefined> {
    return this.store.get(id);
  }

  async importKey({ key }: { key: ManagedKey | ManagedKeyPair }): Promise<string> {
    let id: string;
    if (isManagedKeyPair(key)) {
      id = key.publicKey.id;
    } else {
      // If an ID wasn't specified, generate one.
      if (!key.id) {
        key.id = cryptoUtils.randomUuid();
      }
      id = key.id;
    }

    if (this.store.has(id)) {
      // Key with given ID already exists so import operation cannot proceed.
      throw new Error(`KeyStoreMemory: Key with ID already exists: '${id}'`);
    }

    // Make a deep copy of the key so that the object stored does not share the same references as the input key.
    const clonedKey = structuredClone(key);
    this.store.set(id, clonedKey);

    return id;
  }

  async listKeys(): Promise<(ManagedKey | ManagedKeyPair)[]> {
    return Array.from(this.store.values());
  }

  async updateKey(options:
    Pick<ManagedKey, 'id' | 'alias' | 'metadata'>
  ): Promise<boolean> {
    const id = options.id;
    const propertyUpdates = { alias: options.alias, metadata: options.metadata };

    const keyExists = this.store.has(id);
    if (!keyExists) {
      // Key with given ID not present so update operation cannot proceed.
      return false;
    }

    // Retrieve the current value of the key from the store.
    let key = await this.getKey({ id }) as ManagedKey | ManagedKeyPair;

    // Make a deep copy of the update properties to ensure all nested objects do not share references.
    removeUndefinedProperties(propertyUpdates);
    removeEmptyObjects(propertyUpdates);
    const clonedUpdates = structuredClone(propertyUpdates);

    // Update the given properties of the key.
    if (isManagedKeyPair(key)) {
      key.privateKey = { ...key.privateKey, ...clonedUpdates };
      key.publicKey = { ...key.publicKey, ...clonedUpdates };
    } else {
      key = { ...key, ...clonedUpdates, id: key.id };
    }

    // Overwrite the entry in the store with the updated object.
    this.store.set(id, key);

    return true;
  }
}

/**
 * An implementation of `ManagedKeyStore` that stores private key
 * material in a DWN.
 *
 * An instance of this class can be used by an implementation of
 * `KeyManagementSystem`.
 */
export class PrivateKeyStoreDwn implements ManagedKeyStore<string, ManagedPrivateKey> {
  private _keyRecordProperties = {
    dataFormat : 'application/json',
    schema     : 'https://identity.foundation/schemas/web5/kms-private-key'
  };

  async deleteKey(options: {
    agent: Web5ManagedAgent,
    context?: string,
    id: string
  }): Promise<boolean> {
    const { agent, context, id } = options;

    // Determine which DID to use to author DWN messages.
    const authorDid = await this.getAuthor({ agent, context });

    // Query the DWN for all stored key objects.
    const { reply: queryReply} = await this.getKeyRecords(agent, context);

    // Loop through all of the entries and try to find a match.
    let matchingRecordId: string | undefined;
    for (const record of queryReply.entries ?? []) {
      if (record.encodedData) {
        const storedKey = this.decodeKey(record.encodedData);
        if (storedKey && storedKey.id === id) {
          matchingRecordId = (record as RecordsWriteMessage).recordId ;
          break;
        }
      }
    }

    // Return undefined if the specified key was not found in the store.
    if (!matchingRecordId) return false;

    // If a record for the specified key was found, attempt to delete it.
    const { reply: { status } } = await agent.dwnManager.processRequest({
      author         : authorDid,
      target         : authorDid,
      messageType    : 'RecordsDelete',
      messageOptions : {
        recordId: matchingRecordId
      }
    });

    // If the key was successfully deleted, return true;
    if (status.code === 202) return true;

    // If the key could not be deleted, return false;
    return false;
  }

  async findKey(): Promise<ManagedPrivateKey | undefined> {
    throw new Error(`PrivateKeyStoreDwn: Method not implemented: 'findKey'`);
  }

  async getKey(options: {
    agent: Web5ManagedAgent,
    context?: string,
    id: string
  }): Promise<ManagedPrivateKey | undefined> {
    const { agent, context, id } = options;

    // Query the DWN for all stored key objects.
    const { reply: queryReply} = await this.getKeyRecords(agent, context);

    // Loop through all of the entries and return a match, if found.
    for (const record of queryReply.entries ?? []) {
      if (record.encodedData) {
        const storedKey = this.decodeKey(record.encodedData);
        if (storedKey.id === id) return storedKey;
      }
    }

    // Return undefined if no matches were found.
    return undefined;
  }

  async importKey(options: {
    agent: Web5ManagedAgent,
    context?: string,
    key: Omit<ManagedPrivateKey, 'id'>
  }): Promise<string> {
    const { agent, context, key } = options;

    if (!key.material) throw new TypeError(`Required parameter missing: 'material'`);
    if (!key.type) throw new TypeError(`Required parameter missing: 'type'`);

    // Determine which DID to use to author DWN messages.
    const authorDid = await this.getAuthor({ agent, context });

    // Encode the managed key or key pair as bytes.
    const id = cryptoUtils.randomUuid(); // Generate a random ID.
    const encodedPrivateKey = this.encodeKey({...key, id });

    const { reply: { status } } = await agent.dwnManager.processRequest({
      author         : authorDid,
      target         : authorDid,
      messageType    : 'RecordsWrite',
      messageOptions : { ...this._keyRecordProperties },
      dataStream     : new Blob([encodedPrivateKey])
    });

    // If the write fails, throw an error.
    if (status.code !== 202) {
      throw new Error('PrivateKeyStoreDwn: Failed to write imported DID to store.');
    }

    return id;
  }

  async listKeys(options: {
    agent: Web5ManagedAgent,
    context?: string
  }): Promise<ManagedPrivateKey[]> {
    const { agent, context } = options;

    // Query the DWN for all stored key objects.
    const { reply: queryReply} = await this.getKeyRecords(agent, context);

    // Loop through all of the entries and accumulate the key objects.
    let storedKeys: ManagedPrivateKey[] = [];
    for (const record of queryReply.entries ?? []) {
      if (record.encodedData) {
        const storedKey = this.decodeKey(record.encodedData);
        storedKeys.push(storedKey);
      }
    }

    return storedKeys;
  }

  async updateKey(): Promise<boolean> {
    throw new Error(`PrivateKeyStoreMemory: Method not implemented: 'updateKey'`);
  }

  private decodeKey(keyEncodedData: string): ManagedPrivateKey {
    const encodedKey = Convert.base64Url(keyEncodedData).toObject() as EncodedPrivateKey;

    const privateKey = {
      ...encodedKey,
      material: Convert.base64Url(encodedKey.material).toUint8Array()
    } as ManagedPrivateKey;

    return privateKey;
  }

  private encodeKey(privateKey: ManagedPrivateKey): Uint8Array {
    const encodedKey = {
      ...privateKey,
      material: Convert.uint8Array(privateKey.material).toBase64Url()
    } as EncodedPrivateKey;

    const keyBytes = Convert.object(encodedKey).toUint8Array();

    return keyBytes;
  }

  private async getAuthor(options: {
    agent: Web5ManagedAgent,
    context?: string
  }): Promise<string> {
    const { agent, context } = options;

    // If `context` is specified, DWN messages will be signed by this DID.
    if (context) return context;

    // If Agent has an agentDid, use it to sign DWN messages.
    if (agent.agentDid) return agent.agentDid;

    // If `context` and `agent.agentDid`are undefined, throw error.
    throw new Error(`PrivateKeyStoreDwn: Agent property 'agentDid' is undefined and no context was specified.`);
  }

  private async getKeyRecords(agent: Web5ManagedAgent, context?: string): Promise<DwnResponse> {
    // Determine which DID to use to author DWN messages.
    const authorDid = await this.getAuthor({ agent, context });

    const dwnResponse = await agent.dwnManager.processRequest({
      author         : authorDid,
      target         : authorDid,
      messageType    : 'RecordsQuery',
      messageOptions : {
        filter: { ...this._keyRecordProperties }
      }
    });

    return dwnResponse;
  }
}

/**
 * An implementation of `ManagedKeyStore` that stores private key
 * material in memory.
 *
 * An instance of this class can be used by an implementation of
 * `KeyManagementSystem`.
 */
export class PrivateKeyStoreMemory implements ManagedKeyStore<string, ManagedPrivateKey> {
  /**
   * A private field that contains the Map used as the in-memory key-value store.
   */
  private store: Map<string, ManagedPrivateKey> = new Map();

  async deleteKey({ id }: { id: string }): Promise<boolean> {
    if (this.store.has(id)) {
      // Key with given ID exists so proceed with delete.
      this.store.delete(id);
      return true;
    }

    // Key with given ID not present so delete operation not possible.
    return false;
  }

  async findKey(): Promise<ManagedPrivateKey | undefined> {
    throw new Error(`PrivateKeyStoreMemory: Method not implemented: 'findKey'`);
  }

  async getKey({ id }: { id: string }): Promise<ManagedPrivateKey | undefined> {
    return this.store.get(id);
  }

  async importKey({ key }: { key: Omit<ManagedPrivateKey, 'id'> }): Promise<string> {
    if (!key.material) throw new TypeError(`Required parameter missing: 'material'`);
    if (!key.type) throw new TypeError(`Required parameter missing: 'type'`);

    // Make a deep copy of the key so that the object stored does not share the same references as the input key.
    // The private key material is transferred to the new object, making the original obj.material unusable.
    const clonedKey = structuredClone(key, { transfer: [key.material.buffer] }) as ManagedPrivateKey;

    clonedKey.id = cryptoUtils.randomUuid();
    this.store.set(clonedKey.id, clonedKey);

    return clonedKey.id;
  }

  async listKeys(): Promise<ManagedPrivateKey[]> {
    return Array.from(this.store.values());
  }

  async updateKey(): Promise<boolean> {
    throw new Error(`PrivateKeyStoreMemory: Method not implemented: 'updateKey'`);
  }
}