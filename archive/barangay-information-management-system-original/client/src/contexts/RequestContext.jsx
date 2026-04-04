import React, { createContext, useContext, useState } from "react";
import api from "@/utils/api";
import { handleError } from "@/utils/errorHandler";
import { toast } from "@/hooks/use-toast";

const RequestContext = createContext(undefined);

export function RequestProvider({ children }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);

  // Submit a new certificate request
  const submitCertificateRequest = async (requestData) => {
    setLoading(true);
    try {
      const response = await api.post(
        "/public/requests/certificate",
        requestData
      );

      const newRequest = {
        id: response.data.data.id,
        uuid: response.data.data.uuid,
        tracking_id: response.data.data.tracking_id || response.data.data.uuid,
        type: "certificate",
        status: "pending",
        submittedAt: new Date().toISOString(),
        ...requestData,
      };

      setRequests((prev) => [...prev, newRequest]);

      toast({
        title: "Certificate request submitted successfully!",
        description: `Your tracking ID: ${newRequest.tracking_id}`,
        duration: 8000, // Show longer so user can copy
      });

      return newRequest;
    } catch (error) {
      handleError(error, "Submit Certificate Request");
      toast({
        title: "Failed to submit request",
        description: "Please try again or contact the barangay office.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Submit a new appointment request
  const submitAppointmentRequest = async (requestData) => {
    setLoading(true);
    try {
      const response = await api.post(
        "/public/requests/appointment",
        requestData
      );

      const newRequest = {
        id: response.data.data.id,
        uuid: response.data.data.uuid,
        tracking_id: response.data.data.tracking_id || response.data.data.uuid,
        type: "appointment",
        status: "pending",
        submittedAt: new Date().toISOString(),
        ...requestData,
      };

      setRequests((prev) => [...prev, newRequest]);

      toast({
        title: "Appointment request submitted successfully!",
        description: `Your tracking ID: ${newRequest.tracking_id}`,
        duration: 8000, // Show longer so user can copy
      });

      return newRequest;
    } catch (error) {
      handleError(error, "Submit Appointment Request");
      toast({
        title: "Failed to submit request",
        description: "Please try again or contact the barangay office.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Track a request by UUID
  const trackRequest = async (trackingId) => {
    setLoading(true);
    try {
      // Use the tracking UUID to fetch request details
      const response = await api.get(`/public/track/${trackingId}`);
      return response.data.data;
    } catch (error) {
      handleError(error, "Track Request");
      toast({
        title: "Failed to track request",
        description: "Please check your tracking ID and try again.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Get all requests for a resident (if authenticated)
  const getMyRequests = async () => {
    setLoading(true);
    try {
      const response = await api.get("/public/requests/my-requests");
      setRequests(response.data.data || []);
      return response.data.data;
    } catch (error) {
      handleError(error, "Fetch My Requests");
      return [];
    } finally {
      setLoading(false);
    }
  };

  const value = {
    requests,
    loading,
    submitCertificateRequest,
    submitAppointmentRequest,
    trackRequest,
    getMyRequests,
  };

  return (
    <RequestContext.Provider value={value}>{children}</RequestContext.Provider>
  );
}

export function useRequest() {
  const context = useContext(RequestContext);
  if (context === undefined) {
    throw new Error("useRequest must be used within a RequestProvider");
  }
  return context;
}
