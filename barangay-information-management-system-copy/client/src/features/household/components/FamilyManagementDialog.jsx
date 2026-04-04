import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserPlus, UserMinus, Edit, Trash, Plus, X } from "lucide-react";
import ReactSelect from "react-select";
import api from "@/utils/api";
import { toast } from "@/hooks/use-toast";

// ReactSelect styles
const reactSelectStyles = {
  control: (provided, state) => ({
    ...provided,
    backgroundColor: "transparent",
    borderColor: state.isFocused ? "#d1d5db" : "#e5e7eb",
    boxShadow: "none",
    minHeight: "38px",
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
};

const FamilyManagementDialog = ({
  household,
  open,
  onOpenChange,
  onSuccess,
}) => {
  const [residents, setResidents] = useState([]);
  const [families, setFamilies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [residentSearchTerm, setResidentSearchTerm] = useState("");
  const [residentSearchLoading, setResidentSearchLoading] = useState(false);
  const [residentSearchTimeout, setResidentSearchTimeout] = useState(null);

  // Fetch residents when dialog opens
  useEffect(() => {
    if (open) {
      if (household && household.families) {
        setFamilies(
          household.families.map((family) => ({
            ...family,
            members: family.members || [],
          }))
        );
      }
    }
  }, [open, household]);

  const fetchResidents = async () => {
    try {
      // Don't fetch all residents initially - wait for search
      setResidents([]);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
  console.error("Failed to fetch residents:", error);
}
      toast({ title: "Failed to fetch residents", variant: "destructive" });
    }
  };

  // Search residents with debouncing
  const searchResidents = async (searchTerm) => {
    if (!searchTerm || searchTerm.trim().length < 2) {
      setResidents([]);
      return;
    }

    setResidentSearchLoading(true);
    try {
      const res = await api.get("/list/residents", {
        params: {
          search: searchTerm.trim(),
          page: 1,
          perPage: 50, // Limit results for better performance
        },
      });
      const data = res.data.data?.data || res.data.data || [];
      setResidents(data);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
  console.error("Failed to search residents:", error);
}
      setResidents([]);
      toast({ title: "Failed to search residents", variant: "destructive" });
    } finally {
      setResidentSearchLoading(false);
    }
  };

  // Debounced search effect
  useEffect(() => {
    if (residentSearchTimeout) {
      clearTimeout(residentSearchTimeout);
    }

    if (residentSearchTerm.trim().length >= 2) {
      const timeout = setTimeout(() => {
        searchResidents(residentSearchTerm);
      }, 300); // 300ms debounce
      setResidentSearchTimeout(timeout);
    } else if (residentSearchTerm.trim().length === 0) {
      setResidents([]);
    }

    return () => {
      if (residentSearchTimeout) {
        clearTimeout(residentSearchTimeout);
      }
    };
  }, [residentSearchTerm]);

  // Resident options for ReactSelect
  const residentOptions = residents.map((r) => ({
    value: r.id,
    label: `${r.last_name}, ${r.first_name}${
      r.middle_name ? " " + r.middle_name : ""
    }`,
  }));

  // Helper to get all selected resident ids in families
  const getSelectedResidentIds = () => {
    const ids = new Set();
    families.forEach((family) => {
      if (family.family_head) ids.add(family.family_head);
      family.members.forEach((member) => {
        if (member.fm_member) ids.add(member.fm_member);
      });
    });
    return ids;
  };

  // Helper to get filtered resident options for a dropdown
  const getFilteredResidentOptions = (currentValue) => {
    const selectedIds = getSelectedResidentIds();
    return residentOptions.filter(
      (opt) => !selectedIds.has(opt.value) || opt.value === currentValue
    );
  };

  // Add new family group
  const addFamilyGroup = () => {
    setFamilies([
      ...families,
      {
        family_id: `temp_${Date.now()}`,
        family_group: `Group ${families.length + 1}`,
        family_head: "",
        members: [],
      },
    ]);
  };

  // Remove family group
  const removeFamilyGroup = (index) => {
    setFamilies(families.filter((_, i) => i !== index));
  };

  // Add member to family
  const addFamilyMember = (familyIndex) => {
    const updatedFamilies = [...families];
    updatedFamilies[familyIndex].members.push({
      fm_id: `temp_${Date.now()}`,
      fm_member: "",
      fm_relationship_to_fm_head: "",
    });
    setFamilies(updatedFamilies);
  };

  // Remove member from family
  const removeFamilyMember = (familyIndex, memberIndex) => {
    const updatedFamilies = [...families];
    updatedFamilies[familyIndex].members = updatedFamilies[
      familyIndex
    ].members.filter((_, i) => i !== memberIndex);
    setFamilies(updatedFamilies);
  };

  // Update family head
  const updateFamilyHead = (familyIndex, value) => {
    const updatedFamilies = [...families];
    updatedFamilies[familyIndex].family_head = value;
    setFamilies(updatedFamilies);
  };

  // Update family member
  const updateFamilyMember = (familyIndex, memberIndex, value) => {
    const updatedFamilies = [...families];
    updatedFamilies[familyIndex].members[memberIndex].fm_member = value;
    setFamilies(updatedFamilies);
  };

  // Save families
  const handleSave = async () => {
    if (!household) return;

    setSaving(true);
    try {
      // Transform families data for backend
      const familiesData = families
        .filter((family) => family.family_head) // Only families with heads
        .map((family) => ({
          familyHeadId: family.family_head,
          familyMembers: family.members
            .filter((member) => member.fm_member) // Only members with values
            .map((member) => ({
              memberId: member.fm_member,
              relationshipToHead: member.fm_relationship_to_fm_head || "",
            })),
        }));

      // Transform to backend format
      const familiesObj = {};
      familiesData.forEach((fam, i) => {
        const membersObj = {};
        fam.familyMembers.forEach((m, j) => {
          membersObj[j] = m;
        });
        familiesObj[i] = { ...fam, familyMembers: membersObj };
      });

      // Update household with new families
      await api.put(`/household/${household.household_id}`, {
        ...household,
        families: familiesObj,
      });

      toast({ title: "Families updated successfully!" });
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
  console.error("Failed to update families:", error);
}
      toast({ title: "Failed to update families", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Manage Family Groups
          </DialogTitle>
          <DialogDescription>
            Add, edit, or remove family members for this household
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <span className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Family Groups */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Family Groups</h3>
                <Button variant="outline" size="sm" onClick={addFamilyGroup}>
                  <Plus className="h-4 w-4 mr-1" /> Add Family Group
                </Button>
              </div>

              {families.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No family groups found</p>
                  <p className="text-sm">
                    Click "Add Family Group" to get started
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {families.map((family, familyIndex) => (
                    <Card key={family.family_id}>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-primary" />
                            {family.family_group}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              Family {familyIndex + 1}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFamilyGroup(familyIndex)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Family Head */}
                        <div className="space-y-2">
                          <Label>Family Head</Label>
                          <ReactSelect
                            options={getFilteredResidentOptions(
                              family.family_head
                            )}
                            value={
                              getFilteredResidentOptions(
                                family.family_head
                              ).find(
                                (opt) => opt.value === family.family_head
                              ) || null
                            }
                            onChange={(opt) =>
                              updateFamilyHead(familyIndex, opt?.value || "")
                            }
                            onInputChange={(newValue, { action }) => {
                              if (action === "input-change") {
                                setResidentSearchTerm(newValue);
                              }
                            }}
                            inputValue={residentSearchTerm}
                            isClearable
                            isSearchable
                            isLoading={residentSearchLoading}
                            placeholder={
                              residentSearchLoading
                                ? "Searching residents..."
                                : "Type to search for family head (min 2 characters)"
                            }
                            noOptionsMessage={() => 
                              residentSearchTerm.trim().length < 2 
                                ? "Type at least 2 characters to search" 
                                : "No residents found"
                            }
                            styles={reactSelectStyles}
                          />
                        </div>

                        {/* Family Members */}
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <Label>Family Members</Label>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => addFamilyMember(familyIndex)}
                            >
                              <UserPlus className="h-4 w-4 mr-1" /> Add Member
                            </Button>
                          </div>

                          {family.members.length > 0 && (
                            <div className="space-y-2">
                              {family.members.map((member, memberIndex) => (
                                <div
                                  key={member.fm_id}
                                  className="flex gap-2 items-center"
                                >
                                  <ReactSelect
                                    className="flex-1"
                                    options={getFilteredResidentOptions(
                                      member.fm_member
                                    )}
                                    value={
                                      getFilteredResidentOptions(
                                        member.fm_member
                                      ).find(
                                        (opt) => opt.value === member.fm_member
                                      ) || null
                                    }
                                    onChange={(opt) =>
                                      updateFamilyMember(
                                        familyIndex,
                                        memberIndex,
                                        opt?.value || ""
                                      )
                                    }
                                    onInputChange={(newValue, { action }) => {
                                      if (action === "input-change") {
                                        setResidentSearchTerm(newValue);
                                      }
                                    }}
                                    inputValue={residentSearchTerm}
                                    isClearable
                                    isSearchable
                                    isLoading={residentSearchLoading}
                                    placeholder={
                                      residentSearchLoading
                                        ? "Searching residents..."
                                        : `Type to search for family member ${memberIndex + 1} (min 2 characters)`
                                    }
                                    noOptionsMessage={() => 
                                      residentSearchTerm.trim().length < 2 
                                        ? "Type at least 2 characters to search" 
                                        : "No residents found"
                                    }
                                    styles={reactSelectStyles}
                                  />
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      removeFamilyMember(
                                        familyIndex,
                                        memberIndex
                                      )
                                    }
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button variant="hero" onClick={handleSave} disabled={saving}>
                {saving ? (
                  <div className="flex items-center gap-2">
                    <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                    Saving...
                  </div>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default FamilyManagementDialog;
