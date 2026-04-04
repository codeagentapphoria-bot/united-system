import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import SelectReact from 'react-select';
import { cn } from '@/lib/utils';
import { FiUser, FiMail, FiPhone, FiCalendar, FiMapPin, FiUpload, FiCheck } from 'react-icons/fi';
import { citizenRegistrationService, type CitizenRegistrationData } from '@/services/api/citizen-registration.service';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useAddresses } from '@/hooks/addresses/useAddresses';

const reactSelectStyles = {
  control: (base: any) => ({
    ...base,
    minHeight: '48px',
    borderColor: '#d1d9e3',
    '&:hover': { borderColor: '#4c6085' },
  }),
  menu: (base: any) => ({
    ...base,
    zIndex: 9999,
  }),
};

// ID Document Types
const ID_DOCUMENT_TYPES = [
  { value: 'PHILHEALTH_ID', label: 'PhilHealth ID' },
  { value: 'DRIVERS_LICENSE', label: "Driver's License" },
  { value: 'PASSPORT', label: 'Passport' },
  { value: 'NATIONAL_ID', label: 'National ID (ePhilID)' },
  { value: 'VOTERS_ID', label: "Voter's ID" },
  { value: 'POSTAL_ID', label: 'Postal ID' },
  { value: 'EMPLOYEE_ID', label: 'Employee ID (with LGU seal)' },
  { value: 'SCHOOL_ID', label: 'School ID (with LGU seal)' },
  { value: 'BARANGAY_CLEARANCE', label: 'Barangay Clearance with Signature' },
  { value: 'OTHER', label: 'Other Government ID' },
];

// Form validation schema - matches CitizenRegistrationRequest model
const citizenRegistrationSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  middleName: z.string().max(100).optional().or(z.literal('')),
  lastName: z.string().min(1, 'Last name is required').max(100),
  extensionName: z.string().max(20).optional().or(z.literal('')),
  phoneNumber: z
    .string()
    .min(1, 'Phone number is required')
    .regex(/^09\d{9}$/, 'Phone number must be 11 digits starting with 09'),
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
  birthDate: z.string().min(1, 'Date of birth is required'),
  sex: z.enum(['male', 'female'], { required_error: 'Sex is required' }),
  civilStatus: z.enum(['single', 'married', 'widowed', 'separated', 'annulled'], {
    required_error: 'Civil status is required',
  }),
  // Address fields
  region: z.string().min(1, 'Region is required'),
  province: z.string().min(1, 'Province is required'),
  municipality: z.string().min(1, 'Municipality is required'),
  barangay: z.string().min(1, 'Barangay is required'),
  postalCode: z.string().optional().or(z.literal('')),
  streetAddress: z.string().optional().or(z.literal('')),
  address: z.string().min(1, 'Full address is required'),
  // Document fields
  idDocumentType: z.string().min(1, 'ID document type is required'),
  idDocumentNumber: z.string().min(1, 'ID document number is required'),
  acceptTerms: z.boolean().refine((val) => val === true, 'You must accept the terms'),
});

type CitizenRegistrationInput = z.infer<typeof citizenRegistrationSchema>;

export const CitizenRegister: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [idDocumentPreview, setIdDocumentPreview] = useState<string | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [idDocumentUrl, setIdDocumentUrl] = useState<string | null>(null);
  const [selfieUrl, setSelfieUrl] = useState<string | null>(null);

  const idDocumentRef = useRef<File | null>(null);
  const selfieRef = useRef<File | null>(null);

  const {
    getUniqueRegions,
    getProvincesByRegion,
    getMunicipalitiesByRegionAndProvince,
    getBarangaysByRegionProvinceAndMunicipality,
    getPostalCode,
  } = useAddresses();

  const form = useForm<CitizenRegistrationInput>({
    resolver: zodResolver(citizenRegistrationSchema),
    defaultValues: {
      firstName: '',
      middleName: '',
      lastName: '',
      extensionName: '',
      phoneNumber: '',
      email: '',
      birthDate: '',
      sex: undefined,
      civilStatus: undefined,
      region: '',
      province: '',
      municipality: '',
      barangay: '',
      postalCode: '',
      streetAddress: '',
      address: '',
      idDocumentType: '',
      idDocumentNumber: '',
      acceptTerms: false,
    },
  });

  const watchRegion = form.watch('region');
  const watchProvince = form.watch('province');
  const watchMunicipality = form.watch('municipality');
  const watchBarangay = form.watch('barangay');

  // Auto-generate full address when components change
  useEffect(() => {
    const region = form.watch('region') || '';
    const province = form.watch('province') || '';
    const municipality = form.watch('municipality') || '';
    const barangay = form.watch('barangay') || '';
    const streetAddress = form.watch('streetAddress') || '';

    const parts = [];
    if (streetAddress) parts.push(streetAddress);
    if (barangay) parts.push(barangay);
    if (municipality) parts.push(municipality);
    if (province) parts.push(province);
    if (region) parts.push(region);

    if (parts.length > 0) {
      form.setValue('address', parts.join(', '), { shouldValidate: true });
    }
  }, [watchRegion, watchProvince, watchMunicipality, watchBarangay, form]);

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'idDocument' | 'selfie'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      toast({
        variant: 'destructive',
        title: 'Invalid File',
        description: 'Please upload a JPG, PNG, or PDF file.',
      });
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'File Too Large',
        description: 'File size must be less than 5MB.',
      });
      return;
    }

    // Store as base64 URL (in production, upload to server)
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      if (type === 'idDocument') {
        idDocumentRef.current = file;
        setIdDocumentPreview(result);
        setIdDocumentUrl(result);
      } else {
        selfieRef.current = file;
        setSelfiePreview(result);
        setSelfieUrl(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const validateStep = async (step: number): Promise<boolean> => {
    let fieldsToValidate: (keyof CitizenRegistrationInput)[] = [];
    
    if (step === 1) {
      fieldsToValidate = ['firstName', 'lastName', 'phoneNumber', 'birthDate', 'sex', 'civilStatus'];
    } else if (step === 2) {
      fieldsToValidate = ['region', 'province', 'municipality', 'barangay', 'address'];
    } else if (step === 3) {
      fieldsToValidate = ['idDocumentType', 'idDocumentNumber', 'acceptTerms'];
    }

    const result = await form.trigger(fieldsToValidate);
    return result;
  };

  const handleNext = async () => {
    const isValid = await validateStep(currentStep);
    if (isValid) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep(currentStep - 1);
  };

  const onSubmit = async (data: CitizenRegistrationInput) => {
    if (!idDocumentRef.current || !selfieRef.current) {
      toast({
        variant: 'destructive',
        title: 'Missing Documents',
        description: 'Please upload both ID document and selfie.',
      });
      return;
    }

    if (!idDocumentUrl || !selfieUrl) {
      toast({
        variant: 'destructive',
        title: 'Upload Error',
        description: 'Please wait for uploads to complete.',
      });
      return;
    }

    setIsLoading(true);

    try {
      const registrationData: CitizenRegistrationData = {
        firstName: data.firstName,
        middleName: data.middleName || undefined,
        lastName: data.lastName,
        extensionName: data.extensionName || undefined,
        phoneNumber: data.phoneNumber,
        email: data.email || undefined,
        birthDate: data.birthDate,
        sex: data.sex,
        civilStatus: data.civilStatus,
        // Address
        address: data.address,
        barangay: data.barangay,
        municipality: data.municipality,
        province: data.province,
        region: data.region,
        postalCode: data.postalCode || undefined,
        streetAddress: data.streetAddress || undefined,
        // Documents
        idDocumentType: data.idDocumentType,
        idDocumentNumber: data.idDocumentNumber,
        idDocumentUrl: idDocumentUrl,
        selfieUrl: selfieUrl,
      };

      await citizenRegistrationService.submitRegistration(registrationData);
      
      setCurrentStep(4); // Show success step

      toast({
        title: 'Registration Submitted',
        description: 'Your application has been submitted for review. We will send you an email once reviewed.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Registration Failed',
        description: error.message || 'Please try again later.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const steps = [
    { number: 1, title: 'Personal Info' },
    { number: 2, title: 'Address' },
    { number: 3, title: 'Documents' },
    { number: 4, title: 'Complete' },
  ];

  // Success step after submission
  if (currentStep === 4) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-lg shadow-xl">
          <CardContent className="pt-6 pb-8">
            <div className="text-center space-y-4">
              <div className="h-16 w-16 mx-auto rounded-full bg-green-100 flex items-center justify-center">
                <FiCheck className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Registration Submitted!</h2>
              <p className="text-gray-600">
                Your citizen registration application has been submitted successfully.
                We will send you an email once your application has been reviewed.
              </p>
              <div className="pt-4">
                <Button
                  onClick={() => navigate('/portal')}
                  className="bg-primary-600 hover:bg-primary-700"
                >
                  Return to Home
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <div
                  className={cn(
                    'flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium',
                    currentStep >= step.number
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  )}
                >
                  {currentStep > step.number ? <FiCheck size={16} /> : step.number}
                </div>
                <span className={cn(
                  'ml-2 text-sm font-medium hidden sm:block',
                  currentStep >= step.number ? 'text-primary-600' : 'text-gray-500'
                )}>
                  {step.title}
                </span>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      'w-8 sm:w-16 h-0.5 mx-2',
                      currentStep > step.number ? 'bg-primary-600' : 'bg-gray-200'
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl text-center">
              {currentStep === 1 && 'Personal Information'}
              {currentStep === 2 && 'Address Information'}
              {currentStep === 3 && 'Document Upload'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Step 1: Personal Information */}
                {currentStep === 1 && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center">
                              <FiUser size={16} className="mr-2" />
                              First Name *
                            </FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Juan" className="h-12" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center">
                              <FiUser size={16} className="mr-2" />
                              Last Name *
                            </FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Dela Cruz" className="h-12" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="middleName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Middle Name</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Santos (optional)" className="h-12" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="extensionName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Suffix</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Jr., Sr., III" className="h-12" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="phoneNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center">
                            <FiPhone size={16} className="mr-2" />
                            Phone Number *
                          </FormLabel>
                          <FormControl>
                            <Input {...field} type="tel" placeholder="09XXXXXXXXX" className="h-12" />
                          </FormControl>
                          <FormDescription>11-digit mobile number (e.g., 09123456789)</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center">
                            <FiMail size={16} className="mr-2" />
                            Email
                          </FormLabel>
                          <FormControl>
                            <Input {...field} type="email" placeholder="email@example.com" className="h-12" />
                          </FormControl>
                          <FormDescription>Optional. For notifications and password recovery.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="birthDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center">
                              <FiCalendar size={16} className="mr-2" />
                              Date of Birth *
                            </FormLabel>
                            <FormControl>
                              <Input {...field} type="date" className="h-12" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="sex"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Sex *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-12">
                                  <SelectValue placeholder="Select sex" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="male">Male</SelectItem>
                                <SelectItem value="female">Female</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="civilStatus"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Civil Status *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-12">
                                <SelectValue placeholder="Select civil status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="single">Single</SelectItem>
                              <SelectItem value="married">Married</SelectItem>
                              <SelectItem value="widowed">Widowed</SelectItem>
                              <SelectItem value="separated">Separated</SelectItem>
                              <SelectItem value="annulled">Annulled</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                  </div>
                )}

                {/* Step 2: Address Information */}
                {currentStep === 2 && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Region */}
                      <FormField
                        control={form.control}
                        name="region"
                        render={({ field }) => {
                          const regionOptions = getUniqueRegions();
                          return (
                            <FormItem>
                              <FormLabel className="flex items-center">
                                <FiMapPin size={16} className="mr-2" />
                                Region *
                              </FormLabel>
                              <FormControl>
                                <SelectReact
                                  options={regionOptions}
                                  placeholder="Select region"
                                  styles={reactSelectStyles}
                                  value={regionOptions.find(opt => opt.value === field.value)}
                                  onChange={(option: any) => {
                                    field.onChange(option?.value || '');
                                    form.setValue('province', '');
                                    form.setValue('municipality', '');
                                    form.setValue('barangay', '');
                                    form.setValue('postalCode', '');
                                  }}
                                  isSearchable={true}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          );
                        }}
                      />

                      {/* Province */}
                      <FormField
                        control={form.control}
                        name="province"
                        render={({ field }) => {
                          const provinceOptions = getProvincesByRegion(watchRegion);
                          return (
                            <FormItem>
                              <FormLabel className="flex items-center">
                                <FiMapPin size={16} className="mr-2" />
                                Province *
                              </FormLabel>
                              <FormControl>
                                <SelectReact
                                  options={provinceOptions}
                                  placeholder="Select province"
                                  styles={reactSelectStyles}
                                  value={provinceOptions.find(opt => opt.value === field.value)}
                                  onChange={(option: any) => {
                                    field.onChange(option?.value || '');
                                    form.setValue('municipality', '');
                                    form.setValue('barangay', '');
                                    form.setValue('postalCode', '');
                                  }}
                                  isSearchable={true}
                                  isDisabled={!watchRegion}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          );
                        }}
                      />

                      {/* Municipality */}
                      <FormField
                        control={form.control}
                        name="municipality"
                        render={({ field }) => {
                          const municipalityOptions = getMunicipalitiesByRegionAndProvince(watchRegion, watchProvince);
                          return (
                            <FormItem>
                              <FormLabel className="flex items-center">
                                <FiMapPin size={16} className="mr-2" />
                                Municipality *
                              </FormLabel>
                              <FormControl>
                                <SelectReact
                                  options={municipalityOptions}
                                  placeholder="Select municipality"
                                  styles={reactSelectStyles}
                                  value={municipalityOptions.find(opt => opt.value === field.value)}
                                  onChange={(option: any) => {
                                    field.onChange(option?.value || '');
                                    form.setValue('barangay', '');
                                    form.setValue('postalCode', '');
                                  }}
                                  isSearchable={true}
                                  isDisabled={!watchRegion || !watchProvince}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          );
                        }}
                      />

                      {/* Barangay */}
                      <FormField
                        control={form.control}
                        name="barangay"
                        render={({ field }) => {
                          const barangayOptions = getBarangaysByRegionProvinceAndMunicipality(
                            watchRegion,
                            watchProvince,
                            watchMunicipality
                          );
                          return (
                            <FormItem>
                              <FormLabel className="flex items-center">
                                <FiMapPin size={16} className="mr-2" />
                                Barangay *
                              </FormLabel>
                              <FormControl>
                                <SelectReact
                                  options={barangayOptions}
                                  placeholder="Select barangay"
                                  styles={reactSelectStyles}
                                  value={barangayOptions.find(opt => opt.value === field.value)}
                                  onChange={(option: any) => {
                                    field.onChange(option?.value || '');
                                    if (option?.value) {
                                      const postalCode = getPostalCode(watchRegion, watchProvince, watchMunicipality, option.value);
                                      form.setValue('postalCode', postalCode);
                                    }
                                  }}
                                  isSearchable={true}
                                  isDisabled={!watchRegion || !watchProvince || !watchMunicipality}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          );
                        }}
                      />

                      {/* Postal Code */}
                      <FormField
                        control={form.control}
                        name="postalCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Postal Code</FormLabel>
                            <FormControl>
                              <Input {...field} className="h-12" readOnly disabled />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Street Address */}
                      <FormField
                        control={form.control}
                        name="streetAddress"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Unit No. / House No. / Street</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="e.g., Blk 5 Lot 12" className="h-12" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Full Address (auto-generated) */}
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center">
                            <FiMapPin size={16} className="mr-2" />
                            Full Address
                          </FormLabel>
                          <FormControl>
                            <Input {...field} className="h-12" readOnly disabled />
                          </FormControl>
                          <FormDescription>
                            Automatically generated from the address fields above.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {/* Step 3: Document Upload */}
                {currentStep === 3 && (
                  <div className="space-y-6">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-medium text-blue-800 mb-2">Required Documents</h4>
                      <ul className="text-sm text-blue-700 space-y-1">
                        <li>• Valid government-issued ID (PhilID, Driver's License, Passport, etc.)</li>
                        <li>• Recent selfie with your ID visible</li>
                        <li>• Accepted formats: JPG, PNG, PDF (max 5MB each)</li>
                      </ul>
                    </div>

                    {/* ID Document Type */}
                    <FormField
                      control={form.control}
                      name="idDocumentType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ID Document Type *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-12">
                                <SelectValue placeholder="Select ID type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {ID_DOCUMENT_TYPES.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* ID Document Number */}
                    <FormField
                      control={form.control}
                      name="idDocumentNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ID Document Number *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter ID number" className="h-12" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* ID Document Upload */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Upload ID Document *</label>
                      <div
                        className={cn(
                          'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
                          idDocumentPreview ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-primary-500'
                        )}
                        onClick={() => document.getElementById('idDocument')?.click()}
                      >
                        <input
                          id="idDocument"
                          type="file"
                          accept="image/jpeg,image/png,image/jpg,application/pdf"
                          className="hidden"
                          onChange={(e) => handleFileChange(e, 'idDocument')}
                        />
                        {idDocumentPreview ? (
                          <div className="space-y-2">
                            <FiCheck className="mx-auto h-8 w-8 text-green-600" />
                            <p className="text-sm text-green-700 font-medium">{idDocumentRef.current?.name}</p>
                            <p className="text-xs text-gray-500">Click to change</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <FiUpload className="mx-auto h-8 w-8 text-gray-400" />
                            <p className="text-sm text-gray-600">Click to upload ID document</p>
                            <p className="text-xs text-gray-500">JPG, PNG, or PDF (max 5MB)</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Selfie Upload */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Selfie with ID *</label>
                      <div
                        className={cn(
                          'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
                          selfiePreview ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-primary-500'
                        )}
                        onClick={() => document.getElementById('selfie')?.click()}
                      >
                        <input
                          id="selfie"
                          type="file"
                          accept="image/jpeg,image/png,image/jpg"
                          className="hidden"
                          onChange={(e) => handleFileChange(e, 'selfie')}
                        />
                        {selfiePreview ? (
                          <div className="space-y-2">
                            <FiCheck className="mx-auto h-8 w-8 text-green-600" />
                            <p className="text-sm text-green-700 font-medium">{selfieRef.current?.name}</p>
                            <p className="text-xs text-gray-500">Click to change</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <FiUpload className="mx-auto h-8 w-8 text-gray-400" />
                            <p className="text-sm text-gray-600">Click to upload selfie</p>
                            <p className="text-xs text-gray-500">JPG or PNG (max 5MB)</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Terms */}
                    <FormField
                      control={form.control}
                      name="acceptTerms"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-sm font-normal cursor-pointer">
                              I certify that all information provided is true and accurate. I understand that
                              providing false information may result in the rejection of my application or
                              revocation of my privileges. *
                            </FormLabel>
                            <FormMessage />
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex justify-between pt-4">
                  {currentStep > 1 ? (
                    <Button type="button" variant="outline" onClick={handleBack}>
                      Back
                    </Button>
                  ) : (
                    <div />
                  )}

                  {currentStep < 3 ? (
                    <Button type="button" onClick={handleNext}>
                      Next
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      className="bg-primary-600 hover:bg-primary-700"
                      disabled={isLoading || !idDocumentRef.current || !selfieRef.current}
                    >
                      {isLoading ? 'Submitting...' : 'Submit Application'}
                    </Button>
                  )}
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <button
            onClick={() => navigate('/portal')}
            className="text-primary-600 hover:underline font-medium"
          >
            Sign in here
          </button>
        </p>
      </div>
    </div>
  );
};

export default CitizenRegister;
