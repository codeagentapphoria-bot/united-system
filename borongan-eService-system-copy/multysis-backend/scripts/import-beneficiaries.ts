// borongan-eService-system-copy/multysis-backend/scripts/import-beneficiaries.ts
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

// Direkta Ayuda program UUID (from government_programs table)
const DIREKTA_AYUDA_PROGRAM_ID = '00000501-0501-4001-8001-000000000003';

interface CsvRow {
  'First Name': string;
  'Middle Name': string;
  'Last Name': string;
  'Extension Name': string;
  'Birthdate': string;
  'Sex': string;
  'Civil Status': string;
  'Profession': string;
  'Phone Number': string;
  'Region': string;
  'Municipality': string;
  'Barangay': string;
  'Street': string;
  'Place of Birth': string;
  'Spouse Name': string;
  'Emergency Contact Person': string;
  'Emergency Contact Number': string;
  'ID Type': string;
  'Resident ID': string;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parseDate(raw: string): Date | null {
  if (!raw || raw === '-') return null;
  const m = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!m) return null;
  const [, year, month, day] = m;
  const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  return isNaN(d.getTime()) ? null : d;
}

function generateStudentId(counter: number): string {
  return `ST-2026-${String(counter).padStart(4, '0')}`;
}

async function main() {
  const csvPath = process.env.CSV_PATH;
  if (!csvPath) {
    console.error('ERROR: CSV_PATH env var not set');
    process.exit(1);
  }

  if (!fs.existsSync(csvPath)) {
    console.error(`ERROR: CSV file not found at ${csvPath}`);
    process.exit(1);
  }

  console.log('Reading CSV...');
  const raw = fs.readFileSync(csvPath, 'utf-8');
  const lines = raw.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) {
    console.error('ERROR: CSV has no data rows');
    process.exit(1);
  }

  const header = parseCsvLine(lines[0]);
  const rows: CsvRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    if (values.length < header.length) continue;
    const row: Record<string, string> = {};
    header.forEach((col, idx) => { row[col] = values[idx] || ''; });
    rows.push(row as unknown as CsvRow);
  }
  console.log(`Loaded ${rows.length} rows from CSV`);

  // Load barangay cache
  const boronganMuni = await prisma.municipality.findFirst({
    where: { municipalityName: { equals: 'Borongan', mode: 'insensitive' } },
    select: { id: true },
  });
  if (!boronganMuni) {
    console.error('ERROR: Municipality "Borongan" not found in database');
    process.exit(1);
  }

  const barangays = await prisma.barangay.findMany({
    where: { municipalityId: boronganMuni.id },
    select: { id: true, barangayName: true },
  });
  const barangayMap = new Map<string, number>();
  for (const b of barangays) {
    barangayMap.set(b.barangayName.toLowerCase().trim(), b.id);
  }
  console.log(`Loaded ${barangayMap.size} barangays`);

  // Verify Direkta Ayuda program exists
  const program = await prisma.governmentProgram.findUnique({
    where: { id: DIREKTA_AYUDA_PROGRAM_ID },
    select: { id: true, name: true, isActive: true },
  });
  if (!program) {
    console.error(`ERROR: Direkta Ayuda program (${DIREKTA_AYUDA_PROGRAM_ID}) not found in government_programs table`);
    process.exit(1);
  }
  if (!program.isActive) {
    console.error('ERROR: Direkta Ayuda program is not active');
    process.exit(1);
  }
  console.log(`Program: ${program.name} (${program.id})`);

  // Pre-compute student ID counter
  const year = new Date().getFullYear();
  const yearPrefix = `ST-${year}-`;
  const lastStudent = await prisma.$queryRawUnsafe<Array<{ display_id: string }>>(
    `SELECT student_id as display_id FROM public.student_beneficiaries WHERE student_id LIKE $1
     ORDER BY student_id DESC LIMIT 1`,
    `${yearPrefix}%`
  );
  let studentCounter = 1;
  if (lastStudent.length > 0) {
    const parts = lastStudent[0].display_id.split('-');
    const lastNum = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastNum)) {
      studentCounter = lastNum + 1;
    }
  }
  console.log(`Starting student ID counter at: ${generateStudentId(studentCounter)}`);

  let inserted = 0;
  let skipped = 0;
  let errors = 0;
  const seen = new Set<string>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      const firstName = row['First Name']?.trim();
      const lastName = row['Last Name']?.trim();
      if (!firstName || !lastName) { skipped++; continue; }

      const barangayName = row['Barangay']?.toLowerCase().trim();
      const barangayId = barangayName ? barangayMap.get(barangayName) ?? null : null;
      if (!barangayId) {
        console.warn(`Row ${i + 2}: Unknown barangay "${row['Barangay']}" — skipping`);
        skipped++;
        continue;
      }

      const birthdate = parseDate(row['Birthdate']);
      if (!birthdate) {
        console.warn(`Row ${i + 2}: Invalid birthdate "${row['Birthdate']}" — skipping`);
        skipped++;
        continue;
      }

      const dedupKey = `${firstName}|${lastName}|${barangayId}|${row['Birthdate']}`;
      if (seen.has(dedupKey)) { skipped++; continue; }
      seen.add(dedupKey);

      const idDocumentNumber = row['Resident ID']?.trim() || null;

      // Check if resident already exists
      const existing = idDocumentNumber
        ? await prisma.resident.findFirst({ where: { idDocumentNumber } })
        : await prisma.resident.findFirst({ where: { firstName, lastName, barangayId, birthdate } });
      if (existing) { skipped++; continue; }

      // Record 1: Create resident
      const resident = await prisma.resident.create({
        data: {
          firstName,
          lastName,
          middleName: row['Middle Name']?.trim() || null,
          extensionName: row['Extension Name']?.trim() || null,
          birthdate,
          sex: row['Sex']?.trim() || null,
          civilStatus: row['Civil Status']?.trim() || null,
          profession: row['Profession']?.trim() || null,
          contactNumber: row['Phone Number']?.trim() || null,
          barangayId,
          streetAddress: row['Street']?.trim() || null,
          placeOfBirth: row['Place of Birth']?.trim() || null,
          spouseName: row['Spouse Name']?.trim() || null,
          emergencyContactPerson: row['Emergency Contact Person']?.trim() || null,
          emergencyContactNumber: row['Emergency Contact Number']?.trim() || null,
          idType: row['ID Type']?.trim() || null,
          idDocumentNumber,
          status: 'active',
          citizenship: 'Filipino',
        },
      });

      // Record 2: Create student_beneficiaries
      const studentId = generateStudentId(studentCounter++);
      await prisma.studentBeneficiary.create({
        data: {
          residentId: resident.id,
          studentId,
          status: 'ACTIVE',
        },
      });

      // Record 3: Create approved government_program_applications
      // This triggers the approval flow which auto-creates beneficiary_program_pivots
      await prisma.governmentProgramApplication.create({
        data: {
          residentId: resident.id,
          programId: DIREKTA_AYUDA_PROGRAM_ID,
          status: 'approved',
          reviewedAt: new Date(),
          appliedAt: new Date(),
        },
      });

      inserted++;

      if (inserted % 100 === 0) {
        console.log(`Progress: ${inserted} inserted, ${skipped} skipped, ${errors} errors`);
      }
    } catch (err: unknown) {
      errors++;
      console.error(`Row ${i + 2} error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log(`\nImport complete. ${inserted} inserted, ${skipped} skipped, ${errors} errors`);
  await prisma.$disconnect();
  process.exit(errors > 10 ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
