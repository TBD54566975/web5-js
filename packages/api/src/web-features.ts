/*
  This file is run in dual environments to make installation of the Service Worker code easier.
  Be mindful that code placed in any open excution space may be evaluated multiple times in different contexts,
  so take care to gate additions to only activate code in the right env, such as a Service Worker scope or page window.
*/

import { UniversalResolver, DidDht, DidWeb } from '@web5/dids';

declare const ServiceWorkerGlobalScope: any;

const DidResolver = new UniversalResolver({ didResolvers: [DidDht, DidWeb] });
const didUrlRegex = /^https?:\/\/dweb\/([^/]+)\/?(.*)?$/;
const httpToHttpsRegex = /^http:/;
const trailingSlashRegex = /\/$/;

async function getDwnEndpoints(did) {
  const { didDocument } = await DidResolver.resolve(did);
  let endpoints = didDocument?.service?.find(service => service.type === 'DecentralizedWebNode')?.serviceEndpoint;
  return (Array.isArray(endpoints) ? endpoints : [endpoints]).filter(url => url.startsWith('http'));
}

async function handleEvent(event, did, path, options){
  const drl = event.request.url.replace(httpToHttpsRegex, 'https:').replace(trailingSlashRegex, '');
  const responseCache = await caches.open('drl');
  const cachedResponse = await responseCache.match(drl);
  if (cachedResponse) {
    if (!navigator.onLine) return cachedResponse;
    const match = await options?.onCacheCheck(event, drl);
    if (match) {
      const cacheTime = cachedResponse.headers.get('dwn-cache-time');
      if (cacheTime && Date.now() < Number(cacheTime) + (Number(match.ttl) || 0)) {
        return cachedResponse;
      }
    }
  }
  try {
    if (!path) {
      const response = await DidResolver.resolve(did);
      return new Response(JSON.stringify(response), {
        status  : 200,
        headers : {
          'Content-Type': 'application/json'
        }
      });
    }
    else return await fetchResource(event, did, drl, path, responseCache, options);
  }
  catch(error){
    if (error instanceof Response) {
      return error;
    }
    console.log(`Error in DID URL fetch: ${error}`);
    return new Response('DID URL fetch error', { status: 500 });
  }
}

async function fetchResource(event, did, drl, path, responseCache, options) {
  const endpoints = await getDwnEndpoints(did);
  if (!endpoints?.length) {
    throw new Response('DWeb Node resolution failed: no valid endpoints found.', { status: 530 });
  }
  for (const endpoint of endpoints) {
    try {
      const url = `${endpoint.replace(trailingSlashRegex, '')}/${did}/${path}`;
      const response = await fetch(url, { headers: event.request.headers });
      if (response.ok) {
        const match = await options?.onCacheCheck(event, drl);
        if (match) {
          cacheResponse(drl, url, response, responseCache);
        }
        return response;
      }
      console.log(`DWN endpoint error: ${response.status}`);
      return new Response('DWeb Node request failed', { status: response.status });
    }
    catch (error) {
      console.log(`DWN endpoint error: ${error}`);
      return new Response('DWeb Node request failed: ' + error, { status: 500 });
    }
  }
}

async function cacheResponse(drl, url, response, cache){
  const clonedResponse = response.clone();
  const headers = new Headers(clonedResponse.headers);
  headers.append('dwn-cache-time', Date.now().toString());
  headers.append('dwn-composed-url', url);
  const modifiedResponse = new Response(clonedResponse.body, { headers });
  cache.put(drl, modifiedResponse);
}

/* Service Worker-based features */

export function installWorker(options: any = {}): void {
  const workerSelf = self as any;
  try {
    if (typeof ServiceWorkerGlobalScope !== 'undefined' && workerSelf instanceof ServiceWorkerGlobalScope) {
      workerSelf.skipWaiting();
      workerSelf.addEventListener('activate', event => {
        // Claim clients to make the service worker take control immediately
        event.waitUntil(workerSelf.clients.claim());
      });
      workerSelf.addEventListener('fetch', event => {
        const match = event.request.url.match(didUrlRegex);
        if (match) {
          event.respondWith(handleEvent(event, match[1], match[2], options));
        }
      });
    }
    else if (globalThis?.navigator?.serviceWorker) {
      // @ts-ignore
      const workerUrl =  globalThis.document ? document?.currentScript?.src : import.meta?.url;
      navigator.serviceWorker.register(options.path || workerUrl, { type: 'module' }).catch(error => {
        console.error('DWeb networking feature installation failed: ', error);
      });
    }
    else {
      throw new Error('DWeb networking features are not available for install in this environment');
    }
  } catch (error) {
    console.error('Error in installing networking features:', error);
  }
}

/* DOM Environment Features */

const activeFeatures = {} as any;
const loaderStyles = `
  .drl-loading-overlay {
    position: fixed;
    inset: 0;
    display: flex;
    flex-wrap: wrap;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    color: #fff;
    background: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(15px);
    -webkit-backdrop-filter: blur(15px);
    z-index: 1000000;
  }

  .drl-loading-overlay > div {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .drl-loading-spinner {
    display: flex;
    align-items: center;
    justify-content: center;
  }

    .drl-loading-spinner div {
      position: relative;
      width: 2em;
      height: 2em;
      margin: 0.1em 0.25em 0 0;
    }
    .drl-loading-spinner div::after,
    .drl-loading-spinner div::before {
      content: '';  
      box-sizing: border-box;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      border: 0.1em solid #FFF;
      position: absolute;
      left: 0;
      top: 0;
      opacity: 0;
      animation: drl-loading-spinner 2s linear infinite;
    }
    .drl-loading-spinner div::after {
      animation-delay: 1s;
    }

  .drl-loading-overlay span {
    --text-opacity: 2;
    display: flex;
    align-items: center;
    margin: 2em auto 0;
    padding: 0.2em 0.75em 0.25em;
    text-align: center;
    border-radius: 5em;
    background: rgba(255 255 255 / 8%);
    opacity: 0.8;
    transition: opacity 0.3s ease;
    cursor: pointer;
  }

    .drl-loading-overlay span:focus {
      opacity: 1;
    }

    .drl-loading-overlay span:hover {
      opacity: 1;
    }

    .drl-loading-overlay span::before {
      content: "✕ ";
      margin: 0 0.4em 0 0;
      color: red;
      font-size: 65%;
      font-weight: bold;
    }

    .drl-loading-overlay span::after {
      content: "stop";
      display: block;
      font-size: 60%;
      line-height: 0;
      color: rgba(255 255 255 / 60%);
    }

    .drl-loading-overlay.new-tab-overlay span::after {
      content: "close";
    }
  
  @keyframes drl-loading-spinner {
    0% {
      transform: scale(0);
      opacity: 1;
    }
    100% {
      transform: scale(1);
      opacity: 0;
    }
  }
`;
const tabContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Loading DRL...</title>
  <style>
    html, body {
      background-color: #151518;
      height: 100%;
      margin: 0;
      padding: 0;
      font-family: Arial, sans-serif;
      text-align: center;
    }
    ${loaderStyles}
  </style>
</head>
<body>
  <div class="drl-loading-overlay new-tab-overlay">
    <div class="drl-loading-spinner">
      <div></div>
      Loading DRL
    </div>
    <span onclick="window.close()" tabindex="0"></span>
  </div>
</body>
</html>
`;

let elementsInjected = false;
function injectElements() {
  if (elementsInjected) return;
  const style = document.createElement('style');
  style.innerHTML = `
    ${loaderStyles}

    .drl-loading-overlay {
      opacity: 0;
      transition: opacity 0.3s ease;
      pointer-events: none;
    }

    :root[drl-link-loading] .drl-loading-overlay {
      opacity: 1;
      pointer-events: all;
    }
  `;
  document.head.append(style);

  let overlay = document.createElement('div');
  overlay.classList.add('drl-loading-overlay');
  overlay.innerHTML = `
    <div class="drl-loading-spinner">
      <div></div>
      Loading DRL
    </div> 
    <span tabindex="0"></span>
  `;
  overlay.lastElementChild.addEventListener('click', cancelNavigation);
  document.body.prepend(overlay);
  elementsInjected = true;
}

function cancelNavigation(){
  document.documentElement.removeAttribute('drl-link-loading');
  activeNavigation = null;
}

let activeNavigation;
function addLinkFeatures(){
  if (!activeFeatures.links) {
    document.addEventListener('click', async (event: any) => {
      let anchor = event.target.closest('a');
      if (anchor) {
        let href = anchor.href;
        const match = href.match(didUrlRegex);
        if (match) {
          let did = match[1];
          let path = match[2];
          const openAsTab = anchor.target === '_blank';
          event.preventDefault();
          try {
            let tab;
            if (openAsTab) {
              tab = window.open('', '_blank');
              tab.document.write(tabContent);
            }
            else {
              activeNavigation = path;
              setTimeout(() => document.documentElement.setAttribute('drl-link-loading', ''), 50);
            }
            const endpoints = await getDwnEndpoints(did);
            if (!endpoints.length) throw null;
            let url = `${endpoints[0].replace(trailingSlashRegex, '')}/${did}/${path}`;
            if (openAsTab) {
              if (!tab.closed) tab.location.href = url;
            }
            else if (activeNavigation === path) {
              window.location.href = url;
            }
          }
          catch(e) {
            if (activeNavigation === path) {
              cancelNavigation();
            }
            throw new Error(`DID endpoint resolution failed for the DRL: ${href}`);
          }
        }
      }
    });

    let contextMenuTarget;
    async function resetContextMenuTarget(e?: any){
      if (e?.type === 'pointerup') {
        await new Promise(r => requestAnimationFrame(r));
      }
      if (contextMenuTarget) {
        contextMenuTarget.src = contextMenuTarget.__src__;
        delete contextMenuTarget.__src__;
        contextMenuTarget = null;
      }
    }
    document.addEventListener('pointercancel', resetContextMenuTarget);
    document.addEventListener('pointerdown', async (event: any) => {
      const target = event.composedPath()[0];
      if ((event.pointerType === 'mouse' && event.button === 2) ||
          (event.pointerType === 'touch' && event.isPrimary)) {
        resetContextMenuTarget();
        if (target && target?.src?.match(didUrlRegex)) {
          contextMenuTarget = target;
          target.__src__ = target.src;
          const drl = target.src.replace(httpToHttpsRegex, 'https:').replace(trailingSlashRegex, '');
          const responseCache = await caches.open('drl');
          const response = await responseCache.match(drl);
          const url = response.headers.get('dwn-composed-url');
          if (url) target.src = url;
          target.addEventListener('pointerup', resetContextMenuTarget, { once: true });
        }
      }
      else if (target === contextMenuTarget) {
        resetContextMenuTarget();
      }
    });

    activeFeatures.links = true;
  }
}

export function activateFeatures(options: any = {}){
  if (typeof window !== 'undefined' && typeof window.document !== 'undefined') {
    if (document.readyState !== 'loading') injectElements();
    else {
      document.addEventListener('DOMContentLoaded', injectElements, { once: true });
    }
    if (options.links || options.allFeatures) addLinkFeatures();
  }
}