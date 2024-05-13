
declare const ServiceWorkerGlobalScope: any;

export function installNetworkingFeatures(path: string): void {
  // Assume `self` could be any type
  const workerSelf = self as any;

  try {
    if (typeof ServiceWorkerGlobalScope !== 'undefined' && workerSelf instanceof ServiceWorkerGlobalScope) {
      // Dynamically import service worker code only if we're in a Service Worker context
      import('./service-worker.js').catch(error => {
        console.error('Error loading service worker module:', error);
      });
    }
    else if (globalThis?.navigator?.serviceWorker) {
      // Register the service worker if `path` is provided and service workers are supported
      navigator.serviceWorker.register(path).catch(error => {
        console.error('DWeb networking feature installation failed: ', error);
      });
    }
    else {
      throw new Error("DWeb networking features are not available for install in this environment");
    }
  } catch (error) {
    console.error('Error in installing networking features:', error);
  }
}