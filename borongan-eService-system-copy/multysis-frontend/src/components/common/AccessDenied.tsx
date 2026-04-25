import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldOff } from 'lucide-react';

interface AccessDeniedProps {
  pagePath?: string;
}

export const AccessDenied: React.FC<AccessDeniedProps> = ({ pagePath }) => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <ShieldOff className="h-12 w-12 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Access Denied</CardTitle>
          <CardDescription>
            {pagePath
              ? `You don't have permission to access this page.`
              : `You don't have permission to view this content.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button onClick={() => navigate('/admin/dashboard')} variant="default">
            Go to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
