import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Map old TransactionType enum values to new Service records
const transactionTypeToService = [
  {
    code: 'BIRTH_CERTIFICATE',
    name: 'Birth Certificate',
    description: 'Request and manage birth certificate transactions',
    category: 'Civil Registry',
    order: 1,
    requiresPayment: true,
    defaultAmount: 0,
    paymentStatuses: ['PENDING', 'APPROVED', 'FOR_PRINTING', 'FOR_PICK_UP', 'RELEASED'],
    displayInSidebar: true,
    displayInSubscriberTabs: true,
    formFields: {
      fields: [
        {
          name: 'fullName',
          type: 'text',
          label: 'Full Name of Person',
          required: true,
          placeholder: 'Enter full name',
        },
        {
          name: 'dateOfBirth',
          type: 'date',
          label: 'Date of Birth',
          required: true,
        },
        {
          name: 'placeOfBirth',
          type: 'text',
          label: 'Place of Birth',
          required: true,
          placeholder: 'Enter place of birth',
        },
        {
          name: 'parentsName',
          type: 'text',
          label: "Parent's Name",
          required: true,
          placeholder: "Enter parent's full name",
        },
        {
          name: 'purpose',
          type: 'select',
          label: 'Purpose',
          required: true,
          placeholder: 'Select purpose',
          options: [
            { value: 'personal', label: 'Personal Use' },
            { value: 'legal', label: 'Legal' },
            { value: 'other', label: 'Other' },
          ],
        },
        {
          name: 'supportingDocuments',
          type: 'file',
          label: 'Supporting Documents',
          required: false,
          placeholder: 'Upload supporting documents',
        },
      ],
    },
  },
  {
    code: 'CEDULAS',
    name: 'Cedulas',
    description: 'Community tax certificate transactions',
    category: 'Tax',
    order: 2,
    requiresPayment: true,
    defaultAmount: 0,
    paymentStatuses: ['PENDING', 'PAID', 'RELEASED'],
    displayInSidebar: true,
    displayInSubscriberTabs: true,
    formFields: {
      fields: [
        {
          name: 'fullName',
          type: 'text',
          label: 'Full Name',
          required: true,
          placeholder: 'Enter full name',
        },
        {
          name: 'address',
          type: 'textarea',
          label: 'Address',
          required: true,
          placeholder: 'Enter complete address',
        },
        {
          name: 'purpose',
          type: 'select',
          label: 'Purpose',
          required: true,
          placeholder: 'Select purpose',
          options: [
            { value: 'employment', label: 'Employment' },
            { value: 'business', label: 'Business' },
            { value: 'personal', label: 'Personal' },
            { value: 'other', label: 'Other' },
          ],
        },
        {
          name: 'validIdType',
          type: 'select',
          label: 'Valid ID Type',
          required: true,
          placeholder: 'Select ID type',
          options: [
            { value: 'drivers_license', label: "Driver's License" },
            { value: 'passport', label: 'Passport' },
            { value: 'tin', label: 'TIN' },
            { value: 'other', label: 'Other' },
          ],
        },
        {
          name: 'validIdNumber',
          type: 'text',
          label: 'Valid ID Number',
          required: true,
          placeholder: 'Enter ID number',
        },
      ],
    },
  },
  {
    code: 'OCCUPATIONAL_HEALTH',
    name: 'Occupational & Health',
    description: 'Occupational health certificate transactions',
    category: 'Health',
    order: 3,
    requiresPayment: true,
    defaultAmount: 0,
    paymentStatuses: ['PENDING', 'APPROVED', 'FOR_RELEASE', 'RELEASED'],
    requiresAppointment: true,
    appointmentDuration: 30, // 30 minutes
    displayInSidebar: true,
    displayInSubscriberTabs: true,
    formFields: {
      fields: [
        {
          name: 'fullName',
          type: 'text',
          label: 'Full Name',
          required: true,
          placeholder: 'Enter full name',
        },
        {
          name: 'occupation',
          type: 'text',
          label: 'Occupation',
          required: true,
          placeholder: 'Enter occupation',
        },
        {
          name: 'workplaceAddress',
          type: 'textarea',
          label: 'Workplace Address',
          required: true,
          placeholder: 'Enter workplace address',
        },
        {
          name: 'certificateType',
          type: 'select',
          label: 'Health Certificate Type',
          required: true,
          placeholder: 'Select certificate type',
          options: [
            { value: 'pre_employment', label: 'Pre-Employment' },
            { value: 'annual', label: 'Annual' },
            { value: 'renewal', label: 'Renewal' },
          ],
        },
        {
          name: 'previousCertificateNumber',
          type: 'text',
          label: 'Previous Certificate Number',
          required: false,
          placeholder: 'Enter previous certificate number (if renewal)',
        },
        {
          name: 'medicalRecords',
          type: 'file',
          label: 'Medical Records',
          required: false,
          placeholder: 'Upload medical records',
        },
      ],
    },
  },
  {
    code: 'RPTAX',
    name: 'RPTAX',
    description: 'Real Property Tax transactions',
    category: 'Tax',
    order: 4,
    requiresPayment: true,
    defaultAmount: 0,
    paymentStatuses: ['ASSESSED', 'FOR_PAYMENT', 'PAID'],
    displayInSidebar: true,
    displayInSubscriberTabs: true,
    formFields: {
      fields: [
        {
          name: 'propertyOwnerName',
          type: 'text',
          label: 'Property Owner Name',
          required: true,
          placeholder: 'Enter property owner name',
        },
        {
          name: 'propertyAddress',
          type: 'textarea',
          label: 'Property Address',
          required: true,
          placeholder: 'Enter property address',
        },
        {
          name: 'propertyType',
          type: 'select',
          label: 'Property Type',
          required: true,
          placeholder: 'Select property type',
          options: [
            { value: 'residential', label: 'Residential' },
            { value: 'commercial', label: 'Commercial' },
            { value: 'agricultural', label: 'Agricultural' },
            { value: 'other', label: 'Other' },
          ],
        },
        {
          name: 'taxDeclarationNumber',
          type: 'text',
          label: 'Tax Declaration Number',
          required: true,
          placeholder: 'Enter tax declaration number',
        },
        {
          name: 'assessmentYear',
          type: 'number',
          label: 'Assessment Year',
          required: true,
          placeholder: 'Enter assessment year',
          validation: {
            min: 2020,
            max: new Date().getFullYear(),
          },
        },
        {
          name: 'supportingDocuments',
          type: 'file',
          label: 'Supporting Documents',
          required: false,
          placeholder: 'Upload supporting documents',
        },
      ],
    },
  },
  {
    code: 'BPTAX',
    name: 'BPTAX',
    description: 'Business Property Tax transactions',
    category: 'Tax',
    order: 5,
    requiresPayment: true,
    defaultAmount: 0,
    paymentStatuses: ['ASSESSED', 'FOR_PAYMENT', 'PAID'],
    displayInSidebar: true,
    displayInSubscriberTabs: true,
    formFields: {
      fields: [
        {
          name: 'businessName',
          type: 'text',
          label: 'Business Name',
          required: true,
          placeholder: 'Enter business name',
        },
        {
          name: 'businessAddress',
          type: 'textarea',
          label: 'Business Address',
          required: true,
          placeholder: 'Enter business address',
        },
        {
          name: 'businessType',
          type: 'select',
          label: 'Business Type',
          required: true,
          placeholder: 'Select business type',
          options: [
            { value: 'sole_proprietorship', label: 'Sole Proprietorship' },
            { value: 'partnership', label: 'Partnership' },
            { value: 'corporation', label: 'Corporation' },
            { value: 'other', label: 'Other' },
          ],
        },
        {
          name: 'tinNumber',
          type: 'text',
          label: 'TIN Number',
          required: true,
          placeholder: 'Enter TIN number',
        },
        {
          name: 'assessmentYear',
          type: 'number',
          label: 'Assessment Year',
          required: true,
          placeholder: 'Enter assessment year',
          validation: {
            min: 2020,
            max: new Date().getFullYear(),
          },
        },
        {
          name: 'businessPermit',
          type: 'file',
          label: 'Business Permit',
          required: false,
          placeholder: 'Upload business permit',
        },
      ],
    },
  },
  {
    code: 'NOV',
    name: 'Notice of Violations',
    description: 'Notice of violations transactions',
    category: 'Permit',
    order: 6,
    requiresPayment: true,
    defaultAmount: 0,
    paymentStatuses: ['ACKNOWLEDGED', 'COMPLIED', 'FOR_HEARING', 'SETTLED'],
    displayInSidebar: true,
    displayInSubscriberTabs: true,
    formFields: {
      fields: [
        {
          name: 'violationType',
          type: 'select',
          label: 'Violation Type',
          required: true,
          placeholder: 'Select violation type',
          options: [
            { value: 'building_code', label: 'Building Code' },
            { value: 'zoning', label: 'Zoning' },
            { value: 'environmental', label: 'Environmental' },
            { value: 'other', label: 'Other' },
          ],
        },
        {
          name: 'propertyAddress',
          type: 'textarea',
          label: 'Property Address',
          required: true,
          placeholder: 'Enter property address',
        },
        {
          name: 'violationDate',
          type: 'date',
          label: 'Violation Date',
          required: true,
        },
        {
          name: 'description',
          type: 'textarea',
          label: 'Description',
          required: true,
          placeholder: 'Enter violation description',
        },
        {
          name: 'compliancePlan',
          type: 'file',
          label: 'Compliance Plan',
          required: false,
          placeholder: 'Upload compliance plan',
        },
        {
          name: 'supportingDocuments',
          type: 'file',
          label: 'Supporting Documents',
          required: false,
          placeholder: 'Upload supporting documents',
        },
      ],
    },
  },
  {
    code: 'OVRS',
    name: 'OVRS',
    description: 'Ordinance Violations Reporting System transactions',
    category: 'Permit',
    order: 7,
    requiresPayment: true,
    defaultAmount: 0,
    paymentStatuses: ['ISSUED', 'UNPAID', 'WAIVED'],
    displayInSidebar: true,
    displayInSubscriberTabs: true,
    formFields: {
      fields: [
        {
          name: 'violationCategory',
          type: 'select',
          label: 'Violation Category',
          required: true,
          placeholder: 'Select violation category',
          options: [
            { value: 'noise', label: 'Noise' },
            { value: 'littering', label: 'Littering' },
            { value: 'parking', label: 'Parking' },
            { value: 'other', label: 'Other' },
          ],
        },
        {
          name: 'location',
          type: 'text',
          label: 'Location',
          required: true,
          placeholder: 'Enter violation location',
        },
        {
          name: 'violationDate',
          type: 'date',
          label: 'Violation Date',
          required: true,
        },
        {
          name: 'description',
          type: 'textarea',
          label: 'Description',
          required: true,
          placeholder: 'Enter violation description',
        },
        {
          name: 'witnessInformation',
          type: 'textarea',
          label: 'Witness Information',
          required: false,
          placeholder: 'Enter witness information (if applicable)',
        },
        {
          name: 'evidence',
          type: 'file',
          label: 'Evidence',
          required: false,
          placeholder: 'Upload evidence',
        },
      ],
    },
  },
  {
    code: 'BPLS',
    name: 'BPLS',
    description: 'Business Permit and Licensing System transactions',
    category: 'Business',
    order: 8,
    requiresPayment: true,
    defaultAmount: 0,
    paymentStatuses: ['FOR_INSPECTION', 'FOR_RELEASE', 'REJECTED'],
    displayInSidebar: true,
    displayInSubscriberTabs: true,
    formFields: {
      fields: [
        {
          name: 'businessName',
          type: 'text',
          label: 'Business Name',
          required: true,
          placeholder: 'Enter business name',
        },
        {
          name: 'businessType',
          type: 'select',
          label: 'Business Type',
          required: true,
          placeholder: 'Select business type',
          options: [
            { value: 'retail', label: 'Retail' },
            { value: 'food_service', label: 'Food Service' },
            { value: 'manufacturing', label: 'Manufacturing' },
            { value: 'service', label: 'Service' },
            { value: 'other', label: 'Other' },
          ],
        },
        {
          name: 'businessAddress',
          type: 'textarea',
          label: 'Business Address',
          required: true,
          placeholder: 'Enter business address',
        },
        {
          name: 'ownerName',
          type: 'text',
          label: 'Owner Name',
          required: true,
          placeholder: 'Enter owner name',
        },
        {
          name: 'tinNumber',
          type: 'text',
          label: 'TIN Number',
          required: true,
          placeholder: 'Enter TIN number',
        },
        {
          name: 'applicationType',
          type: 'select',
          label: 'Application Type',
          required: true,
          placeholder: 'Select application type',
          options: [
            { value: 'new', label: 'New' },
            { value: 'renewal', label: 'Renewal' },
            { value: 'amendment', label: 'Amendment' },
          ],
        },
        {
          name: 'businessDocuments',
          type: 'file',
          label: 'Business Documents',
          required: true,
          placeholder: 'Upload business documents',
        },
      ],
    },
  },
  {
    code: 'EBOSS',
    name: 'E-Boss',
    description: 'E-Business One Stop Shop transactions',
    category: 'Business',
    order: 9,
    requiresPayment: true,
    defaultAmount: 0,
    paymentStatuses: ['FOR_INSPECTION', 'FOR_RELEASE', 'REJECTED'],
    displayInSidebar: true,
    displayInSubscriberTabs: true,
    formFields: {
      fields: [
        {
          name: 'businessName',
          type: 'text',
          label: 'Business Name',
          required: true,
          placeholder: 'Enter business name',
        },
        {
          name: 'businessType',
          type: 'select',
          label: 'Business Type',
          required: true,
          placeholder: 'Select business type',
          options: [
            { value: 'retail', label: 'Retail' },
            { value: 'food_service', label: 'Food Service' },
            { value: 'manufacturing', label: 'Manufacturing' },
            { value: 'service', label: 'Service' },
            { value: 'other', label: 'Other' },
          ],
        },
        {
          name: 'businessAddress',
          type: 'textarea',
          label: 'Business Address',
          required: true,
          placeholder: 'Enter business address',
        },
        {
          name: 'ownerName',
          type: 'text',
          label: 'Owner Name',
          required: true,
          placeholder: 'Enter owner name',
        },
        {
          name: 'contactNumber',
          type: 'text',
          label: 'Contact Number',
          required: true,
          placeholder: 'Enter contact number',
        },
        {
          name: 'applicationType',
          type: 'select',
          label: 'Application Type',
          required: true,
          placeholder: 'Select application type',
          options: [
            { value: 'new', label: 'New' },
            { value: 'renewal', label: 'Renewal' },
            { value: 'amendment', label: 'Amendment' },
          ],
        },
        {
          name: 'requiredDocuments',
          type: 'file',
          label: 'Required Documents',
          required: true,
          placeholder: 'Upload required documents',
        },
      ],
    },
  },
  {
    code: 'DEATH_CERTIFICATE',
    name: 'Death Certificate',
    description: 'Request and manage death certificate transactions',
    category: 'Civil Registry',
    order: 10,
    requiresPayment: true,
    defaultAmount: 0,
    paymentStatuses: ['PENDING', 'APPROVED', 'FOR_PRINTING', 'FOR_PICK_UP', 'RELEASED'],
    displayInSidebar: true,
    displayInSubscriberTabs: true,
    formFields: {
      fields: [
        {
          name: 'deceasedFullName',
          type: 'text',
          label: 'Deceased Full Name',
          required: true,
          placeholder: 'Enter deceased full name',
        },
        {
          name: 'dateOfDeath',
          type: 'date',
          label: 'Date of Death',
          required: true,
        },
        {
          name: 'placeOfDeath',
          type: 'text',
          label: 'Place of Death',
          required: true,
          placeholder: 'Enter place of death',
        },
        {
          name: 'causeOfDeath',
          type: 'text',
          label: 'Cause of Death',
          required: true,
          placeholder: 'Enter cause of death',
        },
        {
          name: 'relationshipToDeceased',
          type: 'select',
          label: 'Relationship to Deceased',
          required: true,
          placeholder: 'Select relationship',
          options: [
            { value: 'spouse', label: 'Spouse' },
            { value: 'child', label: 'Child' },
            { value: 'parent', label: 'Parent' },
            { value: 'sibling', label: 'Sibling' },
            { value: 'other', label: 'Other' },
          ],
        },
        {
          name: 'purpose',
          type: 'select',
          label: 'Purpose',
          required: true,
          placeholder: 'Select purpose',
          options: [
            { value: 'insurance', label: 'Insurance' },
            { value: 'legal', label: 'Legal' },
            { value: 'personal', label: 'Personal' },
            { value: 'other', label: 'Other' },
          ],
        },
        {
          name: 'supportingDocuments',
          type: 'file',
          label: 'Supporting Documents',
          required: false,
          placeholder: 'Upload supporting documents',
        },
      ],
    },
  },
];

export const seedServices = async () => {
  console.log('Seeding services...');

  for (const serviceData of transactionTypeToService) {
    const existingService = await prisma.service.findUnique({
      where: { code: serviceData.code },
    });

    if (!existingService) {
      await prisma.service.create({
        data: {
          ...serviceData,
          paymentStatuses: serviceData.paymentStatuses as any,
          formFields: serviceData.formFields ? (serviceData.formFields as any) : null,
          isActive: true,
        },
      });
      console.log(`Created service: ${serviceData.name}`);
    } else {
      // Update existing service with formFields, appointment fields, and tax calculation fields if they are provided
      const updateData: any = {};
      if (serviceData.formFields) {
        updateData.formFields = serviceData.formFields as any;
      }
      if (serviceData.requiresAppointment !== undefined) {
        updateData.requiresAppointment = serviceData.requiresAppointment;
      }
      if (serviceData.appointmentDuration !== undefined) {
        updateData.appointmentDuration = serviceData.appointmentDuration;
      }
      if (Object.keys(updateData).length > 0) {
        await prisma.service.update({
          where: { code: serviceData.code },
          data: updateData,
        });
        console.log(`Updated service: ${serviceData.name}`);
      } else {
        console.log(`Service already exists: ${serviceData.name}`);
      }
    }
  }

  console.log('Services seeding completed!');
};
