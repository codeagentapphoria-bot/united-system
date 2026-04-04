import api from "@/utils/api";

export async function buildSetupLink({
  barangayName,
  barangayCode,
  barangayId,
  fullName,
  email,
}) {
  try {
    // Request secure token from backend
    const response = await api.post("/generate-setup-token", {
      barangayId,
      barangayName,
      barangayCode,
      fullName,
      email,
    });
    
    return response.data.data.setupLink;
  } catch (error) {
    console.error("Failed to generate secure setup link, falling back to URL parameters:", error);
    
    // Fallback to old method if token generation fails
    const params = new URLSearchParams({
      barangayName,
      barangayCode,
      fullName,
      email,
    });
    if (barangayId) params.append("barangayId", barangayId);
    return `${window.location.origin}/setup-account?${params.toString()}`;
  }
}
