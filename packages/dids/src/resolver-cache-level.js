var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import ms from 'ms';
import { Level } from 'level';
/**
 * Naive level-based cache for did resolution results. It just so happens that level aggressively keeps as much as it
 * can in memory when possible while also writing to the filesystem (in node runtime) and indexedDB (in browser runtime).
 * the persistent aspect is especially useful across page refreshes.
 */
export class DidResolverCacheLevel {
    constructor(options = {}) {
        let { location, ttl } = options;
        location !== null && location !== void 0 ? location : (location = DidResolverCacheLevel.defaultOptions.location);
        ttl !== null && ttl !== void 0 ? ttl : (ttl = DidResolverCacheLevel.defaultOptions.ttl);
        this.cache = new Level(location);
        this.ttl = ms(ttl);
    }
    get(did) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const str = yield this.cache.get(did);
                const cacheWrapper = JSON.parse(str);
                if (Date.now() >= cacheWrapper.ttlMillis) {
                    // defer deletion to be called in the next tick of the js event loop
                    this.cache.nextTick(() => this.cache.del(did));
                    return;
                }
                else {
                    return cacheWrapper.value;
                }
            }
            catch (error) {
                // Don't throw when a key wasn't found.
                if (error.code === 'LEVEL_NOT_FOUND') {
                    return;
                }
                throw error;
            }
        });
    }
    set(did, value) {
        const cacheWrapper = { ttlMillis: Date.now() + this.ttl, value };
        const str = JSON.stringify(cacheWrapper);
        return this.cache.put(did, str);
    }
    delete(did) {
        return this.cache.del(did);
    }
    clear() {
        return this.cache.clear();
    }
    close() {
        return this.cache.close();
    }
}
DidResolverCacheLevel.defaultOptions = {
    location: 'DATA/AGENT/DID_RESOLVERCACHE',
    ttl: '15m'
};
//# sourceMappingURL=resolver-cache-level.js.map