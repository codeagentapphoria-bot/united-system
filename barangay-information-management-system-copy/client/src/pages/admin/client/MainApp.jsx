import React from "react";
import { Sidebar } from "@/components/layouts/Sidebar";
import logger from "@/utils/logger";
import { Dashboard } from "@/pages/admin/DashboardPage";
import { ResidentsPage } from "@/pages/admin/ResidentsPage";
import { HouseholdsPage } from "@/pages/admin/HouseholdsPage";
import { PetsPage } from "@/pages/admin/PetsPage";
import { VaccinesPage } from "@/pages/admin/VaccinesPage";
import { ArchivesPage } from "@/pages/admin/ArchivesPage";
import { InventoryPage } from "@/pages/admin/InventoryPage";
import { RequestsPage } from "@/pages/admin/RequestsPage";

import { OfficialsPage } from "@/pages/admin/OfficialsPage";
import { Card } from "@/components/ui/card";
import GeoMap from "@/pages/admin/GeoMapPage";

import AccountsPage from "@/pages/admin/shared/AccountsPage";
// Add this import if BarangaysPage is implemented in the future
// import BarangaysPage from "@/pages/admin/BarangaysPage";

export const MainApp = ({ userType, role, onLogout }) => {
  const [currentPage, setCurrentPage] = React.useState("dashboard");
  logger.debug(userType, role);

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <Dashboard userType={userType} role={role} />;
      case "residents":
        return <ResidentsPage userType={userType} role={role} />;
      case "households":
        return <HouseholdsPage />;
      case "officials":
        return <OfficialsPage />;
      case "archives":
        return <ArchivesPage />;
      case "inventory":
        return <InventoryPage />;

      case "pets":
        return <PetsPage />;
      case "vaccines":
        return <VaccinesPage />;
      case "requests":
        return <RequestsPage />;
      case "barangays":
        // Placeholder since BarangaysPage is empty
        return (
          <PlaceholderPage
            title="Barangays"
            description="Oversee barangay management"
          />
        );
      case "geomap":
        return <GeoMap />;
      case "accounts":
        return <AccountsPage />;
      case "settings":
        return (
          <PlaceholderPage
            title="Settings"
            description="System configuration and preferences"
          />
        );
      default:
        return <Dashboard userType={userType} role={role} />;
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        userType={userType}
        role={role}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        onLogout={onLogout}
      />
      <main className="flex-1 overflow-auto">{renderPage()}</main>
    </div>
  );
};

// Placeholder component for unimplemented pages
const PlaceholderPage = ({ title, description }) => (
  <div className="p-6">
    <div className="max-w-2xl mx-auto text-center">
      <Card className="p-8">
        <h1 className="text-3xl font-bold mb-4">{title}</h1>
        <p className="text-muted-foreground mb-6">{description}</p>
        <div className="text-sm text-muted-foreground">
          This page will be implemented with the backend integration.
          <br />
          Connect to Supabase to enable full functionality.
        </div>
      </Card>
    </div>
  </div>
);
