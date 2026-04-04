import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { seedAddresses } from './address.seed';
import { seedFAQs } from './faq.seed';
import { seedServices } from './service.seed';
import { seedEServices } from './eservices.seed';
// import { seedSampleData } from './sample-data.seed';

const prisma = new PrismaClient();

async function seedSocialAmeliorationSettings() {
  console.log('🌱 Seeding social amelioration settings...');

  // Pension Types
  const pensionTypes = [
    {
      name: 'Social Pension',
      description: 'Monthly social pension for indigent senior citizens',
      isActive: true,
    },
    {
      name: 'GSIS Pension',
      description: 'Government Service Insurance System pension',
      isActive: true,
    },
    { name: 'SSS Pension', description: 'Social Security System pension', isActive: true },
    {
      name: 'Private Pension',
      description: 'Private company or organization pension',
      isActive: true,
    },
    { name: 'Veterans Pension', description: 'Pension for military veterans', isActive: true },
  ];

  for (const pensionType of pensionTypes) {
    const existing = await (prisma as any).socialAmeliorationSetting.findFirst({
      where: {
        type: 'PENSION_TYPE',
        name: pensionType.name,
      },
    });

    if (!existing) {
      await (prisma as any).socialAmeliorationSetting.create({
        data: {
          type: 'PENSION_TYPE',
          name: pensionType.name,
          description: pensionType.description,
          isActive: pensionType.isActive,
        },
      });
    }
  }
  console.log(`✅ Seeded ${pensionTypes.length} pension types`);

  // Disability Types
  const disabilityTypes = [
    { name: 'Visual Impairment', description: 'Blindness or partial sight', isActive: true },
    { name: 'Hearing Impairment', description: 'Deafness or hard of hearing', isActive: true },
    {
      name: 'Speech Impairment',
      description: 'Difficulty in speaking or communication',
      isActive: true,
    },
    { name: 'Physical Impairment', description: 'Mobility or physical disability', isActive: true },
    {
      name: 'Intellectual Disability',
      description: 'Developmental or cognitive disability',
      isActive: true,
    },
    {
      name: 'Mental Health Condition',
      description: 'Psychiatric or mental health disability',
      isActive: true,
    },
    {
      name: 'Autism Spectrum Disorder',
      description: 'Autism or related developmental disorders',
      isActive: true,
    },
    { name: 'Learning Disability', description: 'Specific learning difficulties', isActive: true },
    { name: 'Chronic Illness', description: 'Long-term medical conditions', isActive: true },
    {
      name: 'Multiple Disabilities',
      description: 'Combination of two or more disabilities',
      isActive: true,
    },
  ];

  for (const disabilityType of disabilityTypes) {
    const existing = await (prisma as any).socialAmeliorationSetting.findFirst({
      where: {
        type: 'DISABILITY_TYPE',
        name: disabilityType.name,
      },
    });

    if (!existing) {
      await (prisma as any).socialAmeliorationSetting.create({
        data: {
          type: 'DISABILITY_TYPE',
          name: disabilityType.name,
          description: disabilityType.description,
          isActive: disabilityType.isActive,
        },
      });
    }
  }
  console.log(`✅ Seeded ${disabilityTypes.length} disability types`);

  // Grade Levels
  const gradeLevels = [
    { name: 'Kindergarten', description: 'Pre-school level', isActive: true },
    { name: 'Grade 1', description: 'First grade elementary', isActive: true },
    { name: 'Grade 2', description: 'Second grade elementary', isActive: true },
    { name: 'Grade 3', description: 'Third grade elementary', isActive: true },
    { name: 'Grade 4', description: 'Fourth grade elementary', isActive: true },
    { name: 'Grade 5', description: 'Fifth grade elementary', isActive: true },
    { name: 'Grade 6', description: 'Sixth grade elementary', isActive: true },
    { name: 'Grade 7', description: 'First year junior high school', isActive: true },
    { name: 'Grade 8', description: 'Second year junior high school', isActive: true },
    { name: 'Grade 9', description: 'Third year junior high school', isActive: true },
    { name: 'Grade 10', description: 'Fourth year junior high school', isActive: true },
    { name: 'Grade 11', description: 'First year senior high school', isActive: true },
    { name: 'Grade 12', description: 'Second year senior high school', isActive: true },
    { name: 'College', description: 'College/University level', isActive: true },
  ];

  for (const gradeLevel of gradeLevels) {
    const existing = await (prisma as any).socialAmeliorationSetting.findFirst({
      where: {
        type: 'GRADE_LEVEL',
        name: gradeLevel.name,
      },
    });

    if (!existing) {
      await (prisma as any).socialAmeliorationSetting.create({
        data: {
          type: 'GRADE_LEVEL',
          name: gradeLevel.name,
          description: gradeLevel.description,
          isActive: gradeLevel.isActive,
        },
      });
    }
  }
  console.log(`✅ Seeded ${gradeLevels.length} grade levels`);

  // Solo Parent Categories
  const soloParentCategories = [
    { name: 'Widowed', description: 'Parent whose spouse has passed away', isActive: true },
    {
      name: 'Separated',
      description: 'Parent who is legally separated from spouse',
      isActive: true,
    },
    { name: 'Annulled', description: 'Parent whose marriage has been annulled', isActive: true },
    { name: 'Unmarried', description: 'Parent who has never been married', isActive: true },
    { name: 'Abandoned', description: 'Parent who has been abandoned by spouse', isActive: true },
    {
      name: 'Spouse Detained',
      description: 'Parent whose spouse is detained or imprisoned',
      isActive: true,
    },
  ];

  for (const category of soloParentCategories) {
    const existing = await (prisma as any).socialAmeliorationSetting.findFirst({
      where: {
        type: 'SOLO_PARENT_CATEGORY',
        name: category.name,
      },
    });

    if (!existing) {
      await (prisma as any).socialAmeliorationSetting.create({
        data: {
          type: 'SOLO_PARENT_CATEGORY',
          name: category.name,
          description: category.description,
          isActive: category.isActive,
        },
      });
    }
  }
  console.log(`✅ Seeded ${soloParentCategories.length} solo parent categories`);

  console.log('✅ Social amelioration settings seeding completed!');
}

async function seedGovernmentPrograms() {
  console.log('🌱 Seeding government programs...');

  const governmentPrograms = [
    // ALL - Available for all residents
    {
      name: 'Libre Sakay',
      description: 'Free bus services for the city residents',
      type: 'ALL',
      isActive: true,
    },
    {
      name: 'Libre Medisina',
      description: 'City Pharmacy Free Medicine Program',
      type: 'ALL',
      isActive: true,
    },

    // STUDENT - For students
    {
      name: 'Direkta Ayuda',
      description: 'Student Financial Assistance Program',
      type: 'STUDENT',
      isActive: true,
    },
    {
      name: 'Educational Assistance Program',
      description:
        'Financial support for educational expenses including books, supplies, and school fees',
      type: 'STUDENT',
      isActive: true,
    },
    {
      name: 'Scholarship Grant',
      description: 'City scholarship program for outstanding students',
      type: 'STUDENT',
      isActive: true,
    },
    {
      name: 'School Uniform Assistance',
      description: 'Free school uniform and supplies for indigent students',
      type: 'STUDENT',
      isActive: true,
    },

    // SENIOR_CITIZEN - For senior citizens
    {
      name: 'Senior Citizen Monthly Pension',
      description: 'Monthly financial assistance for qualified senior citizens',
      type: 'SENIOR_CITIZEN',
      isActive: true,
    },
    {
      name: 'Senior Citizen Health Card',
      description: 'Free medical services and discounts for senior citizens',
      type: 'SENIOR_CITIZEN',
      isActive: true,
    },
    {
      name: 'Birthday Gift for Seniors',
      description: 'Birthday cash gift for senior citizens celebrating their birthdays',
      type: 'SENIOR_CITIZEN',
      isActive: true,
    },
    {
      name: 'Senior Citizen Discount Card',
      description: 'Enhanced discount card for senior citizens in local establishments',
      type: 'SENIOR_CITIZEN',
      isActive: true,
    },

    // PWD - For Persons with Disabilities
    {
      name: 'PWD Monthly Allowance',
      description: 'Monthly financial assistance for registered PWDs',
      type: 'PWD',
      isActive: true,
    },
    {
      name: 'PWD Assistive Device Program',
      description:
        'Free or subsidized assistive devices for PWDs (wheelchairs, hearing aids, etc.)',
      type: 'PWD',
      isActive: true,
    },
    {
      name: 'PWD Health Services',
      description: 'Free medical services and rehabilitation programs for PWDs',
      type: 'PWD',
      isActive: true,
    },
    {
      name: 'PWD Livelihood Assistance',
      description: 'Livelihood and skills training program for PWDs',
      type: 'PWD',
      isActive: true,
    },

    // SOLO_PARENT - For solo parents
    {
      name: 'Solo Parent Monthly Assistance',
      description: 'Monthly financial assistance for registered solo parents',
      type: 'SOLO_PARENT',
      isActive: true,
    },
    {
      name: 'Solo Parent Livelihood Program',
      description: 'Skills training and livelihood opportunities for solo parents',
      type: 'SOLO_PARENT',
      isActive: true,
    },
    {
      name: 'Solo Parent Health Benefits',
      description: 'Free medical services and health insurance assistance for solo parents',
      type: 'SOLO_PARENT',
      isActive: true,
    },
    {
      name: 'Solo Parent Educational Assistance',
      description: 'Educational support for children of solo parents',
      type: 'SOLO_PARENT',
      isActive: true,
    },
    {
      name: 'Solo Parent Childcare Support',
      description: 'Subsidized childcare services for solo parents',
      type: 'SOLO_PARENT',
      isActive: true,
    },
  ];

  for (const program of governmentPrograms) {
    const existing = await (prisma as any).governmentProgram.findFirst({
      where: {
        name: program.name,
        type: program.type,
      },
    });

    if (!existing) {
      await (prisma as any).governmentProgram.create({
        data: {
          name: program.name,
          description: program.description,
          type: program.type,
          isActive: program.isActive,
        },
      });
      console.log(`  ✓ Created: ${program.name} (${program.type})`);
    } else {
      console.log(`  ⊙ Already exists: ${program.name} (${program.type})`);
    }
  }

  const allCount = governmentPrograms.filter((p) => p.type === 'ALL').length;
  const studentCount = governmentPrograms.filter((p) => p.type === 'STUDENT').length;
  const seniorCount = governmentPrograms.filter((p) => p.type === 'SENIOR_CITIZEN').length;
  const pwdCount = governmentPrograms.filter((p) => p.type === 'PWD').length;
  const soloParentCount = governmentPrograms.filter((p) => p.type === 'SOLO_PARENT').length;

  console.log(`✅ Seeded ${governmentPrograms.length} government programs:`);
  console.log(`   - ALL: ${allCount} programs`);
  console.log(`   - STUDENT: ${studentCount} programs`);
  console.log(`   - SENIOR_CITIZEN: ${seniorCount} programs`);
  console.log(`   - PWD: ${pwdCount} programs`);
  console.log(`   - SOLO_PARENT: ${soloParentCount} programs`);
  console.log('✅ Government programs seeding completed!');
}

async function main() {
  console.log('🌱 Starting database seed...');

  // Create default admin user
  const adminPassword = await bcrypt.hash('Admin123!', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@multysis.local' },
    update: {},
    create: {
      email: 'admin@multysis.local',
      password: adminPassword,
      name: 'Admin User',
      role: 'admin',
    },
  });
  console.log('✅ Created admin user:', admin.email);

  // Create test subscriber
  const subscriberPassword = await bcrypt.hash('Subscriber123!', 10);

  // Check if NonCitizen already exists
  const existingNonCitizen = await (prisma as any).nonCitizen.findUnique({
    where: { phoneNumber: '09171234567' },
  });

  let nonCitizen;
  if (existingNonCitizen) {
    // Use existing NonCitizen
    nonCitizen = existingNonCitizen;
    console.log('✅ Using existing subscriber:', nonCitizen.phoneNumber);
  } else {
    // Generate resident ID dynamically (same logic as portalSignup)
    const year = new Date().getFullYear();
    const count = await (prisma as any).nonCitizen.count({
      where: {
        createdAt: {
          gte: new Date(`${year}-01-01`),
          lt: new Date(`${year + 1}-01-01`),
        },
      },
    });
    const residentId = `RES-${year}-${String(count + 1).padStart(3, '0')}`;

    // Create new NonCitizen (password is now on Subscriber, not NonCitizen)
    nonCitizen = await (prisma as any).nonCitizen.create({
      data: {
        firstName: 'Juan',
        middleName: 'Santos',
        lastName: 'Dela Cruz',
        extensionName: 'Jr.',
        phoneNumber: '09171234567',
        email: 'juan@example.com',
        status: 'ACTIVE',
        residentId,
        residencyType: 'NON_RESIDENT',
        residencyStatus: 'active',
        birthDate: new Date('1990-05-15'),
        civilStatus: 'Single',
        sex: 'Male',
        residentAddress: '123 Main Street, Barangay Central, Quezon City, Metro Manila',
        placeOfBirth: {
          create: {
            region: 'region8',
            province: 'Eastern Samar',
            municipality: 'Borongan City',
          },
        },
        motherInfo: {
          create: {
            firstName: 'Maria',
            middleName: 'Cruz',
            lastName: 'Santos',
          },
        },
      },
    });
    console.log('✅ Created test subscriber:', nonCitizen.phoneNumber);
  }

  // Then, create/upsert Subscriber gateway linked to NonCitizen (password goes here now)
  const subscriber = await (prisma as any).subscriber.upsert({
    where: { nonCitizenId: nonCitizen.id },
    update: {
      // Update password if subscriber already exists
      password: subscriberPassword,
    },
    create: {
      type: 'SUBSCRIBER',
      nonCitizenId: nonCitizen.id,
      citizenId: null,
      password: subscriberPassword, // Password is now on Subscriber
    },
  });

  // Reference to prevent unused variable warning (subscriber gateway is created for linking)
  void subscriber;

  // Note: Sample transactions are now created using the Service model
  // After services are seeded, you can create transactions with serviceId
  // This is handled separately in the service seeding process

  // Create default roles
  const adminRole = await prisma.role.upsert({
    where: { name: 'Admin' },
    update: {},
    create: {
      name: 'Admin',
      description: 'Full system access',
    },
  });

  await prisma.role.upsert({
    where: { name: 'Manager' },
    update: {},
    create: {
      name: 'Manager',
      description: 'Management access',
    },
  });

  console.log('✅ Created roles');

  // Create permissions
  const resources = ['subscribers', 'citizens', 'transactions', 'roles', 'permissions', 'users'];

  const permissions = [];
  for (const resource of resources) {
    const readPermission = await prisma.permission.upsert({
      where: {
        resource_action: {
          resource,
          action: 'READ',
        },
      },
      update: {},
      create: {
        resource,
        action: 'READ',
      },
    });

    const allPermission = await prisma.permission.upsert({
      where: {
        resource_action: {
          resource,
          action: 'ALL',
        },
      },
      update: {},
      create: {
        resource,
        action: 'ALL',
      },
    });

    permissions.push(readPermission, allPermission);
  }

  console.log('✅ Created permissions');

  // Assign all permissions to admin role
  for (const permission of permissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: adminRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: adminRole.id,
        permissionId: permission.id,
      },
    });
  }

  // Assign admin role to admin user
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: admin.id,
        roleId: adminRole.id,
      },
    },
    update: {},
    create: {
      userId: admin.id,
      roleId: adminRole.id,
    },
  });

  console.log('✅ Assigned permissions and roles');

  // Seed services
  await seedServices();

  // Seed social amelioration settings
  await seedSocialAmeliorationSettings();

  // Seed government programs
  await seedGovernmentPrograms();

  // Seed addresses
  await seedAddresses();

  // Seed FAQs
  await seedFAQs();

  // Seed E-Services
  await seedEServices();

  // Optionally seed sample data (non-citizens, citizens, transactions, beneficiaries)
  // Uncomment the line below to include sample data in the main seed
  // await seedSampleData();

  console.log('🎉 Database seed completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
