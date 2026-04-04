import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  BookOpen, 
  Users, 
  Building, 
  MapPin, 
  FileText, 
  Package, 
  Heart, 
  Settings, 
  Crown, 
  Activity, 
  Globe, 
  Archive, 
  MessageSquare,
  Home,
  CheckCircle,
  AlertCircle,
  Info,
  Lightbulb,
  ArrowRight,
  Download,
  Video,
  HelpCircle
} from 'lucide-react';
import useRoles from '@/hooks/useRoles';

const GuidePage = () => {
  const { role } = useRoles();
  const [activeTab, setActiveTab] = useState('overview');

  const isMunicipality = role === 'municipality';

  const municipalityGuide = {
    overview: {
      title: "Municipality Administrator Guide",
      description: "Complete guide for managing multiple barangays and municipality-wide operations",
      sections: [
        {
          title: "System Overview",
          content: "As a Municipality Administrator, you have oversight of all barangays within your municipality. You can view aggregated data, manage barangay accounts, and monitor activities across all barangays.",
          icon: Home,
          color: "bg-blue-100 text-blue-700"
        },
        {
          title: "Key Responsibilities",
          content: "Manage barangay accounts, oversee data quality, generate municipality-wide reports, and ensure system compliance across all barangays.",
          icon: Crown,
          color: "bg-purple-100 text-purple-700"
        }
      ]
    },
    features: [
      {
        title: "Dashboard",
        description: "View comprehensive municipality-wide statistics and demographics",
        icon: Home,
        path: "/admin/municipality/dashboard",
        tips: [
          "Monitor total population across all barangays",
          "View demographic charts and statistics",
          "Track employment and education data",
          "Filter data by barangay"
        ]
      },
      {
        title: "Residents Management",
        description: "View and search resident information across all barangays",
        icon: Users,
        path: "/admin/municipality/residents",
        tips: [
          "Search residents across all barangays",
          "View resident details and classifications",
          "Monitor demographic data quality",
          "Export resident information"
        ]
      },
      {
        title: "Households Management",
        description: "Manage household information and family structures",
        icon: Building,
        path: "/admin/municipality/households",
        tips: [
          "View household distribution by barangay",
          "Monitor family size statistics",
          "Track household composition changes",
          "Generate household reports"
        ]
      },
      {
        title: "Pets Management",
        description: "View and monitor pet registrations across barangays",
        icon: Heart,
        path: "/admin/municipality/pets",
        tips: [
          "View pet registrations from all barangays",
          "Monitor pet species distribution",
          "Track pet ownership statistics",
          "Generate QR codes for pet identification"
        ]
      },
      {
        title: "Barangay Management",
        description: "Manage barangay accounts and monitor operations",
        icon: Building,
        path: "/admin/municipality/barangays",
        tips: [
          "View all barangays in the municipality",
          "Monitor barangay statistics and data",
          "Track barangay official information",
          "View organizational charts"
        ]
      },
      {
        title: "Geographical Map",
        description: "Interactive map showing barangay boundaries and data",
        icon: Globe,
        path: "/admin/municipality/geomap",
        tips: [
          "View barangay boundaries and locations",
          "Visualize resident distribution",
          "Analyze geographic data patterns",
          "Export map data for external use"
        ]
      },
      {
        title: "Accounts Management",
        description: "Manage user accounts and permissions",
        icon: Users,
        path: "/admin/municipality/accounts",
        tips: [
          "Create and manage user accounts",
          "Assign appropriate permissions",
          "Monitor user activity and login history",
          "Reset passwords and manage access"
        ]
      },
      {
        title: "Activities Log",
        description: "Monitor system activities and user actions",
        icon: Activity,
        path: "/admin/municipality/activities",
        tips: [
          "Track all system activities",
          "Monitor user actions and changes",
          "Generate activity reports",
          "Identify unusual patterns or issues"
        ]
      },
      {
        title: "Settings",
        description: "Configure system settings and preferences",
        icon: Settings,
        path: "/admin/municipality/settings",
        tips: [
          "Configure system parameters",
          "Manage notification settings",
          "Update profile information",
          "Configure data export options"
        ]
      }
    ]
  };

  const barangayGuide = {
    overview: {
      title: "Barangay Administrator Guide",
      description: "Complete guide for managing your barangay's information and operations",
      sections: [
        {
          title: "System Overview",
          content: "As a Barangay Administrator, you manage all aspects of your barangay's information including residents, households, pets, and administrative tasks.",
          icon: Home,
          color: "bg-green-100 text-green-700"
        },
        {
          title: "Key Responsibilities",
          content: "Maintain accurate resident records, manage household information, track pet registrations, handle requests, and ensure data quality.",
          icon: Crown,
          color: "bg-purple-100 text-purple-700"
        }
      ]
    },
    features: [
      {
        title: "Dashboard",
        description: "View local barangay statistics and demographics",
        icon: Home,
        path: "/admin/barangay/dashboard",
        tips: [
          "Monitor local population statistics",
          "View demographic charts and data",
          "Track employment and education trends",
          "Filter data by barangay"
        ]
      },
      {
        title: "Residents Management",
        description: "Add, edit, and manage resident information with classifications",
        icon: Users,
        path: "/admin/barangay/residents",
        tips: [
          "Add new residents with complete information",
          "Upload resident photos for identification",
          "Classify residents by various criteria",
          "Generate QR codes for residents",
          "Export resident data and generate PDFs"
        ]
      },
      {
        title: "Households Management",
        description: "Manage household information and family structures",
        icon: Building,
        path: "/admin/barangay/households",
        tips: [
          "Create household records",
          "Add family members to households",
          "Track household composition changes",
          "Manage household classifications",
          "Generate household reports"
        ]
      },
      {
        title: "Pets Management",
        description: "Register and manage pet information with QR codes",
        icon: Heart,
        path: "/admin/barangay/pets",
        tips: [
          "Add new pets with complete information",
          "Upload pet photos for identification",
          "Generate QR codes for pet tracking",
          "Edit pet details and images",
          "Filter pets by species and barangay"
        ]
      },
      {
        title: "Officials Management",
        description: "Manage barangay officials and their roles",
        icon: Crown,
        path: "/admin/barangay/officials",
        tips: [
          "Add and manage barangay officials",
          "Assign roles and responsibilities",
          "Track official terms and positions",
          "Maintain official contact information"
        ]
      },
      {
        title: "Requests Management",
        description: "Process resident certificate and document requests",
        icon: MessageSquare,
        path: "/admin/barangay/requests",
        tips: [
          "Process resident certificate requests",
          "Track request status and progress",
          "Generate and issue certificates",
          "Manage document request workflow"
        ]
      },
      {
        title: "Archives",
        description: "Store and manage historical records",
        icon: Archive,
        path: "/admin/barangay/archives",
        tips: [
          "Archive old or inactive records",
          "Maintain historical data",
          "Search archived information",
          "Restore records when needed"
        ]
      },
      {
        title: "Inventory Management",
        description: "Track barangay assets and equipment",
        icon: Package,
        path: "/admin/barangay/inventory",
        tips: [
          "Record barangay assets and equipment",
          "Track inventory status and condition",
          "Monitor asset maintenance",
          "Generate inventory reports"
        ]
      },
      {
        title: "Geographical Map",
        description: "Interactive map showing barangay boundaries and data",
        icon: Globe,
        path: "/admin/barangay/geomap",
        tips: [
          "View barangay boundaries",
          "Visualize resident locations",
          "Analyze geographic distribution",
          "Export map data"
        ]
      },
      {
        title: "Accounts Management",
        description: "Manage user accounts and permissions",
        icon: Users,
        path: "/admin/barangay/accounts",
        tips: [
          "Create and manage user accounts",
          "Assign appropriate permissions",
          "Monitor user activity",
          "Manage access controls"
        ]
      },
      {
        title: "Activities Log",
        description: "Monitor system activities and user actions",
        icon: Activity,
        path: "/admin/barangay/activities",
        tips: [
          "Track all system activities",
          "Monitor user actions",
          "Generate activity reports",
          "Identify data changes"
        ]
      },
      {
        title: "Settings",
        description: "Configure system settings and preferences",
        icon: Settings,
        path: "/admin/barangay/settings",
        tips: [
          "Configure system parameters",
          "Manage notification settings",
          "Update profile information",
          "Configure data export options"
        ]
      }
    ]
  };

  const currentGuide = isMunicipality ? municipalityGuide : barangayGuide;

  const quickStartSteps = [
    {
      step: 1,
      title: "Complete Setup",
      description: "Ensure your account setup is complete with all required information",
      icon: CheckCircle,
      color: "text-green-600"
    },
    {
      step: 2,
      title: "Add Initial Data",
      description: isMunicipality 
        ? "Create barangay accounts and send setup invitations" 
        : "Add your first residents and households",
      icon: Users,
      color: "text-blue-600"
    },
    {
      step: 3,
      title: "Configure Settings",
      description: "Review and configure system settings according to your needs",
      icon: Settings,
      color: "text-purple-600"
    },
    {
      step: 4,
      title: "Explore Features",
      description: "Familiarize yourself with all available features and tools",
      icon: BookOpen,
      color: "text-orange-600"
    }
  ];

  const bestPractices = [
    {
      title: "Data Quality",
      description: "Always ensure accurate and complete information when adding records",
      icon: CheckCircle,
      color: "bg-green-100 text-green-700"
    },
    {
      title: "Regular Updates",
      description: "Keep resident and household information up to date",
      icon: Activity,
      color: "bg-blue-100 text-blue-700"
    },
    {
      title: "Backup Data",
      description: "Regularly export important data for backup purposes",
      icon: Download,
      color: "bg-purple-100 text-purple-700"
    },
    {
      title: "User Training",
      description: "Train staff members on proper system usage and data entry",
      icon: Users,
      color: "bg-orange-100 text-orange-700"
    }
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-800">
            {currentGuide.overview.title}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {currentGuide.overview.description}
          </p>
        </div>
        <Badge variant="outline" className="text-xs shrink-0">
          {isMunicipality ? 'Municipality' : 'Barangay'} Admin
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="quickstart">Quick Start</TabsTrigger>
          <TabsTrigger value="best-practices">Best Practices</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {currentGuide.overview.sections.map((section, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${section.color}`}>
                      <section.icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-lg">{section.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-gray-600 dark:text-gray-400">
                    {section.content}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Info className="h-5 w-5 text-blue-600" />
                <span>System Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-2">
                    Your Role
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {isMunicipality 
                      ? "Municipality Administrator with oversight of all barangays"
                      : "Barangay Administrator managing local operations"
                    }
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-2">
                    Access Level
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {isMunicipality 
                      ? "Full system access with barangay management capabilities"
                      : "Complete barangay data management and administrative functions"
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Features Tab */}
        <TabsContent value="features" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {currentGuide.features.map((feature, index) => (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
                      <feature.icon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </div>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                      <Lightbulb className="h-4 w-4 mr-1 text-yellow-600" />
                      Tips & Best Practices
                    </h4>
                    <ul className="space-y-2">
                      {feature.tips.map((tip, tipIndex) => (
                        <li key={tipIndex} className="text-sm text-gray-600 dark:text-gray-400 flex items-start">
                          <ArrowRight className="h-3 w-3 mr-2 mt-0.5 text-gray-400 flex-shrink-0" />
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => window.location.href = feature.path}
                  >
                    Open {feature.title}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Quick Start Tab */}
        <TabsContent value="quickstart" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <HelpCircle className="h-5 w-5 text-green-600" />
                <span>Getting Started</span>
              </CardTitle>
              <CardDescription>
                Follow these steps to get started with the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {quickStartSteps.map((step, index) => (
                  <div key={index} className="flex items-start space-x-4">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center ${step.color}`}>
                      <step.icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        Step {step.step}: {step.title}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {step.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                <span>Important Notes</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-orange-800 dark:text-orange-200">
                      Data Security
                    </h4>
                    <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                      Always log out when finished and never share your login credentials. 
                      The system contains sensitive personal information that must be protected.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-blue-800 dark:text-blue-200">
                      Support
                    </h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      If you encounter any issues or need assistance, contact your system administrator 
                      or refer to the technical documentation.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Best Practices Tab */}
        <TabsContent value="best-practices" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {bestPractices.map((practice, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${practice.color}`}>
                      <practice.icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-lg">{practice.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-gray-600 dark:text-gray-400">
                    {practice.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Video className="h-5 w-5 text-purple-600" />
                <span>Training Resources</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="flex items-center space-x-3">
                <Info className="h-5 w-5 text-blue-600" />
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Not Available Yet
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    This section is not available yet. Training resources will be provided soon.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default GuidePage;
