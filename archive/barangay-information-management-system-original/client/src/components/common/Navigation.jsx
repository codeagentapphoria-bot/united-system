import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Menu,
  X,
  FileText,
  Calendar,
  MapPin,
  Phone,
  BookOpen,
  Home,
  Map,
  Users,
  QrCode,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "./ThemeToggle";
import { BarangaySelector } from "./BarangaySelector";

// Primary navigation items (most important)
const primaryNavigationItems = [
  { name: "Home", href: "/", icon: Home },
  { name: "Request", href: "/request", icon: FileText },
  { name: "Track", href: "/track", icon: Calendar },
];

// Secondary navigation items (less frequently used)
const secondaryNavigationItems = [
  { name: "Map", href: "/map", icon: Map },
  { name: "Officials", href: "/officials", icon: Users },
  { name: "Pet Scanner", href: "/pet-scanner", icon: QrCode },
  { name: "Contact", href: "/contact", icon: Phone },
];

export function Navigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  return (
    <nav className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/40 shadow-sm">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link
              to="/"
              className="flex items-center space-x-2 transition-smooth hover:scale-105"
            >
              <img
                src="/lgu-borongan.png"
                alt="LGU Borongan"
                className="w-6 h-6 sm:w-8 sm:h-8 object-contain"
              />
              <span className="text-lg sm:text-xl font-semibold text-foreground">
                BIMS
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-8 sm:ml-10 flex items-center space-x-1">
              {/* Primary Navigation Items */}
              {primaryNavigationItems.map((item) => {
                const isActive = location.pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-smooth flex items-center space-x-2 ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-soft"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
              
              {/* More Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-smooth flex items-center space-x-2 text-muted-foreground hover:text-foreground hover:bg-accent"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                    <span>More</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {secondaryNavigationItems.map((item) => {
                    const isActive = location.pathname === item.href;
                    const Icon = item.icon;
                    return (
                      <DropdownMenuItem key={item.name} asChild>
                        <Link
                          to={item.href}
                          className={`flex items-center space-x-2 w-full ${
                            isActive ? "bg-accent" : ""
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{item.name}</span>
                        </Link>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Barangay Selector, Theme Toggle & Mobile Menu Button */}
          <div className="flex items-center space-x-1 sm:space-x-2">
            <div className="hidden md:block">
              <BarangaySelector />
            </div>
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="transition-smooth h-9 w-9 sm:h-10 sm:w-10"
              >
                {isMobileMenuOpen ? (
                  <X className="h-5 w-5 sm:h-6 sm:w-6" />
                ) : (
                  <Menu className="h-5 w-5 sm:h-6 sm:w-6" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-border/40 bg-background/95 backdrop-blur-md">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {/* All navigation items in mobile */}
              {[...primaryNavigationItems, ...secondaryNavigationItems].map((item) => {
                const isActive = location.pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`block px-3 py-3 rounded-lg text-sm sm:text-base font-medium transition-smooth flex items-center space-x-3 ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-soft"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    }`}
                  >
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
              <div className="px-3 py-2 border-t border-border/40 mt-2 pt-4">
                <BarangaySelector />
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
