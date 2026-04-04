import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Calendar,
  Phone,
  Mail,
  MapPin,
  Crown,
  Users,
  FileText,
  User,
  Maximize2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

const SERVER_URL   = import.meta.env.VITE_SERVER_URL        || "http://localhost:5000";
const ESERVICE_URL = import.meta.env.VITE_ESERVICE_SERVER_URL || "http://localhost:3000";

/** Resolve a stored picture_path to an absolute URL. */
const toAbsUrl = (p) => {
  if (!p) return null;
  if (p.startsWith("http://") || p.startsWith("https://")) return p;
  const clean = p.replace(/\\/g, "/").replace(/^\/+/, "");
  if (clean.startsWith("uploads/images/")) return `${ESERVICE_URL}/${clean}`;
  return `${SERVER_URL}/${clean}`;
};

const ViewOfficialDialog = ({ open, onOpenChange, official }) => {
  const [activeTab, setActiveTab] = useState("overview");
  const [imageModalOpen, setImageModalOpen] = useState(false);

  if (!official) return null;

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), "MMMM dd, yyyy");
    } catch {
      return "Invalid Date";
    }
  };

  const getInitials = (firstName, lastName) => {
    const first = firstName?.charAt(0) || "";
    const last = lastName?.charAt(0) || "";
    return `${first}${last}`.toUpperCase();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Official Information</DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              View detailed information about the barangay official
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="flex flex-wrap gap-2 mb-4">
                <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
                <TabsTrigger value="position" className="text-xs sm:text-sm">Position & Responsibilities</TabsTrigger>
                <TabsTrigger value="term" className="text-xs sm:text-sm">Term Information</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview">
                <div className="space-y-6">
                  {/* Header with main info and official picture */}
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 mb-6">
                    {/* Official Picture */}
                    <div className="flex-shrink-0">
                      {official.picture_path ? (
                        <div 
                          className="w-24 h-24 sm:w-32 sm:h-32 rounded-lg overflow-hidden border-4 border-primary bg-white shadow-lg cursor-pointer hover:shadow-xl transition-all duration-200 relative group"
                          onClick={() => setImageModalOpen(true)}
                        >
                          <img
                            src={toAbsUrl(official.picture_path)}
                            alt={`${official.first_name} ${official.last_name}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                          <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground bg-muted/20" style={{ display: 'none' }}>
                            <User className="h-8 w-8" />
                          </div>
                          {/* Overlay with maximize icon on hover */}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                            <Maximize2 className="h-8 w-8 text-white" />
                          </div>
                        </div>
                      ) : (
                        <div className="w-32 h-32 rounded-lg border-4 border-muted bg-muted/20 flex items-center justify-center shadow-lg">
                          <div className="text-center">
                            <User className="h-16 w-16 text-muted-foreground/50 mx-auto mb-2" />
                            <p className="text-xs text-muted-foreground">No photo</p>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Official Info */}
                    <div className="flex-1 text-center sm:text-left">
                      <div className="text-xl sm:text-2xl font-bold mb-2">
                        {official.first_name} {official.last_name}
                        {official.suffix && ` ${official.suffix}`}
                      </div>
                      <div className="text-muted-foreground text-base sm:text-lg mb-3">
                        {official.position}
                      </div>
                      <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                        <Badge variant="default" className="text-xs sm:text-sm">
                          <Crown className="h-3 w-3 mr-1" />
                          {official.position}
                        </Badge>
                        {official.committee && (
                          <Badge variant="secondary" className="text-xs sm:text-sm">
                            <Users className="h-3 w-3 mr-1" />
                            {official.committee}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Quick stats grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2">
                          <Crown className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                          Position
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-base sm:text-lg font-semibold">
                          {official.position}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2">
                          <Users className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                          Committee
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-base sm:text-lg font-semibold">
                          {official.committee || "No committee assigned"}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs sm:text-sm font-medium flex items-center gap-2">
                          <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                          Term Duration
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-base sm:text-lg font-semibold">
                          {formatDate(official.term_start)} - {formatDate(official.term_end)}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              {/* Position & Responsibilities Tab */}
              <TabsContent value="position">
                <div className="space-y-4">
                  {/* Compact header with official picture */}
                  <div className="flex items-center gap-4 mb-4 p-4 bg-muted/20 rounded-lg">
                    <div className="flex-shrink-0">
                      {official.picture_path ? (
                        <div 
                          className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary bg-white cursor-pointer hover:border-primary/80 transition-all duration-200 relative group"
                          onClick={() => setImageModalOpen(true)}
                        >
                          <img
                            src={toAbsUrl(official.picture_path)}
                            alt={`${official.first_name} ${official.last_name}`}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                          <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground bg-muted/20" style={{ display: 'none' }}>
                            <User className="h-6 w-6" />
                          </div>
                          {/* Overlay with maximize icon on hover */}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                            <Maximize2 className="h-4 w-4 text-white" />
                          </div>
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-full border-2 border-muted bg-muted/20 flex items-center justify-center">
                          <User className="h-8 w-8 text-muted-foreground/50" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold">
                        {official.first_name} {official.last_name}
                      </h3>
                      <p className="text-sm text-muted-foreground">Position & Responsibilities</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                    {/* Position Information */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                          <Crown className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                          Position Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Crown className="h-3 w-3 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
                          <span className="font-semibold text-xs sm:text-sm">Position:</span>
                          <span className="ml-1 text-xs sm:text-sm">{official.position}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-3 w-3 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
                          <span className="font-semibold text-xs sm:text-sm">Committee:</span>
                          <span className="ml-1 text-xs sm:text-sm">{official.committee || "No committee assigned"}</span>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Responsibilities */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                          <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                          Responsibilities
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {official.responsibilities ? (
                          <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
                            {official.responsibilities}
                          </p>
                        ) : (
                          <p className="text-xs sm:text-sm text-muted-foreground italic">
                            No responsibilities specified
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              {/* Term Information Tab */}
              <TabsContent value="term">
                <div className="space-y-4">
                  {/* Compact header with official picture */}
                  <div className="flex items-center gap-4 mb-4 p-4 bg-muted/20 rounded-lg">
                    <div className="flex-shrink-0">
                      {official.picture_path ? (
                        <div 
                          className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary bg-white cursor-pointer hover:border-primary/80 transition-all duration-200 relative group"
                          onClick={() => setImageModalOpen(true)}
                        >
                          <img
                            src={toAbsUrl(official.picture_path)}
                            alt={`${official.first_name} ${official.last_name}`}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                          <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground bg-muted/20" style={{ display: 'none' }}>
                            <User className="h-6 w-6" />
                          </div>
                          {/* Overlay with maximize icon on hover */}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                            <Maximize2 className="h-4 w-4 text-white" />
                          </div>
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-full border-2 border-muted bg-muted/20 flex items-center justify-center">
                          <User className="h-8 w-8 text-muted-foreground/50" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-base sm:text-lg font-semibold">
                        {official.first_name} {official.last_name}
                      </h3>
                      <p className="text-xs sm:text-sm text-muted-foreground">Term Information</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                    {/* Term Details */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                          <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                          Term Details
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
                          <span className="font-semibold text-xs sm:text-sm">Term Start:</span>
                          <span className="ml-1 text-xs sm:text-sm">{formatDate(official.term_start)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
                          <span className="font-semibold text-xs sm:text-sm">Term End:</span>
                          <span className="ml-1 text-xs sm:text-sm">{formatDate(official.term_end)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
                          <span className="font-semibold text-xs sm:text-sm">Date Added:</span>
                          <span className="ml-1 text-xs sm:text-sm">{formatDate(official.created_at)}</span>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Service Duration */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                          <Crown className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                          Service Summary
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <span className="font-semibold text-xs sm:text-sm">Position:</span>
                          <p className="text-base sm:text-lg mt-1">{official.position}</p>
                        </div>
                        {official.committee && (
                          <div>
                            <span className="font-semibold text-xs sm:text-sm">Committee:</span>
                            <p className="text-base sm:text-lg mt-1">{official.committee}</p>
                          </div>
                        )}
                        <div>
                          <span className="font-semibold text-xs sm:text-sm">Status:</span>
                          <Badge variant="default" className="ml-2 text-xs sm:text-sm">
                            Active
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Modal */}
      <Dialog open={imageModalOpen} onOpenChange={setImageModalOpen}>
        <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] p-0 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>
              {official ? `${official.first_name} ${official.last_name} - Official Picture` : 'Official Picture'}
            </DialogTitle>
            <DialogDescription>
              View the official's picture in full size. Click outside or press the close button to exit.
            </DialogDescription>
          </DialogHeader>
          <div className="relative">
            {/* Close Button */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 z-10 bg-black/50 text-white hover:bg-black/70"
              onClick={() => setImageModalOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
            
            {/* Maximized Image */}
            {official?.picture_path ? (
              <div className="w-full max-h-[90vh] flex items-center justify-center bg-black">
                <img
                  src={toAbsUrl(official.picture_path)}
                  alt={`${official.first_name || 'Official'} ${official.last_name || ''} - Full size image`}
                  className="max-w-full max-h-[90vh] object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
                <div className="w-full h-64 flex items-center justify-center text-white bg-black" style={{ display: 'none' }}>
                  <div className="text-center">
                    <User className="h-16 w-16 mx-auto mb-2" />
                    <p>Image could not be loaded</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full h-64 flex items-center justify-center bg-muted">
                <div className="text-center">
                  <User className="h-16 w-16 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No image available</p>
                </div>
              </div>
            )}
            
            {/* Image Info Footer */}
            {official && (
              <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-4">
                <p className="text-lg font-semibold">
                  {official.first_name} {official.last_name}
                  {official.suffix && ` ${official.suffix}`}
                </p>
                <p className="text-sm text-white/80">
                  {official.position}
                  {official.committee && ` • ${official.committee}`}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ViewOfficialDialog;
