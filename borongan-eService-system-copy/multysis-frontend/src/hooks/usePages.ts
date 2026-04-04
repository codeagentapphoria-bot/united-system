export interface RedirectOption {
  value: string;
  label: string;
  description?: string;
  category?: string;
}

export function usePages() {
  const redirectOptions: RedirectOption[] = [];
  return {
    redirectOptions,
    isLoading: false,
  };
}
