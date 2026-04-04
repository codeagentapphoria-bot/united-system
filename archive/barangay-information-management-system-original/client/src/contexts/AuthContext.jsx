import { useState, useEffect, createContext, useContext } from "react";
import api from "@/utils/api";
import { handleErrorSilently } from "@/utils/errorHandler";
import logger from "@/utils/logger";
import {
  getToken,
  setToken,
  removeToken,
  decodeToken,
} from "@/constants/token";
import { toast } from "@/hooks/use-toast";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [state, setState] = useState({
    user: null,
    isAuthenticated: false,
    loading: true,
    error: null,
    isSetup: false,
    barangayData: null,
    isInitialized: false,
    setupLoading: false,
  });

  const checkSetup = async (role, barangayId = null) => {
    if (role === "municipality") {
      try {
        const { data } = await api.get("/municipality", {
          headers: {
            'x-skip-cache': 'true' // Bypass cache to get fresh data
          }
        });
        const municipalityData = Array.isArray(data.data)
          ? data.data[0]
          : data.data;
        const isSetup = Boolean(
          municipalityData && municipalityData.municipality_name && municipalityData.municipality_code && municipalityData.municipality_logo_path
        );
        
        return {
          isSetup,
          data: municipalityData,
        };
      } catch (err) {
        handleErrorSilently(err, "Municipality Setup Check");
        return { isSetup: false, data: null };
      }
    }
    if (role === "barangay") {
      if (!barangayId) {
        logger.error("Barangay ID is required for barangay setup check", null, "Setup Check");
        throw new Error("Barangay ID is required for barangay setup check");
      }
      try {
        setState((prev) => ({ ...prev, barangayData: null }));
        const { data } = await api.get(`/${barangayId}/barangay`, {
          headers: {
            'x-skip-cache': 'true' // Bypass cache to get fresh data
          }
        });
        setState((prev) => ({ ...prev, barangayData: data.data }));
        
        const isSetup = Boolean(data.data && data.data.barangay_name && data.data.barangay_code && data.data.email && data.data.barangay_logo_path);
        
        return {
          isSetup,
          data: data.data,
        };
      } catch (err) {
        setState((prev) => ({ ...prev, barangayData: null }));
        return { isSetup: false, data: null };
      }
    }
    return { isSetup: false, data: null };
  };

  const updateSetupStatus = async (user) => {
    if (!user) {
      setState((prev) => ({
        ...prev,
        isSetup: false,
        barangayData: null,
        setupLoading: false,
      }));
      return;
    }

    setState((prev) => ({ ...prev, setupLoading: true, isSetup: false }));

    const role = user.target_type;
    let isSetup = false;

    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Setup check timeout")), 10000);
      });

      const setupPromise = (async () => {
        if (role === "municipality") {
          const result = await checkSetup("municipality");
          isSetup = result.isSetup;
        } else if (role === "barangay") {
          const result = await checkSetup("barangay", user.target_id);
          isSetup = result.isSetup;
        }
      })();

      await Promise.race([setupPromise, timeoutPromise]);
      setState((prev) => ({ ...prev, isSetup, setupLoading: false }));
    } catch (err) {
      handleErrorSilently(err, "Update Setup Status");
      setState((prev) => ({ ...prev, isSetup: false, setupLoading: false }));
    }
  };

  const refreshToken = async () => {
    try {
      const token = getToken();
      if (!token) return null;

      const { data } = await api.post("/auth/refresh", {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (data.status === "success") {
        setToken(data.token);
        return data.token;
      }
      return null;
    } catch (err) {
      logger.warn("Token refresh failed:", err.message);
      return null;
    }
  };

  const initializeAuth = async () => {
    const token = getToken();
    if (!token) {
      setState((prev) => ({
        ...prev,
        loading: false,
        isSetup: false,
        isInitialized: true,
      }));
      return;
    }
    try {
      const decoded = decodeToken(token);
      const { data } = await api.get("/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setState({
        user: data.data.user,
        isAuthenticated: true,
        loading: false,
        error: null,
        isSetup: false,
        barangayData: null,
        isInitialized: true,
        setupLoading: true,
      });
      updateSetupStatus(data.data.user);
    } catch (err) {
      // Try to refresh token if auth fails
      if (err.response?.status === 401) {
        logger.info("Token expired, attempting refresh...");
        const newToken = await refreshToken();
        if (newToken) {
          try {
            const { data } = await api.get("/auth/me", {
              headers: { Authorization: `Bearer ${newToken}` },
            });
            setState({
              user: data.data.user,
              isAuthenticated: true,
              loading: false,
              error: null,
              isSetup: false,
              barangayData: null,
              isInitialized: true,
              setupLoading: true,
            });
            updateSetupStatus(data.data.user);
            return;
          } catch (refreshErr) {
            logger.warn("Token refresh failed:", refreshErr.message);
          }
        }
      }
      
      handleErrorSilently(err, "Auth Initialization");
      removeToken();
      setState({
        user: null,
        isAuthenticated: false,
        loading: false,
        error: err.message,
        isSetup: false,
        barangayData: null,
        isInitialized: true,
        setupLoading: false,
      });
    }
  };

  useEffect(() => {
    initializeAuth();
    // eslint-disable-next-line
  }, []);

  const login = async (email, password) => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      const { data } = await api.post("/auth/login", { email, password });
      setToken(data.token);
      setState({
        user: data.data.user,
        isAuthenticated: true,
        loading: false,
        error: null,
        isSetup: false,
        barangayData: null,
        isInitialized: true,
        setupLoading: true,
      });
      updateSetupStatus(data.data.user);
      return { success: true };
    } catch (err) {
      const error = err.response?.data?.message || "Login failed";
      setState((prev) => ({
        ...prev,
        loading: false,
        error,
        isSetup: false,
        isInitialized: true,
      }));
      return { success: false, error };
    }
  };

  const logout = () => {
    removeToken();
    setState({
      user: null,
      isAuthenticated: false,
      loading: false,
      error: null,
      isSetup: false,
      barangayData: null,
      isInitialized: true,
      setupLoading: false,
    });
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });
  };

  if (!state.isInitialized) {
    return <div>Initializing authentication...</div>;
  }

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        checkSetup,
        updateSetupStatus,
        refreshToken,
        isSetup: state.isSetup,
        barangayData: state.barangayData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
