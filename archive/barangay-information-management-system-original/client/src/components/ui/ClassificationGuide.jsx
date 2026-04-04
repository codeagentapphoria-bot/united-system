import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { Button } from './button';
import { Badge } from './badge';
import { FileText, Settings, Plus, ArrowRight, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getRoleRoutes } from '@/constants/routes';
import useAuth from '@/hooks/useAuth';

const ClassificationGuide = ({ onAddClassification }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Get the appropriate routes based on user role
  const roleRoutes = getRoleRoutes(user?.target_type || 'barangay');
  
  // Fallback route in case navigation fails
  const fallbackRoute = '/admin/barangay/settings';

  const handleGoToSettings = () => {
    try {
      if (roleRoutes.SETTINGS) {
        navigate(roleRoutes.SETTINGS);
      } else {
        if (process.env.NODE_ENV === 'development') {
  console.warn('Settings route not found, using fallback');
}
        navigate(fallbackRoute);
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
  console.error('Navigation error:', error);
}
    }
  };

  const handleAddClassification = () => {
    try {
      if (onAddClassification) {
        onAddClassification();
      } else {
        if (roleRoutes.SETTINGS) {
          // Navigate to settings with hash to open classification tab
          const settingsUrl = `${roleRoutes.SETTINGS}#classification`;
          navigate(settingsUrl);
        } else {
          const fallbackUrl = `${fallbackRoute}#classification`;
          navigate(fallbackUrl);
        }
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
  console.error('Add classification error:', error);
}
    }
  };

  return (
    <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <FileText className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <CardTitle className="text-lg text-blue-900">No Classification Types Available</CardTitle>
            <CardDescription className="text-blue-700">
              Set up classification types to categorize residents effectively
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-white rounded-lg p-4 border border-blue-200">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-2">
              <h4 className="font-medium text-blue-900">What are Classification Types?</h4>
              <p className="text-sm text-blue-700">
                Classification types help you categorize residents based on their characteristics, 
                such as Senior Citizen, Person with Disability, Student, etc. You can also add 
                custom fields for each classification to collect specific information.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-medium text-blue-900">How to add Classification Types:</h4>
          <div className="space-y-2 text-sm text-blue-700">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-medium text-xs">1</div>
              <span>Go to Settings → Classification tab</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-medium text-xs">2</div>
              <span>Click "Add Classification Type"</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-medium text-xs">3</div>
              <span>Enter name, description, and choose a color</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-medium text-xs">4</div>
              <span>Add custom fields if needed (optional)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-medium text-xs">5</div>
              <span>Save and start using the classification</span>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-medium text-blue-900">Example Classification Types:</h4>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
              Senior Citizen
            </Badge>
            <Badge variant="secondary" className="bg-purple-100 text-purple-700 border-purple-200">
              Person with Disability
            </Badge>
            <Badge variant="secondary" className="bg-orange-100 text-orange-700 border-orange-200">
              Solo Parent
            </Badge>
            <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200">
              Student
            </Badge>
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 border-yellow-200">
              OFW
            </Badge>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button 
            onClick={handleGoToSettings}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Settings className="h-4 w-4" />
            Go to Settings
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            onClick={handleAddClassification}
            className="flex items-center gap-2 border-blue-300 text-blue-700 hover:bg-blue-50 hover:text-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add Classification Type
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ClassificationGuide;
