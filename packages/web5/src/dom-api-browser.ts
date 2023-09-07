import type { DidResolutionResult, ServiceEndpoint } from '@tbd54566975/dids';

let Web5: any;
let dwnCache: { [key: string]: { urls: string[], timestamp: number } } = {};
let dwnCacheTimeout = 60 * 60 * 1000 * 6;
const attributes = ['src', 'href', 'data'];
const splitDRL = /^(.*?)\/(.*)$/;

export function activateDomFeatures(web5: any) {
  Web5 = web5;
  addEventListener('error', detectAttributes, true);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => parseDom);
  } else {
    parseDom();
  }
}

export function deactivateDomFeatures() {
  removeEventListener('error', detectAttributes);
}

function detectAttributes(element: any) {
  const target = element.target || element;
  const attribute = attributes.find(attr => target?.[attr]?.startsWith('did:') ? attr : null);
  if (attribute) {
    replaceDrl(attribute, target);
  }
}

function parseDom() {
  const elements = document.querySelectorAll('[' + attributes.join('], [') + ']');

  elements.forEach((element) => {
    detectAttributes(element);
  });
}

async function replaceDrl(attribute: string, element: any) {
  const [_, did, path] = element[attribute]?.split(splitDRL) || [];

  if (did && path) {
    let urls: string[] = [];
    const cacheEntry = dwnCache[did];

    if (cacheEntry && new Date().getTime() - dwnCacheTimeout > cacheEntry.timestamp) {
      urls = cacheEntry.urls;
    } else {
      try {
        const response: DidResolutionResult = await Web5.did.resolve(did);
        response?.didDocument?.service?.forEach((service: ServiceEndpoint) => {
          if (typeof service?.serviceEndpoint !== 'string') {
            const nodes = service?.serviceEndpoint?.nodes;
            if ('nodes' in service.serviceEndpoint) {
              urls.push(...nodes.filter((url: string) => url.match(/^(http|https):/)));
            }
          }
        });

        dwnCache[did] = {
          urls,
          timestamp: new Date().getTime()
        };
      } catch (error) {
        element.dispatchEvent(new CustomEvent('unresolvable', {
          detail: {
            did,
            message: 'DID resolution failed'
          }
        }));
      }
    }

    if (urls.length) {
      element[attribute] = `${urls[0].replace(/\/$/, '')}/${did}/${path}`;
    } else {
      element.dispatchEvent(new CustomEvent('unresolvable', {
        detail: {
          did,
          message: 'No DWeb Node service entries found'
        }
      }));
    }
  }
}
