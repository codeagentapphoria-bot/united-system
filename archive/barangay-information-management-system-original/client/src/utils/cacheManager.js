// Frontend Cache Manager
// Centralized cache management for clearing all frontend caches

// Global cache stores
const globalCaches = new Set();

// Register a cache store
export const registerCache = (cacheStore, name) => {
  globalCaches.add({ store: cacheStore, name });
};

// Clear all registered caches
export const clearAllCaches = () => {

  globalCaches.forEach(({ store, name }) => {
    try {
      if (store && typeof store.clear === 'function') {
        store.clear();
      } else if (store && typeof store.size !== 'undefined') {
        // Handle Map-like objects
        store.clear();
      }
    } catch (error) {
      // Error clearing cache - continue with other caches
    }
  });

  // Also clear localStorage cache-related items
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('cache') || key.includes('data') || key.includes('api'))) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
  } catch (error) {
    // Error clearing localStorage - continue
  }

};

// Clear specific cache patterns
export const clearCachePattern = (pattern) => {

  globalCaches.forEach(({ store, name }) => {
    try {
      if (store && typeof store.forEach === 'function') {
        const keysToDelete = [];
        store.forEach((value, key) => {
          if (key.includes(pattern)) {
            keysToDelete.push(key);
          }
        });

        keysToDelete.forEach(key => store.delete(key));
      }
    } catch (error) {
      // Error clearing pattern - continue with other caches
    }
  });
};

// Force refresh all data
export const forceRefreshAllData = () => {

  // Clear all caches
  clearAllCaches();

  // Trigger page reload to ensure fresh data
  setTimeout(() => {
    window.location.reload();
  }, 100);
};

// Export cache clearing functions for use in components
export const cacheManager = {
  clearAll: clearAllCaches,
  clearPattern: clearCachePattern,
  forceRefresh: forceRefreshAllData,
  register: registerCache
};
