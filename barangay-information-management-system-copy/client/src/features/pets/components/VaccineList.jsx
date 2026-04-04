import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Edit,
  Trash,
  Syringe,
  Calendar,
  Info,
  MoreHorizontal,
} from "lucide-react";
import { vaccineService } from "@/services/vaccineService";
import VaccineForm from "./VaccineForm";
import VaccineDeleteConfirmationDialog from "./VaccineDeleteConfirmationDialog";
import { useToast } from "@/hooks/use-toast";

const VaccineList = ({ petId, petName, showAddButtons = true }) => {
  const [vaccines, setVaccines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedVaccine, setSelectedVaccine] = useState(null);
  const [vaccineToDelete, setVaccineToDelete] = useState(null);
  const { toast } = useToast();

  // Fetch vaccines for the pet
  const fetchVaccines = async () => {
    setLoading(true);
    try {
      const response = await vaccineService.getVaccinesByTarget("pet", petId);
      setVaccines(response.data || []);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
  console.error("Error fetching vaccines:", error);
}
      toast({
        title: "Error",
        description: "Failed to fetch vaccine records",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (petId) {
      fetchVaccines();
    }
  }, [petId]);

  // Handle add vaccine
  const handleAddVaccine = async (vaccineData) => {
    setLoading(true);
    try {
      await vaccineService.createVaccine(vaccineData);
      toast({
        title: "Success",
        description: "Vaccine record added successfully",
      });
      setIsAddDialogOpen(false);
      fetchVaccines(); // Refresh the list
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
  console.error("Error adding vaccine:", error);
}
      toast({
        title: "Error",
        description: "Failed to add vaccine record",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle edit vaccine
  const handleEditVaccine = async (vaccineData) => {
    setLoading(true);
    try {
      await vaccineService.updateVaccine(selectedVaccine.id, vaccineData);
      toast({
        title: "Success",
        description: "Vaccine record updated successfully",
      });
      setIsEditDialogOpen(false);
      setSelectedVaccine(null);
      fetchVaccines(); // Refresh the list
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
  console.error("Error updating vaccine:", error);
}
      toast({
        title: "Error",
        description: "Failed to update vaccine record",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle delete vaccine confirmation
  const handleDeleteConfirm = (vaccine) => {
    setVaccineToDelete(vaccine);
    setIsDeleteDialogOpen(true);
  };

  // Handle delete vaccine execution
  const handleDeleteExecute = async (vaccineId) => {
    setLoading(true);
    try {
      await vaccineService.deleteVaccine(vaccineId);
      toast({
        title: "Success",
        description: "Vaccine record deleted successfully",
      });
      setIsDeleteDialogOpen(false);
      setVaccineToDelete(null);
      fetchVaccines(); // Refresh the list
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
  console.error("Error deleting vaccine:", error);
}
      toast({
        title: "Error",
        description: "Failed to delete vaccine record",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Get days since vaccination
  const getDaysSinceVaccination = (dateString) => {
    const vaccinationDate = new Date(dateString);
    const today = new Date();
    const diffTime = Math.abs(today - vaccinationDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Get status badge
  const getStatusBadge = (dateString) => {
    const daysSince = getDaysSinceVaccination(dateString);
    if (daysSince <= 30) {
      return <Badge variant="default" className="bg-green-500">Recent</Badge>;
    } else if (daysSince <= 365) {
      return <Badge variant="secondary">Within Year</Badge>;
    } else {
      return <Badge variant="destructive">Overdue</Badge>;
    }
  };

  return (
    <div className="space-y-4 !mt-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        {showAddButtons && (
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="flex gap-2 !ml-auto">
                <Plus className="h-4 w-4" />
                Add Vaccine
              </Button>
            </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Vaccine Record</DialogTitle>
              <DialogDescription>
                Add a new vaccine record for {petName}
              </DialogDescription>
            </DialogHeader>
            <VaccineForm
              mode="create"
              onSubmit={handleAddVaccine}
              onCancel={() => setIsAddDialogOpen(false)}
              loading={loading}
              targetType="pet"
              targetId={petId}
            />
          </DialogContent>
        </Dialog>
        )}
      </div>

      {/* Vaccine Records Table */}
      {vaccines.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Syringe className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No vaccine records</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              No vaccine records have been added for this pet yet.
            </p>
            {showAddButtons && (
              <Button
                onClick={() => setIsAddDialogOpen(true)}
                className="flex gap-2"
              >
                <Plus className="h-4 w-4" />
                Add First Vaccine
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vaccine Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[50px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vaccines.map((vaccine) => (
                  <TableRow key={vaccine.id}>
                    <TableCell className="font-medium">
                      {vaccine.vaccine_name}
                    </TableCell>
                    <TableCell>
                      {vaccine.vaccine_type || (
                        <span className="text-muted-foreground">Not specified</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {formatDate(vaccine.vaccination_date)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(vaccine.vaccination_date)}
                    </TableCell>
                    <TableCell>
                      {vaccine.vaccine_description ? (
                        <div className="max-w-[200px] truncate" title={vaccine.vaccine_description}>
                          {vaccine.vaccine_description}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">No description</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedVaccine(vaccine);
                              setIsEditDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                                                     <DropdownMenuItem
                             onClick={() => handleDeleteConfirm(vaccine)}
                             className="text-red-600"
                           >
                             <Trash className="h-4 w-4 mr-2" /> Delete
                           </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Edit Vaccine Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Vaccine Record</DialogTitle>
            <DialogDescription>
              Update vaccine record for {petName}
            </DialogDescription>
          </DialogHeader>
          {selectedVaccine && (
            <VaccineForm
              mode="edit"
              initialData={selectedVaccine}
              onSubmit={handleEditVaccine}
              onCancel={() => {
                setIsEditDialogOpen(false);
                setSelectedVaccine(null);
              }}
              loading={loading}
              targetType="pet"
              targetId={petId}
            />
                     )}
         </DialogContent>
       </Dialog>

       {/* Delete Confirmation Dialog */}
       <VaccineDeleteConfirmationDialog
         vaccine={vaccineToDelete}
         open={isDeleteDialogOpen}
         onOpenChange={setIsDeleteDialogOpen}
         onConfirm={handleDeleteExecute}
         loading={loading}
       />
     </div>
   );
 };

export default VaccineList;
