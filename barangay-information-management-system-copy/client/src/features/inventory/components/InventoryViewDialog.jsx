import React, { useState } from "react";
import { getFileUrl } from "@/utils/utils";
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
  Package,
  Calendar,
  Edit,
  Trash2,
  FileText,
  Users,
  Hash,
  ZoomIn,
} from "lucide-react";
import { format } from "date-fns";
import { Label } from "@/components/ui/label";
import ImageViewer from "@/components/ui/image-viewer";

const InventoryViewDialog = ({
  inventory,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}) => {
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  
  if (!inventory) return null;

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), "MMM dd, yyyy 'at' h:mm a");
    } catch {
      return "Invalid Date";
    }
  };

  const getItemTypeBadgeVariant = (itemType) => {
    switch (itemType?.toLowerCase()) {
      case 'office supplies':
        return 'default';
      case 'equipments':
        return 'secondary';
      case 'furnitures':
        return 'outline';
      case 'maintenance':
        return 'default';
      case 'medicals':
        return 'secondary';
      case 'sports':
        return 'outline';
      case 'events':
        return 'default';
      case 'others':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getQuantityStatus = (quantity) => {
    const qty = parseInt(quantity);
    if (qty <= 0) return { status: 'Out of Stock', variant: 'destructive', className: '' };
    if (qty <= 5) return { status: 'Low Stock', variant: 'outline', className: 'border-warning bg-warning/10 text-warning-foreground' };
    return { status: 'In Stock', variant: 'outline', className: 'border-success bg-success/10 text-success-foreground' };
  };

  const quantityStatus = getQuantityStatus(inventory.quantity);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between pr-4">
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Inventory Item Details
          </DialogTitle>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex gap-2">
                <MoreHorizontal className="h-4 w-4" />
                Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit?.(inventory)}>
                <Edit className="h-4 w-4 mr-2" /> Edit Item
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onDelete?.(inventory)}
              >
                <Trash2 className="h-4 w-4 mr-2" /> Delete Item
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </DialogHeader>

        <DialogDescription className="sr-only">
          View detailed information about the inventory item
        </DialogDescription>

        <div className="space-y-6">
          {/* Item Image */}
          {inventory.file_path && (
            <div className="flex justify-center">
              <Card className="max-w-md">
                <CardContent className="p-4">
                  <div className="relative group cursor-pointer" onClick={() => setIsImageViewerOpen(true)}>
                    <img
                      src={getFileUrl(inventory.file_path)}
                      alt={inventory.item_name}
                      className="w-full h-48 object-cover rounded-lg transition-transform group-hover:scale-105"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.parentElement.nextSibling.style.display = 'flex';
                      }}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-lg flex items-center justify-center">
                      <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  <div className="w-full h-48 bg-muted rounded-lg flex items-center justify-center" style={{ display: 'none' }}>
                    <div className="text-center text-muted-foreground">
                      <Package className="h-12 w-12 mx-auto mb-2" />
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
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold">Item Information</h3>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">
                      Item Name
                    </Label>
                    <p className="text-xl font-semibold text-foreground">{inventory.item_name}</p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">
                      Item Type
                    </Label>
                    <p className="text-base font-medium text-foreground">
                      {inventory.item_type || "N/A"}
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">
                      Description
                    </Label>
                    <p className="text-base leading-relaxed text-foreground">
                      {inventory.description || "No description provided"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold">Quantity & Status</h3>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">
                      Quantity
                    </Label>
                    <p className="text-xl font-semibold text-foreground">
                      {inventory.quantity} {inventory.unit}
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">
                      Stock Status
                    </Label>
                    <p className="text-base font-medium text-foreground">
                      {quantityStatus.status}
                    </p>
                  </div>

                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">
                      Unit
                    </Label>
                    <p className="text-base text-foreground">{inventory.unit}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sponsors Information */}
          {inventory.sponsors && (
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold">Sponsors</h3>
                </div>
                <p className="text-base leading-relaxed text-foreground">{inventory.sponsors}</p>
              </CardContent>
            </Card>
          )}

          {/* Record Timestamps */}
          {(inventory.created_at || inventory.updated_at) && (
            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold">Record Information</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {inventory.created_at && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">
                        Created
                      </Label>
                      <p className="text-base text-foreground">
                        {formatDate(inventory.created_at)}
                      </p>
                    </div>
                  )}
                  {inventory.updated_at && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">
                        Last Updated
                      </Label>
                      <p className="text-base text-foreground">
                        {formatDate(inventory.updated_at)}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>

    {/* Image Viewer */}
    {inventory.file_path && (
      <ImageViewer
        src={getFileUrl(inventory.file_path)}
        alt={inventory.item_name}
        open={isImageViewerOpen}
        onOpenChange={setIsImageViewerOpen}
      />
    )}
  </>
  );
};

export default InventoryViewDialog;
