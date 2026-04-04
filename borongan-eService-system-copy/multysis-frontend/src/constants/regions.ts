export interface RegionOption {
  value: string;
  label: string;
}

/**
 * Philippine Administrative Regions
 * Standardized region options for use across the application
 */
export const regionOptions: RegionOption[] = [
  { value: 'ncr', label: 'NCR – National Capital Region' },
  { value: 'region1', label: 'Region I – Ilocos Region' },
  { value: 'region2', label: 'Region II – Cagayan Valley' },
  { value: 'region3', label: 'Region III – Central Luzon' },
  { value: 'region4a', label: 'Region IV‑A – CALABARZON' },
  { value: 'region4b', label: 'Region IV‑B – MIMAROPA' },
  { value: 'region5', label: 'Region V – Bicol Region' },
  { value: 'region6', label: 'Region VI – Western Visayas' },
  { value: 'region7', label: 'Region VII – Central Visayas' },
  { value: 'region8', label: 'Region VIII – Eastern Visayas' },
  { value: 'region9', label: 'Region IX – Zamboanga Peninsula' },
  { value: 'region10', label: 'Region X – Northern Mindanao' },
  { value: 'region11', label: 'Region XI – Davao Region' },
  { value: 'region12', label: 'Region XII – SOCCSKSARGEN' },
  { value: 'region13', label: 'Region XIII – Caraga' },
  { value: 'car', label: 'CAR – Cordillera Administrative Region' },
  { value: 'barmm', label: 'BARMM – Bangsamoro Autonomous Region in Muslim Mindanao' },
  { value: 'nir', label: 'NIR – Negros Island Region' },
];

/**
 * Get the display name for a region value
 * @param regionValue - The region value (e.g., 'region8', 'ncr')
 * @returns The display name (e.g., 'Region VIII – Eastern Visayas') or the original value if not found
 */
export const getRegionName = (regionValue: string | null | undefined): string => {
  if (!regionValue) return '';
  const region = regionOptions.find(opt => opt.value === regionValue);
  return region ? region.label : regionValue;
};

