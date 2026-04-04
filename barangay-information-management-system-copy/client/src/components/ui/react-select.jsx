import React from 'react';
import Select from 'react-select';

const ReactSelect = ({
  value,
  onChange,
  options,
  placeholder,
  isSearchable = true,
  isClearable = false,
  isMulti = false,
  isDisabled = false,
  isLoading = false,
  className = '',
  customStyles = {},
  components = {},
  noOptionsMessage = () => "No options available",
  loadingMessage = () => "Loading...",
  ...props
}) => {
  // Default styles that match the design system
  const defaultStyles = {
    control: (provided, state) => ({
      ...provided,
      minHeight: '40px',
      borderColor: state.isFocused ? 'hsl(var(--primary))' : 'hsl(var(--border))',
      boxShadow: state.isFocused ? '0 0 0 1px hsl(var(--primary))' : 'none',
      backgroundColor: 'hsl(var(--background))',
      borderRadius: '6px',
      transition: 'all 0.2s ease',
      '&:hover': {
        borderColor: 'hsl(var(--primary))'
      }
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected 
        ? 'hsl(var(--primary))' 
        : state.isFocused 
        ? 'hsl(var(--muted))' 
        : 'hsl(var(--background))',
      color: state.isSelected 
        ? 'hsl(var(--primary-foreground))' 
        : 'hsl(var(--foreground))',
      padding: '8px 12px',
      cursor: 'pointer',
      transition: 'background-color 0.2s ease',
      '&:hover': {
        backgroundColor: state.isSelected 
          ? 'hsl(var(--primary))' 
          : 'hsl(var(--muted))'
      }
    }),
    singleValue: (provided) => ({
      ...provided,
      color: 'hsl(var(--foreground))'
    }),
    placeholder: (provided) => ({
      ...provided,
      color: 'hsl(var(--muted-foreground))'
    }),
    input: (provided) => ({
      ...provided,
      color: 'hsl(var(--foreground))'
    }),
    menu: (provided) => ({
      ...provided,
      backgroundColor: 'hsl(var(--background))',
      border: '1px solid hsl(var(--border))',
      borderRadius: '6px',
      boxShadow: 'var(--shadow-md)',
      zIndex: 50
    }),
    menuList: (provided) => ({
      ...provided,
      padding: '4px'
    }),
    indicatorSeparator: (provided) => ({
      ...provided,
      backgroundColor: 'hsl(var(--border))'
    }),
    dropdownIndicator: (provided, state) => ({
      ...provided,
      color: state.isFocused 
        ? 'hsl(var(--foreground))' 
        : 'hsl(var(--muted-foreground))',
      transition: 'color 0.2s ease',
      '&:hover': {
        color: 'hsl(var(--foreground))'
      }
    }),
    clearIndicator: (provided, state) => ({
      ...provided,
      color: state.isFocused 
        ? 'hsl(var(--foreground))' 
        : 'hsl(var(--muted-foreground))',
      transition: 'color 0.2s ease',
      '&:hover': {
        color: 'hsl(var(--foreground))'
      }
    }),
    multiValue: (provided) => ({
      ...provided,
      backgroundColor: 'hsl(var(--muted))',
      borderRadius: '4px'
    }),
    multiValueLabel: (provided) => ({
      ...provided,
      color: 'hsl(var(--foreground))'
    }),
    multiValueRemove: (provided, state) => ({
      ...provided,
      color: state.isFocused 
        ? 'hsl(var(--destructive))' 
        : 'hsl(var(--muted-foreground))',
      '&:hover': {
        backgroundColor: 'hsl(var(--destructive))',
        color: 'hsl(var(--destructive-foreground))'
      }
    }),
    loadingMessage: (provided) => ({
      ...provided,
      color: 'hsl(var(--muted-foreground))',
      padding: '8px 12px'
    }),
    noOptionsMessage: (provided) => ({
      ...provided,
      color: 'hsl(var(--muted-foreground))',
      padding: '8px 12px'
    })
  };

  // Merge custom styles with default styles
  const mergedStyles = {
    ...defaultStyles,
    ...customStyles
  };

  return (
    <Select
      value={value}
      onChange={onChange}
      options={options}
      placeholder={placeholder}
      isSearchable={isSearchable}
      isClearable={isClearable}
      isMulti={isMulti}
      isDisabled={isDisabled}
      isLoading={isLoading}
      styles={mergedStyles}
      components={components}
      className={`react-select-container ${className}`}
      classNamePrefix="react-select"
      noOptionsMessage={noOptionsMessage}
      loadingMessage={loadingMessage}
      aria-label={placeholder}
      {...props}
    />
  );
};

export default ReactSelect;
