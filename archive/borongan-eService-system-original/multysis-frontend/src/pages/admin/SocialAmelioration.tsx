import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { adminMenuItems } from '@/config/admin-menu';
import { cn } from '@/lib/utils';
import React, { useEffect, useState } from 'react';
import { FiBookOpen, FiHeart, FiSettings, FiUserCheck, FiUsers } from 'react-icons/fi';
import { useSearchParams } from 'react-router-dom';

// Import tab components
import {
  DashboardTab,
  PWDTab,
  SeniorCitizenTab,
  SettingsTab,
  SoloParentsTab,
  StudentsTab
} from '@/components/social-amelioration';

export const SocialAmelioration: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'dashboard';
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    const current = searchParams.get('tab');
    if (current !== activeTab) {
      setSearchParams({ tab: activeTab });
    }
  }, [activeTab]);

  return (
    <DashboardLayout menuItems={adminMenuItems}>
      <div className={cn("space-y-4") }>
        {/* Header */}
        <div className={cn("flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4") }>
          <div>
            <h2 className={cn("text-2xl font-semibold text-heading-700") }>Social Amelioration</h2>
            <p className={cn("text-sm text-gray-500 mt-1") }>
              Manage social welfare programs and beneficiaries
            </p>
          </div>
        </div>

        {/* Main Content */}
        <Card>
          <CardContent className={cn("p-0") }>
            <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val)} className={cn("w-full") }>
              <div className={cn("border-b border-gray-200") }>
                <TabsList className={cn("h-auto bg-transparent p-0 w-full justify-start") }>
                  <TabsTrigger
                    value="dashboard" 
                    className={cn("flex items-center gap-2 px-6 py-4 data-[state=active]:bg-primary-50 data-[state=active]:text-primary-700 data-[state=active]:border-b-2 data-[state=active]:border-primary-600") }
                  >
                    <FiUsers size={18} />
                    Dashboard
                  </TabsTrigger>
                  <TabsTrigger
                    value="senior-citizen" 
                    className={cn("flex items-center gap-2 px-6 py-4 data-[state=active]:bg-primary-50 data-[state=active]:text-primary-700 data-[state=active]:border-b-2 data-[state=active]:border-primary-600") }
                  >
                    <FiUserCheck size={18} />
                    Senior Citizen
                  </TabsTrigger>
                  <TabsTrigger
                    value="pwd" 
                    className={cn("flex items-center gap-2 px-6 py-4 data-[state=active]:bg-primary-50 data-[state=active]:text-primary-700 data-[state=active]:border-b-2 data-[state=active]:border-primary-600") }
                  >
                    <FiHeart size={18} />
                    PWD
                  </TabsTrigger>
                  <TabsTrigger
                    value="students" 
                    className={cn("flex items-center gap-2 px-6 py-4 data-[state=active]:bg-primary-50 data-[state=active]:text-primary-700 data-[state=active]:border-b-2 data-[state=active]:border-primary-600") }
                  >
                    <FiBookOpen size={18} />
                    Students
                  </TabsTrigger>
                  <TabsTrigger
                    value="solo-parents" 
                    className={cn("flex items-center gap-2 px-6 py-4 data-[state=active]:bg-primary-50 data-[state=active]:text-primary-700 data-[state=active]:border-b-2 data-[state=active]:border-primary-600") }
                  >
                    <FiHeart size={18} />
                    Solo Parents
                  </TabsTrigger>
                  <TabsTrigger
                    value="settings" 
                    className={cn("flex items-center gap-2 px-6 py-4 data-[state=active]:bg-primary-50 data-[state=active]:text-primary-700 data-[state=active]:border-b-2 data-[state=active]:border-primary-600") }
                  >
                    <FiSettings size={18} />
                    Settings
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Tab Contents */}
              <div className={cn("p-6") }>
                <TabsContent value="dashboard" className={cn("mt-0") }>
                  <DashboardTab />
                </TabsContent>
                
                <TabsContent value="senior-citizen" className={cn("mt-0") }>
                  <SeniorCitizenTab />
                </TabsContent>
                
                <TabsContent value="pwd" className={cn("mt-0") }>
                  <PWDTab />
                </TabsContent>
                
                <TabsContent value="students" className={cn("mt-0") }>
                  <StudentsTab />
                </TabsContent>
                
                <TabsContent value="solo-parents" className={cn("mt-0") }>
                  <SoloParentsTab />
                </TabsContent>
                
                <TabsContent value="settings" className={cn("mt-0") }>
                  <SettingsTab />
                </TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};
