import { useState, useEffect } from "react";
import { Layout } from "@/components/common/Layout";
import { handleError } from "@/utils/errorHandler";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Users,
  Network,
  Phone,
  Mail,
  MapPin,
  Calendar,
  User,
  Crown,
  Shield,
  Building,
  Maximize2,
  X,
  Download,
} from "lucide-react";
import { useBarangay } from "@/contexts/BarangayContext";
import api from "@/utils/api";
import { toast } from "@/hooks/use-toast";

const Officials = () => {
  const { selectedBarangay } = useBarangay();
  const [officials, setOfficials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [orgChartPath, setOrgChartPath] = useState(null);
  const [orgChartLoading, setOrgChartLoading] = useState(false);
  const [orgChartModalOpen, setOrgChartModalOpen] = useState(false);

  // Fetch officials data
  const fetchOfficials = async () => {
    if (!selectedBarangay?.id) return;

    setLoading(true);
    setError(null);

    try {
      const res = await api.get(`/public/list/${selectedBarangay.id}/official`);
      setOfficials(res.data.data || []);
    } catch (err) {
      setError("Failed to fetch officials");
      setOfficials([]);
      handleError(err, "Fetch Officials");
    } finally {
      setLoading(false);
    }
  };

  // Fetch organizational chart
  const fetchOrgChart = async () => {
    if (!selectedBarangay?.id) return;

    setOrgChartLoading(true);
    try {
      const response = await api.get(`/public/${selectedBarangay.id}/barangay`);
      const barangay = response.data.data;
      if (barangay.organizational_chart_path) {
        const SERVER_URL =
          import.meta.env.VITE_SERVER_URL || "http://13.211.71.85";
        setOrgChartPath(`${SERVER_URL}/${barangay.organizational_chart_path}`);
      } else {
        setOrgChartPath(null);
      }
    } catch (error) {
      handleError(error, "Fetch Organizational Chart");
      setOrgChartPath(null);
    } finally {
      setOrgChartLoading(false);
    }
  };

  useEffect(() => {
    if (selectedBarangay?.id) {
      fetchOfficials();
      fetchOrgChart();
    }
  }, [selectedBarangay?.id]);

  // Download organizational chart
  const downloadOrgChart = async () => {
    if (!orgChartPath) return;
    
    try {
      const response = await fetch(orgChartPath);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${selectedBarangay?.name || 'barangay'}-organizational-chart.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Success",
        description: "Organizational chart downloaded successfully",
      });
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
  console.error("Download failed:", error);
}
      toast({
        title: "Error",
        description: "Failed to download organizational chart",
        variant: "destructive",
      });
    }
  };

  const getInitials = (firstName, lastName) => {
    const first = firstName?.charAt(0) || "";
    const last = lastName?.charAt(0) || "";
    return `${first}${last}`.toUpperCase();
  };

  const getPositionIcon = (position) => {
    if (
      position?.toLowerCase().includes("captain") ||
      position?.toLowerCase().includes("punong")
    ) {
      return <Crown className="w-4 h-4 text-yellow-600" />;
    }
    if (
      position?.toLowerCase().includes("secretary") ||
      position?.toLowerCase().includes("treasurer")
    ) {
      return <Shield className="w-4 h-4 text-blue-600" />;
    }
    if (
      position?.toLowerCase().includes("councilor") ||
      position?.toLowerCase().includes("kagawad")
    ) {
      return <Building className="w-4 h-4 text-green-600" />;
    }
    return <User className="w-4 h-4 text-gray-600" />;
  };

  const getPositionBadgeColor = (position) => {
    if (
      position?.toLowerCase().includes("captain") ||
      position?.toLowerCase().includes("punong")
    ) {
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300";
    }
    if (
      position?.toLowerCase().includes("secretary") ||
      position?.toLowerCase().includes("treasurer")
    ) {
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300";
    }
    if (
      position?.toLowerCase().includes("councilor") ||
      position?.toLowerCase().includes("kagawad")
    ) {
      return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300";
    }
    return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300";
  };

  if (!selectedBarangay) {
    return (
      <Layout>
        <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 py-6 sm:py-12">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 sm:w-24 sm:h-24 bg-muted rounded-full flex items-center justify-center mb-4 sm:mb-6">
                <Users className="w-8 h-8 sm:w-12 sm:h-12 text-muted-foreground" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-3 sm:mb-4">
                Barangay Officials
              </h1>
              <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto">
                Please select a barangay to view the officials and
                organizational structure.
              </p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 py-6 sm:py-12">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          {/* Header */}
          <div className="text-center mb-8 sm:mb-12 animate-fade-in">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-3 sm:mb-4">
              {selectedBarangay.name} Officials
            </h1>
            <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto">
              Meet the dedicated public servants who work tirelessly to serve
              the community of {selectedBarangay.name}.
            </p>
          </div>

          <Tabs defaultValue="officials" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 sm:mb-8">
              <TabsTrigger
                value="officials"
                className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm"
              >
                <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Officials Directory</span>
                <span className="sm:hidden">Officials</span>
              </TabsTrigger>
              <TabsTrigger value="orgChart" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                <Network className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Organizational Chart</span>
                <span className="sm:hidden">Org Chart</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="officials" className="space-y-6">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-muted-foreground">
                    Loading officials...
                  </div>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-destructive">{error}</div>
                </div>
              ) : officials.length === 0 ? (
                <div className="text-center py-8 sm:py-12">
                  <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-muted rounded-full flex items-center justify-center mb-3 sm:mb-4">
                    <Users className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">
                    No Officials Found
                  </h3>
                  <p className="text-sm sm:text-base text-muted-foreground">
                    Official information for {selectedBarangay.name} is not
                    available at the moment.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {officials.map((official) => (
                    <Card
                      key={official.official_id}
                      className="hover:shadow-lg transition-all duration-300 animate-slide-up"
                    >
                      <CardHeader className="text-center pb-3 sm:pb-4">
                        <div className="flex justify-center mb-3 sm:mb-4">
                          <Avatar className="h-16 w-16 sm:h-20 sm:w-20">
                            <AvatarImage
                              src={
                                official.picture_path
                                  ? `${
                                      import.meta.env.VITE_SERVER_URL ||
                                      "http://13.211.71.85"
                                    }/${official.picture_path.replace(
                                      /\\/g,
                                      "/"
                                    )}`
                                  : undefined
                              }
                              className="object-cover"
                            />
                            <AvatarFallback className="text-sm sm:text-lg">
                              {getInitials(
                                official.first_name,
                                official.last_name
                              )}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                        <div className="flex items-center justify-center gap-1 sm:gap-2 mb-2">
                          {getPositionIcon(official.position)}
                          <Badge
                            className={`${getPositionBadgeColor(official.position)} text-xs sm:text-sm`}
                          >
                            {official.position}
                          </Badge>
                        </div>
                        <CardTitle className="text-base sm:text-lg">
                          {official.first_name} {official.last_name}
                          {official.suffix && ` ${official.suffix}`}
                        </CardTitle>
                        {official.committee && (
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            Committee: {official.committee}
                          </p>
                        )}
                      </CardHeader>
                      <CardContent className="space-y-2 sm:space-y-3">

                        {(official.term_start || official.term_end) && (
                          <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                            <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Term:</span>
                            <span className="font-medium">
                              {official.term_start &&
                                new Date(official.term_start).getFullYear()}
                              {official.term_end &&
                                ` - ${new Date(
                                  official.term_end
                                ).getFullYear()}`}
                            </span>
                          </div>
                        )}
                        {official.responsibilities && (
                          <div className="pt-2 border-t">
                            <p className="text-xs text-muted-foreground">
                              <strong>Responsibilities:</strong>{" "}
                              {official.responsibilities}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="orgChart" className="space-y-4 sm:space-y-6">
              {orgChartLoading ? (
                <div className="flex items-center justify-center h-48 sm:h-64">
                  <div className="text-sm sm:text-base text-muted-foreground">
                    Loading organizational chart...
                  </div>
                </div>
              ) : orgChartPath ? (
                <Card>
                  <CardHeader className="p-4 sm:p-6">
                    <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-base sm:text-lg">
                      <Network className="h-4 w-4 sm:h-5 sm:w-5" />
                      Organizational Structure
                    </CardTitle>
                    <p className="text-sm sm:text-base text-muted-foreground">
                      Official organizational chart of {selectedBarangay.name}
                    </p>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6">
                    <div className="flex flex-col items-center space-y-3 sm:space-y-4">
                      <div className="flex justify-center">
                        <div 
                          className="relative group cursor-pointer rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-all duration-200"
                          onClick={() => setOrgChartModalOpen(true)}
                        >
                          <img
                            src={orgChartPath}
                            alt={`${selectedBarangay.name} Organizational Chart`}
                            className="max-w-full h-auto"
                            style={{ maxHeight: "60vh" }}
                          />
                          {/* Overlay with maximize icon on hover */}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                            <Maximize2 className="h-8 w-8 sm:h-12 sm:w-12 text-white" />
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-center w-full sm:w-auto">
                        <Button
                          variant="outline"
                          onClick={() => setOrgChartModalOpen(true)}
                          className="text-xs sm:text-sm"
                        >
                          <Maximize2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                          <span className="hidden sm:inline">View Full Size</span>
                          <span className="sm:hidden">View Full</span>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="text-center py-8 sm:py-12">
                  <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-muted rounded-full flex items-center justify-center mb-3 sm:mb-4">
                    <Network className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">
                    Organizational Chart Not Available
                  </h3>
                  <p className="text-sm sm:text-base text-muted-foreground">
                    The organizational chart for {selectedBarangay.name} is not
                    available at the moment.
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Organization Chart Image Modal */}
      <Dialog open={orgChartModalOpen} onOpenChange={setOrgChartModalOpen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 overflow-hidden bg-black">
          <div className="relative w-full h-full">
            {/* Close Button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 z-10 bg-black/50 text-white hover:bg-black/70 h-8 w-8 sm:h-10 sm:w-10"
              onClick={() => setOrgChartModalOpen(false)}
            >
              <X className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
            
            {/* Maximized Organization Chart */}
            {orgChartPath ? (
              <div className="w-full h-full flex items-center justify-center">
                <img
                  src={orgChartPath}
                  alt={`${selectedBarangay?.name || 'Barangay'} Organizational Chart - Full Size`}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div className="w-full h-full flex items-center justify-center text-white" style={{ display: 'none' }}>
                  <div className="text-center">
                    <Network className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-2" />
                    <p className="text-sm sm:text-base">Image could not be loaded</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <Network className="h-12 w-12 sm:h-16 sm:w-16 text-white mx-auto mb-2" />
                  <p className="text-sm sm:text-base text-white">No organizational chart available</p>
                </div>
              </div>
            )}
            
            
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default Officials;
