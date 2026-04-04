import { Layout } from "@/components/common/Layout";
import BarangayGeoMap from "@/components/common/BarangayGeoMap";
import {
  MapPin,
  Navigation,
  Info,
  Building,
  Users,
  Phone,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBarangay } from "@/contexts/BarangayContext";

const Map = () => {
  const { selectedBarangay } = useBarangay();

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-8 sm:mb-12 animate-fade-in">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-3 sm:mb-4">
              {selectedBarangay
                ? `${selectedBarangay.name} Barangay Map`
                : "Municipality Map"}
            </h1>
            <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto">
              {selectedBarangay
                ? `Explore ${selectedBarangay.name} with detailed boundaries, facilities, and landmarks.`
                : "Explore our barangay boundaries and discover important locations, facilities, and landmarks in your community."}
            </p>
          </div>

          {/* Map Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 animate-slide-up">
            <div className="bg-gradient-card rounded-xl p-6 shadow-soft text-center">
              <div className="p-3 bg-primary/10 rounded-lg w-fit mx-auto mb-4">
                <Building className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">
                {selectedBarangay
                  ? "Barangay Boundaries"
                  : "Municipality Boundaries"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {selectedBarangay
                  ? "View detailed boundaries and administrative information for your barangay."
                  : "View detailed barangay boundaries and administrative information with population statistics."}
              </p>
            </div>

            <div className="bg-gradient-card rounded-xl p-6 shadow-soft text-center">
              <div className="p-3 bg-accent/10 rounded-lg w-fit mx-auto mb-4">
                <MapPin className="w-6 h-6 text-accent" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">
                {selectedBarangay ? "Local Facilities" : "Key Locations"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {selectedBarangay
                  ? "Find offices, health centers, schools, and community facilities in your barangay."
                  : "Find barangay offices, health centers, schools, and community facilities in your area."}
              </p>
            </div>

            <div className="bg-gradient-card rounded-xl p-6 shadow-soft text-center">
              <div className="p-3 bg-royal/10 rounded-lg w-fit mx-auto mb-4">
                <Users className="w-6 h-6 text-royal" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">
                Community Data
              </h3>
              <p className="text-sm text-muted-foreground">
                {selectedBarangay
                  ? "Access real-time population, household, and family statistics for your barangay."
                  : "Access real-time population, household, and family statistics for each barangay."}
              </p>
            </div>
          </div>

          {/* Interactive Map */}
          <div className="animate-slide-up" style={{ animationDelay: "0.3s" }}>
            <BarangayGeoMap />
          </div>

          {/* Additional Information */}
          <div
            className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 animate-slide-up"
            style={{ animationDelay: "0.6s" }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="w-5 h-5" />
                  How to Use the Map
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-muted-foreground">
                  <li>
                    • Click on any barangay area to view detailed information
                  </li>
                  <li>• Hover over boundaries to highlight specific areas</li>
                  <li>• Use the layer control to switch between map types</li>
                  <li>• Zoom in/out to explore different levels of detail</li>
                  {selectedBarangay && (
                    <li>
                      • Click on facility markers to view location details
                    </li>
                  )}
                  <li>
                    • View population and household statistics for each barangay
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Navigation className="w-5 h-5" />
                  Map Features
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded"></div>
                    <span className="text-sm">
                      {selectedBarangay
                        ? "Barangay boundaries"
                        : "Barangay boundaries with detailed information"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-300 rounded opacity-30"></div>
                    <span className="text-sm">
                      Interactive areas with hover effects
                    </span>
                  </div>
                  {selectedBarangay && (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🏛️</span>
                        <span className="text-sm">
                          Government offices and facilities
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🏫</span>
                        <span className="text-sm">
                          Educational institutions
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🏥</span>
                        <span className="text-sm">
                          Health centers and medical facilities
                        </span>
                      </div>
                    </>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📊</span>
                    <span className="text-sm">
                      Real-time statistics and contact information
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🗺️</span>
                    <span className="text-sm">
                      Multiple map layers (Street, Satellite, Topo)
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contact Information */}
          <div
            className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 animate-slide-up"
            style={{ animationDelay: "0.9s" }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="w-5 h-5" />
                  Need Assistance?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  {selectedBarangay
                    ? `Having trouble finding a specific location in ${selectedBarangay.name} or need more information? Contact the barangay office for assistance.`
                    : "Having trouble finding a specific location or need more information about a barangay? Contact the barangay office for assistance."}
                </p>
                {selectedBarangay && (
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 text-primary mr-2" />
                      <span className="text-muted-foreground">
                        {selectedBarangay.address || "Barangay Hall"}
                      </span>
                    </div>
                    {selectedBarangay.contactNumber &&
                      selectedBarangay.contactNumber !== "N/A" && (
                        <div className="flex items-center">
                          <span className="w-4 h-4 text-primary mr-2">📞</span>
                          <span className="text-muted-foreground">
                            {selectedBarangay.contactNumber}
                          </span>
                        </div>
                      )}
                    {selectedBarangay.email && (
                      <div className="flex items-center">
                        <span className="w-4 h-4 text-primary mr-2">✉️</span>
                        <span className="text-muted-foreground">
                          {selectedBarangay.email}
                        </span>
                      </div>
                    )}
                    {(!selectedBarangay.contactNumber ||
                      selectedBarangay.contactNumber === "N/A") &&
                      !selectedBarangay.email && (
                        <div className="flex items-center">
                          <span className="w-4 h-4 text-yellow-500 mr-2">
                            ⚠️
                          </span>
                          <span className="text-yellow-600 text-xs">
                            Contact information not available
                          </span>
                        </div>
                      )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Community Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  {selectedBarangay
                    ? `Access comprehensive community data including population statistics, household information, and administrative details for ${selectedBarangay.name}.`
                    : "Access comprehensive community data including population statistics, household information, and administrative details for all barangays."}
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center">
                    <span className="w-4 h-4 text-primary mr-2">📊</span>
                    <span className="text-muted-foreground">
                      Real-time population and household data
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-4 h-4 text-primary mr-2">🏛️</span>
                    <span className="text-muted-foreground">
                      {selectedBarangay
                        ? "Barangay administrative information"
                        : "Barangay administrative information"}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-4 h-4 text-primary mr-2">📍</span>
                    <span className="text-muted-foreground">
                      Precise geographical boundaries
                    </span>
                  </div>
                  {selectedBarangay && (
                    <div className="flex items-center">
                      <span className="w-4 h-4 text-primary mr-2">🏢</span>
                      <span className="text-muted-foreground">
                        Local facilities and landmarks
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Barangay Selection Notice */}
          {!selectedBarangay && (
            <div
              className="mt-8 animate-slide-up"
              style={{ animationDelay: "1.2s" }}
            >
              <Card className="border-yellow-200 bg-yellow-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-yellow-800">
                    <AlertCircle className="w-5 h-5" />
                    Select a Barangay for Detailed View
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-yellow-700 mb-4">
                    To view detailed facilities, landmarks, and
                    barangay-specific information, please select a barangay from
                    the dropdown in the header.
                  </p>
                  <div className="flex items-center gap-2 text-sm text-yellow-600">
                    <span>📍</span>
                    <span>Use the barangay selector in the navigation bar</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Map;
