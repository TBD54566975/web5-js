import { UniversalResolver, DidDht, DidWeb } from '@web5/dids';

const workerSelf = self as any;
const DidResolver = new UniversalResolver({ didResolvers: [DidDht, DidWeb] });
const didUrlRegex = /^https?:\/\/dweb\/(([^/]+)\/.*)?$/;
const httpToHttpsRegex = /^http:/;
const trailingSlashRegex = /\/$/;

workerSelf.addEventListener('fetch', event => {
  const match = event.request.url.match(didUrlRegex);
  if (match) {
    event.respondWith((async () => {
      const normalizedUrl = event.request.url.replace(httpToHttpsRegex, 'https:').replace(trailingSlashRegex, '');
      const cachedResponse = await caches.open('drl').then(cache => cache.match(normalizedUrl));
      return cachedResponse || handleEvent(event, match[2], match[1]);
    })());
  }
});

async function handleEvent(event, did, route){
  try {
    const result = await DidResolver.resolve(did);
    return await fetchResource(event, result.didDocument, route);
  }
  catch(error){
    if (error instanceof Response) {
      return error;
    }
    console.log(`Error in DID URL fetch: ${error}`);
    return new Response('DID URL fetch error', { status: 500 });
  }
}

async function fetchResource(event, ddo, route) {
  let endpoints = ddo?.service?.find(service => service.type === 'DecentralizedWebNode')?.serviceEndpoint;
  endpoints = (Array.isArray(endpoints) ? endpoints : [endpoints]).filter(url => url.startsWith('http'));
  if (!endpoints?.length) {
    throw new Response('DWeb Node resolution failed: no valid endpoints found.', { status: 530 });
  }

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${endpoint.replace(trailingSlashRegex, '')}/${route}`, { headers: event.request.headers });
      if (response.ok) {
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