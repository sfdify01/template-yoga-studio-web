// Simple in-memory cache for Instagram posts

interface CacheEntry<T> {
  data: T;
  fetchedAt: number;
  expiresAt: number;
}

class InstagramCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private defaultTTL = 10 * 60 * 1000; // 10 minutes

  set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
    const now = Date.now();
    this.cache.set(key, {
      data,
      fetchedAt: now,
      expiresAt: now + ttl,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    const now = Date.now();
    
    // Check if expired
    if (now > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    const now = Date.now();
    
    if (now > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  clear(): void {
    this.cache.clear();
  }

  // Get stale data (for stale-while-revalidate pattern)
  getStale<T>(key: string): T | null {
    const entry = this.cache.get(key);
    return entry ? entry.data as T : null;
  }
}

// Singleton instance
export const instagramCache = new InstagramCache();
