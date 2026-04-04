// React imports
import React from 'react';

// UI Components (shadcn/ui)
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

// Hooks
import { useCitizens } from '@/hooks/citizens/useCitizens';
import { useDebounce } from '@/hooks/useDebounce';

// Utils
import { cn } from '@/lib/utils';

// Icons
import { FiPlus, FiSearch, FiUserCheck } from 'react-icons/fi';

interface CitizenSelectorProps {
  localSearchQuery: string;
  onSearchChange: (value: string) => void;
  selectedCitizen: any;
  onCitizenSelect: (citizen: any) => void;
  onAddNewCitizen: () => void;
  isLoading?: boolean;
}

export const CitizenSelector: React.FC<CitizenSelectorProps> = ({
  localSearchQuery,
  onSearchChange,
  selectedCitizen,
  onCitizenSelect,
  onAddNewCitizen,
  isLoading = false,
}) => {
  const { citizens } = useCitizens();
  
  // Debounce the search query for filtering
  const debouncedSearchQuery = useDebounce(localSearchQuery, 400);

  // Filter citizens based on debounced search
  const filteredCitizens = citizens.filter(citizen => {
    const fullName = `${citizen.firstName} ${citizen.middleName || ''} ${citizen.lastName}`.toLowerCase();
    const searchLower = debouncedSearchQuery.toLowerCase();
    return fullName.includes(searchLower) ||
           citizen.residentId?.toLowerCase().includes(searchLower) ||
           citizen.phoneNumber?.toLowerCase().includes(searchLower);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-primary-600">Check Citizen</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAddNewCitizen}
          className="text-primary-600 hover:text-primary-700 hover:bg-primary-50"
        >
          <FiPlus className="h-4 w-4 mr-2" />
          Add New Citizen
        </Button>
      </div>
      
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Search Citizen</label>
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <Input
            placeholder="Search by name, resident ID, or phone number..."
            value={localSearchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-4 text-gray-500">Loading citizens...</div>
      ) : filteredCitizens.length === 0 ? (
        <div className="text-center py-4 text-gray-500">
          {localSearchQuery ? 'No citizens found. Click "Add New Citizen" to create one.' : 'No citizens available. Click "Add New Citizen" to create one.'}
        </div>
      ) : (
        <div className="space-y-2 max-h-[200px] overflow-y-auto">
          {filteredCitizens.map((citizen) => (
            <Card
              key={citizen.id}
              className={cn(
                'cursor-pointer transition-all hover:shadow-md',
                selectedCitizen?.id === citizen.id
                  ? 'border-primary-600 bg-primary-50'
                  : 'hover:border-primary-300'
              )}
              onClick={() => onCitizenSelect(citizen)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-heading-700">
                      {citizen.firstName} {citizen.middleName} {citizen.lastName}
                      {citizen.extensionName && ` ${citizen.extensionName}`}
                    </h4>
                    <p className="text-sm text-gray-500 mt-1">
                      {citizen.residentId && `ID: ${citizen.residentId}`}
                      {citizen.phoneNumber && ` • ${citizen.phoneNumber}`}
                    </p>
                  </div>
                  {selectedCitizen?.id === citizen.id && (
                    <div className="text-primary-600">
                      <FiUserCheck size={20} />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

