import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Helper function to generate transaction ID
const generateTransactionId = (serviceCode: string, year: number, count: number): string => {
  const prefix = serviceCode.substring(0, 2).toUpperCase();
  return `${prefix}-${year}-${String(count + 1).padStart(3, '0')}`;
};

// Helper function to generate reference number
const generateReferenceNumber = (serviceCode: string, year: number, count: number): string => {
  const prefix = serviceCode.substring(0, 2).toUpperCase();
  return `REF-${prefix}-${year}-${String(count + 1).padStart(6, '0')}`;
};

// Sample Filipino names
const firstNames = [
  'Maria',
  'Juan',
  'Jose',
  'Ana',
  'Carlos',
  'Rosa',
  'Pedro',
  'Carmen',
  'Miguel',
  'Elena',
  'Antonio',
  'Isabel',
  'Francisco',
  'Dolores',
  'Manuel',
  'Teresa',
  'Ricardo',
  'Rosa',
  'Fernando',
  'Concepcion',
  'Roberto',
  'Patricia',
  'Alberto',
  'Mercedes',
  'Eduardo',
  'Gloria',
  'Ramon',
  'Esperanza',
  'Alfredo',
  'Amparo',
  'Jorge',
  'Rosario',
  'Luis',
  'Dolores',
  'Enrique',
  'Margarita',
];

const lastNames = [
  'Dela Cruz',
  'Garcia',
  'Reyes',
  'Ramos',
  'Mendoza',
  'Santos',
  'Villanueva',
  'Fernandez',
  'Cruz',
  'Torres',
  'Gonzales',
  'Rivera',
  'Lopez',
  'Martinez',
  'Sanchez',
  'Gomez',
  'Morales',
  'Aquino',
  'Bautista',
  'Castro',
  'Diaz',
  'Estrada',
  'Flores',
  'Herrera',
  'Jimenez',
  'Luna',
  'Moreno',
  'Navarro',
  'Ortega',
  'Perez',
  'Quizon',
  'Ramos',
  'Silva',
  'Valdez',
  'Zamora',
];

const middleNames = [
  'Santos',
  'Cruz',
  'Reyes',
  'Garcia',
  'Mendoza',
  'Ramos',
  'Villanueva',
  'Fernandez',
  'Torres',
  'Gonzales',
  'Rivera',
  'Lopez',
  'Martinez',
  'Sanchez',
];

// Generate unique phone number
const generatePhoneNumber = (index: number): string => {
  const base = 9170000000;
  return `09${String(base + index).slice(-9)}`;
};

// Generate unique email
const generateEmail = (firstName: string, lastName: string, index: number): string => {
  const cleanLastName = lastName.toLowerCase().replace(/\s+/g, '');
  return `${firstName.toLowerCase()}.${cleanLastName}${index}@example.com`;
};

// Generate unique username
const generateUsername = (firstName: string, lastName: string, index: number): string => {
  const cleanLastName = lastName.toLowerCase().replace(/\s+/g, '');
  return `${firstName.toLowerCase()}${cleanLastName}${index}`;
};

// Generate resident ID for non-citizens
const generateResidentId = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const count = await (prisma as any).nonCitizen.count({
    where: {
      createdAt: {
        gte: new Date(`${year}-01-01`),
        lt: new Date(`${year + 1}-01-01`),
      },
    },
  });
  return `RES-${year}-${String(count + 1).padStart(3, '0')}`;
};

// Generate resident ID for citizens
const generateCitizenResidentId = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const count = await (prisma as any).citizen.count({
    where: {
      createdAt: {
        gte: new Date(`${year}-01-01`),
        lt: new Date(`${year + 1}-01-01`),
      },
    },
  });
  return `CIT-${year}-${String(count + 1).padStart(3, '0')}`;
};

// Seed Non-Citizens
async function seedNonCitizens() {
  console.log('🌱 Seeding non-citizens...');

  const nonCitizensData = [];
  const subscriberPassword = await bcrypt.hash('Sample123!', 10);

  for (let i = 0; i < 8; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const middleName = middleNames[Math.floor(Math.random() * middleNames.length)];
    const phoneNumber = generatePhoneNumber(i + 100);
    const email = generateEmail(firstName, lastName, i);
    const residentId = await generateResidentId();

    const birthDate = new Date(
      1980 + Math.floor(Math.random() * 30),
      Math.floor(Math.random() * 12),
      Math.floor(Math.random() * 28) + 1
    );
    const civilStatuses = ['Single', 'Married', 'Widowed', 'Separated'];
    const sexes = ['Male', 'Female'];
    const residencyTypes = ['RESIDENT', 'NON_RESIDENT'];
    const statuses = ['PENDING', 'ACTIVE'];

    const regions = ['NCR', 'Region I', 'Region II', 'Region III', 'Region IV-A', 'Region V'];
    const provinces = ['Metro Manila', 'Bulacan', 'Laguna', 'Cavite', 'Rizal', 'Quezon'];
    const municipalities = ['Manila', 'Quezon City', 'Makati', 'Pasig', 'Taguig', 'Caloocan'];

    const region = regions[Math.floor(Math.random() * regions.length)];
    const province = provinces[Math.floor(Math.random() * provinces.length)];
    const municipality = municipalities[Math.floor(Math.random() * municipalities.length)];

    const motherFirstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const motherLastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const motherMiddleName = middleNames[Math.floor(Math.random() * middleNames.length)];

    try {
      // Check if phone number already exists
      const existing = await (prisma as any).nonCitizen.findUnique({
        where: { phoneNumber },
      });

      if (existing) {
        console.log(`  ⊙ Non-citizen with phone ${phoneNumber} already exists, skipping...`);
        continue;
      }

      const nonCitizen = await (prisma as any).nonCitizen.create({
        data: {
          firstName,
          middleName,
          lastName,
          extensionName: i % 3 === 0 ? 'Jr.' : null,
          phoneNumber,
          email,
          residentId,
          residencyType: residencyTypes[Math.floor(Math.random() * residencyTypes.length)] as any,
          status: statuses[Math.floor(Math.random() * statuses.length)] as any,
          residencyStatus: 'active',
          birthDate,
          civilStatus: civilStatuses[Math.floor(Math.random() * civilStatuses.length)],
          sex: sexes[Math.floor(Math.random() * sexes.length)],
          residentAddress: `${Math.floor(Math.random() * 999) + 1} Sample Street, Barangay ${lastName}, ${municipality}, ${province}`,
          placeOfBirth: {
            create: {
              region,
              province,
              municipality,
            },
          },
          motherInfo: {
            create: {
              firstName: motherFirstName,
              middleName: motherMiddleName,
              lastName: motherLastName,
            },
          },
        },
      });

      // Create Subscriber gateway
      const subscriber = await (prisma as any).subscriber.create({
        data: {
          type: 'SUBSCRIBER',
          nonCitizenId: nonCitizen.id,
          citizenId: null,
          password: subscriberPassword,
        },
        include: {
          citizen: true,
          nonCitizen: true,
        },
      });

      nonCitizensData.push({ nonCitizen, subscriber });
      console.log(`  ✓ Created non-citizen: ${firstName} ${lastName} (${phoneNumber})`);
    } catch (error: any) {
      console.error(`  ✗ Error creating non-citizen ${firstName} ${lastName}:`, error.message);
    }
  }

  console.log(`✅ Seeded ${nonCitizensData.length} non-citizens`);
  return nonCitizensData;
}

// Seed Citizens
async function seedCitizens() {
  console.log('🌱 Seeding citizens...');

  const citizensData = [];
  const subscriberPassword = await bcrypt.hash('Sample123!', 10);

  for (let i = 0; i < 8; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const middleName = middleNames[Math.floor(Math.random() * middleNames.length)];
    const username = generateUsername(firstName, lastName, i);
    const phoneNumber = generatePhoneNumber(i + 200);
    const email = generateEmail(firstName, lastName, i + 100);
    const residentId = await generateCitizenResidentId();

    const birthDate = new Date(
      1970 + Math.floor(Math.random() * 40),
      Math.floor(Math.random() * 12),
      Math.floor(Math.random() * 28) + 1
    );
    const civilStatuses = ['Single', 'Married', 'Widowed', 'Separated'];
    const sexes = ['Male', 'Female'];
    const residencyStatuses = ['PENDING', 'ACTIVE', 'INACTIVE'];
    const professions = [
      'Teacher',
      'Engineer',
      'Nurse',
      'Accountant',
      'Lawyer',
      'Doctor',
      'Business Owner',
      'Farmer',
    ];

    const regions = ['NCR', 'Region I', 'Region II', 'Region III', 'Region IV-A', 'Region V'];
    const provinces = ['Metro Manila', 'Bulacan', 'Laguna', 'Cavite', 'Rizal', 'Quezon'];
    const municipalities = ['Manila', 'Quezon City', 'Makati', 'Pasig', 'Taguig', 'Caloocan'];
    const barangays = ['Barangay 1', 'Barangay 2', 'Barangay 3', 'Barangay 4', 'Barangay 5'];

    const region = regions[Math.floor(Math.random() * regions.length)];
    const province = provinces[Math.floor(Math.random() * provinces.length)];
    const municipality = municipalities[Math.floor(Math.random() * municipalities.length)];
    const barangay = barangays[Math.floor(Math.random() * barangays.length)];

    try {
      // Check if username already exists
      const existing = await (prisma as any).citizen.findUnique({
        where: { username },
      });

      if (existing) {
        console.log(`  ⊙ Citizen with username ${username} already exists, skipping...`);
        continue;
      }

      const citizen = await (prisma as any).citizen.create({
        data: {
          firstName,
          middleName,
          lastName,
          extensionName: i % 4 === 0 ? 'Jr.' : i % 4 === 1 ? 'Sr.' : null,
          username,
          pin: String(Math.floor(1000 + Math.random() * 9000)),
          phoneNumber,
          email,
          residentId,
          birthDate,
          civilStatus: civilStatuses[Math.floor(Math.random() * civilStatuses.length)],
          sex: sexes[Math.floor(Math.random() * sexes.length)],
          residencyStatus: residencyStatuses[
            Math.floor(Math.random() * residencyStatuses.length)
          ] as any,
          isResident: Math.random() > 0.3,
          isVoter: Math.random() > 0.4,
          isEmployed: Math.random() > 0.5,
          profession: professions[Math.floor(Math.random() * professions.length)],
          citizenship: 'Filipino',
          height: `${Math.floor(150 + Math.random() * 50)} cm`,
          weight: `${Math.floor(45 + Math.random() * 40)} kg`,
          addressRegion: region,
          addressProvince: province,
          addressMunicipality: municipality,
          addressBarangay: barangay,
          addressStreetAddress: `${Math.floor(Math.random() * 999) + 1} Sample Street`,
          addressPostalCode: String(Math.floor(1000 + Math.random() * 9000)),
          emergencyContactPerson: `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`,
          emergencyContactNumber: generatePhoneNumber(i + 300),
          idType: "Driver's License",
          spouseName:
            Math.random() > 0.5
              ? `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`
              : null,
          placeOfBirth: {
            create: {
              region,
              province,
              municipality,
            },
          },
        },
      });

      // Create Subscriber gateway
      const subscriber = await (prisma as any).subscriber.create({
        data: {
          type: 'CITIZEN',
          citizenId: citizen.id,
          nonCitizenId: null,
          password: subscriberPassword,
        },
        include: {
          citizen: true,
          nonCitizen: true,
        },
      });

      citizensData.push({ citizen, subscriber });
      console.log(`  ✓ Created citizen: ${firstName} ${lastName} (${username})`);
    } catch (error: any) {
      console.error(`  ✗ Error creating citizen ${firstName} ${lastName}:`, error.message);
    }
  }

  console.log(`✅ Seeded ${citizensData.length} citizens`);
  return citizensData;
}

// Helper function to get payment amount based on service
const getPaymentAmount = (serviceCode: string): number => {
  // Realistic payment amounts in PHP for different services
  const amounts: Record<string, { min: number; max: number }> = {
    BIRTH_CERTIFICATE: { min: 150, max: 300 },
    CEDULAS: { min: 50, max: 200 },
    OCCUPATIONAL_HEALTH: { min: 200, max: 500 },
    RPTAX: { min: 500, max: 5000 },
    BPTAX: { min: 1000, max: 10000 },
    NOV: { min: 300, max: 800 },
    OVRS: { min: 500, max: 1500 },
    BPLS: { min: 200, max: 600 },
    E_BOSS: { min: 1000, max: 5000 },
    DEATH_CERTIFICATE: { min: 150, max: 300 },
  };

  const serviceAmount = amounts[serviceCode] || { min: 100, max: 500 };
  const amount = serviceAmount.min + Math.random() * (serviceAmount.max - serviceAmount.min);
  return Math.round(amount * 100) / 100; // Round to 2 decimal places
};

// Seed Transactions
async function seedTransactions(createdSubscribers?: any[]) {
  console.log('🌱 Seeding e-government service transactions...');

  // Use provided subscribers or get all subscribers from database
  let subscribers;
  if (createdSubscribers && createdSubscribers.length > 0) {
    // Fetch full subscriber data including relations
    const subscriberIds = createdSubscribers.map((s: any) => s.id);
    subscribers = await (prisma as any).subscriber.findMany({
      where: {
        id: { in: subscriberIds },
      },
      include: {
        citizen: true,
        nonCitizen: true,
      },
    });
  } else {
    // Get all subscribers (both citizens and non-citizens)
    subscribers = await (prisma as any).subscriber.findMany({
      include: {
        citizen: true,
        nonCitizen: true,
      },
    });
  }

  if (subscribers.length === 0) {
    console.log('  ⚠️  No subscribers found. Please seed citizens and non-citizens first.');
    return [];
  }

  console.log(`  📋 Found ${subscribers.length} subscribers to create transactions for`);

  // Get all active services
  const services = await prisma.service.findMany({
    where: { isActive: true },
  });

  if (services.length === 0) {
    console.log('  ⚠️  No services found. Please seed services first.');
    return [];
  }

  const transactions = [];
  const paymentStatuses = [
    'PENDING',
    'PAID',
    'APPROVED',
    'FOR_PRINTING',
    'FOR_PICK_UP',
    'RELEASED',
  ];
  const year = new Date().getFullYear();

  // Create 25-30 transactions to ensure good distribution across subscribers
  const transactionCount = Math.min(30, subscribers.length * 3); // At least 3 transactions per subscriber if possible

  for (let i = 0; i < transactionCount; i++) {
    const subscriber = subscribers[Math.floor(Math.random() * subscribers.length)];
    const service = services[Math.floor(Math.random() * services.length)];

    // Determine payment status (60% PENDING, 40% paid/completed for revenue data)
    const paymentStatus =
      Math.random() < 0.6
        ? 'PENDING'
        : paymentStatuses[Math.floor(Math.random() * (paymentStatuses.length - 1)) + 1];

    // Get realistic payment amount based on service
    const paymentAmount = getPaymentAmount(service.code);

    // Count existing transactions for this service this year
    const count = await prisma.transaction.count({
      where: {
        serviceId: service.id,
        createdAt: {
          gte: new Date(`${year}-01-01`),
          lt: new Date(`${year + 1}-01-01`),
        },
      },
    });

    const transactionId = generateTransactionId(service.code, year, count);
    const referenceNumber = generateReferenceNumber(service.code, year, count);

    // Generate service data based on service code
    let serviceData: any = {};
    const subscriberName = subscriber.citizen
      ? `${subscriber.citizen.firstName} ${subscriber.citizen.lastName}`
      : `${subscriber.nonCitizen?.firstName} ${subscriber.nonCitizen?.lastName}`;

    switch (service.code) {
      case 'BIRTH_CERTIFICATE':
        serviceData = {
          fullName: subscriberName,
          dateOfBirth: new Date(1990, 0, 1).toISOString().split('T')[0],
          placeOfBirth: 'Manila, Metro Manila',
          parentsName: 'Sample Parent Name',
          purpose: 'personal',
        };
        break;
      case 'CEDULAS':
        serviceData = {
          fullName: subscriberName,
          address: '123 Sample Street, Barangay Sample, Manila',
          purpose: 'employment',
          validIdType: 'drivers_license',
          validIdNumber: 'DL123456',
        };
        break;
      case 'OCCUPATIONAL_HEALTH':
        serviceData = {
          fullName: subscriberName,
          occupation: 'Teacher',
          workplaceAddress: 'Sample School, Manila',
          certificateType: 'pre_employment',
        };
        break;
      case 'RPTAX':
        serviceData = {
          propertyOwner: subscriberName,
          propertyAddress: '123 Sample Street, Manila',
          propertyType: 'residential',
        };
        break;
      case 'BPTAX':
        serviceData = {
          businessName: `Sample Business ${i}`,
          businessAddress: '123 Sample Street, Manila',
          businessType: 'retail',
        };
        break;
      default:
        serviceData = {
          fullName: subscriberName,
          purpose: 'general',
        };
    }

    // Add appointment date if service requires appointment
    let preferredAppointmentDate: Date | null = null;
    let appointmentStatus: string | null = null;

    if (service.requiresAppointment && Math.random() > 0.3) {
      const daysFromNow = Math.floor(Math.random() * 30) + 1;
      preferredAppointmentDate = new Date();
      preferredAppointmentDate.setDate(preferredAppointmentDate.getDate() + daysFromNow);
      preferredAppointmentDate.setHours(9 + Math.floor(Math.random() * 8), 0, 0, 0);
      appointmentStatus = paymentStatus === 'PENDING' ? 'PENDING' : 'ACCEPTED';
    }

    try {
      // Verify subscriber exists and has valid ID
      if (!subscriber || !subscriber.id) {
        console.log(`  ⚠️  Skipping transaction - invalid subscriber`);
        continue;
      }

      const transaction = await prisma.transaction.create({
        data: {
          subscriberId: subscriber.id,
          serviceId: service.id,
          transactionId,
          referenceNumber,
          paymentStatus,
          paymentAmount: paymentAmount, // Use realistic payment amount
          isResidentOfBorongan: Math.random() > 0.5,
          status:
            paymentStatus === 'PENDING'
              ? 'Pending'
              : paymentStatus === 'PAID' || paymentStatus === 'RELEASED'
                ? 'Completed'
                : 'In Progress',
          isPosted: paymentStatus !== 'PENDING',
          serviceData,
          preferredAppointmentDate,
          appointmentStatus: appointmentStatus as any,
          referenceNumberGeneratedAt: new Date(),
        },
      });

      transactions.push(transaction);
      const subscriberName = subscriber.citizen
        ? `${subscriber.citizen.firstName} ${subscriber.citizen.lastName}`
        : subscriber.nonCitizen
          ? `${subscriber.nonCitizen.firstName} ${subscriber.nonCitizen.lastName}`
          : 'Unknown';
      console.log(
        `  ✓ Created transaction: ${transactionId} (${service.name}) - ${paymentStatus} - ₱${paymentAmount.toFixed(2)} - Subscriber: ${subscriberName}`
      );
    } catch (error: any) {
      console.error(`  ✗ Error creating transaction:`, error.message);
      if (error.message.includes('subscriberId')) {
        console.error(`    Subscriber ID: ${subscriber?.id}, Service ID: ${service.id}`);
      }
    }
  }

  // Calculate total revenue from paid transactions
  const totalRevenue = transactions.reduce((sum, t) => {
    const amount =
      typeof t.paymentAmount === 'string'
        ? parseFloat(t.paymentAmount)
        : Number(t.paymentAmount) || 0;
    return sum + amount;
  }, 0);

  const paidTransactions = transactions.filter(
    (t) => t.paymentStatus !== 'PENDING' && t.paymentStatus !== 'UNKNOWN'
  );
  const paidRevenue = paidTransactions.reduce((sum, t) => {
    const amount =
      typeof t.paymentAmount === 'string'
        ? parseFloat(t.paymentAmount)
        : Number(t.paymentAmount) || 0;
    return sum + amount;
  }, 0);

  console.log(`✅ Seeded ${transactions.length} transactions`);
  console.log(`   💰 Total Revenue: ₱${totalRevenue.toFixed(2)}`);
  console.log(
    `   💵 Paid Revenue: ₱${paidRevenue.toFixed(2)} (${paidTransactions.length} paid transactions)`
  );
  return transactions;
}

// Seed Citizens Connected to Social Amelioration
async function seedSocialAmeliorationCitizens(createdCitizens?: any[]) {
  console.log('🌱 Seeding citizens connected to social amelioration...');

  // Get existing citizens or use provided ones
  let citizens;
  if (createdCitizens && createdCitizens.length > 0) {
    // Extract citizen objects from the created items
    citizens = createdCitizens.map((item: any) => item.citizen || item).filter(Boolean);
  } else {
    // Get existing citizens from database
    citizens = await (prisma as any).citizen.findMany({
      take: 12,
    });
  }

  // If we don't have enough citizens, create more
  if (citizens.length < 12) {
    console.log('  Creating additional citizens for social amelioration...');
    const additionalCitizensData = await seedCitizens();
    const additionalCitizens = additionalCitizensData
      .map((item: any) => item.citizen || item)
      .filter(Boolean);
    citizens = [...citizens, ...additionalCitizens];
  }

  // Get social amelioration settings
  const pensionTypes = await (prisma as any).socialAmeliorationSetting.findMany({
    where: { type: 'PENSION_TYPE', isActive: true },
  });

  const disabilityTypes = await (prisma as any).socialAmeliorationSetting.findMany({
    where: { type: 'DISABILITY_TYPE', isActive: true },
  });

  const gradeLevels = await (prisma as any).socialAmeliorationSetting.findMany({
    where: { type: 'GRADE_LEVEL', isActive: true },
  });

  const soloParentCategories = await (prisma as any).socialAmeliorationSetting.findMany({
    where: { type: 'SOLO_PARENT_CATEGORY', isActive: true },
  });

  // Get government programs
  const seniorPrograms = await prisma.governmentProgram.findMany({
    where: { type: 'SENIOR_CITIZEN', isActive: true },
  });

  const pwdPrograms = await prisma.governmentProgram.findMany({
    where: { type: 'PWD', isActive: true },
  });

  const studentPrograms = await prisma.governmentProgram.findMany({
    where: { type: 'STUDENT', isActive: true },
  });

  const soloParentPrograms = await prisma.governmentProgram.findMany({
    where: { type: 'SOLO_PARENT', isActive: true },
  });

  let citizenIndex = 0;
  const beneficiaries = [];

  // Create Senior Citizen Beneficiaries (2-3)
  for (let i = 0; i < 3 && citizenIndex < citizens.length; i++) {
    const citizen = citizens[citizenIndex++];

    // Check if already has senior beneficiary record
    const existing = await (prisma as any).seniorCitizenBeneficiary.findUnique({
      where: { citizenId: citizen.id },
    });

    if (existing) {
      console.log(
        `  ⊙ Citizen ${citizen.firstName} ${citizen.lastName} already has senior beneficiary record`
      );
      continue;
    }

    try {
      const year = new Date().getFullYear();
      const count = await (prisma as any).seniorCitizenBeneficiary.count({
        where: {
          createdAt: {
            gte: new Date(`${year}-01-01`),
            lt: new Date(`${year + 1}-01-01`),
          },
        },
      });
      const seniorCitizenId = `SENIOR-${year}-${String(count + 1).padStart(3, '0')}`;

      // Select 1-2 pension types
      const selectedPensionTypes = pensionTypes
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.floor(Math.random() * 2) + 1);

      const beneficiary = await (prisma as any).seniorCitizenBeneficiary.create({
        data: {
          citizenId: citizen.id,
          seniorCitizenId,
          status: 'ACTIVE',
          pensionTypes: {
            create: selectedPensionTypes.map((pt: any) => ({ settingId: pt.id })),
          },
        },
      });

      // Link to programs
      if (seniorPrograms.length > 0) {
        const selectedPrograms = seniorPrograms
          .sort(() => Math.random() - 0.5)
          .slice(0, Math.min(2, seniorPrograms.length));

        await (prisma as any).beneficiaryProgramPivot.createMany({
          data: selectedPrograms.map((program) => ({
            beneficiaryType: 'SENIOR_CITIZEN',
            beneficiaryId: beneficiary.id,
            programId: program.id,
          })),
          skipDuplicates: true,
        });
      }

      beneficiaries.push(beneficiary);
      console.log(
        `  ✓ Created senior citizen beneficiary: ${citizen.firstName} ${citizen.lastName}`
      );
    } catch (error: any) {
      console.error(`  ✗ Error creating senior citizen beneficiary:`, error.message);
    }
  }

  // Create PWD Beneficiaries (2-3)
  for (let i = 0; i < 3 && citizenIndex < citizens.length; i++) {
    const citizen = citizens[citizenIndex++];

    const existing = await (prisma as any).pWDBeneficiary.findUnique({
      where: { citizenId: citizen.id },
    });

    if (existing) {
      console.log(
        `  ⊙ Citizen ${citizen.firstName} ${citizen.lastName} already has PWD beneficiary record`
      );
      continue;
    }

    try {
      const year = new Date().getFullYear();
      const count = await (prisma as any).pWDBeneficiary.count({
        where: {
          createdAt: {
            gte: new Date(`${year}-01-01`),
            lt: new Date(`${year + 1}-01-01`),
          },
        },
      });
      const pwdId = `PWD-${year}-${String(count + 1).padStart(3, '0')}`;

      const selectedDisabilityType =
        disabilityTypes[Math.floor(Math.random() * disabilityTypes.length)];

      const beneficiary = await (prisma as any).pWDBeneficiary.create({
        data: {
          citizenId: citizen.id,
          pwdId,
          disabilityTypeId: selectedDisabilityType.id,
          disabilityLevel: ['Mild', 'Moderate', 'Severe'][Math.floor(Math.random() * 3)],
          monetaryAllowance: Math.random() > 0.5,
          assistedDevice: Math.random() > 0.5,
          donorDevice: Math.random() > 0.3 ? 'Wheelchair' : null,
          status: 'ACTIVE',
        },
      });

      // Link to programs
      if (pwdPrograms.length > 0) {
        const selectedPrograms = pwdPrograms
          .sort(() => Math.random() - 0.5)
          .slice(0, Math.min(2, pwdPrograms.length));

        await (prisma as any).beneficiaryProgramPivot.createMany({
          data: selectedPrograms.map((program) => ({
            beneficiaryType: 'PWD',
            beneficiaryId: beneficiary.id,
            programId: program.id,
          })),
          skipDuplicates: true,
        });
      }

      beneficiaries.push(beneficiary);
      console.log(`  ✓ Created PWD beneficiary: ${citizen.firstName} ${citizen.lastName}`);
    } catch (error: any) {
      console.error(`  ✗ Error creating PWD beneficiary:`, error.message);
    }
  }

  // Create Student Beneficiaries (2-3)
  for (let i = 0; i < 3 && citizenIndex < citizens.length; i++) {
    const citizen = citizens[citizenIndex++];

    const existing = await (prisma as any).studentBeneficiary.findUnique({
      where: { citizenId: citizen.id },
    });

    if (existing) {
      console.log(
        `  ⊙ Citizen ${citizen.firstName} ${citizen.lastName} already has student beneficiary record`
      );
      continue;
    }

    try {
      const year = new Date().getFullYear();
      const count = await (prisma as any).studentBeneficiary.count({
        where: {
          createdAt: {
            gte: new Date(`${year}-01-01`),
            lt: new Date(`${year + 1}-01-01`),
          },
        },
      });
      const studentId = `STUDENT-${year}-${String(count + 1).padStart(3, '0')}`;

      const selectedGradeLevel = gradeLevels[Math.floor(Math.random() * gradeLevels.length)];

      const beneficiary = await (prisma as any).studentBeneficiary.create({
        data: {
          citizenId: citizen.id,
          studentId,
          gradeLevelId: selectedGradeLevel.id,
          status: 'ACTIVE',
        },
      });

      // Link to programs
      if (studentPrograms.length > 0) {
        const selectedPrograms = studentPrograms
          .sort(() => Math.random() - 0.5)
          .slice(0, Math.min(2, studentPrograms.length));

        await (prisma as any).beneficiaryProgramPivot.createMany({
          data: selectedPrograms.map((program) => ({
            beneficiaryType: 'STUDENT',
            beneficiaryId: beneficiary.id,
            programId: program.id,
          })),
          skipDuplicates: true,
        });
      }

      beneficiaries.push(beneficiary);
      console.log(`  ✓ Created student beneficiary: ${citizen.firstName} ${citizen.lastName}`);
    } catch (error: any) {
      console.error(`  ✗ Error creating student beneficiary:`, error.message);
    }
  }

  // Create Solo Parent Beneficiaries (2-3)
  for (let i = 0; i < 3 && citizenIndex < citizens.length; i++) {
    const citizen = citizens[citizenIndex++];

    const existing = await (prisma as any).soloParentBeneficiary.findUnique({
      where: { citizenId: citizen.id },
    });

    if (existing) {
      console.log(
        `  ⊙ Citizen ${citizen.firstName} ${citizen.lastName} already has solo parent beneficiary record`
      );
      continue;
    }

    try {
      const year = new Date().getFullYear();
      const count = await (prisma as any).soloParentBeneficiary.count({
        where: {
          createdAt: {
            gte: new Date(`${year}-01-01`),
            lt: new Date(`${year + 1}-01-01`),
          },
        },
      });
      const soloParentId = `SOLO-${year}-${String(count + 1).padStart(3, '0')}`;

      const selectedCategory =
        soloParentCategories[Math.floor(Math.random() * soloParentCategories.length)];

      const beneficiary = await (prisma as any).soloParentBeneficiary.create({
        data: {
          citizenId: citizen.id,
          soloParentId,
          categoryId: selectedCategory.id,
          status: 'ACTIVE',
        },
      });

      // Link to programs
      if (soloParentPrograms.length > 0) {
        const selectedPrograms = soloParentPrograms
          .sort(() => Math.random() - 0.5)
          .slice(0, Math.min(2, soloParentPrograms.length));

        await (prisma as any).beneficiaryProgramPivot.createMany({
          data: selectedPrograms.map((program) => ({
            beneficiaryType: 'SOLO_PARENT',
            beneficiaryId: beneficiary.id,
            programId: program.id,
          })),
          skipDuplicates: true,
        });
      }

      beneficiaries.push(beneficiary);
      console.log(`  ✓ Created solo parent beneficiary: ${citizen.firstName} ${citizen.lastName}`);
    } catch (error: any) {
      console.error(`  ✗ Error creating solo parent beneficiary:`, error.message);
    }
  }

  // Create Mixed Beneficiaries (1-2 citizens with multiple types)
  // Try to find citizens who don't have any beneficiary yet
  const remainingCitizens = citizens.slice(citizenIndex);
  for (let i = 0; i < 2 && i < remainingCitizens.length; i++) {
    const citizen = remainingCitizens[i];

    // Check if citizen already has any beneficiary
    const hasSenior = await (prisma as any).seniorCitizenBeneficiary.findUnique({
      where: { citizenId: citizen.id },
    });
    const hasPWD = await (prisma as any).pWDBeneficiary.findUnique({
      where: { citizenId: citizen.id },
    });

    if (hasSenior || hasPWD) {
      continue;
    }

    try {
      // Create both Senior and PWD for this citizen
      const year = new Date().getFullYear();

      // Create Senior Citizen
      const seniorCount = await (prisma as any).seniorCitizenBeneficiary.count({
        where: {
          createdAt: {
            gte: new Date(`${year}-01-01`),
            lt: new Date(`${year + 1}-01-01`),
          },
        },
      });
      const seniorCitizenId = `SENIOR-${year}-${String(seniorCount + 1).padStart(3, '0')}`;

      const selectedPensionTypes = pensionTypes.sort(() => Math.random() - 0.5).slice(0, 1);

      const seniorBeneficiary = await (prisma as any).seniorCitizenBeneficiary.create({
        data: {
          citizenId: citizen.id,
          seniorCitizenId,
          status: 'ACTIVE',
          pensionTypes: {
            create: selectedPensionTypes.map((pt: any) => ({ settingId: pt.id })),
          },
        },
      });

      // Create PWD
      const pwdCount = await (prisma as any).pWDBeneficiary.count({
        where: {
          createdAt: {
            gte: new Date(`${year}-01-01`),
            lt: new Date(`${year + 1}-01-01`),
          },
        },
      });
      const pwdId = `PWD-${year}-${String(pwdCount + 1).padStart(3, '0')}`;

      const selectedDisabilityType =
        disabilityTypes[Math.floor(Math.random() * disabilityTypes.length)];

      const pwdBeneficiary = await (prisma as any).pWDBeneficiary.create({
        data: {
          citizenId: citizen.id,
          pwdId,
          disabilityTypeId: selectedDisabilityType.id,
          disabilityLevel: 'Moderate',
          monetaryAllowance: true,
          assistedDevice: true,
          status: 'ACTIVE',
        },
      });

      // Link to programs
      if (seniorPrograms.length > 0) {
        await (prisma as any).beneficiaryProgramPivot.createMany({
          data: seniorPrograms.slice(0, 1).map((program) => ({
            beneficiaryType: 'SENIOR_CITIZEN',
            beneficiaryId: seniorBeneficiary.id,
            programId: program.id,
          })),
          skipDuplicates: true,
        });
      }

      if (pwdPrograms.length > 0) {
        await (prisma as any).beneficiaryProgramPivot.createMany({
          data: pwdPrograms.slice(0, 1).map((program) => ({
            beneficiaryType: 'PWD',
            beneficiaryId: pwdBeneficiary.id,
            programId: program.id,
          })),
          skipDuplicates: true,
        });
      }

      beneficiaries.push(seniorBeneficiary, pwdBeneficiary);
      console.log(
        `  ✓ Created mixed beneficiary (Senior + PWD): ${citizen.firstName} ${citizen.lastName}`
      );
    } catch (error: any) {
      console.error(`  ✗ Error creating mixed beneficiary:`, error.message);
    }
  }

  console.log(`✅ Seeded ${beneficiaries.length} beneficiary records`);
  return beneficiaries;
}

// Main seeding function
async function seedSampleData() {
  console.log('🌱 Starting sample data seeding...');

  try {
    // Seed non-citizens and get created subscribers
    const nonCitizens = await seedNonCitizens();

    // Seed citizens and get created subscribers
    const citizens = await seedCitizens();

    // Collect all subscribers we just created
    const allCreatedSubscribers = [];

    // Get subscribers from non-citizens
    for (const item of nonCitizens) {
      if (item.subscriber) {
        allCreatedSubscribers.push(item.subscriber);
      }
    }

    // Get subscribers from citizens
    for (const item of citizens) {
      if (item.subscriber) {
        allCreatedSubscribers.push(item.subscriber);
      }
    }

    console.log(`  📋 Total subscribers created: ${allCreatedSubscribers.length}`);

    // Seed transactions (pass the created subscribers to ensure they're linked)
    await seedTransactions(allCreatedSubscribers);

    // Seed social amelioration citizens (depends on citizens, settings, and programs)
    await seedSocialAmeliorationCitizens(citizens);

    console.log('🎉 Sample data seeding completed!');
  } catch (error) {
    console.error('❌ Error seeding sample data:', error);
    throw error;
  }
}

// Standalone main function
async function main() {
  console.log('🌱 Starting sample data seed...');

  try {
    await seedSampleData();
  } catch (e) {
    console.error('❌ Error seeding sample data:', e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { seedSampleData };
