// React imports
import React, { useEffect, useState } from 'react';

// Third-party libraries
import { FiEdit2, FiLock, FiPlus, FiSearch, FiSettings } from 'react-icons/fi';

// UI Components (shadcn/ui)
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
// Switch component - using checkbox instead if Switch doesn't exist
// import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

// Custom Components
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// Services
import { taxProfileService, type TaxProfile, type TaxProfileVersion } from '@/services/api/tax-profile.service';
import { serviceService, type FieldMetadata } from '@/services/api/service.service';
import { useToast } from '@/hooks/use-toast';

// Components
import { TaxProfileDesigner } from '@/components/tax/TaxProfileDesigner';

// Types
import type { TaxConfiguration } from '@/types/tax';

// Utils
import { adminMenuItems } from '@/config/admin-menu';
import { format } from 'date-fns';

export const TaxProfiles: React.FC = () => {
  const { toast } = useToast();
  const [taxProfiles, setTaxProfiles] = useState<TaxProfile[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<TaxProfile | null>(null);
  const [versions, setVersions] = useState<TaxProfileVersion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [serviceFilter, setServiceFilter] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [isActivateModalOpen, setIsActivateModalOpen] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<TaxProfileVersion | null>(null);
  const [isDesignerModalOpen, setIsDesignerModalOpen] = useState(false);
  const [designingVersion, setDesigningVersion] = useState<TaxProfileVersion | null>(null);
  const [serviceFields, setServiceFields] = useState<FieldMetadata[]>([]);
  const [designerConfiguration, setDesignerConfiguration] = useState<TaxConfiguration>({
    inputs: [],
    derivedValues: [],
    finalTax: { formula: '0', description: '' },
    adjustmentRules: [],
  });

  // Form state
  const [formData, setFormData] = useState({
    serviceId: '',
    name: '',
    variant: '',
    isActive: true,
  });

  const [versionFormData, setVersionFormData] = useState({
    version: '',
    effectiveFrom: '',
    effectiveTo: '',
    changeReason: '',
  });

  useEffect(() => {
    loadTaxProfiles();
    loadServices();
  }, []);

  useEffect(() => {
    if (selectedProfile) {
      loadVersions(selectedProfile.id);
    }
  }, [selectedProfile]);

  const loadTaxProfiles = async () => {
    setIsLoading(true);
    try {
      const filters: any = {};
      if (serviceFilter !== 'all') filters.serviceId = serviceFilter;
      if (searchQuery) filters.search = searchQuery;

      const result = await taxProfileService.getTaxProfiles(filters, { page: 1, limit: 100 });
      setTaxProfiles(result.taxProfiles);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to load tax profiles',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadServices = async () => {
    try {
      const result = await serviceService.getAllServices(1, 100);
      setServices(result.services);
    } catch (error: any) {
      console.error('Failed to load services:', error);
    }
  };

  const loadVersions = async (taxProfileId: string) => {
    try {
      const versionsData = await taxProfileService.getTaxProfileVersions(taxProfileId);
      setVersions(versionsData);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to load versions',
        variant: 'destructive',
      });
    }
  };

  const handleCreateProfile = async () => {
    try {
      await taxProfileService.createTaxProfile(formData);
      toast({
        title: 'Success',
        description: 'Tax profile created successfully',
      });
      setIsAddModalOpen(false);
      setFormData({ serviceId: '', name: '', variant: '', isActive: true });
      loadTaxProfiles();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create tax profile',
        variant: 'destructive',
      });
    }
  };

  const handleCreateVersion = async () => {
    if (!selectedProfile) return;

    try {
      const newVersion = await taxProfileService.createTaxProfileVersion(selectedProfile.id, {
        version: versionFormData.version || undefined,
        effectiveFrom: versionFormData.effectiveFrom,
        effectiveTo: versionFormData.effectiveTo || undefined,
        changeReason: versionFormData.changeReason,
        configuration: {
          inputs: [],
          derivedValues: [],
          finalTax: {
            formula: '0',
            description: 'Default tax formula',
          },
        },
      });
      toast({
        title: 'Success',
        description: 'Tax profile version created successfully',
      });
      setIsVersionModalOpen(false);
      setVersionFormData({ version: '', effectiveFrom: '', effectiveTo: '', changeReason: '' });
      await loadVersions(selectedProfile.id);
      // Auto-open designer after version creation
      if (newVersion) {
        // Find the newly created version in the updated list
        const updatedVersions = await taxProfileService.getTaxProfileVersions(selectedProfile.id);
        const createdVersion = updatedVersions.find(v => v.id === newVersion.id);
        if (createdVersion) {
          handleOpenDesigner(createdVersion);
        }
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create version',
        variant: 'destructive',
      });
    }
  };

  const handleActivateVersion = async () => {
    if (!selectedVersion) return;

    try {
      await taxProfileService.activateTaxProfileVersion(selectedVersion.id);
      toast({
        title: 'Success',
        description: 'Version activated successfully',
      });
      setIsActivateModalOpen(false);
      setSelectedVersion(null);
      if (selectedProfile) {
        loadVersions(selectedProfile.id);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to activate version',
        variant: 'destructive',
      });
    }
  };

  const handleOpenDesigner = async (version: TaxProfileVersion) => {
    setDesigningVersion(version);
    setDesignerConfiguration(version.configuration as TaxConfiguration);
    setIsDesignerModalOpen(true);

    // Fetch service fields if we have a selected profile
    if (selectedProfile && selectedProfile.serviceId) {
      try {
        const fields = await serviceService.getServiceFieldsMetadata(selectedProfile.serviceId);
        setServiceFields(fields);
      } catch (error: any) {
        console.error('Failed to fetch service fields:', error);
        // Don't show error toast - just set empty array, validation will still work
        setServiceFields([]);
      }
    } else {
      setServiceFields([]);
    }
  };

  const handleSaveConfiguration = async () => {
    if (!designingVersion) return;

    try {
      await taxProfileService.updateTaxProfileVersion(designingVersion.id, {
        configuration: designerConfiguration,
      });
      toast({
        title: 'Success',
        description: 'Configuration saved successfully',
      });
      setIsDesignerModalOpen(false);
      if (selectedProfile) {
        loadVersions(selectedProfile.id);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to save configuration',
        variant: 'destructive',
      });
    }
  };

  const handleDesignerChange = (configuration: TaxConfiguration) => {
    setDesignerConfiguration(configuration);
  };

  const filteredProfiles = taxProfiles.filter((profile) => {
    const matchesSearch = !searchQuery || 
      profile.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      profile.variant?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesService = serviceFilter === 'all' || profile.serviceId === serviceFilter;
    return matchesSearch && matchesService;
  });

  return (
    <DashboardLayout menuItems={adminMenuItems}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Tax Profiles</h1>
            <p className="text-gray-600 mt-1">Manage tax computation profiles and versions</p>
          </div>
          <Button onClick={() => setIsAddModalOpen(true)}>
            <FiPlus className="mr-2 h-4 w-4" />
            Create Tax Profile
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Search</Label>
                <div className="relative">
                  <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by name or variant..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Service</Label>
                <Select value={serviceFilter} onValueChange={setServiceFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All services" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Services</SelectItem>
                    {services.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Tax Profiles List */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Tax Profiles</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-gray-500">Loading...</div>
              ) : filteredProfiles.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No tax profiles found</div>
              ) : (
                <div className="space-y-2">
                  {filteredProfiles.map((profile) => (
                    <div
                      key={profile.id}
                      onClick={() => setSelectedProfile(profile)}
                      className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                        selectedProfile?.id === profile.id
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900">{profile.name}</h3>
                          {profile.variant && (
                            <p className="text-sm text-gray-600">{profile.variant}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            {profile.service?.name}
                          </p>
                        </div>
                        <Badge variant={profile.isActive ? 'default' : 'secondary'}>
                          {profile.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        {profile._count?.versions || 0} version(s)
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right: Version Management */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>
                {selectedProfile ? `${selectedProfile.name} - Versions` : 'Select a Tax Profile'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedProfile ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-600">
                      Manage versions for this tax profile
                    </p>
                    <Button
                      size="sm"
                      onClick={() => setIsVersionModalOpen(true)}
                    >
                      <FiPlus className="mr-2 h-4 w-4" />
                      Create Version
                    </Button>
                  </div>

                  {versions.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No versions found. Create the first version.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {versions.map((version) => {
                        const config = version.configuration as TaxConfiguration;
                        const hasNonEmptyConfig = 
                          (config.inputs && config.inputs.length > 0) ||
                          (config.derivedValues && config.derivedValues.length > 0) ||
                          (config.finalTax && config.finalTax.formula !== '0') ||
                          (config.adjustmentRules && config.adjustmentRules.length > 0);
                        const configSummary = [
                          config.inputs?.length ? `${config.inputs.length} input${config.inputs.length !== 1 ? 's' : ''}` : null,
                          config.derivedValues?.length ? `${config.derivedValues.length} derived value${config.derivedValues.length !== 1 ? 's' : ''}` : null,
                          config.adjustmentRules?.length ? `${config.adjustmentRules.length} adjustment rule${config.adjustmentRules.length !== 1 ? 's' : ''}` : null,
                        ].filter(Boolean).join(', ') || 'Empty configuration';

                        return (
                          <div
                            key={version.id}
                            className="p-4 rounded-lg border border-gray-200"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-semibold">Version {version.version}</h4>
                                  <Badge
                                    variant={
                                      version.status === 'ACTIVE'
                                        ? 'default'
                                        : version.status === 'DRAFT'
                                        ? 'secondary'
                                        : 'outline'
                                    }
                                  >
                                    {version.status}
                                  </Badge>
                                  {version.status === 'ACTIVE' && (
                                    <FiLock className="h-4 w-4 text-gray-400" />
                                  )}
                                  {hasNonEmptyConfig && version.status === 'DRAFT' && (
                                    <Badge variant="outline" className="text-xs">
                                      Configured
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600 mt-1">
                                  {version.changeReason}
                                </p>
                                <div className="text-xs text-gray-500 mt-2">
                                  <div>
                                    Effective From: {format(new Date(version.effectiveFrom), 'PPP')}
                                  </div>
                                  {version.effectiveTo && (
                                    <div>
                                      Effective To: {format(new Date(version.effectiveTo), 'PPP')}
                                    </div>
                                  )}
                                  <div className="mt-1 text-gray-400">
                                    {configSummary}
                                  </div>
                                </div>
                              </div>
                              {version.status === 'DRAFT' && (
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleOpenDesigner(version)}
                                  >
                                    <FiEdit2 className="mr-2 h-4 w-4" />
                                    Design
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      if (!hasNonEmptyConfig) {
                                        toast({
                                          title: 'Warning',
                                          description: 'This version has an empty configuration. Consider designing it before activation.',
                                          variant: 'destructive',
                                        });
                                      }
                                      setSelectedVersion(version);
                                      setIsActivateModalOpen(true);
                                    }}
                                  >
                                    Activate
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <FiSettings className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg">Select a tax profile to view versions</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create Tax Profile Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Tax Profile</DialogTitle>
            <DialogDescription>
              Create a new tax profile for a service
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Service</Label>
              <Select
                value={formData.serviceId}
                onValueChange={(value) => setFormData({ ...formData, serviceId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a service" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., RPTAX Residential"
              />
            </div>
            <div className="space-y-2">
              <Label>Variant (Optional)</Label>
              <Input
                value={formData.variant}
                onChange={(e) => setFormData({ ...formData, variant: e.target.value })}
                placeholder="e.g., Residential, Commercial"
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, isActive: e.target.checked })}
                className="rounded border-gray-300"
              />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateProfile}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Version Modal */}
      <Dialog open={isVersionModalOpen} onOpenChange={setIsVersionModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Tax Profile Version</DialogTitle>
            <DialogDescription>
              Create a new version for {selectedProfile?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Version (Optional - auto-generated if not provided)</Label>
              <Input
                value={versionFormData.version}
                onChange={(e) => setVersionFormData({ ...versionFormData, version: e.target.value })}
                placeholder="e.g., 1.0.0"
              />
            </div>
            <div className="space-y-2">
              <Label>Effective From *</Label>
              <Input
                type="datetime-local"
                value={versionFormData.effectiveFrom}
                onChange={(e) => setVersionFormData({ ...versionFormData, effectiveFrom: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Effective To (Optional)</Label>
              <Input
                type="datetime-local"
                value={versionFormData.effectiveTo}
                onChange={(e) => setVersionFormData({ ...versionFormData, effectiveTo: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Change Reason *</Label>
              <Textarea
                value={versionFormData.changeReason}
                onChange={(e) => setVersionFormData({ ...versionFormData, changeReason: e.target.value })}
                placeholder="Explain why this version was created..."
                rows={4}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsVersionModalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateVersion}
              disabled={!versionFormData.effectiveFrom || !versionFormData.changeReason}
            >
              Create Version
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activate Version Modal */}
      <Dialog open={isActivateModalOpen} onOpenChange={setIsActivateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Activate Version</DialogTitle>
            <DialogDescription>
              Are you sure you want to activate version {selectedVersion?.version}?
              This will archive the current active version.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsActivateModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleActivateVersion}>Activate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tax Profile Designer Modal */}
      <Dialog open={isDesignerModalOpen} onOpenChange={setIsDesignerModalOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Design Tax Configuration - Version {designingVersion?.version}
            </DialogTitle>
            <DialogDescription>
              Configure inputs, derived values, final tax formula, and adjustment rules
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <TaxProfileDesigner
              configuration={designerConfiguration}
              onChange={handleDesignerChange}
              onSave={handleSaveConfiguration}
              serviceFields={serviceFields}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDesignerModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveConfiguration}>
              Save Configuration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

