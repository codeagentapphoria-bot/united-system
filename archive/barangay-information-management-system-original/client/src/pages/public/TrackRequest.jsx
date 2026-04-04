import { Layout } from "@/components/common/Layout";
import { Search, Package, Clock, CheckCircle, AlertCircle, FileText, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import api from "@/utils/api";
import { useToast } from "@/hooks/use-toast";
import { handleError } from "@/utils/errorHandler";

const TrackRequest = () => {
  const [trackingId, setTrackingId] = useState("");
  const [isTracking, setIsTracking] = useState(false);
  const [requestData, setRequestData] = useState(null);
  const [error, setError] = useState("");
  const { toast } = useToast();

  const handleTrack = async () => {
    if (!trackingId.trim()) {
      toast({
        title: "Error",
        description: "Please enter a tracking ID",
        variant: "destructive",
      });
      return;
    }

    setIsTracking(true);
    setError("");
    setRequestData(null);

    try {
      const response = await api.get(`/public/track/${trackingId.trim()}`);
      setRequestData(response.data.data);
      toast({
        title: "Request Found",
        description: "Request tracking information retrieved successfully",
        variant: "default",
      });
    } catch (error) {
      handleError(error, "Track Request");
      setError(error.response?.data?.message || "Request not found");
    } finally {
      setIsTracking(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "in-progress":
        return <Clock className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 py-6 sm:py-12">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-8">
          {/* Header */}
          <div className="text-center mb-8 sm:mb-12 animate-fade-in">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-3 sm:mb-4">
              Track Your Request
            </h1>
            <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto">
              Enter your request tracking ID to monitor the status of your application
              in real-time.
            </p>
          </div>

          {/* Search Section */}
          <div className="bg-gradient-card rounded-xl p-4 sm:p-6 lg:p-8 shadow-soft mb-6 sm:mb-8 animate-slide-up">
            <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-4 sm:mb-6 text-center">
              Track Your Request
            </h3>
            <div className="flex flex-col md:flex-row gap-3 sm:gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                <Input
                  placeholder="Enter your request tracking ID"
                  value={trackingId}
                  onChange={(e) => setTrackingId(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleTrack()}
                  className="pl-9 sm:pl-10 shadow-soft text-sm sm:text-base"
                />
              </div>
              <Button
                onClick={handleTrack}
                disabled={!trackingId || isTracking}
                className="flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base"
              >
                <Package className="w-3 h-3 sm:w-4 sm:h-4" />
                {isTracking ? "Tracking..." : "Track Request"}
              </Button>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-3 sm:mt-4 text-center">
              Use your unique tracking ID (UUID format) to securely track your certificate or appointment requests
            </p>
          </div>

          {/* Results Section */}
          {(requestData || isTracking || error) && (
            <div
              className="animate-slide-up"
              style={{ animationDelay: "0.3s" }}
            >
              {/* Error Display */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 sm:p-6 lg:p-8 shadow-soft mb-6">
                  <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                    <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-500" />
                    <h3 className="text-base sm:text-lg font-semibold text-red-800">Request Not Found</h3>
                  </div>
                  <p className="text-sm sm:text-base text-red-700 mb-3 sm:mb-4">{error}</p>
                  <p className="text-xs sm:text-sm text-red-600">
                    Please check your tracking ID and try again.
                  </p>
                </div>
              )}

              {/* Request Details */}
              {requestData && (
                <div className="bg-gradient-card rounded-xl p-4 sm:p-6 lg:p-8 shadow-soft mb-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
                    <div>
                      <div className="flex items-center gap-1.5 sm:gap-2 mb-2">
                        {requestData.request_type === 'appointment' ? (
                          <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
                        ) : (
                          <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-green-500" />
                        )}
                        <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold text-foreground">
                          {requestData.request_type === 'appointment' 
                            ? 'Appointment Request' 
                            : requestData.certificate_type?.replace(/-/g, ' ') || 'Certificate Request'}
                        </h2>
                      </div>
                      <p className="text-sm sm:text-base text-muted-foreground font-mono break-all">
                        Tracking ID: {requestData.tracking_id}
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <div className="text-xs sm:text-sm text-muted-foreground">Status</div>
                      <div className={`text-base sm:text-lg font-semibold ${
                        requestData.status === 'completed' ? 'text-green-600' :
                        requestData.status === 'approved' ? 'text-blue-600' :
                        requestData.status === 'rejected' ? 'text-red-600' :
                        'text-yellow-600'
                      }`}>
                        {requestData.status?.charAt(0).toUpperCase() + requestData.status?.slice(1)}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <div className="text-xs sm:text-sm text-muted-foreground">
                        Submitted Date
                      </div>
                      <div className="text-sm sm:text-base font-medium">
                        {new Date(requestData.submitted_date).toLocaleDateString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm text-muted-foreground">
                        Last Updated
                      </div>
                      <div className="text-sm sm:text-base font-medium">
                        {new Date(requestData.last_updated).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  {requestData.purpose && (
                    <div className="mt-4 sm:mt-6">
                      <div className="text-xs sm:text-sm text-muted-foreground mb-2">
                        Purpose
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                        <p className="text-sm sm:text-base text-gray-700">{requestData.purpose}</p>
                      </div>
                    </div>
                  )}

                  {requestData.urgency && requestData.request_type === 'certificate' && (
                    <div className="mt-3 sm:mt-4">
                      <div className="text-xs sm:text-sm text-muted-foreground mb-2">
                        Processing Urgency
                      </div>
                      <div className="text-sm sm:text-base font-medium">
                        {requestData.urgency.charAt(0).toUpperCase() + requestData.urgency.slice(1)}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Progress Timeline */}
              {requestData && (
                <div className="bg-gradient-card rounded-xl p-8 shadow-soft">
                  <h3 className="text-xl font-semibold text-foreground mb-6">
                    Request Status Timeline
                  </h3>

                  <div className="space-y-6">
                    {/* Submitted Step */}
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 mt-1">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-green-600">
                            Request Submitted
                          </h4>
                          <span className="text-sm text-muted-foreground">
                            {new Date(requestData.submitted_date).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Your request has been received and is being reviewed
                        </p>
                      </div>
                    </div>

                    {/* Current Status Step */}
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 mt-1">
                        {getStatusIcon(
                          requestData.status === 'pending' ? 'in-progress' :
                          requestData.status === 'approved' ? 'completed' :
                          requestData.status === 'rejected' ? 'completed' :
                          requestData.status === 'completed' ? 'completed' : 'pending'
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className={`font-medium ${
                            requestData.status === 'pending' ? 'text-yellow-600' :
                            requestData.status === 'approved' ? 'text-green-600' :
                            requestData.status === 'rejected' ? 'text-red-600' :
                            requestData.status === 'completed' ? 'text-green-600' : 'text-muted-foreground'
                          }`}>
                            {requestData.status === 'pending' ? 'Under Review' :
                             requestData.status === 'approved' ? 'Request Approved' :
                             requestData.status === 'rejected' ? 'Request Rejected' :
                             requestData.status === 'completed' ? 'Request Completed' : 'Processing'}
                          </h4>
                          <span className="text-sm text-muted-foreground">
                            {new Date(requestData.last_updated).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {requestData.status === 'pending' ? 'Your request is currently being reviewed by barangay officials' :
                           requestData.status === 'approved' ? 'Your request has been approved and is ready for processing' :
                           requestData.status === 'rejected' ? 'Your request has been rejected. Please contact barangay officials for more information' :
                           requestData.status === 'completed' ? 'Your request has been completed successfully' : 'Processing your request'}
                        </p>
                      </div>
                    </div>

                    {/* Future Steps */}
                    {requestData.status === 'pending' && (
                      <>
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 mt-1">
                            <AlertCircle className="w-5 h-5 text-gray-400" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium text-muted-foreground">
                                Final Processing
                              </h4>
                              <span className="text-sm text-muted-foreground">
                                TBD
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              Final review and processing of your request
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 mt-1">
                            <AlertCircle className="w-5 h-5 text-gray-400" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h4 className="font-medium text-muted-foreground">
                                {requestData.request_type === 'appointment' ? 'Appointment Scheduled' : 'Certificate Ready'}
                              </h4>
                              <span className="text-sm text-muted-foreground">
                                TBD
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {requestData.request_type === 'appointment' 
                                ? 'Your appointment will be scheduled and confirmed' 
                                : 'Your certificate will be prepared and ready for pickup'}
                            </p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      <strong>Note:</strong> Processing times may vary based on
                      application complexity. You will receive email notifications
                      for major status updates.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default TrackRequest;
