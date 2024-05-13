
export function installNetworkingFeatures(path){
  if (typeof ServiceWorkerGlobalScope !== 'undefined' && self instanceof ServiceWorkerGlobalScope) {
    import('./service-worker.js')
  }
  else if (globalThis?.navigator?.serviceWorker) {
    if (path) navigator.serviceWorker.register(path).catch(error => {
      console.error('DWeb networking feature installation failed: ', error);
    });
  }
  else throw "DWeb networking features are not avaialable for install in this environment"
}