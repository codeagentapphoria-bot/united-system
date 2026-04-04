// React imports
import React, { useEffect, useState } from 'react';

// Third-party libraries
import { useDebounce } from '@/hooks/useDebounce';
import { useFormContext } from 'react-hook-form';
import { logger } from '@/utils/logger';

// UI Components (shadcn/ui)
import { Button } from '@/components/ui/button';
import {
    FormControl,
    FormField,
    FormItem,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';

// Custom Components
import { FormLabel as CustomFormLabel } from '@/components/common/FormLabel';

// Services
import { subscriberService } from '@/services/api/subscriber.service';

// Types and Schemas
import type { AddSubscriberInput } from '@/validations/subscriber.schema';

// Utils
import { cn } from '@/lib/utils';

interface Citizen {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  extensionName?: string;
  phoneNumber?: string;
  email?: string;
  residentId?: string;
  birthDate?: string;
}

export const CitizenSearchField: React.FC = () => {
  const form = useFormContext<AddSubscriberInput>();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Citizen[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  
  const debouncedSearch = useDebounce(searchQuery, 500);
  const selectedCitizenId = form.watch('citizenId');

  useEffect(() => {
    const searchCitizens = async () => {
      if (debouncedSearch.trim().length < 2) {
        setSearchResults([]);
        setShowResults(false);
        return;
      }

      setIsSearching(true);
      try {
        const results = await subscriberService.searchCitizens(debouncedSearch, 10);
        setSearchResults(results);
        setShowResults(true);
      } catch (error) {
        logger.error('Failed to search citizens:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    searchCitizens();
  }, [debouncedSearch]);

  const handleSelectCitizen = (citizen: Citizen) => {
    const hasPhone = !!(citizen.phoneNumber && citizen.phoneNumber.trim().length > 0);
    
    form.setValue('citizenId', citizen.id);
    form.setValue('firstName', citizen.firstName);
    form.setValue('middleName', citizen.middleName || '');
    form.setValue('lastName', citizen.lastName);
    
    // Pre-fill contact information from citizen to avoid duplicates
    if (hasPhone) {
      // Convert citizen phone format to subscriber format (10 digits)
      // Citizen format: "09171234567" (11 digits) or "+639171234567" or "639171234567"
      // Subscriber format: "9171234567" (10 digits)
      let phone = citizen.phoneNumber!.trim();
      
      // Remove country code prefixes
      phone = phone.replace(/^\+63/, '');
      phone = phone.replace(/^63/, '');
      
      // Remove leading 0 if present (09171234567 -> 9171234567)
      if (phone.startsWith('0') && phone.length === 11) {
        phone = phone.substring(1);
      }
      
      // Ensure it's exactly 10 digits
      if (phone.length === 10 && /^\d{10}$/.test(phone)) {
        form.setValue('countryCode', '+63');
        form.setValue('mobileNumber', phone);
      } else {
        // If format doesn't match, still set it but user might need to adjust
        form.setValue('mobileNumber', phone.replace(/\D/g, '').slice(-10));
      }
    } else {
      // Citizen doesn't have a phone number - clear the field so user can enter one
      form.setValue('mobileNumber', '');
      form.setValue('countryCode', '+63');
      // Clear any validation errors
      form.clearErrors('mobileNumber');
    }
    
    if (citizen.email) {
      form.setValue('email', citizen.email);
    }
    
    setSearchQuery(`${citizen.firstName} ${citizen.lastName}${citizen.extensionName ? ` ${citizen.extensionName}` : ''}`);
    setShowResults(false);
  };

  const handleClearSelection = () => {
    form.setValue('citizenId', undefined);
    form.setValue('firstName', '');
    form.setValue('middleName', '');
    form.setValue('lastName', '');
    form.setValue('mobileNumber', '');
    form.setValue('email', '');
    setSearchQuery('');
    setShowResults(false);
  };

  const selectedCitizen = searchResults.find(c => c.id === selectedCitizenId);

  return (
    <div className="space-y-2">
      <CustomFormLabel>Search Citizen</CustomFormLabel>
      <div className="relative">
        <FormField
          control={form.control}
          name="citizenId"
          render={() => (
            <FormItem>
              <FormControl>
                <div className="relative">
                  <Input
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      if (!e.target.value) {
                        handleClearSelection();
                      }
                    }}
                    onFocus={() => {
                      if (searchResults.length > 0) {
                        setShowResults(true);
                      }
                    }}
                    placeholder="Search by name, phone, or resident ID..."
                    className="h-10 pr-10"
                    disabled={!!selectedCitizenId}
                  />
                  {selectedCitizenId && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleClearSelection}
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                    >
                      ✕
                    </Button>
                  )}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Search Results Dropdown */}
        {showResults && (searchResults.length > 0 || isSearching) && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
            {isSearching ? (
              <div className="p-4 text-center text-sm text-gray-500">
                Searching...
              </div>
            ) : searchResults.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">
                No citizens found. You can create a new citizen record.
              </div>
            ) : (
              <div className="py-1">
                {searchResults.map((citizen) => (
                  <button
                    key={citizen.id}
                    type="button"
                    onClick={() => handleSelectCitizen(citizen)}
                    className={cn(
                      "w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors",
                      selectedCitizenId === citizen.id && "bg-primary-50 border-l-2 border-primary-600"
                    )}
                  >
                    <div className="font-medium text-gray-900">
                      {citizen.firstName} {citizen.middleName ? `${citizen.middleName} ` : ''}{citizen.lastName}
                      {citizen.extensionName && ` ${citizen.extensionName}`}
                    </div>
                    <div className="text-sm text-gray-500 mt-1 space-y-0.5">
                      {citizen.phoneNumber && (
                        <div>Phone: {citizen.phoneNumber}</div>
                      )}
                      {citizen.email && (
                        <div>Email: {citizen.email}</div>
                      )}
                      {citizen.residentId && (
                        <div>Resident ID: {citizen.residentId}</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Selected Citizen Display */}
        {selectedCitizenId && selectedCitizen && (
          <div className="mt-2 p-3 bg-primary-50 border border-primary-200 rounded-md">
            <div className="text-sm font-medium text-primary-900 mb-2">
              Selected Citizen:
            </div>
            <div className="text-sm text-primary-700 font-medium">
              {selectedCitizen.firstName} {selectedCitizen.middleName ? `${selectedCitizen.middleName} ` : ''}{selectedCitizen.lastName}
              {selectedCitizen.extensionName && ` ${selectedCitizen.extensionName}`}
            </div>
            <div className="text-xs text-primary-600 mt-2 space-y-1">
              {selectedCitizen.phoneNumber && (
                <div>Phone: {selectedCitizen.phoneNumber}</div>
              )}
              {selectedCitizen.email && (
                <div>Email: {selectedCitizen.email}</div>
              )}
              {selectedCitizen.residentId && (
                <div>Resident ID: {selectedCitizen.residentId}</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

