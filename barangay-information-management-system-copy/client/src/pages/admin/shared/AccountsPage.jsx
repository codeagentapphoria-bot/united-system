import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import RefreshControls from "@/components/common/RefreshControls";
import { useCrudRefresh } from "@/hooks/useCrudRefresh";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import LoadingSpinner from "@/components/common/LoadingSpinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  Shield,
  Building,
  MapPin,
  Mail,
  Phone,
  Calendar,
  AlertTriangle,
  Upload,
  Camera,
  X,
  User,
  Lock,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { accountsService } from "@/services/accountsService";
import { useAuth } from "@/contexts/AuthContext";

// Delete Confirmation Dialog Component
const DeleteConfirmationDialog = ({
  open,
  onOpenChange,
  onConfirm,
  loading = false,
  account = null,
}) => {
  if (!account) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-destructive" />
            <span>Delete Account</span>
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this account? This action cannot be
            undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Account Info */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <h4 className="font-semibold flex items-center gap-2">
              <Users className="h-4 w-4" />
              {account.full_name}
            </h4>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>Email: {account.email}</p>
              <p>Role: {account.role}</p>
              <p>Organization: {account.target_name}</p>
              <p>Status: {account.is_active ? "Active" : "Inactive"}</p>
            </div>
          </div>

          {/* Warning */}
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">
              <strong>Warning:</strong> This will permanently remove the account
              from the system. All associated data will be lost.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={onConfirm}
              disabled={loading}
              className="flex items-center space-x-2 w-full sm:w-auto"
            >
              {loading ? (
                <>
                  <LoadingSpinner
                    message="Deleting..."
                    variant="default"
                    size="sm"
                  />
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  <span>Delete Account</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const AccountsPage = () => {
  const { user } = useAuth();
  const { handleCrudSuccess, handleCrudError } = useCrudRefresh({
    autoRefresh: false, // Disabled to prevent double refresh - data is refreshed by individual CRUD operations
    clearCache: true,
    refreshDelay: 1500
  });
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [accountToDelete, setAccountToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Pagination state
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [total, setTotal] = useState(0);

  // Picture upload state
  const [selectedFile, setSelectedFile] = useState(null);
  const [picturePreview, setPicturePreview] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState(null);
  const [removePictureFlag, setRemovePictureFlag] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const canvasRef2 = useRef(null);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
  });

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch users from API
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await accountsService.getUsersByTarget(
          user?.target_type,
          user?.target_id
        );
        setAccounts(response.data || []);
        setTotal(response.data?.length || 0);
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
  console.error("Error fetching users:", error);
}
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (user?.target_type && user?.target_id) {
      fetchUsers();
    }
  }, [user]);

  // Filter accounts based on search and filters
  const filteredAccounts = useMemo(() => {
    return accounts.filter((account) => {
      const matchesSearch =
        debouncedSearchTerm === "" ||
        account.full_name
          ?.toLowerCase()
          .includes(debouncedSearchTerm.toLowerCase()) ||
        account.email
          ?.toLowerCase()
          .includes(debouncedSearchTerm.toLowerCase());
      const matchesRole = filterRole === "all" || account.role === filterRole;
      return matchesSearch && matchesRole;
    });
  }, [accounts, debouncedSearchTerm, filterRole]);

  // Paginate filtered accounts
  const paginatedAccounts = useMemo(() => {
    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage;
    return filteredAccounts.slice(startIndex, endIndex);
  }, [filteredAccounts, page, perPage]);

  // Calculate pagination values
  const totalPages = Math.ceil(filteredAccounts.length / perPage);

  // Handle pagination
  const handlePrev = () => {
    setPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNext = () => {
    setPage((prev) => Math.min(prev + 1, totalPages));
  };

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearchTerm, filterRole]);

  // Picture upload handlers
  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Image file must be less than 5MB",
          variant: "destructive",
        });
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file (JPG, PNG, GIF)",
          variant: "destructive",
        });
        return;
      }

      setSelectedFile(file);
      setRemovePictureFlag(false); // Reset removal flag when new image is selected
      const reader = new FileReader();
      reader.onload = (e) => {
        setPicturePreview(e.target.result);
      };
      reader.onerror = (error) => {
        if (process.env.NODE_ENV === 'development') {
  console.error("Error reading file:", error);
}
        toast({
          title: "Error",
          description: "Failed to read image file",
          variant: "destructive",
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCameraCapture = async () => {
    try {
      // Check if we're on HTTPS or localhost
      const isSecure = window.location.protocol === "https:" || window.location.hostname === "localhost";
      if (!isSecure) {
        toast({
          title: "HTTPS Required",
          description: "Camera access requires HTTPS. Please use the HTTPS development server.",
          variant: "destructive",
        });
        return;
      }

      // Check if mediaDevices API is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast({
          title: "Camera Not Supported",
          description: "Your browser doesn't support camera access. Please use Chrome, Firefox, or Edge.",
          variant: "destructive",
        });
        return;
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
      });

      setStream(mediaStream);
      setShowCamera(true);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
  console.error("Error accessing camera:", error);
}

      let errorMessage = "Unable to access camera. Please check permissions.";

      if (error.name === 'NotAllowedError') {
        errorMessage = "Camera permission denied. Please allow camera access in your browser settings.";
      } else if (error.name === 'NotFoundError') {
        errorMessage = "No camera found. Please connect a camera and try again.";
      } else if (error.name === 'NotSupportedError') {
        errorMessage = "Camera not supported. Please use a different browser.";
      } else if (error.name === 'NotReadableError') {
        errorMessage = "Camera is in use by another application. Please close other camera apps.";
      }

      toast({
        title: "Camera Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext("2d");
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0);

      canvasRef.current.toBlob((blob) => {
        const file = new File([blob], "user-photo.jpg", { type: "image/jpeg" });
        setSelectedFile(file);
        setRemovePictureFlag(false); // Reset removal flag when new image is captured
        setPicturePreview(URL.createObjectURL(blob));
        setShowCamera(false);
        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
        }
      }, "image/jpeg", 0.8);
    }
  };

  const removePicture = () => {
    setSelectedFile(null);
    setPicturePreview(null);
    setRemovePictureFlag(true); // Set flag to indicate removal
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const resetForm = () => {
    setFormData({
      fullName: "",
      email: "",
      password: "",
    });
    setSelectedFile(null);
    setPicturePreview(null);
    setRemovePictureFlag(false);
    setShowCamera(false);
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
  };

  const handleAddAccount = async () => {
    try {
      // Create FormData for file upload
      const formDataToSend = new FormData();
      formDataToSend.append("fullname", formData.fullName);
      formDataToSend.append("email", formData.email);
      formDataToSend.append("password", formData.password);
      formDataToSend.append("role", "staff"); // Fixed to staff
      formDataToSend.append("targetType", user?.target_type); // Auto-set from current user
      formDataToSend.append("targetId", user?.target_id); // Auto-set from current user

      // Add picture if selected
      if (selectedFile) {
        formDataToSend.append("picturePath", selectedFile);
      } else {}

      for (let [key, value] of formDataToSend.entries()) {}

      const response = await accountsService.createUser(formDataToSend);

      // Refresh the users list
      const usersResponse = await accountsService.getUsersByTarget(
        user?.target_type,
        user?.target_id
      );
      setAccounts(usersResponse.data || []);
      setTotal(usersResponse.data?.length || 0);

      setIsAddDialogOpen(false);
      resetForm();

      toast({
        title: "Account Created",
        description: "New account has been created successfully.",
      });
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
  console.error("Error creating account:", error);
}
      if (process.env.NODE_ENV === 'development') {
  console.error("Error response:", error.response);
}
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEditAccount = async () => {
    try {
      // Create FormData for file upload
      const formDataToSend = new FormData();
      formDataToSend.append("fullname", formData.fullName);
      formDataToSend.append("email", formData.email);
      if (formData.password) {
        formDataToSend.append("password", formData.password);
      }
      formDataToSend.append("role", selectedAccount.role); // Keep existing role
      formDataToSend.append("targetType", selectedAccount.target_type); // Keep existing target type
      formDataToSend.append("targetId", selectedAccount.target_id); // Keep existing target id

      // Add picture if selected
      if (selectedFile) {
        formDataToSend.append("picturePath", selectedFile);
      } else if (removePictureFlag) {
        formDataToSend.append("removePicture", "true");
      } else {}

      for (let [key, value] of formDataToSend.entries()) {}

      const response = await accountsService.updateUser(selectedAccount.id, formDataToSend);

      // Refresh the users list
      const usersResponse = await accountsService.getUsersByTarget(
        user?.target_type,
        user?.target_id
      );
      setAccounts(usersResponse.data || []);
      setTotal(usersResponse.data?.length || 0);

      setIsEditDialogOpen(false);
      setSelectedAccount(null);
      resetForm();

      // Handle successful update with auto-refresh
      await handleCrudSuccess('update', {
        message: `Account ${formData.fullName || selectedAccount.fullname} has been updated`
      });
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
  console.error("Error updating account:", error);
}
      if (process.env.NODE_ENV === 'development') {
  console.error("Error response:", error.response);
}
      handleCrudError(error, 'update');
    }
  };

  const handleDeleteAccount = (account) => {
    setAccountToDelete(account);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!accountToDelete) return;

    try {
      setDeleteLoading(true);
      await accountsService.deleteUser(accountToDelete.id);

      // Handle successful deletion with auto-refresh
      await handleCrudSuccess('delete', {
        message: `Account ${accountToDelete.fullname || accountToDelete.email} has been deleted`
      });

      // Refresh the users list
      const response = await accountsService.getUsersByTarget(
        user?.target_type,
        user?.target_id
      );
      setAccounts(response.data || []);
      setTotal(response.data?.length || 0);

      setIsDeleteDialogOpen(false);
      setAccountToDelete(null);

    } catch (error) {
      handleCrudError(error, 'delete');
    } finally {
      setDeleteLoading(false);
    }
  };

  const openEditDialog = (account) => {
    setSelectedAccount(account);
    setFormData({
      fullName: account.full_name || "",
      email: account.email || "",
      password: "", // Don't populate password for security
    });
    // Set existing picture preview if available
    setPicturePreview(account.picture_path);
    setSelectedFile(null); // Reset selected file for new upload
    setRemovePictureFlag(false); // Reset flag for new upload
    setIsEditDialogOpen(true);
  };

  const getRoleBadgeVariant = (role) => {
    return role === "admin" ? "default" : "secondary";
  };

  const getStatusBadgeVariant = (isActive) => {
    return isActive ? "default" : "destructive";
  };

  if (loading) {
    return (
      <LoadingSpinner
        message="Loading accounts..."
        variant="default"
        size="lg"
      />
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Accounts Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage user accounts, roles, and permissions
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <RefreshControls variant="outline" size="sm" />
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Account
              </Button>
            </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Add New Staff Account
              </DialogTitle>
              <DialogDescription>
                Create a new staff account for your organization. The account will automatically be assigned to your current organization.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Account Information Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Account Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName" className="text-sm font-medium">
                        Full Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="fullName"
                        value={formData.fullName}
                        onChange={(e) =>
                          setFormData({ ...formData, fullName: e.target.value })
                        }
                        placeholder="Enter full name"
                        className="h-12"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-medium">
                        Email Address <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        placeholder="Enter email address"
                        className="h-12"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium">
                      Password <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      placeholder="Enter secure password"
                      className="h-12"
                    />
                    <p className="text-xs text-muted-foreground">
                      Password must be at least 8 characters long
                    </p>
                  </div>
                </CardContent>
              </Card>
              {/* Profile Picture Section */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Profile Picture
                    <Badge variant="secondary" className="text-xs font-normal">Optional</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Current Image Preview */}
                  <div className="space-y-4">
                    <Label className="text-sm font-medium text-center block">
                      Profile Image
                    </Label>
                    <div className="flex justify-center">
                      {picturePreview ? (
                        <div className="relative">
                          <img
                            src={picturePreview}
                            alt="Profile preview"
                            className="w-48 h-48 object-cover rounded-lg border shadow-sm"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full"
                            onClick={removePicture}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="w-48 h-48 border-2 border-dashed border-muted-foreground/25 rounded-lg flex items-center justify-center bg-muted/20">
                          <div className="text-center">
                            <User className="h-16 w-16 text-muted-foreground/50 mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">
                              No image uploaded
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Upload and Capture Buttons */}
                  <div className="space-y-4">
                    <Label className="text-sm font-medium">
                      Upload or Capture Image
                    </Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 flex-1"
                      >
                        <Upload className="h-4 w-4" />
                        Upload Photo
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCameraCapture}
                        className="flex items-center gap-2 flex-1"
                      >
                        <Camera className="h-4 w-4" />
                        Take Photo
                      </Button>
                    </div>
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <p className="text-xs text-muted-foreground text-center">
                      Supported formats: JPG, PNG, GIF. Max size: 5MB
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Camera Modal */}
            {showCamera && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
                <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-slate-900">Take Photo</h3>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowCamera(false);
                          if (stream) {
                            stream.getTracks().forEach((track) => track.stop());
                          }
                        }}
                        className="h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="relative bg-black rounded-lg overflow-hidden border-4 border-slate-200">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="w-full h-64 object-cover"
                      />
                      <canvas ref={canvasRef} className="hidden" />
                      <div className="absolute inset-0 border-2 border-white/50 rounded-lg m-2 pointer-events-none">
                        <div className="absolute top-2 left-2 w-8 h-8 border-l-2 border-t-2 border-white rounded-tl-lg"></div>
                        <div className="absolute top-2 right-2 w-8 h-8 border-r-2 border-t-2 border-white rounded-tr-lg"></div>
                        <div className="absolute bottom-2 left-2 w-8 h-8 border-l-2 border-b-2 border-white rounded-bl-lg"></div>
                        <div className="absolute bottom-2 right-2 w-8 h-8 border-r-2 border-b-2 border-white rounded-br-lg"></div>
                      </div>
                    </div>
                    <div className="flex gap-3 justify-center">
                      <Button
                        type="button"
                        onClick={capturePhoto}
                        className="flex items-center gap-2 bg-primary hover:bg-primary/90"
                      >
                        <Camera className="h-4 w-4" />
                        Capture Photo
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowCamera(false);
                          if (stream) {
                            stream.getTracks().forEach((track) => track.stop());
                          }
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-6 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddDialogOpen(false);
                  resetForm();
                }}
                className="w-full sm:w-auto h-12"
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddAccount}
                className="w-full sm:w-auto h-12 bg-primary hover:bg-primary/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Account
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search accounts…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-9 pl-9"
          />
        </div>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="h-9 w-36">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="staff">Staff</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-gray-400 ml-auto">
          {filteredAccounts.length} account{filteredAccounts.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Accounts Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedAccounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 border-2 border-primary/20">
                        <AvatarImage 
                          src={
                            account.picture_path 
                              ? account.picture_path
                              : undefined
                          } 
                        />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {account.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{account.full_name}</div>
                        <div className="text-sm text-slate-500 flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {account.email}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(account.role)}>
                      <Shield className="h-3 w-3 mr-1" />
                      {account.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(account.is_active)}>
                      {account.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-slate-500">
                      {account.created_at
                        ? new Date(account.created_at).toLocaleDateString()
                        : "N/A"}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center gap-2 justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(account)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      {account.role !== "admin" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteAccount(account)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 px-4 py-3 border-t">
            <div className="text-sm text-gray-500">
              Page {page} of {totalPages || 1}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePrev} disabled={page === 1}>
                Previous
              </Button>
              <Button variant="outline" size="sm" onClick={handleNext} disabled={page === totalPages || totalPages === 0}>
                Next
              </Button>
            </div>
            <select
              className="w-24 border rounded px-2 py-1 text-sm"
              value={perPage}
              onChange={(e) => setPerPage(Number(e.target.value))}
            >
              <option value={5}>5 / page</option>
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="w-[95vw] max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Edit Account
            </DialogTitle>
            <DialogDescription>
              Update account information. Role and organization cannot be changed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Account Information Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Account Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-fullName" className="text-sm font-medium">
                      Full Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="edit-fullName"
                      value={formData.fullName}
                      onChange={(e) =>
                        setFormData({ ...formData, fullName: e.target.value })
                      }
                      placeholder="Enter full name"
                      className="h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-email" className="text-sm font-medium">
                      Email Address <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="edit-email"
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      placeholder="Enter email address"
                      className="h-12"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-password" className="text-sm font-medium">
                    Password (leave blank to keep current)
                  </Label>
                  <Input
                    id="edit-password"
                    type="password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    placeholder="Enter new password (optional)"
                    className="h-12"
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave blank to keep the current password
                  </p>
                </div>
              </CardContent>
            </Card>
            {/* Profile Picture Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Profile Picture
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Current Image Preview */}
                <div className="space-y-4">
                  <Label className="text-sm font-medium text-center block">
                    Profile Image
                  </Label>
                  <div className="flex justify-center">
                    {picturePreview ? (
                      <div className="relative">
                        <img
                          src={picturePreview}
                          alt="Profile preview"
                          className="w-48 h-48 object-cover rounded-lg border shadow-sm"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full"
                          onClick={removePicture}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="w-48 h-48 border-2 border-dashed border-muted-foreground/25 rounded-lg flex items-center justify-center bg-muted/20">
                        <div className="text-center">
                          <User className="h-16 w-16 text-muted-foreground/50 mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">
                            No image uploaded
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Upload and Capture Buttons */}
                <div className="space-y-4">
                  <Label className="text-sm font-medium">
                    Upload or Capture Image
                  </Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 flex-1"
                    >
                      <Upload className="h-4 w-4" />
                      Upload Photo
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCameraCapture}
                      className="flex items-center gap-2 flex-1"
                    >
                      <Camera className="h-4 w-4" />
                      Take Photo
                    </Button>
                  </div>
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    Supported formats: JPG, PNG, GIF. Max size: 5MB
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Camera Modal for Edit */}
          {showCamera && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900">Take Photo</h3>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowCamera(false);
                        if (stream) {
                          stream.getTracks().forEach((track) => track.stop());
                        }
                      }}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="relative bg-black rounded-lg overflow-hidden border-4 border-slate-200">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full h-64 object-cover"
                    />
                    <canvas ref={canvasRef} className="hidden" />
                    <div className="absolute inset-0 border-2 border-white/50 rounded-lg m-2 pointer-events-none">
                      <div className="absolute top-2 left-2 w-8 h-8 border-l-2 border-t-2 border-white rounded-tl-lg"></div>
                      <div className="absolute top-2 right-2 w-8 h-8 border-r-2 border-t-2 border-white rounded-tr-lg"></div>
                      <div className="absolute bottom-2 left-2 w-8 h-8 border-l-2 border-b-2 border-white rounded-bl-lg"></div>
                      <div className="absolute bottom-2 right-2 w-8 h-8 border-r-2 border-b-2 border-white rounded-br-lg"></div>
                    </div>
                  </div>
                  <div className="flex gap-3 justify-center">
                    <Button
                      type="button"
                      onClick={capturePhoto}
                      className="flex items-center gap-2 bg-primary hover:bg-primary/90"
                    >
                      <Camera className="h-4 w-4" />
                      Capture Photo
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowCamera(false);
                        if (stream) {
                          stream.getTracks().forEach((track) => track.stop());
                        }
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-6 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                resetForm();
              }}
              className="w-full sm:w-auto h-12"
            >
              Cancel
            </Button>
            <Button onClick={handleEditAccount} className="w-full sm:w-auto h-12">
              <Edit className="h-4 w-4 mr-2" />
              Update Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        loading={deleteLoading}
        account={accountToDelete}
      />
    </div>
  );
};

export default AccountsPage;
