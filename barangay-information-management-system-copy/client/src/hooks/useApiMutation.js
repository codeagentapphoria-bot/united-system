/**
 * useApiMutation.js
 *
 * Thin wrapper around @tanstack/react-query's useMutation.
 * Accepts a mutationFn and optional react-query options.
 *
 * Usage:
 *   const mutation = useApiMutation(
 *     (payload) => api.post("/some/endpoint", payload),
 *     { onSuccess: (data) => console.log(data) }
 *   );
 *   mutation.mutate(payload);
 */
import { useMutation } from "@tanstack/react-query";

export function useApiMutation(mutationFn, options = {}) {
  return useMutation({ mutationFn, ...options });
}
