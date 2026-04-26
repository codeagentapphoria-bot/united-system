import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldOff } from 'lucide-react';
import { useAllowedPages } from '@/context/AllowedPagesContext';

interface AccessDeniedProps {
  pagePath?: string;
  message?: string;
}

export const AccessDenied: React.FC<AccessDeniedProps> = ({ pagePath, message }) => {
  const navigate = useNavigate();
  const { allowedPaths } = useAllowedPages();

  const handleGoToDashboard = () => {
    // Find the first allowed page to navigate to
    const firstAllowedPath = Array.from(allowedPaths)[0];
    if (firstAllowedPath) {
      navigate(firstAllowedPath);
    } else {
      // Fallback to logout if no pages available
      navigate('/admin/login');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <ShieldOff className="h-12 w-12 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Access Denied</CardTitle>
          <CardDescription>
            {message || (pagePath
              ? `You don't have permission to access this page.`
              : `You don't have permission to view this content.`)}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button onClick={handleGoToDashboard} variant="default">
            Go to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
