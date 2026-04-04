import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// All Philippine Regions
const regions = [
  { value: 'region1', name: 'Region I – Ilocos Region' },
  { value: 'region2', name: 'Region II – Cagayan Valley' },
  { value: 'region3', name: 'Region III – Central Luzon' },
  { value: 'region4a', name: 'Region IV‑A – CALABARZON' },
  { value: 'region4b', name: 'MIMAROPA Region' },
  { value: 'region5', name: 'Region V – Bicol Region' },
  { value: 'region6', name: 'Region VI – Western Visayas' },
  { value: 'region7', name: 'Region VII – Central Visayas' },
  { value: 'region8', name: 'Region VIII – Eastern Visayas' },
  { value: 'region9', name: 'Region IX – Zamboanga Peninsula' },
  { value: 'region10', name: 'Region X – Northern Mindanao' },
  { value: 'region11', name: 'Region XI – Davao Region' },
  { value: 'region12', name: 'Region XII – SOCCSKSARGEN' },
  { value: 'region13', name: 'Region XIII – Caraga' },
  { value: 'ncr', name: 'NCR – National Capital Region' },
  { value: 'car', name: 'CAR – Cordillera Administrative Region' },
  { value: 'barmm', name: 'BARMM – Bangsamoro Autonomous Region in Muslim Mindanao' },
  { value: 'nir', name: 'NIR – Negros Island Region' },
];

// Region VIII Provinces
const region8Provinces = [
  { name: 'Biliran', postalCode: '6549' },
  { name: 'Eastern Samar', postalCode: '6800' },
  { name: 'Leyte', postalCode: '6500' },
  { name: 'Northern Samar', postalCode: '6400' },
  { name: 'Samar', postalCode: '6700' },
  { name: 'Southern Leyte', postalCode: '6600' },
  { name: 'Tacloban', postalCode: '6500' },
];

// Borongan City Barangays
const boronganCityBarangays = [
  'Alang-alang',
  'Amantacop',
  'Ando',
  'Balacdas',
  'Balud',
  'Banuyo',
  'Baras',
  'Barangay A',
  'Barangay B',
  'Barangay C',
  'Barangay D1',
  'Barangay D2',
  'Barangay E',
  'Barangay F',
  'Barangay G',
  'Barangay H',
  'Bato',
  'Bayobay',
  'Benowangan',
  'Bugas',
  'Cabalagnan',
  'Cabong',
  'Cagbonga',
  'Calico-an',
  'Calingatngan',
  'Camada',
  'Campesao',
  'Can-abong',
  'Can-aga',
  'Canjaway',
  'Canlaray',
  'Canyopay',
  'Divinubo',
  'Hebacong',
  'Hindang',
  'Lalawigan',
  'Libuton',
  'Locso-on',
  'Maybacong',
  'Maypangdan',
  'Pepelitan',
  'Pinanag-an',
  'Punta Maria',
  'Sabang North',
  'Sabang South',
  'San Andres',
  'San Gabriel',
  'San Gregorio',
  'San Jose',
  'San Mateo',
  'San Pablo',
  'San Saturnino',
  'Santa Fe',
  'Siha',
  'Sohutan',
  'Songco',
  'Suribao',
  'Surok',
  'Taboc',
  'Tabunan',
  'Tamoso',
];

// Region VIII - Eastern Samar Municipalities
const easternSamarMunicipalities = [
  { name: 'Arteche', postalCode: '6822' },
  { name: 'Balangiga', postalCode: '6812' },
  { name: 'Balangkayan', postalCode: '6821' },
  { name: 'Borongan City', postalCode: '6800', hasBarangays: true },
  { name: 'Can-avid', postalCode: '6806' },
  { name: 'Dolores', postalCode: '6817' },
  { name: 'General MacArthur', postalCode: '6805' },
  { name: 'Giporlos', postalCode: '6811' },
  { name: 'Guiuan', postalCode: '6809' },
  { name: 'Hernani', postalCode: '6804' },
  { name: 'Jipapad', postalCode: '6819' },
  { name: 'Lawaan', postalCode: '6813' },
  { name: 'Llorente', postalCode: '6803' },
  { name: 'Maslog', postalCode: '6820' },
  { name: 'Maydolong', postalCode: '6802' },
  { name: 'Mercedes', postalCode: '6808' },
  { name: 'Oras', postalCode: '6818' },
  { name: 'Quinapondan', postalCode: '6810' },
  { name: 'Salcedo', postalCode: '6807' },
  { name: 'San Julian', postalCode: '6814' },
  { name: 'San Policarpo', postalCode: '6823' },
  { name: 'Sulat', postalCode: '6815' },
  { name: 'Taft', postalCode: '6816' },
];

export const seedAddresses = async () => {
  console.log('🌱 Seeding addresses...');

  let totalCreated = 0;
  let totalSkipped = 0;

  // Seed all regions with placeholder entries (one per region)
  for (const region of regions) {
    const existingAddress = await prisma.address.findFirst({
      where: {
        region: region.value,
        province: '–',
        municipality: '–',
        barangay: '–',
      },
    });

    if (!existingAddress) {
      await prisma.address.create({
        data: {
          region: region.value,
          province: '–',
          municipality: '–',
          barangay: '–',
          postalCode: '0000',
          streetAddress: '',
          isActive: true,
        },
      });
      totalCreated++;
    } else {
      totalSkipped++;
    }
  }

  // Seed Region VIII - All Provinces with placeholder entries
  for (const province of region8Provinces) {
    const existingAddress = await prisma.address.findFirst({
      where: {
        region: 'region8',
        province: province.name,
        municipality: 'Main',
        barangay: 'Main',
      },
    });

    if (!existingAddress) {
      await prisma.address.create({
        data: {
          region: 'region8',
          province: province.name,
          municipality: 'Main',
          barangay: 'Main',
          postalCode: province.postalCode,
          streetAddress: '',
          isActive: true,
        },
      });
      totalCreated++;
    } else {
      totalSkipped++;
    }
  }

  // Seed Region VIII - Eastern Samar municipalities
  for (const municipality of easternSamarMunicipalities) {
    if (municipality.name === 'Borongan City' && municipality.hasBarangays) {
      // Seed all Borongan City barangays
      for (const barangay of boronganCityBarangays) {
        const existingAddress = await prisma.address.findFirst({
          where: {
            region: 'region8',
            province: 'Eastern Samar',
            municipality: 'Borongan City',
            barangay: barangay,
          },
        });

        if (!existingAddress) {
          await prisma.address.create({
            data: {
              region: 'region8',
              province: 'Eastern Samar',
              municipality: 'Borongan City',
              barangay: barangay,
              postalCode: municipality.postalCode,
              streetAddress: '',
              isActive: true,
            },
          });
          totalCreated++;
        } else {
          totalSkipped++;
        }
      }
    } else {
      // For other municipalities, create a main barangay entry
      const barangayName = 'Poblacion';
      const existingAddress = await prisma.address.findFirst({
        where: {
          region: 'region8',
          province: 'Eastern Samar',
          municipality: municipality.name,
          barangay: barangayName,
        },
      });

      if (!existingAddress) {
        await prisma.address.create({
          data: {
            region: 'region8',
            province: 'Eastern Samar',
            municipality: municipality.name,
            barangay: barangayName,
            postalCode: municipality.postalCode,
            streetAddress: '',
            isActive: true,
          },
        });
        totalCreated++;
      } else {
        totalSkipped++;
      }
    }
  }

  console.log(`✅ Seeded ${totalCreated} addresses (${totalSkipped} already existed)`);
  console.log(`   - All regions: ${regions.length} regions (placeholder entries)`);
  console.log(`   - Region VIII provinces: ${region8Provinces.length} provinces`);
  console.log(`   - Region VIII, Eastern Samar:`);
  console.log(`     - Borongan City: ${boronganCityBarangays.length} barangays`);
  console.log(
    `     - Other municipalities: ${easternSamarMunicipalities.length - 1} municipalities (Poblacion)`
  );
  console.log('✅ Address seeding completed!');
};
