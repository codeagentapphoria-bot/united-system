import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useUnifiedAutoRefresh } from '@/hooks/useUnifiedAutoRefresh';
import api from '@/utils/api';

const AutoRefreshTest = () => {
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(false);

  // Set up unified auto refresh
  const { registerRefreshCallback, handleCRUDOperation } = useUnifiedAutoRefresh({
    entityType: 'resident',
    successMessage: 'Test operation completed successfully!',
    autoRefresh: true,
    refreshDelay: 100
  });

  // Fetch residents function
  const fetchResidents = useCallback(async () => {
    console.log('🔍 Fetching residents...');
    setLoading(true);
    try {
      const response = await api.get('/list/residents');
      setResidents(response.data.data || []);
      console.log('✅ Residents fetched:', response.data.data?.length || 0);
    } catch (error) {
      console.error('❌ Error fetching residents:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Register fetch function for auto refresh
  React.useEffect(() => {
    const unregister = registerRefreshCallback(fetchResidents);
    return unregister;
  }, [registerRefreshCallback, fetchResidents]);

  // Test delete function
  const testDelete = async () => {
    if (residents.length === 0) {
      alert('No residents to delete');
      return;
    }

    const residentToDelete = residents[0];
    console.log('🗑️ Testing delete for resident:', residentToDelete.resident_id);

    try {
      await handleCRUDOperation(
        async (data) => {
          return await api.delete(`/${data.resident_id}/resident`);
        },
        { resident_id: residentToDelete.resident_id }
      );
      console.log('✅ Delete operation completed');
    } catch (error) {
      console.error('❌ Delete operation failed:', error);
    }
  };

  // Test create function
  const testCreate = async () => {
    console.log('➕ Testing create resident');

    const testResident = {
      barangayId: 1,
      lastName: 'Test',
      firstName: 'User',
      middleName: 'Auto',
      sex: 'male',
      civilStatus: 'single',
      birthdate: '1990-01-01',
      birthplace: 'Test City',
      contactNumber: '1234567890',
      email: 'test@example.com',
      occupation: 'Tester',
      monthlyIncome: '50000',
      employmentStatus: 'employed',
      educationAttainment: 'college',
      residentStatus: 'active',
      indigenousPerson: false,
      classifications: []
    };

    try {
      await handleCRUDOperation(
        async (data) => {
          const formData = new FormData();
          Object.entries(data).forEach(([key, value]) => {
            if (key === 'classifications') {
              formData.append(key, JSON.stringify(value));
            } else {
              formData.append(key, value);
            }
          });
          return await api.post('/resident', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        },
        testResident
      );
      console.log('✅ Create operation completed');
    } catch (error) {
      console.error('❌ Create operation failed:', error);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Auto Refresh Test Page</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button onClick={fetchResidents} disabled={loading}>
              {loading ? 'Loading...' : 'Fetch Residents'}
            </Button>
            <Button onClick={testCreate} variant="outline">
              Test Create Resident
            </Button>
            <Button onClick={testDelete} variant="destructive">
              Test Delete First Resident
            </Button>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Residents ({residents.length})</h3>
            <div className="max-h-60 overflow-y-auto">
              {residents.map((resident) => (
                <div key={resident.resident_id} className="p-2 border rounded mb-2">
                  <div className="font-medium">
                    {resident.first_name} {resident.last_name}
                  </div>
                  <div className="text-sm text-gray-600">
                    ID: {resident.resident_id}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-sm text-gray-600">
            <p>Open browser console to see debug logs</p>
            <p>Test operations should automatically refresh the residents list</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AutoRefreshTest;
