import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Home, Map, FileText, Users, ArrowLeft, Search } from "lucide-react";
import logger from "@/utils/logger";
import { PUBLIC_ROUTES } from "@/constants/routes";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    logger.error(
      "404 Error: User attempted to access non-existent route:",
      null,
      "Routing"
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-2xl w-full">
        <Card className="border-0 shadow-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <CardContent className="p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-red-100 dark:bg-red-900/20 rounded-full mb-6">
                <Search className="w-12 h-12 text-red-500" />
              </div>
              <h1 className="text-6xl font-bold text-gray-800 dark:text-gray-100 mb-2">
                404
              </h1>
              <h2 className="text-2xl font-semibold text-gray-700 dark:text-gray-200 mb-2">
                Barangay Page Not Found
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                The barangay information you're looking for seems to have moved or doesn't exist.
              </p>
            </div>

            {/* Error Details */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-8">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                <strong>Requested URL:</strong>
              </p>
              <code className="text-xs bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded break-all">
                {location.pathname}
              </code>
            </div>

            {/* Helpful Actions */}
            <div className="space-y-4 mb-8">
              <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-4">
                Here are some helpful links to get you back on track:
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link to={PUBLIC_ROUTES.HOME}>
                  <Button className="w-full h-12 bg-green-600 hover:bg-green-700 text-white" variant="default">
                    <Home className="w-4 h-4 mr-2" />
                    Go to Homepage
                  </Button>
                </Link>
                
                <Link to={PUBLIC_ROUTES.MAP}>
                  <Button className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white" variant="default">
                    <Map className="w-4 h-4 mr-2" />
                    View Barangay Map
                  </Button>
                </Link>
                
                <Link to={PUBLIC_ROUTES.REQUEST}>
                  <Button className="w-full h-12 bg-orange-600 hover:bg-orange-700 text-white" variant="default">
                    <FileText className="w-4 h-4 mr-2" />
                    Request Certificates
                  </Button>
                </Link>
                
                <Link to={PUBLIC_ROUTES.OFFICIALS}>
                  <Button className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white" variant="default">
                    <Users className="w-4 h-4 mr-2" />
                    Meet Our Officials
                  </Button>
                </Link>
              </div>
            </div>

            {/* Additional Help */}
            <div className="text-center">
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Can't find what you're looking for?
              </p>
              <Link to={PUBLIC_ROUTES.CONTACT}>
                <Button variant="outline" className="border-gray-300 dark:border-gray-600">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Contact Barangay Office
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NotFound;
