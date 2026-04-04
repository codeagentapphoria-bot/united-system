// React imports
import { useEffect, useState } from 'react';

// Hooks
import { useToast } from '@/hooks/use-toast';

// Services
import { addressService, type Address, type CreateAddressInput, type UpdateAddressInput } from '@/services/api/address.service';

// Constants
import { getRegionName, regionOptions } from '@/constants/regions';

// Re-export types for convenience
export type { CreateAddressInput, UpdateAddressInput };

export const useAddresses = () => {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const { toast } = useToast();

  // Fetch addresses
  useEffect(() => {
    const fetchAddresses = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const isActive = statusFilter === 'all' ? undefined : statusFilter === 'active';
        
        const fetchedAddresses = await addressService.getAllAddresses(
          searchQuery || undefined,
          isActive
        );
        
        setAddresses(fetchedAddresses);
        
        // Set first address as selected if available
        if (fetchedAddresses.length > 0 && !selectedAddress) {
          setSelectedAddress(fetchedAddresses[0]);
        }
      } catch (err: any) {
        // Handle 403 errors silently (access denied - may be subscriber trying to access admin-only endpoint)
        // This is expected in some cases and shouldn't show an error toast
        if (err.response?.status === 403) {
          setError('Access denied');
          // Don't show toast for 403 errors - they're handled gracefully
          setAddresses([]); // Set empty array so the form can still work with static region data
        } else {
          setError(err.message || 'Failed to fetch addresses');
          toast({
            variant: 'destructive',
            title: 'Error',
            description: err.message || 'Failed to fetch addresses',
          });
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchAddresses();
  }, [searchQuery, statusFilter]);

  // Filter addresses (client-side filtering for immediate UI feedback)
  const filteredAddresses = addresses.filter((address) => {
    const matchesSearch = 
      address.region.toLowerCase().includes(searchQuery.toLowerCase()) ||
      address.province.toLowerCase().includes(searchQuery.toLowerCase()) ||
      address.municipality.toLowerCase().includes(searchQuery.toLowerCase()) ||
      address.barangay.toLowerCase().includes(searchQuery.toLowerCase()) ||
      address.postalCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (address.streetAddress?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && address.isActive) ||
                         (statusFilter === 'inactive' && !address.isActive);
    return matchesSearch && matchesStatus;
  });

  const createAddress = async (data: CreateAddressInput): Promise<Address> => {
    try {
      const newAddress = await addressService.createAddress(data);
      
      setAddresses((prev) => [newAddress, ...prev]);
      toast({
        title: 'Success',
        description: 'Address created successfully',
      });
      return newAddress;
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to create address',
      });
      throw err;
    }
  };

  const updateAddress = async (id: string, data: UpdateAddressInput): Promise<Address> => {
    try {
      const updatedAddress = await addressService.updateAddress(id, data);
      
      setAddresses((prev) =>
        prev.map((address) => (address.id === id ? updatedAddress : address))
      );
      if (selectedAddress?.id === id) {
        setSelectedAddress(updatedAddress);
      }
      toast({
        title: 'Success',
        description: 'Address updated successfully',
      });
      return updatedAddress;
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to update address',
      });
      throw err;
    }
  };

  const deleteAddress = async (id: string): Promise<void> => {
    try {
      await addressService.deleteAddress(id);
      
      setAddresses((prev) => prev.filter((address) => address.id !== id));
      if (selectedAddress?.id === id) {
        setSelectedAddress(null);
      }
      toast({
        title: 'Success',
        description: 'Address deleted successfully',
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to delete address',
      });
      throw err;
    }
  };

  const activateAddress = async (id: string): Promise<Address> => {
    try {
      const activatedAddress = await addressService.activateAddress(id);
      
      setAddresses((prev) =>
        prev.map((address) => (address.id === id ? activatedAddress : address))
      );
      if (selectedAddress?.id === id) {
        setSelectedAddress(activatedAddress);
      }
      toast({
        title: 'Success',
        description: 'Address activated successfully',
      });
      return activatedAddress;
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to activate address',
      });
      throw err;
    }
  };

  const deactivateAddress = async (id: string): Promise<Address> => {
    try {
      const deactivatedAddress = await addressService.deactivateAddress(id);
      
      setAddresses((prev) =>
        prev.map((address) => (address.id === id ? deactivatedAddress : address))
      );
      if (selectedAddress?.id === id) {
        setSelectedAddress(deactivatedAddress);
      }
      toast({
        title: 'Success',
        description: 'Address deactivated successfully',
      });
      return deactivatedAddress;
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to deactivate address',
      });
      throw err;
    }
  };

  // Get active addresses (for use in forms)
  const activeAddresses = addresses.filter(a => a.isActive);

  // Format address for display
  const formatAddress = (address: Address): string => {
    const parts = [
      address.streetAddress,
      address.barangay,
      address.municipality,
      address.province,
      getRegionName(address.region),
    ].filter(Boolean);
    return `${parts.join(', ')} - ${address.postalCode}`;
  };

  // Get unique regions from addresses
  // Falls back to static regionOptions if addresses API fails
  const getUniqueRegions = (): Array<{ value: string; label: string }> => {
    // If we have addresses from API, use them
    if (activeAddresses.length > 0) {
      const regions = new Set(activeAddresses.map(addr => addr.region));
      return Array.from(regions)
        .map(regionValue => {
          // Find the matching region option to get the proper label
          const regionOption = regionOptions.find(opt => opt.value === regionValue);
          return {
            value: regionValue,
            label: regionOption ? regionOption.label : regionValue,
          };
        })
        .sort((a, b) => {
          // Sort by the region value to maintain consistent order
          // NCR and special regions first, then numbered regions
          const order = ['ncr', 'car', 'barmm', 'nir'];
          const aIndex = order.indexOf(a.value);
          const bIndex = order.indexOf(b.value);
          if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
          if (aIndex !== -1) return -1;
          if (bIndex !== -1) return 1;
          return a.value.localeCompare(b.value);
        });
    }
    
    // Fallback to static region options if API data is not available
    return regionOptions;
  };

  // Get unique provinces filtered by region
  const getProvincesByRegion = (region: string): Array<{ value: string; label: string }> => {
    if (!region) return [];
    const provinces = new Set(
      activeAddresses
        .filter(addr => addr.region === region)
        .map(addr => addr.province)
    );
    return Array.from(provinces)
      .sort()
      .map(province => ({
        value: province,
        label: province,
      }));
  };

  // Get unique municipalities filtered by region and province
  const getMunicipalitiesByRegionAndProvince = (
    region: string,
    province: string
  ): Array<{ value: string; label: string }> => {
    if (!region || !province) return [];
    const municipalities = new Set(
      activeAddresses
        .filter(addr => addr.region === region && addr.province === province)
        .map(addr => addr.municipality)
    );
    return Array.from(municipalities)
      .sort()
      .map(municipality => ({
        value: municipality,
        label: municipality,
      }));
  };

  // Get unique barangays filtered by region, province, and municipality
  const getBarangaysByRegionProvinceAndMunicipality = (
    region: string,
    province: string,
    municipality: string
  ): Array<{ value: string; label: string }> => {
    if (!region || !province || !municipality) return [];
    const barangays = new Set(
      activeAddresses
        .filter(
          addr =>
            addr.region === region &&
            addr.province === province &&
            addr.municipality === municipality
        )
        .map(addr => addr.barangay)
    );
    return Array.from(barangays)
      .sort()
      .map(barangay => ({
        value: barangay,
        label: barangay,
      }));
  };

  // Get postal code from selected address components
  const getPostalCode = (
    region: string,
    province: string,
    municipality: string,
    barangay: string
  ): string => {
    if (!region || !province || !municipality || !barangay) return '';
    const address = activeAddresses.find(
      addr =>
        addr.region === region &&
        addr.province === province &&
        addr.municipality === municipality &&
        addr.barangay === barangay
    );
    return address?.postalCode || '';
  };

  return {
    addresses: filteredAddresses,
    allAddresses: addresses,
    activeAddresses,
    formatAddress,
    selectedAddress,
    setSelectedAddress,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    createAddress,
    updateAddress,
    deleteAddress,
    activateAddress,
    deactivateAddress,
    getUniqueRegions,
    getProvincesByRegion,
    getMunicipalitiesByRegionAndProvince,
    getBarangaysByRegionProvinceAndMunicipality,
    getPostalCode,
  };
};

