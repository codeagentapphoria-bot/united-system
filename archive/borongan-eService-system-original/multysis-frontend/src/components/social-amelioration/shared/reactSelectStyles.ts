export const createReactSelectStyles = (hasError: boolean = false) => ({
  control: (base: any) => ({
    ...base,
    minHeight: '40px',
    borderColor: hasError ? '#ef4444' : '#d1d5db',
    '&:hover': {
      borderColor: hasError ? '#ef4444' : '#9ca3af',
    },
  }),
  option: (base: any, state: any) => ({
    ...base,
    padding: '12px',
    backgroundColor: state.isSelected ? '#3b82f6' : state.isFocused ? '#f3f4f6' : 'white',
    color: state.isSelected ? 'white' : '#374151',
  }),
  menu: (base: any) => ({
    ...base,
    zIndex: 9999,
  }),
});

