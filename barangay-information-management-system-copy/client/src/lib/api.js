/**
 * src/lib/api.js
 *
 * Re-exports the shared axios instance as `apiClient` so new pages
 * can import from "@/lib/api" without duplicating the interceptor setup.
 */
import api from "@/utils/api";

export const apiClient = api;
export default api;
