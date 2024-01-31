export class SendCache {
  private static cache = new Map<string, Set<string>>();
  static sendCacheLimit = 100;

  static set(id: string, target: string): void {
    let targetCache = SendCache.cache.get(id) || new Set();
    SendCache.cache.delete(id);
    SendCache.cache.set(id, targetCache);
    if (this.cache.size > SendCache.sendCacheLimit) {
      const firstRecord = SendCache.cache.keys().next().value;
      SendCache.cache.delete(firstRecord);
    }
    targetCache.delete(target);
    targetCache.add(target);
    if (targetCache.size > SendCache.sendCacheLimit) {
      const firstTarget = targetCache.keys().next().value;
      targetCache.delete(firstTarget);
    }
  }

  static check(id: string, target: string): boolean {
    let targetCache = SendCache.cache.get(id);
    return targetCache ? targetCache.has(target) : false;
  }
}