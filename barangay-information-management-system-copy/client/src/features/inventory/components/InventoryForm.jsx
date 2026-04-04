import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Package, Upload, X } from "lucide-react";

const InventoryForm = ({ 
  inventory = null, 
  onSubmit, 
  onCancel, 
  loading = false 
}) => {
  const [formData, setFormData] = useState({
    itemName: inventory?.item_name || "",
    itemType: inventory?.item_type || "",
    description: inventory?.description || "",
    sponsors: inventory?.sponsors || "",
    quantity: inventory?.quantity || "",
    unit: inventory?.unit || "",
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(
    inventory?.file_path 
      ? `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/${inventory.file_path}`
      : null
  );

  const itemTypes = [
    "Office Supplies",
    "Equipments",
    "Furnitures",
    "Maintenance",
    "Medicals",
    "Sports",
    "Events",
    "Others"
  ];

  const units = [
    "Pieces",
    "Boxes",
    "Units",
    "Sets",
    "Packs",
    "Bottles",
    "Cans",
    "Bags",
    "Rolls",
    "Meters",
    "Liters",
    "Kilograms"
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const formDataToSend = new FormData();
    formDataToSend.append('itemName', formData.itemName);
    formDataToSend.append('itemType', formData.itemType);
    formDataToSend.append('description', formData.description);
    formDataToSend.append('sponsors', formData.sponsors);
    formDataToSend.append('quantity', formData.quantity);
    formDataToSend.append('unit', formData.unit);
    
    if (selectedFile) {
      formDataToSend.append('filePath', selectedFile);
    }

    await onSubmit(formDataToSend);
  };

  const isFormValid = () => {
    return formData.itemName && 
           formData.itemType && 
           formData.quantity && 
           formData.unit;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        {/* Item Name */}
        <div className="space-y-2">
          <Label htmlFor="itemName">Item Name *</Label>
          <Input
            id="itemName"
            value={formData.itemName}
            onChange={(e) => handleInputChange('itemName', e.target.value)}
            placeholder="Enter item name"
            required
          />
        </div>

        {/* Item Type */}
        <div className="space-y-2">
          <Label htmlFor="itemType">Item Type *</Label>
          <Select
            value={formData.itemType}
            onValueChange={(value) => handleInputChange('itemType', value)}
            required
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select item type" />
            </SelectTrigger>
            <SelectContent>
              {itemTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Quantity */}
        <div className="space-y-2">
          <Label htmlFor="quantity">Quantity *</Label>
          <Input
            id="quantity"
            type="number"
            min="0"
            value={formData.quantity}
            onChange={(e) => handleInputChange('quantity', e.target.value)}
            placeholder="Enter quantity"
            required
          />
        </div>

        {/* Unit */}
        <div className="space-y-2">
          <Label htmlFor="unit">Unit *</Label>
          <Select
            value={formData.unit}
            onValueChange={(value) => handleInputChange('unit', value)}
            required
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select unit" />
            </SelectTrigger>
            <SelectContent>
              {units.map((unit) => (
                <SelectItem key={unit} value={unit}>
                  {unit}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Sponsors */}
        <div className="space-y-2">
          <Label htmlFor="sponsors">Sponsors</Label>
          <Input
            id="sponsors"
            value={formData.sponsors}
            onChange={(e) => handleInputChange('sponsors', e.target.value)}
            placeholder="Enter sponsors (optional)"
          />
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}
          placeholder="Enter item description (optional)"
          rows={3}
        />
      </div>

      {/* File Upload */}
      <div className="space-y-2">
        <Label>Item Image/File</Label>
        <Card>
          <CardContent className="p-4">
            {previewUrl ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Package className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      {selectedFile ? selectedFile.name : "Current file"}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={removeFile}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="max-w-xs">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-32 object-cover rounded-lg"
                  />
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-2">
                  Upload an image or file for this item
                </p>
                <Input
                  type="file"
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={handleFileChange}
                  className="max-w-xs mx-auto"
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Form Actions */}
      <div className="flex flex-col sm:flex-row justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
          className="w-full sm:w-auto"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!isFormValid() || loading}
          className="flex items-center space-x-2 w-full sm:w-auto"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Package className="h-4 w-4" />
              <span>{inventory ? "Update Item" : "Add Item"}</span>
            </>
          )}
        </Button>
      </div>
    </form>
  );
};

export default InventoryForm;
