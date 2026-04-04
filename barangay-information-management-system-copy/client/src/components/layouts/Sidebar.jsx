import React, { useState, createContext, useContext, useEffect, useMemo, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Home,
  Users,
  Building,
  MapPin,
  FileText,
  Package,
  Heart,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Crown,
  Activity,
  Menu,
  X,
  Clock,
  Globe,
  Archive,
  BookOpen,
  Key,
  Server,
  ClipboardList,
  CreditCard,
  FileBadge2,
} from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";

// Create context for sidebar state
const SidebarContext = createContext();

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

// Sidebar Provider Component
export const SidebarProvider = ({ children, userType, role, onLogout }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const isMobile = useIsMobile();

  // Auto-close mobile sidebar when screen size changes
  useEffect(() => {
    if (!isMobile && isMobileOpen) {
      setIsMobileOpen(false);
    }
  }, [isMobile, isMobileOpen]);

  return (
    <SidebarContext.Provider value={{ 
      isCollapsed, 
      setIsCollapsed, 
      isMobileOpen, 
      setIsMobileOpen,
      isMobile 
    }}>
      <div className="min-h-screen bg-background">
        <Sidebar userType={userType} role={role} onLogout={onLogout} />
        {children}
      </div>
    </SidebarContext.Provider>
  );
};

export const Sidebar = ({ userType, role, onLogout }) => {
  const { isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen, isMobile } = useSidebar();
  const location = useLocation();
  const { user } = useAuth();

  const toggleSidebar = () => {
    if (isMobile) {
      setIsMobileOpen(!isMobileOpen);
    } else {
      setIsCollapsed(!isCollapsed);
    }
  };

  const closeMobileSidebar = () => {
    if (isMobile) {
      setIsMobileOpen(false);
    }
  };

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    }
  };

  // Navigation items based on user type - memoized to prevent re-renders
  const navItems = useMemo(() => {
  const municipalityNavItems = [
      { title: "Dashboard",             icon: Home,          path: "/admin/municipality/dashboard" },
      { title: "Residents",             icon: Users,         path: "/admin/municipality/residents" },
      { title: "Households",            icon: Building,      path: "/admin/municipality/households" },
      { title: "Pets",                  icon: Heart,         path: "/admin/municipality/pets" },
      { title: "Barangays",             icon: Building,      path: "/admin/municipality/barangays" },
      { title: "Certificate Templates", icon: FileBadge2,    path: "/admin/municipality/certificate-templates" },
      { title: "Geographical Map",      icon: Globe,         path: "/admin/municipality/geomap" },
      { title: "Accounts",              icon: Users,         path: "/admin/municipality/accounts" },
      { title: "Activities",            icon: Activity,      path: "/admin/municipality/activities" },
      { title: "Open API",              icon: Key,           path: "/admin/municipality/openapi" },
      { title: "System Management",     icon: Server,        path: "/admin/municipality/system-management" },
      { title: "Settings",              icon: Settings,      path: "/admin/municipality/settings" },
      { title: "Guide",                 icon: BookOpen,      path: "/admin/municipality/guide" },
  ];

  const barangayNavItems = [
      { title: "Dashboard",        icon: Home,          path: "/admin/barangay/dashboard" },
      { title: "Residents",        icon: Users,         path: "/admin/barangay/residents" },
      { title: "Households",       icon: Building,      path: "/admin/barangay/households" },
      { title: "Pets",             icon: Heart,         path: "/admin/barangay/pets" },
      { title: "Officials",        icon: Crown,         path: "/admin/barangay/officials" },
      { title: "Registrations",    icon: ClipboardList, path: "/admin/barangay/registrations" },
      { title: "Certificates",     icon: FileBadge2,    path: "/admin/barangay/certificates" },
      { title: "Archives",         icon: Archive,       path: "/admin/barangay/archives" },
      { title: "Inventory",        icon: Package,       path: "/admin/barangay/inventory" },
      { title: "Geographical Map", icon: Globe,         path: "/admin/barangay/geomap" },
      { title: "Accounts",         icon: Users,         path: "/admin/barangay/accounts" },
      { title: "Activities",       icon: Activity,      path: "/admin/barangay/activities" },
      { title: "Settings",         icon: Settings,      path: "/admin/barangay/settings" },
      { title: "Guide",            icon: BookOpen,      path: "/admin/barangay/guide" },
    ];

    return userType === "municipality" ? municipalityNavItems : barangayNavItems;
  }, [userType]);

  const getUserName = useCallback(() => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    return user?.name || user?.email || "User";
  }, [user]);

  const getUserInitials = useCallback(() => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase();
    }
    return user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "U";
  }, [user]);

  // Time display component - isolated to prevent sidebar re-renders
  const TimeDisplay = () => {
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
      const timer = setInterval(() => {
        setCurrentTime(new Date());
      }, 1000);

      return () => clearInterval(timer);
    }, []);

    const formatTime = (date) => {
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    };

    const formatDate = (date) => {
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

  return (
      <>
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span className="font-mono">{formatTime(currentTime)}</span>
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {formatDate(currentTime)}
        </div>
      </>
    );
  };

  // Sidebar content component
  const SidebarContent = () => (
    <>
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-primary/5 to-primary/10">
            <div className="flex items-center justify-between">
          {(!isCollapsed || isMobile) && (
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                <Avatar className="h-10 w-10 border-2 border-primary/20">
                      <AvatarImage 
                        src={user?.picture_path} 
                      />
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm truncate">
                        {getUserName()}
                      </h3>
                      <p className="text-xs text-muted-foreground truncate">
                        {user?.email}
                      </p>
                    </div>
                  </div>
                    <Badge variant="secondary" className="text-xs">
                {userType === "municipality" ? "Municipality Admin" : "Barangay Admin"}
                    </Badge>
              
              {/* Time display */}
              <TimeDisplay />
                </div>
              )}
          
          {/* Toggle button for desktop */}
          {!isMobile && (
            <TooltipProvider>
              <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
              <Button
                variant="ghost"
                    size="icon"
                    onClick={toggleSidebar}
                    className="h-8 w-8"
                  >
                    {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <div className="flex items-center gap-2">
                {isCollapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronLeft className="h-4 w-4" />
                )}
                    <span className="font-medium">
                      {isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                        </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isCollapsed 
                      ? "Show navigation labels and user information" 
                      : "Hide navigation labels to save space"
                    }
                  </p>
                    </TooltipContent>
                  </Tooltip>
            </TooltipProvider>
          )}

          {/* Close button for mobile */}
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={closeMobileSidebar}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
            </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 min-h-0 pb-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <li key={item.path}>
                <TooltipProvider>
                  <Tooltip delayDuration={300}>
                    <TooltipTrigger asChild>
                    <NavLink
                        to={item.path}
                        onClick={closeMobileSidebar}
                        className={`flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                          isCollapsed && !isMobile 
                            ? "justify-center" 
                            : "gap-3"
                        } ${
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        }`}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                        {(!isCollapsed || isMobile) && (
                          <span className="truncate">{item.title}</span>
                      )}
                    </NavLink>
                    </TooltipTrigger>
                    {(isCollapsed && !isMobile) && (
                      <TooltipContent side="right" className="max-w-xs">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          <span className="font-medium">{item.title}</span>
                  </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {item.title === "Dashboard" && "View overview and statistics"}
                          {item.title === "Residents" && "Manage resident information"}
                          {item.title === "Households" && "Manage household data"}
                          {item.title === "Pets" && "Manage pet registrations"}
                          {item.title === "Barangays" && "Manage barangay information"}
                          {item.title === "Officials" && "Manage barangay officials"}
                          {item.title === "Archives" && "View archived records"}
                          {item.title === "Inventory" && "Manage barangay inventory"}

                          {item.title === "Geographical Map" && "View geographical data and maps"}
                          {item.title === "Accounts" && "Manage user accounts"}
                          {item.title === "Activities" && "View system activities and logs"}
                          {item.title === "System Management" && "Monitor server health and manage exports"}
                          {item.title === "Settings" && "Configure system settings"}
                        </p>
                    </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              </li>
                );
              })}
        </ul>
          </nav>

      {/* Footer */}
      <div className="border-t p-4 flex-shrink-0 bg-background">
        {isCollapsed && !isMobile ? (
          <TooltipProvider>
            <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                <div className="flex justify-center">
                  <Button
                    variant="ghost"
                    onClick={handleLogout}
                    size="icon"
                    className="h-10 w-10"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
                </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                <div className="flex items-center gap-2">
                  <LogOut className="h-4 w-4" />
                  <span className="font-medium">Logout</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Sign out of your account
                </p>
                </TooltipContent>
              </Tooltip>
          </TooltipProvider>
        ) : (
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full justify-start gap-3 text-sm"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </Button>
        )}
      </div>
    </>
  );

  return (
    <TooltipProvider>
      {/* Mobile overlay */}
      {isMobile && isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={closeMobileSidebar}
        />
      )}
      
      {/* Mobile sidebar */}
      {isMobile && (
        <div className={`fixed left-0 top-0 h-screen z-50 transition-transform duration-300 ease-in-out ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          <Card className="h-full flex flex-col border-r w-64 overflow-hidden">
            <SidebarContent />
          </Card>
        </div>
      )}
      
      {/* Desktop sidebar */}
      {!isMobile && (
        <div
          className={`fixed left-0 top-0 h-screen flex-shrink-0 sidebar-transition z-50 ${
            isCollapsed ? "w-16" : "w-64"
          }`}
        >
          <Card className="h-full flex flex-col border-r overflow-hidden">
            <SidebarContent />
          </Card>
        </div>
      )}
      
      {/* Mobile header */}
      {isMobile && (
        <div className="fixed top-0 left-0 right-0 z-30 lg:hidden bg-background border-b shadow-sm">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                className="h-8 w-8"
              >
                <Menu className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-sm font-semibold">
                  {userType === "municipality" ? "Municipality Admin" : "Barangay Admin"}
                </h1>
                <p className="text-xs text-muted-foreground">
                  {getUserName()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span className="font-mono">
                  {new Date().toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                  })}
                </span>
              </div>
            </div>
          </div>
      </div>
      )}
    </TooltipProvider>
  );
};
