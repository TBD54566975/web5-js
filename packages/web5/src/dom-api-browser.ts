
let Web5;
let dwnCache = {};
let dwnCacheTimeout = 60 * 60 * 1000 * 6;
const attributes = ['src', 'href', 'data'];
const splitDRL = /^(.*?)\/(.*)$/;

function detectAttributes(element){
  const target = element.target || element;
  const attribute = attributes.find(attr => target?.[attr]?.startsWith('did:') ? attr : null);
  if (attribute) replaceDrl(attribute, target);
}

async function replaceDrl(attribute, element){
  const [_, did, path] = element[attribute]?.split(splitDRL) || [];
  if (did && path) {
    let urls = [];
    const cacheEntry = dwnCache[did];
    if (cacheEntry && new Date().getTime() - dwnCacheTimeout > cacheEntry.timestamp) {
      urls = cacheEntry.urls;
    }
    else {
      try {
        const response = await Web5.did.resolve(did);
        response?.didDocument?.service?.forEach(service => {
          if (service.type === 'DecentralizedWebNode') {
            const nodes = service?.serviceEndpoint?.nodes;
            if (nodes) {
              urls.push(...nodes.filter(url => url.match(/^(http|https):/)));
            }
          }
        });
        dwnCache[did] = {
          urls,
          timestamp: new Date().getTime()
        };
      }
      catch (e) {
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
    }
    else {
      element.dispatchEvent(new CustomEvent('unresolvable', {
        detail: {
          did,
          message: 'No DWeb Node service entries found'
        }
      }));
    }
  }
}

function parseDom () {
  const elements = document.querySelectorAll('[' + attributes.join('], [') + ']');
  for (const element of elements) {
    detectAttributes(element);
  }
}

export function activateDomFeatures(web5){
  Web5 = web5;
  addEventListener('error', detectAttributes, true);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => parseDom);
  }
  else parseDom();
}

export function deactivateDomFeatures(){
  removeEventListener('error', detectAttributes);
}

