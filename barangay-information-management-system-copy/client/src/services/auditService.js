import api from "@/utils/api";
import { registerCache } from "@/utils/cacheManager";

// Cache for API responses
const apiCache = new Map();
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

// Request deduplication
const pendingRequests = new Map();

// Register cache with global cache manager
registerCache(apiCache, 'audit-service');
registerCache(pendingRequests, 'audit-pending-requests');

// Helper function to generate cache key
const getCacheKey = (endpoint, params = {}) => {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');
  return `${endpoint}?${sortedParams}`;
};

// Helper function to check if cache is valid
const isCacheValid = (timestamp) => {
  return Date.now() - timestamp < CACHE_DURATION;
};

// Optimized API call with caching and deduplication
const cachedApiCall = async (endpoint, params = {}) => {
  const cacheKey = getCacheKey(endpoint, params);
  
  // Check cache first
  const cached = apiCache.get(cacheKey);
  if (cached && isCacheValid(cached.timestamp)) {
    return cached.data;
  }

  // Check if request is already pending
  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey);
  }

  // Make new request
  const requestPromise = api.get(endpoint, { params })
    .then(response => {
      // Cache the response
      apiCache.set(cacheKey, {
        data: response.data,
        timestamp: Date.now()
      });
      pendingRequests.delete(cacheKey);
      return response.data;
    })
    .catch(error => {
      pendingRequests.delete(cacheKey);
      throw error;
    });

  pendingRequests.set(cacheKey, requestPromise);
  return requestPromise;
};

class AuditService {
  /**
   * Get recent activities for the current user with caching
   * @param {string} userType - 'municipality' or 'barangay'
   * @param {string} targetId - User's target ID
   * @param {number} limit - Number of activities to fetch
   * @param {boolean} forceRefresh - Force refresh cache
   * @returns {Promise<Array>} Array of transformed activities
   */
  static async getRecentActivities(userType, targetId, limit = 10, forceRefresh = false) {
    try {
      let endpoint, params;
      
      if (userType === "municipality") {
        // For municipality users, get all logs
        endpoint = "/logs/all-logs";
        params = { limit };
      } else {
        // For barangay users, get barangay-specific logs
        endpoint = "/logs/barangay-logs";
        params = { barangayId: targetId, limit };
      }
      
      const response = forceRefresh ? 
        await api.get(endpoint, { params }) :
        await cachedApiCall(endpoint, params);
      
      // Handle different response structures
      const data = response.data;
      if (Array.isArray(data)) {
        return data;
      } else if (data && Array.isArray(data.data)) {
        return data.data;
      } else if (data && Array.isArray(data.logs)) {
        return data.logs;
      } else {
        if (process.env.NODE_ENV === 'development') {
          console.warn("Unexpected API response structure:", data);
        }
        return [];
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Error fetching recent activities:", error);
      }

      // If audit system is not available, return mock data
      if (error.response?.status === 404 || error.message.includes('function')) {
        if (process.env.NODE_ENV === 'development') {
          console.warn("Audit system not available, returning mock data");
        }
        return this.getMockActivities(userType, limit);
      }

      throw error;
    }
  }

  /**
   * Clear cache for specific endpoint or all cache
   * @param {string} endpoint - Optional endpoint to clear specific cache
   */
  static clearCache(endpoint = null) {
    if (endpoint) {
      // Clear specific endpoint cache
      for (const [key] of apiCache) {
        if (key.startsWith(endpoint)) {
          apiCache.delete(key);
        }
      }
    } else {
      // Clear all cache
      apiCache.clear();
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  static getCacheStats() {
    return {
      size: apiCache.size,
      pendingRequests: pendingRequests.size,
      cacheKeys: Array.from(apiCache.keys())
    };
  }

  /**
   * Get mock activities when audit system is not available
   * @param {string} userType - 'municipality' or 'barangay'
   * @param {number} limit - Number of activities to generate
   * @returns {Array} Mock activities
   */
  static getMockActivities(userType, limit = 10) {
    const mockActivities = [
      {
        id: 1,
        table_name: "residents",
        operation: "INSERT",
        record_id: "12345",
        old_values: null,
        new_values: { full_name: "Juan Dela Cruz", first_name: "Juan" },
        changed_by: 1,
        user_name: "Admin User",
        changed_at: new Date(Date.now() - 5 * 60 * 1000).toISOString() // 5 minutes ago
      },
      {
        id: 2,
        table_name: "households",
        operation: "UPDATE",
        record_id: "67890",
        old_values: { house_number: "123" },
        new_values: { house_number: "124" },
        changed_by: 1,
        user_name: "Admin User",
        changed_at: new Date(Date.now() - 15 * 60 * 1000).toISOString() // 15 minutes ago
      },
      {
        id: 3,
        table_name: "requests",
        operation: "INSERT",
        record_id: "11111",
        old_values: null,
        new_values: { request_type: "certificate", status: "pending" },
        changed_by: 1,
        user_name: "Admin User",
        changed_at: new Date(Date.now() - 30 * 60 * 1000).toISOString() // 30 minutes ago
      },
      {
        id: 4,
        table_name: "pets",
        operation: "INSERT",
        record_id: "22222",
        old_values: null,
        new_values: { pet_name: "Buddy", species: "Dog" },
        changed_by: 1,
        user_name: "Admin User",
        changed_at: new Date(Date.now() - 60 * 60 * 1000).toISOString() // 1 hour ago
      },
      {
        id: 5,
        table_name: "archives",
        operation: "UPDATE",
        record_id: "33333",
        old_values: { status: "pending" },
        new_values: { status: "completed" },
        changed_by: 1,
        user_name: "Admin User",
        changed_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 hours ago
      }
    ];

    // Add more mock activities if needed
    while (mockActivities.length < limit) {
      const randomActivity = this.generateRandomMockActivity();
      mockActivities.push(randomActivity);
    }

    return mockActivities.slice(0, limit);
  }

  /**
   * Generate a random mock activity
   * @returns {Object} Random mock activity
   */
  static generateRandomMockActivity() {
    const tables = ["residents", "households", "requests", "pets", "archives", "inventories"];
    const operations = ["INSERT", "UPDATE", "DELETE"];
    const table = tables[Math.floor(Math.random() * tables.length)];
    const operation = operations[Math.floor(Math.random() * operations.length)];
    
    const timeOffset = Math.floor(Math.random() * 24 * 60 * 60 * 1000); // Random time within 24 hours
    
    return {
      id: Math.floor(Math.random() * 10000),
      table_name: table,
      operation: operation,
      record_id: Math.floor(Math.random() * 100000).toString(),
      old_values: operation === "UPDATE" ? { some_field: "old_value" } : null,
      new_values: operation !== "DELETE" ? { some_field: "new_value" } : null,
      changed_by: 1,
      user_name: "Admin User",
      changed_at: new Date(Date.now() - timeOffset).toISOString()
    };
  }

  /**
   * Get audit history for a specific record
   * @param {string} tableName - Name of the table
   * @param {string} recordId - ID of the record
   * @returns {Promise<Array>} Array of audit history
   */
  static async getRecordHistory(tableName, recordId) {
    try {
      const response = await api.get(`/logs/specific-logs?table=${tableName}&id=${recordId}`);
      return response.data.data || [];
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error("Error fetching record history:", error);
      }

      // If audit system is not available, return mock data
      if (error.response?.status === 404 || error.message.includes('function')) {
        if (process.env.NODE_ENV === 'development') {
          console.warn("Audit system not available, returning mock record history");
        }
        return this.getMockRecordHistory(tableName, recordId);
      }

      throw error;
    }
  }

  /**
   * Get mock record history
   * @param {string} tableName - Name of the table
   * @param {string} recordId - ID of the record
   * @returns {Array} Mock record history
   */
  static getMockRecordHistory(tableName, recordId) {
    return [
      {
        id: 1,
        operation: "INSERT",
        old_values: null,
        new_values: { id: recordId, table: tableName },
        changed_by: 1,
        user_name: "Admin User",
        changed_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 1 day ago
      },
      {
        id: 2,
        operation: "UPDATE",
        old_values: { status: "pending" },
        new_values: { status: "active" },
        changed_by: 1,
        user_name: "Admin User",
        changed_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString() // 12 hours ago
      }
    ];
  }

  /**
   * Transform audit log data into user-friendly format
   * @param {Array} auditLogs - Raw audit log data
   * @returns {Array} Transformed activities
   */
  static transformAuditLogs(auditLogs) {
    // Ensure auditLogs is an array
    if (!Array.isArray(auditLogs)) {
      if (process.env.NODE_ENV === 'development') {
        console.warn("transformAuditLogs received non-array data:", auditLogs);
      }
      return [];
    }
    
    // Filter out family_members and families since they're included in households
    const filteredLogs = auditLogs.filter(log => 
      log.table_name !== 'family_members' && 
      log.table_name !== 'families'
    );
    
    return filteredLogs.map(log => ({
      id: log.id,
      action: this.getActivityDescription(log),
      time: this.formatTimeAgo(log.changed_at),
      type: this.getActivityType(log),
      icon: this.getActivityIcon(log),
      user: log.user_name || "System",
      details: this.getActivityDetails(log),
      timestamp: log.changed_at,
      tableName: log.table_name,
      operation: log.operation,
      recordId: log.record_id
    }));
  }

  /**
   * Get human-readable activity description
   * @param {Object} log - Audit log entry
   * @returns {string} Activity description
   */
  static getActivityDescription(log) {
    const tableName = log.table_name;
    const operation = log.operation;
    
    const descriptions = {
      residents: {
        INSERT: "Resident added",
        UPDATE: "Resident updated",
        DELETE: "Resident removed"
      },
      households: {
        INSERT: "Household added",
        UPDATE: "Household updated",
        DELETE: "Household removed"
      },
      families: {
        INSERT: "Family added",
        UPDATE: "Family updated",
        DELETE: "Family removed"
      },
      pets: {
        INSERT: "Pet registered",
        UPDATE: "Pet updated",
        DELETE: "Pet removed"
      },
      requests: {
        INSERT: "Request submitted",
        UPDATE: "Request updated",
        DELETE: "Request removed"
      },
      archives: {
        INSERT: "Document archived",
        UPDATE: "Archive updated",
        DELETE: "Archive removed"
      },
      inventories: {
        INSERT: "Item added",
        UPDATE: "Item updated",
        DELETE: "Item removed"
      },
      barangays: {
        INSERT: "Barangay added",
        UPDATE: "Barangay updated",
        DELETE: "Barangay removed"
      },
      municipalities: {
        INSERT: "Municipality added",
        UPDATE: "Municipality updated",
        DELETE: "Municipality removed"
      },
      users: {
        INSERT: "User added",
        UPDATE: "User updated",
        DELETE: "User removed"
      }
    };

    return descriptions[tableName]?.[operation] || `${operation} on ${tableName}`;
  }

  /**
   * Get activity type for styling
   * @param {Object} log - Audit log entry
   * @returns {string} Activity type
   */
  static getActivityType(log) {
    const operation = log.operation;
    switch (operation) {
      case "INSERT":
        return "success";
      case "UPDATE":
        return "info";
      case "DELETE":
        return "warning";
      default:
        return "info";
    }
  }

  /**
   * Get activity icon component
   * @param {Object} log - Audit log entry
   * @returns {string} Icon name
   */
  static getActivityIcon(log) {
    const tableName = log.table_name;
    const iconMap = {
      residents: "Users",
      households: "Building",
      families: "Building",
      pets: "PawPrint",
      requests: "MessageSquare",
      archives: "FileText",
      inventories: "Package",
      barangays: "MapPin",
      municipalities: "Building2",
      users: "User"
    };
    
    return iconMap[tableName] || "Activity";
  }

    /**
   * Get resident name from audit data
   * @param {Object} data - Audit data (old_values or new_values)
   * @returns {string} Resident name or null
   */
  static getResidentNameFromAuditData(data) {
    if (!data) return null;
    
    // Check if we have the house_head_name field (from updated audit trigger)
    if (data.house_head_name) {
      const trimmedName = data.house_head_name.trim();
      return trimmedName || null;
    }
    
    // Check if we have house_head_data (from updated audit trigger)
    if (data.house_head_data) {
      const residentData = data.house_head_data;
      
      // Handle both object and string formats
      if (typeof residentData === 'string') {
        try {
          const parsed = JSON.parse(residentData);
          const firstName = parsed.first_name || "";
          const middleName = parsed.middle_name || "";
          const lastName = parsed.last_name || "";
          const suffix = parsed.suffix || "";
          
          const fullName = [firstName, middleName, lastName, suffix]
            .filter(name => name && name.trim())
            .join(" ");
          
          return fullName.trim() || null;
        } catch (e) {
          // If parsing fails, return null
          return null;
        }
      }
      
      const firstName = residentData.first_name || "";
      const middleName = residentData.middle_name || "";
      const lastName = residentData.last_name || "";
      const suffix = residentData.suffix || "";
      
      const fullName = [firstName, middleName, lastName, suffix]
        .filter(name => name && name.trim())
        .join(" ");
      
      return fullName.trim() || null;
    }
    
    // For older audit logs, try to construct name from resident fields
    if (data.first_name || data.last_name) {
      const firstName = data.first_name || "";
      const middleName = data.middle_name || "";
      const lastName = data.last_name || "";
      const suffix = data.suffix || "";
      
      const fullName = [firstName, middleName, lastName, suffix]
        .filter(name => name && name.trim())
        .join(" ");
      
      return fullName.trim() || null;
    }
    
    return null;
  }

  /**
   * Get activity details from audit log
   * @param {Object} log - Audit log entry
   * @returns {string} Activity details
   */
  static getActivityDetails(log) {
    const newData = log.new_values;
    const oldData = log.old_values;
    const tableName = log.table_name;
    
    // For INSERT operations, show the new data
    if (log.operation === "INSERT" && newData) {
      // Special handling for households - check for house head name first
      if (tableName === "households") {
        const houseHeadName = this.getResidentNameFromAuditData(newData);
        if (houseHeadName) {
          return `House Head: ${houseHeadName}`;
        }
        // If we have a house_head ID but no name, it means the resident wasn't found or trigger failed
        if (newData.house_head) {
          return "House Head: Unknown";
        }
      }
      
      const detailFields = {
        residents: ["first_name", "last_name", "middle_name"],
        households: ["house_head"],
        families: ["family_group"],
        pets: ["pet_name", "species"],
        requests: ["request_type", "status"],
        archives: ["document_name", "document_type"],
        inventories: ["item_name", "category"],
        barangays: ["barangay_name"],
        municipalities: ["municipality_name"],
        users: ["full_name", "email"]
      };

      const fields = detailFields[tableName] || [];
      for (const field of fields) {
        // Skip house_head for households since we already handled it above
        if (tableName === "households" && field === "house_head") {
          continue;
        }
        
        if (newData[field]) {
          // For residents, combine first, middle, and last name
          if (tableName === "residents" && (field === "first_name" || field === "last_name")) {
            const firstName = newData.first_name || "";
            const middleName = newData.middle_name || "";
            const lastName = newData.last_name || "";
            const suffix = newData.suffix || "";
            
            const fullName = [firstName, middleName, lastName, suffix]
              .filter(name => name.trim())
              .join(" ");
            
            if (fullName.trim()) {
              return fullName;
            }
          }
          
          return newData[field];
        }
      }
    }
    
    // For UPDATE operations, show what was changed
    if (log.operation === "UPDATE") {
      if (newData && oldData) {
        const changedFields = Object.keys(newData).filter(key => 
          newData[key] !== oldData[key]
        );
        
                 if (changedFields.length > 0) {
           // Filter out geom, updated_at, household_image_path, house_head_data, house_head_name, and house_number fields for households
           const relevantFields = changedFields.filter(field => 
             !(tableName === "households" && (field === "geom" || field === "updated_at" || field === "household_image_path" || field === "house_head_data" || field === "house_head_name" || field === "house_number"))
           );
           
           if (relevantFields.length === 0) {
             return "Details updated";
           }
           
           const field = relevantFields[0];
           const value = newData[field];
           
                       // Map field names to readable labels
            const fieldLabels = {
              first_name: "First Name", 
              last_name: "Last Name",
              middle_name: "Middle Name",
              suffix: "Suffix",
              house_head: "House Head",
              house_head_name: "House Head",
              house_number: "House Number",
              street: "Street",
              family_group: "Family Group",
              pet_name: "Pet Name",
              species: "Species",
              request_type: "Request Type",
              status: "Status",
              document_name: "Document",
              document_type: "Document Type",
              item_name: "Item",
              category: "Category",
              barangay_name: "Barangay",
              municipality_name: "Municipality",
              email: "Email",
              full_name: "Name"
            };
           
           const label = fieldLabels[field] || field;
          
          // For residents, show the full name if name fields changed
          if (tableName === "residents" && ["first_name", "last_name", "middle_name", "suffix"].includes(field)) {
            const firstName = newData.first_name || "";
            const middleName = newData.middle_name || "";
            const lastName = newData.last_name || "";
            const suffix = newData.suffix || "";
            
            const fullName = [firstName, middleName, lastName, suffix]
              .filter(name => name.trim())
              .join(" ");
            
            if (fullName.trim()) {
              return `Name: ${fullName}`;
            }
          }
          
                     // For households, always show house head name with the field change
           if (tableName === "households" && ["house_head", "house_head_name", "house_number", "street"].includes(field)) {
             // Get the house head name
             const houseHeadName = this.getResidentNameFromAuditData(newData);
             const houseHeadLabel = houseHeadName ? `House Head: ${houseHeadName}` : "House Head: Unknown";
             
             if (field === "house_head" || field === "house_head_name") {
               return houseHeadLabel;
             } else if (field === "house_number") {
               // Just show the house head name, not the house number
               return houseHeadLabel;
             } else if (field === "street") {
               const street = newData.street || "";
               return `${houseHeadLabel} - Street: ${street}`;
             }
           }
           

          
          return `${label}: ${value}`;
        }
      }
    }
    
    // For DELETE operations, show what was deleted
    if (log.operation === "DELETE" && oldData) {
      const detailFields = {
        residents: ["first_name", "last_name", "middle_name"],
        households: ["house_head"],
        families: ["family_group"],
        pets: ["pet_name", "species"],
        requests: ["request_type"],
        archives: ["document_name"],
        inventories: ["item_name"],
        barangays: ["barangay_name"],
        municipalities: ["municipality_name"],
        users: ["full_name", "email"]
      };

      const fields = detailFields[tableName] || [];
      for (const field of fields) {
        if (oldData[field]) {
          // For residents, combine first, middle, and last name
          if (tableName === "residents" && (field === "first_name" || field === "last_name")) {
            const firstName = oldData.first_name || "";
            const middleName = oldData.middle_name || "";
            const lastName = oldData.last_name || "";
            const suffix = oldData.suffix || "";
            
            const fullName = [firstName, middleName, lastName, suffix]
              .filter(name => name.trim())
              .join(" ");
            
            if (fullName.trim()) {
              return fullName;
            }
          }
          
                     // For households, show house head name with label
           if (tableName === "households" && field === "house_head") {
             // Try to get the house head name from the audit data
             const houseHeadName = this.getResidentNameFromAuditData(oldData);
             if (houseHeadName) {
               return `House Head: ${houseHeadName}`;
             }
             // Fallback to "House Head: Unknown" if name is not available
             return "House Head: Unknown";
           }
          
          return oldData[field];
        }
      }
    }
    
    // Fallback to record ID if no meaningful data found
    return `Record ID: ${log.record_id}`;
  }

  /**
   * Format timestamp to relative time
   * @param {string} timestamp - ISO timestamp
   * @returns {string} Formatted time
   */
  static formatTimeAgo(timestamp) {
    const now = new Date();
    const activityTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now - activityTime) / (1000 * 60));
    
    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    
    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) return `${diffInWeeks} week${diffInWeeks > 1 ? 's' : ''} ago`;
    
    return activityTime.toLocaleDateString();
  }
}

export default AuditService;
