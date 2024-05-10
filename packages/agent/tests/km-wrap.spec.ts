import { KeyManager } from '../src/key-manager.js';
import { LocalKms } from '../src/kms-local.js';
import { managedToCryptoKey } from '../src/utils.js';
import { CryptoManager } from '../src/types/managed-key.js';



describe('KeyManager', () => {
  // @ts-ignore
  const mockAgent: Web5ManagedAgent = {};
  const memoryKms = new LocalKms({ kmsName: 'memory', agent: mockAgent });
  const otherKms = new LocalKms({ kmsName: 'other', agent: mockAgent });
  const km = new KeyManager({ kms: { memory: memoryKms, other: otherKms }, agent: mockAgent });

  it('approach 1', async () => {
    function createKeyManagerWrapper(keyManager: KeyManager, kms: string) {
      return new Proxy(keyManager, {
        get(target, propKey, receiver) {
          const origMethod = target[propKey as keyof KeyManager];
          if (typeof origMethod === 'function') {
            return (...args: any[]) => {
              // Bind the original method to the original `keyManager` instance
              const boundMethod = origMethod.bind(target);
              // Check if the first argument is an object to inject the kms value
              if (args.length > 0 && typeof args[0] === 'object' && args[0] !== null && !('kms' in args[0])) {
                args[0] = { ...args[0], kms };  // Inject the kms value into the first argument
              }
              return boundMethod(args[0]);  // Call the method with the modified arguments
            };
          }
          return Reflect.get(target, propKey, receiver);
        },
      });
    }

    const crypto = createKeyManagerWrapper(km, 'memory');

    const otherPartyKeyPair = await crypto.generateKey({
      algorithm   : { name: 'ECDH', namedCurve: 'X25519' },
      extractable : false,
      keyUsages   : ['deriveBits']
    });

    const ownKeyPair = await crypto.generateKey({
      algorithm   : { name: 'ECDH', namedCurve: 'X25519' },
      extractable : false,
      keyUsages   : ['deriveBits']
    });

    const otherPartyPublicCryptoKey = managedToCryptoKey({ key: otherPartyKeyPair.publicKey});

    const sharedSecret = await crypto.deriveBits({
      algorithm  : { name: 'ECDH', publicKey: otherPartyPublicCryptoKey },
      baseKeyRef : ownKeyPair.privateKey.id
    });

    console.log(sharedSecret);
  });

  it('approach 2', async () => {
    const crypto = {
      decrypt     : (options) => km.decrypt(options),
      deriveBits  : (options) => km.deriveBits(options),
      encrypt     : (options) => km.encrypt(options),
      generateKey : (options) => km.generateKey({ ...options, kms: 'memory' }),
      importKey   : (options) => ('privateKey' in options) ? km.importKey(options) : km.importKey(options),
      sign        : (options) => km.sign(options),
      verify      : (options) => km.verify(options),
    } as CryptoManager;

    const otherPartyKeyPair = await crypto.generateKey({
      algorithm   : { name: 'ECDH', namedCurve: 'X25519' },
      extractable : false,
      keyUsages   : ['deriveBits']
    });

    const ownKeyPair = await crypto.generateKey({
      algorithm   : { name: 'ECDH', namedCurve: 'X25519' },
      extractable : false,
      keyUsages   : ['deriveBits']
    });

    const otherPartyPublicCryptoKey = managedToCryptoKey({ key: otherPartyKeyPair.publicKey});

    const sharedSecret = await crypto.deriveBits({
      algorithm  : { name: 'ECDH', publicKey: otherPartyPublicCryptoKey },
      baseKeyRef : ownKeyPair.privateKey.id
    });

    console.log(sharedSecret);
  });

  it('approach 3', async () => {
    const wrapWithMemoryKms = (keyManager: KeyManager) => {
      return new Proxy(keyManager, {
        get(target, prop: string) {
          const originalMethod = (target as any)[prop];
          if (typeof originalMethod === 'function') {
            return (...args: any[]) => {
              if (args[0] && typeof args[0] === 'object') {
                args[0].kms = 'memory'; // Force KMS to 'memory'
              }
              return originalMethod.apply(target, args);
            };
          }
          return originalMethod;
        }
      });
    };

    const crypto = wrapWithMemoryKms(km);

    const otherPartyKeyPair = await crypto.generateKey({
      algorithm   : { name: 'ECDH', namedCurve: 'X25519' },
      extractable : false,
      keyUsages   : ['deriveBits']
    });

    const ownKeyPair = await crypto.generateKey({
      algorithm   : { name: 'ECDH', namedCurve: 'X25519' },
      extractable : false,
      keyUsages   : ['deriveBits']
    });

    const otherPartyPublicCryptoKey = managedToCryptoKey({ key: otherPartyKeyPair.publicKey});

    const sharedSecret = await crypto.deriveBits({
      algorithm  : { name: 'ECDH', publicKey: otherPartyPublicCryptoKey },
      baseKeyRef : ownKeyPair.privateKey.id
    });

    console.log(sharedSecret);
  });
});