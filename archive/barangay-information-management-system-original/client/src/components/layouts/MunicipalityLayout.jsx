import React from "react";
import { SidebarProvider, useSidebar } from "./Sidebar";
import useAuth from "@/hooks/useAuth";
import { useLocation } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";

const MunicipalityLayout = ({ children }) => {
  const { logout, user: { role } = {} } = useAuth();
  const location = useLocation();
  const isSetupPage = location.pathname.split("/").pop() === "setup";

  if (isSetupPage) {
    return <div className="min-h-screen bg-background">{children}</div>;
  }

  return (
    <SidebarProvider userType="municipality" role={role} onLogout={logout}>
      <MainContent>{children}</MainContent>
    </SidebarProvider>
  );
};

// Separate component to use the sidebar context
const MainContent = ({ children }) => {
  const { isCollapsed, isMobile } = useSidebar();

  return (
    <main
      className={`bg-background transition-all duration-300 ease-in-out ${
        isMobile 
          ? "ml-0 pt-16 min-h-screen" // No margin on mobile, but add top padding for header
          : isCollapsed 
            ? "ml-16" 
            : "ml-64"
      }`}
    >
      <div className={`${isMobile ? 'p-2 sm:p-4' : 'p-6'} max-w-full`}>
        {children}
      </div>
    </main>
  );
};

export default MunicipalityLayout;
