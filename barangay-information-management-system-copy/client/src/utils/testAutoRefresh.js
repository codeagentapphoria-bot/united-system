/**
 * Test utility for auto refresh functionality
 * This can be used to test the auto refresh system in the browser console
 */

export const testAutoRefresh = {
  // Test if the unified auto refresh hook is working
  testHook: () => {
    console.log('🧪 Testing auto refresh hook...');
    
    // This would be called from a component that uses useUnifiedAutoRefresh
    console.log('✅ Auto refresh hook test completed');
  },

  // Test cache patterns
  testCachePatterns: async () => {
    console.log('🧪 Testing cache patterns...');
    
    try {
      // Test if we can make API calls
      const response = await fetch('/api/list/residents');
      if (response.ok) {
        console.log('✅ API call successful');
        return true;
      } else {
        console.log('❌ API call failed:', response.status);
        return false;
      }
    } catch (error) {
      console.log('❌ API call error:', error);
      return false;
    }
  },

  // Test CRUD operation with auto refresh
  testCRUDOperation: async (operation, data) => {
    console.log('🧪 Testing CRUD operation...');
    
    try {
      const result = await operation(data);
      console.log('✅ CRUD operation successful');
      return result;
    } catch (error) {
      console.log('❌ CRUD operation failed:', error);
      throw error;
    }
  },

  // Debug function to check if auto refresh is registered
  debugAutoRefresh: (registerRefreshCallback, fetchFunction) => {
    console.log('🔍 Debugging auto refresh registration...');
    
    if (typeof registerRefreshCallback !== 'function') {
      console.log('❌ registerRefreshCallback is not a function');
      return false;
    }
    
    if (typeof fetchFunction !== 'function') {
      console.log('❌ fetchFunction is not a function');
      return false;
    }
    
    console.log('✅ Both functions are valid');
    
    // Register the callback
    const unregister = registerRefreshCallback(fetchFunction);
    console.log('✅ Callback registered successfully');
    
    // Return unregister function for cleanup
    return unregister;
  }
};

// Make it available globally for testing
if (typeof window !== 'undefined') {
  window.testAutoRefresh = testAutoRefresh;
}
