import React from "react";
import useAuth from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import MunicipalitySetupForm from "@/features/municipality/MunicipalitySetupForm";
import BarangaySetupForm from "@/features/barangay/BarangaySetupForm";

const SetupPage = ({ role }) => {
  const { user, updateSetupStatus, checkSetup } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSetupComplete = () => {
    // Check if there's a stored redirect path
    const postSetupRedirect = sessionStorage.getItem("postSetupRedirect");
    if (postSetupRedirect) {
      sessionStorage.removeItem("postSetupRedirect");
      navigate(postSetupRedirect);
    } else {
      // Default redirect based on role
      if (role === "municipality") {
        navigate("/admin/municipality/dashboard");
      } else if (role === "barangay") {
        navigate("/admin/barangay/dashboard");
      }
    }
  };

  if (role === "municipality") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background py-10 px-2">
        <MunicipalitySetupForm
          user={user}
          toast={toast}
          navigate={navigate}
          updateSetupStatus={updateSetupStatus}
          checkSetup={checkSetup}
          onSetupComplete={handleSetupComplete}
        />
      </div>
    );
  }
  if (role === "barangay") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background py-10 px-2">
        <BarangaySetupForm
          user={user}
          toast={toast}
          navigate={navigate}
          updateSetupStatus={updateSetupStatus}
          checkSetup={checkSetup}
          onSetupComplete={handleSetupComplete}
        />
      </div>
    );
  }
  return null;
};

export default SetupPage;
