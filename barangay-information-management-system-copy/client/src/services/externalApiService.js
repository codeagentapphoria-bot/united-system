import API_CONFIG, {
  getApiHeaders,
  buildApiUrl,
  handleApiError,
  retryRequest,
} from "@/config/apiConfig";

class ExternalApiService {
  constructor() {
    this.baseURL = API_CONFIG.BASE_URL;
    this.apiKey = API_CONFIG.API_KEY;
  }

  // Generic fetch method with error handling and retry logic
  async fetchWithRetry(url, options = {}) {
    const fetchOptions = {
      method: "GET",
      headers: getApiHeaders(options.headers),
      timeout: API_CONFIG.TIMEOUT,
      ...options,
    };

    return retryRequest(async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        API_CONFIG.TIMEOUT
      );

      try {
        const response = await fetch(url, {
          ...fetchOptions,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        return {
          success: true,
          data,
          status: response.status,
        };
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    });
  }

  // Get all cities in Eastern Samar
  async getCities() {
    try {
      const url = buildApiUrl(API_CONFIG.ENDPOINTS.CITIES);
      return await this.fetchWithRetry(url);
    } catch (error) {
      return handleApiError(error, "Get cities");
    }
  }

  // Get buildings with optional type filtering
  async getBuildings(filters = {}) {
    try {
      let url = buildApiUrl(API_CONFIG.ENDPOINTS.BUILDINGS);

      // Add query parameters if filters are provided
      if (Object.keys(filters).length > 0) {
        const params = new URLSearchParams(filters);
        url += `?${params.toString()}`;
      }

      return await this.fetchWithRetry(url);
    } catch (error) {
      return handleApiError(error, "Get buildings");
    }
  }

  // Get landmarks
  async getLandmarks(filters = {}) {
    try {
      let url = buildApiUrl(API_CONFIG.ENDPOINTS.LANDMARKS);

      // Add query parameters if filters are provided
      if (Object.keys(filters).length > 0) {
        const params = new URLSearchParams(filters);
        url += `?${params.toString()}`;
      }

      return await this.fetchWithRetry(url);
    } catch (error) {
      return handleApiError(error, "Get landmarks");
    }
  }

  // Get landmarks statistics
  async getLandmarksStatistics() {
    try {
      const url = buildApiUrl(API_CONFIG.ENDPOINTS.LANDMARKS_STATISTICS);
      return await this.fetchWithRetry(url);
    } catch (error) {
      return handleApiError(error, "Get landmarks statistics");
    }
  }

  // Get barangays
  async getBarangays(filters = {}) {
    try {
      let url = buildApiUrl(API_CONFIG.ENDPOINTS.BARANGAYS);

      // Add query parameters if filters are provided
      if (Object.keys(filters).length > 0) {
        const params = new URLSearchParams(filters);
        url += `?${params.toString()}`;
      }

      return await this.fetchWithRetry(url);
    } catch (error) {
      return handleApiError(error, "Get barangays");
    }
  }

  // Get municipalities
  async getMunicipalities(filters = {}) {
    try {
      let url = buildApiUrl(API_CONFIG.ENDPOINTS.MUNICIPALITIES);

      // Add query parameters if filters are provided
      if (Object.keys(filters).length > 0) {
        const params = new URLSearchParams(filters);
        url += `?${params.toString()}`;
      }

      return await this.fetchWithRetry(url);
    } catch (error) {
      return handleApiError(error, "Get municipalities");
    }
  }

  // Get provinces
  async getProvinces(filters = {}) {
    try {
      let url = buildApiUrl(API_CONFIG.ENDPOINTS.PROVINCES);

      // Add query parameters if filters are provided
      if (Object.keys(filters).length > 0) {
        const params = new URLSearchParams(filters);
        url += `?${params.toString()}`;
      }

      return await this.fetchWithRetry(url);
    } catch (error) {
      return handleApiError(error, "Get provinces");
    }
  }

  // Generic method for custom endpoints
  async customRequest(endpoint, options = {}) {
    try {
      const url = buildApiUrl(endpoint);
      return await this.fetchWithRetry(url, options);
    } catch (error) {
      return handleApiError(error, `Custom request to ${endpoint}`);
    }
  }

  // Batch request method for multiple endpoints
  async batchRequest(requests) {
    try {
      const promises = requests.map(({ endpoint, options = {} }) =>
        this.customRequest(endpoint, options)
      );

      const results = await Promise.allSettled(promises);

      return {
        success: true,
        data: results.map((result, index) => ({
          request: requests[index],
          result: result.status === "fulfilled" ? result.value : result.reason,
        })),
      };
    } catch (error) {
      return handleApiError(error, "Batch request");
    }
  }

  // Health check method
  async healthCheck() {
    try {
      const url = buildApiUrl("/api/health");
      return await this.fetchWithRetry(url);
    } catch (error) {
      return handleApiError(error, "Health check");
    }
  }
}

// Create and export a singleton instance
const externalApiService = new ExternalApiService();
export default externalApiService;

// Also export the class for testing purposes
export { ExternalApiService };
