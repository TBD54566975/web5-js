
let Web5, init, observer;
let dwnCache = {};
let dwnCacheTimeout = 60 * 60 * 1000 * 6;
const attributes = ['src', 'href', 'data'];
const splitDRL = /^(.*?)\/(.*)$/;

function detectMutation(element){
  const attribute = attributes.find(attr => {
    return element?.[attr]?.startsWith('did:') ? attr : null;
  });
  if (attribute) handleMutation(attribute, element);
}

async function handleMutation(attribute, element){
  const [_, did, path] = element[attribute]?.split(splitDRL) || [];
  if (did && path) {
    let urls = [];
    const cacheEntry = dwnCache[did];
    if (cacheEntry && new Date().getTime() - dwnCacheTimeout > cacheEntry.timestamp) {
      urls = cacheEntry.urls;
    }
    else {
      const response = await Web5.did.resolve(did);
      response?.didDocument?.service?.forEach(service => {
        if (service.type === 'DecentralizedWebNode') {
          const nodes = service?.serviceEndpoint?.nodes;
          if (nodes) {
            urls.push(...nodes.filter(url => url.match(/^(http|https):/)))
          }
        }
      })
      dwnCache[did] = {
        urls,
        timestamp: new Date().getTime()
      }
    }
    if (urls.length) {
      element[attribute] = `${urls[0].replace(/\/$/, '')}/${did}/${path}`;
    }
  }
}

function parseExistingDom () {
  const elements = document.querySelectorAll('[' + attributes.join('], [') + ']');
  for (const element of elements) {
    detectMutation(element);
  }
}

function observeMutations (mutationsList) {
  for (const mutation of mutationsList) {
    if (mutation?.addedNodes?.length) {
      for (let node of mutation.addedNodes) detectMutation(node);
    }
    else if (mutation.type === 'attributes') {
      detectMutation(mutation.target);
    }
  }
}

export function watchDom(web5){
  Web5 = web5;
  if (!init) {
    document.addEventListener('DOMContentLoaded', e => parseExistingDom);
    observer = new MutationObserver(observeMutations);
    init = true;
  }  
  if (document.readyState !== 'loading') parseExistingDom();
  observer.observe(document, {
    childList       : true,
    subtree         : true,
    attributes      : true,
    attributeFilter : attributes,
  }); 
}

export function unwatchDom(){
  if (observer) {
    observer.disconnect();
  }
}

