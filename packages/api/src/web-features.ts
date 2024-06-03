import { UniversalResolver, DidDht, DidWeb } from '@web5/dids';

declare const ServiceWorkerGlobalScope: any;

export function installWorker(options: any = {}): void {
  const workerSelf = self as any;
  try {
    if (typeof ServiceWorkerGlobalScope !== 'undefined' && workerSelf instanceof ServiceWorkerGlobalScope) {
      // Activate Service Worker-specific functionality only if in a Service Worker context.

      const DidResolver = new UniversalResolver({ didResolvers: [DidDht, DidWeb] });
      const didUrlRegex = /^https?:\/\/dweb\/(([^/]+)\/.*)?$/;
      const httpToHttpsRegex = /^http:/;
      const trailingSlashRegex = /\/$/;

      workerSelf.skipWaiting();

      self.addEventListener('activate', (event: any) => {
        // Claim clients to make the service worker take control immediately
        event.waitUntil(workerSelf.clients.claim());
      });

      workerSelf.addEventListener('fetch', event => {
        const match = event.request.url.match(didUrlRegex);
        if (match) {
          event.respondWith(handleEvent(event, match[2], match[1]));
        }
      });

      async function handleEvent(event, did, route){
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
          const result = await DidResolver.resolve(did);
          return await fetchResource(event, result.didDocument, drl, route, responseCache);
        }
        catch(error){
          if (error instanceof Response) {
            return error;
          }
          console.log(`Error in DID URL fetch: ${error}`);
          return new Response('DID URL fetch error', { status: 500 });
        }
      }

      async function fetchResource(event, ddo, drl, route, responseCache) {
        let endpoints = ddo?.service?.find(service => service.type === 'DecentralizedWebNode')?.serviceEndpoint;
            endpoints = (Array.isArray(endpoints) ? endpoints : [endpoints]).filter(url => url.startsWith('http'));
        if (!endpoints?.length) {
          throw new Response('DWeb Node resolution failed: no valid endpoints found.', { status: 530 })
        }
      
        for (const endpoint of endpoints) {
          try {
            const url = `${endpoint.replace(trailingSlashRegex, '')}/${route}`;
            const response = await fetch(url, { headers: event.request.headers });     
            if (response.ok) { 
              const match = await options?.onCacheCheck(event, drl);
              if (match) {
                cacheResponse(drl, response, responseCache);
              }
              return response;
            }
            console.log(`DWN endpoint error: ${response.status}`);
            return new Response('DWeb Node request failed', { status: response.status }) 
          }
          catch (error) {
            console.log(`DWN endpoint error: ${error}`);
            return new Response('DWeb Node request failed: ' + error, { status: 500 }) 
          }
        }
      }

      async function cacheResponse(drl, response, cache){   
        const clonedResponse = response.clone();
        const headers = new Headers(clonedResponse.headers);
              headers.append('dwn-cache-time', Date.now().toString());
        const modifiedResponse = new Response(clonedResponse.body, { headers });
        cache.put(drl, modifiedResponse);
      }
    }
    else if (globalThis?.navigator?.serviceWorker) {
      const workerUrl =  globalThis.document ? (document?.currentScript as any)?.src : import.meta?.url;
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