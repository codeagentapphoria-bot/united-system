/**
 * ClassificationGuide.tsx
 *
 * Shown in ResidentClassificationsForm when no classification types
 * are available for the municipality. Provides guidance on how to
 * configure classification types (BIMS admin does this via BIMS Settings).
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Info } from 'lucide-react';

const ClassificationGuide = () => {
  return (
    <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Info className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <CardTitle className="text-lg text-blue-900">
              No Classification Types Available
            </CardTitle>
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
                Classification types let you categorize residents as Senior Citizen,
                Person with Disability, Student, Solo Parent, and more. Classification
                types are configured by a BIMS administrator via the BIMS Settings page.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-medium text-blue-900">Available Classification Types:</h4>
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
              College Student
            </Badge>
          </div>
        </div>

        <p className="text-xs text-blue-600">
          To add or manage classification types, contact your BIMS administrator
          or visit the Classification Types section in BIMS Settings.
        </p>
      </CardContent>
    </Card>
  );
};

export default ClassificationGuide;
