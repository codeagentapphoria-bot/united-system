import React, { useState, useEffect, useCallback } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Upload, X, Image } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import ReactSelect from "react-select";
import api from "@/utils/api";

const ArchivesForm = ({
  open,
  onOpenChange,
  onSubmit,
  loading = false,
  archive = null,
  isEdit = false,
}) => {
  const [formData, setFormData] = useState({
    title: '',
    documentType: '',
    description: '',
    author: '',
    signatory: '',
    relateResident: '',
  });
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState('');
  
  // Resident search functionality
  const [residents, setResidents] = useState([]);
  const [residentSearchTerm, setResidentSearchTerm] = useState("");
  const [residentSearchLoading, setResidentSearchLoading] = useState(false);
  const [residentSearchTimeout, setResidentSearchTimeout] = useState(null);
  const [selectedResident, setSelectedResident] = useState(null);

  const documentTypes = [
    'Minutes',
    'Certificates',
    'Ordinances',
    'Letters',
    'Resolutions',
    'Forms',
    'Policies',
    'Lupons',
    'Deaths',
    'Others'
  ];

  // Search residents function
  const searchResidents = useCallback(async (searchTerm) => {
    if (searchTerm.trim().length < 2) {
      setResidents([]);
      return;
    }

    setResidentSearchLoading(true);
    try {
      const response = await api.get("/list/residents", {
        params: { search: searchTerm, perPage: 50 }
      });
      
      // The server returns { data: { data: [...], pagination: {...} } }
      // So we need to access response.data.data.data for the residents array
      const residentsData = response.data?.data?.data;

      if (Array.isArray(residentsData)) {
        setResidents(residentsData);
      } else {
        setResidents([]);
      }
    } catch (error) {
      setResidents([]);
    } finally {
      setResidentSearchLoading(false);
    }
  }, []);

  // Debounced search effect
  useEffect(() => {
    if (residentSearchTimeout) {
      clearTimeout(residentSearchTimeout);
    }

    if (residentSearchTerm.trim().length >= 2) {
      const timeout = setTimeout(() => {
        searchResidents(residentSearchTerm);
      }, 300);
      setResidentSearchTimeout(timeout);
    } else {
      setResidents([]);
    }

    return () => {
      if (residentSearchTimeout) {
        clearTimeout(residentSearchTimeout);
      }
    };
  }, [residentSearchTerm, searchResidents]);

  // Get filtered resident options ensuring the current selection is always included
  const getFilteredResidentOptions = useCallback(() => {
    // Ensure residents is always an array
    const residentsArray = Array.isArray(residents) ? residents : [];
    
    // Start with current residents (search results)
    let options = residentsArray.map((resident) => ({
      value: resident.id,
      label: `${resident.first_name} ${resident.last_name}${
        resident.suffix ? ` ${resident.suffix}` : ""
      }`,
    }));

    // Always include the selected resident if it exists
    if (selectedResident && !options.some(opt => opt.value === selectedResident.id)) {
      options.push({
        value: selectedResident.id,
        label: `${selectedResident.first_name} ${selectedResident.last_name}${
          selectedResident.suffix ? ` ${selectedResident.suffix}` : ""
        }`,
      });
    }

    return options;
  }, [residents, selectedResident]);

  const handleResidentChange = (selectedOption) => {
    setFormData({
      ...formData,
      relateResident: selectedOption?.value || "",
    });
    // Store the selected resident data
    if (selectedOption) {
      const residentsArray = Array.isArray(residents) ? residents : [];
      const residentData = residentsArray.find(r => r.id === selectedOption.value);
      if (residentData) {
        setSelectedResident(residentData);
      }
    } else {
      setSelectedResident(null);
    }
    // Clear search term after selection
    setResidentSearchTerm("");
  };

  useEffect(() => {
    if (archive && isEdit) {
      setFormData({
        title: archive.title || '',
        documentType: archive.document_type || '',
        description: archive.description || '',
        author: archive.author || '',
        signatory: archive.signatory || '',
        relateResident: archive.relate_resident || '',
      });
      if (archive.file_path) {
        setFilePreview(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/${archive.file_path}`);
      }
    } else {
      resetForm();
    }
  }, [archive, isEdit, open]);

  // Cleanup URL object when component unmounts
  useEffect(() => {
    return () => {
      if (filePreview && filePreview.startsWith('blob:')) {
        URL.revokeObjectURL(filePreview);
      }
    };
  }, [filePreview]);

  const resetForm = () => {
    setFormData({
      title: '',
      documentType: '',
      description: '',
      author: '',
      signatory: '',
      relateResident: '',
    });
    if (filePreview && filePreview.startsWith('blob:')) {
      URL.revokeObjectURL(filePreview);
    }
    setFile(null);
    setFilePreview('');
    // Reset resident search state
    setResidents([]);
    setResidentSearchTerm("");
    setSelectedResident(null);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Check if file is an image
      if (!selectedFile.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please upload an image file (JPG, PNG, GIF, etc.)",
          variant: "destructive",
        });
        return;
      }
      
      // Check file size (max 5MB for images)
      if (selectedFile.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Image file must be less than 5MB",
          variant: "destructive",
        });
        return;
      }
      
      setFile(selectedFile);
      const url = URL.createObjectURL(selectedFile);
      setFilePreview(url);
    }
  };

  const removeFile = () => {
    if (filePreview && filePreview.startsWith('blob:')) {
      URL.revokeObjectURL(filePreview);
    }
    setFile(null);
    setFilePreview('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const formDataToSend = new FormData();
    Object.keys(formData).forEach(key => {
      if (formData[key]) {
        formDataToSend.append(key, formData[key]);
      }
    });
    
    if (file) {
      formDataToSend.append('filePath', file);
    }

    await onSubmit(formDataToSend);
    if (!isEdit) {
      resetForm();
    }
  };

  const isFormValid = () => {
    return formData.title && 
           formData.documentType && 
           (!isEdit ? file : true); // File is required for new archives
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {isEdit ? 'Edit Archive' : 'Add New Archive'}
          </DialogTitle>
          <DialogDescription>
            {isEdit 
              ? 'Update the archive document information and image.'
              : 'Add a new document to the archives with all necessary details and an image file.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Document Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Enter document title"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="documentType">Document Type *</Label>
              <Select
                value={formData.documentType}
                onValueChange={(value) => handleInputChange('documentType', value)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  {documentTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Enter document description"
              rows={3}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="author">Author</Label>
              <Input
                id="author"
                value={formData.author}
                onChange={(e) => handleInputChange('author', e.target.value)}
                placeholder="Enter author name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="signatory">Signatory</Label>
              <Input
                id="signatory"
                value={formData.signatory}
                onChange={(e) => handleInputChange('signatory', e.target.value)}
                placeholder="Enter signatory name"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="relateResident">Related Resident</Label>
            <ReactSelect
              value={getFilteredResidentOptions().find(
                (option) => option.value === formData.relateResident
              ) || (selectedResident ? {
                value: selectedResident.id,
                label: `${selectedResident.first_name} ${selectedResident.last_name}${
                  selectedResident.suffix ? ` ${selectedResident.suffix}` : ""
                }`
              } : null)}
              onChange={handleResidentChange}
              onInputChange={(newValue, { action }) => {
                if (action === "input-change") {
                  setResidentSearchTerm(newValue);
                }
              }}
              inputValue={residentSearchTerm}
              options={getFilteredResidentOptions()}
              placeholder={
                residentSearchLoading
                  ? "Searching residents..."
                  : "Type to search for resident (min 2 characters)"
              }
              noOptionsMessage={() => 
                residentSearchTerm.trim().length < 2 
                  ? "Type at least 2 characters to search" 
                  : "No residents found"
              }
              isClearable
              isSearchable
              isLoading={residentSearchLoading}
              styles={{
                control: (provided, state) => ({
                  ...provided,
                  backgroundColor: "transparent",
                  borderColor: state.isFocused ? "#d1d5db" : "#e5e7eb",
                  boxShadow: "none",
                  borderRadius: "0.5rem",
                  fontSize: "1rem",
                  paddingLeft: "0.5rem",
                  paddingRight: "0.5rem",
                }),
                menu: (provided) => ({
                  ...provided,
                  zIndex: 20,
                }),
                option: (provided, state) => ({
                  ...provided,
                  backgroundColor: state.isSelected
                    ? "#f3f4f6"
                    : state.isFocused
                    ? "#f9fafb"
                    : "transparent",
                  color: "#111827",
                  cursor: "pointer",
                }),
                singleValue: (provided) => ({
                  ...provided,
                  color: "#111827",
                }),
                placeholder: (provided) => ({
                  ...provided,
                  color: "#6b7280",
                }),
                indicatorSeparator: () => ({
                  display: "none",
                }),
              }}
            />
          </div>

          <div className="space-y-2">
            <Label>Document Image {!isEdit && '*'}</Label>
            <Card>
              <CardContent className="p-4">
                {filePreview ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Image className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          {file ? file.name : "Current file"}
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
                        src={filePreview}
                        alt="Preview"
                        className="w-full h-32 object-cover rounded-lg"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground mb-2">
                      Upload an image for this document
                    </p>
                    <p className="text-xs text-muted-foreground mb-2">
                      JPG, PNG, GIF, WebP (Max 5MB)
                    </p>
                    <Input
                      id="file"
                      type="file"
                      onChange={handleFileChange}
                      accept="image/*"
                      className="max-w-xs mx-auto"
                      required={!isEdit}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isFormValid() || loading}
              className="flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4" />
                  <span>{isEdit ? "Update Archive" : "Add Archive"}</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ArchivesForm;
