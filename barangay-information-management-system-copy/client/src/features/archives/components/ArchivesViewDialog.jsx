import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  FileText,
  Calendar,
  Edit,
  Trash2,
  Image,
  Users,
  ZoomIn,
} from "lucide-react";
import { format } from "date-fns";
import { Label } from "@/components/ui/label";
import ImageViewer from "@/components/ui/image-viewer";

const ArchivesViewDialog = ({
  archive,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  loading = false,
}) => {
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  
  if (!archive) return null;

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), "MMM dd, yyyy 'at' h:mm a");
    } catch {
      return "Invalid Date";
    }
  };

  const getDocumentTypeBadgeVariant = (documentType) => {
    switch (documentType?.toLowerCase()) {
      case 'ordinances':
        return 'default';
      case 'resolutions':
        return 'secondary';
      case 'minutes':
        return 'outline';
      case 'certificates':
        return 'default';

      case 'letters':
        return 'outline';
      case 'forms':
        return 'default';
      case 'policies':
        return 'secondary';
      case 'lupons':
        return 'outline';
      case 'deaths':
        return 'destructive';
      case 'others':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between pr-4">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Archive Document Details
          </DialogTitle>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex gap-2">
                <MoreHorizontal className="h-4 w-4" />
                Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit?.(archive)}>
                <Edit className="h-4 w-4 mr-2" /> Edit Document
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onDelete?.(archive)}
              >
                <Trash2 className="h-4 w-4 mr-2" /> Delete Document
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </DialogHeader>

        <div className="space-y-6">
                     {/* Document Image */}
           {archive.file_path && (
             <div className="flex justify-center">
               <Card className="max-w-md">
                 <CardContent className="p-4">
                   <div className="relative group cursor-pointer" onClick={() => setIsImageViewerOpen(true)}>
                     <img
                       src={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/${archive.file_path}`}
                       alt={archive.title}
                       className="w-full h-48 object-cover rounded-lg transition-transform group-hover:scale-105"
                       onError={(e) => {
                         e.target.style.display = 'none';
                         e.target.nextSibling.style.display = 'block';
                       }}
                     />
                     <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg flex items-center justify-center">
                       <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                     </div>
                   </div>
                   <div className="hidden w-full h-48 bg-muted rounded-lg flex items-center justify-center">
                     <div className="text-center text-muted-foreground">
                       <Image className="h-12 w-12 mx-auto mb-2" />
                       <p className="text-sm">Image not available</p>
                     </div>
                   </div>
                 </CardContent>
               </Card>
             </div>
           )}

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold">Document Information</h3>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">
                      Document Title
                    </Label>
                    <p className="text-xl font-semibold text-foreground">{archive.title}</p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">
                      Document Type
                    </Label>
                    <Badge variant={getDocumentTypeBadgeVariant(archive.document_type)} className="text-sm">
                      {archive.document_type || "N/A"}
                    </Badge>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">
                      Description
                    </Label>
                    <p className="text-base leading-relaxed text-foreground">
                      {archive.description || "No description provided"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold">Author & Signatory</h3>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">
                      Author
                    </Label>
                    <p className="text-base font-medium text-foreground">{archive.author || "N/A"}</p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">
                      Signatory
                    </Label>
                    <p className="text-base font-medium text-foreground">{archive.signatory || "N/A"}</p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">
                      Related Resident
                    </Label>
                    <p className="text-base font-medium text-foreground">{archive.relate_resident || "N/A"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Image Viewer */}
    {archive.file_path && (
      <ImageViewer
                 src={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/${archive.file_path}`}
         alt={archive.title}
        open={isImageViewerOpen}
        onOpenChange={setIsImageViewerOpen}
      />
    )}
  </>
);
};

export default ArchivesViewDialog;
