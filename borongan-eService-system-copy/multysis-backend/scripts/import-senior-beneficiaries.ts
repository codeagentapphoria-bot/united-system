/**
 * import-senior-beneficiaries.ts
 *
 * Bulk-imports Senior Citizen Registry from a cleaned CSV into the database.
 *
 * What it does per batch (500 rows):
 *   1. Generates SC IDs (SC-2026-NNNN format)
 *   2. Bulk inserts residents          → public.residents
 *   3. Bulk inserts SC classifications → resident_classifications (raw SQL)
 *   4. Bulk inserts SC beneficiaries   → senior_citizen_beneficiaries (raw SQL)
 *   5. Bulk inserts program apps       → government_program_applications (raw SQL)
 *   All in a single transaction per batch.
 *
 * Safety features:
 *   - Pre-loads existing seniors by composite key → skips duplicates
 *   - ON CONFLICT DO NOTHING on all inserts → idempotent
 *   - Full rollback on any batch failure
 *
 * Usage:
 *   CSV_PATH="C:\\...\\Senior Citizen Registry_cleaned.csv" \
 *     npx ts-node scripts/import-senior-beneficiaries.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_URL } },
});

// ─── Constants ────────────────────────────────────────────────────────────────

const SENIOR_CITIZEN_PROGRAM_ID = '00000501-0501-4001-8001-000000000004';
const MUNICIPALITY_ID = 2;
const BATCH_SIZE = 500;

// ─── Types ────────────────────────────────────────────────────────────────────

interface CsvRow {
  'First Name': string;
  'Middle Name': string;
  'Last Name': string;
  'Extension Name': string;
  Birthdate: string;
  Sex: string;
  Age: string;
  Barangay: string;
  oscaId: string;
  dateRegistered: string;
  withPension: string;
  pensionAmount: string;
  socPenStatus: string;
  socPenDate: string;
  sourceOfIncome: string;
  monthlyIncome: string;
  regular: string;
  withIllness: string;
  illnessType: string;
  bedridden: string;
  pwd: string;
  disabilityType: string;
  withGuardian: string;
  guardianName: string;
  guardianContact: string;
  withPhilSys: string;
  philSysId: string;
  bbmVerified: string;
  dateAuth: string;
  livingAlone: string;
  neglected: string;
  abandoned: string;
  housing: string;
  ageClass: string;
  ncscStatus: string;
  dateProcess: string;
  dateClaimed: string;
  remarks: string;
}

interface ValidatedRow extends CsvRow {
  rowIndex: number;
  barangayId: number;
  seniorCitizenId: string;
  residentUUID: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        fields.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

function sqlStr(val: string | null | undefined): string {
  if (val === null || val === undefined || val === '') return 'NULL';
  return `'${String(val).replace(/'/g, "''")}'`;
}

function sqlJsonb(val: unknown): string {
  if (val === null || val === undefined) return 'NULL';
  return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
}

/** Normalize barangay name to lowercase for matching.
 *  Strips "Brgy. " prefix, "(Pob.)" suffix, and normalizes separators. */
function normalizeBarangay(name: string): string {
  return name
    .trim()
    .replace(/^Brgy\.?\s+/i, '')
    .replace(/\s*\(Pob\.\)\s*/gi, '')  // "Purok A (Pob.)" → "Purok A"
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim();
}

/** Map CSV active status to BeneficiaryStatus enum value. */
function mapBeneficiaryStatus(activeStatus: string): string {
  const v = (activeStatus || '').trim().toUpperCase();
  if (v === 'ACTIVE') return 'ACTIVE';
  if (v === 'INACTIVE') return 'INACTIVE';
  if (v.includes('DELISTING')) return 'INACTIVE';
  return 'ACTIVE';
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // Allow override via env var, but prefer CLI arg
  const csvPath = process.argv[2] || process.env.CSV_PATH;
  if (!csvPath) {
    console.error('ERROR: CSV path not provided');
    console.error('Usage: npx ts-node scripts/import-senior-beneficiaries.ts "<path-to-cleaned-csv>"');
    console.error('  or:   CSV_PATH="...Senior Citizen Registry_cleaned.csv" npx ts-node scripts/import-senior-beneficiaries.ts');
    process.exit(1);
  }
  if (!fs.existsSync(csvPath)) {
    console.error(`ERROR: CSV file not found: ${csvPath}`);
    process.exit(1);
  }

  // ── 1. Read CSV ────────────────────────────────────────────────────────────
  console.log('Reading CSV...');
  const raw = fs.readFileSync(csvPath, 'utf8').replace(/^\ufeff/, '');
  const lines = raw.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) {
    console.error('ERROR: CSV has no data rows');
    process.exit(1);
  }

  const header = parseCSVLine(lines[0]);
  const rawRows: (CsvRow & { rowIndex: number })[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    header.forEach((col, idx) => { row[col] = values[idx] || ''; });
    rawRows.push({ ...row as unknown as CsvRow, rowIndex: i });
  }
  console.log(`Loaded ${rawRows.length} rows from CSV`);

  // ── 2. Load barangay map ────────────────────────────────────────────────────
  const barangays = await prisma.barangay.findMany({
    where: { municipalityId: MUNICIPALITY_ID },
    select: { id: true, barangayName: true },
  });
  const barangayMap = new Map<string, number>();
  for (const b of barangays) {
    barangayMap.set(normalizeBarangay(b.barangayName), b.id);
  }
  console.log(`Loaded ${barangayMap.size} barangays`);

  // ── 3. Validate government program ─────────────────────────────────────────
  const program = await prisma.governmentProgram.findUnique({
    where: { id: SENIOR_CITIZEN_PROGRAM_ID },
    select: { id: true, name: true, isActive: true },
  });
  if (!program) {
    console.error(`ERROR: Senior Citizen Allowance program (${SENIOR_CITIZEN_PROGRAM_ID}) not found`);
    process.exit(1);
  }
  if (!program.isActive) {
    console.error(`ERROR: Program "${program.name}" is not active`);
    process.exit(1);
  }
  console.log(`Program: ${program.name} (${program.id})`);

  // ── 4. Pre-load existing seniors by composite key ────────────────────────────
  console.log('Pre-loading existing senior citizens from DB...');

  // Existing residents who are already senior citizens (have SC classification)
  const existingSC = await prisma.$queryRawUnsafe<Array<{
    r_first_name: string; r_last_name: string; b_barangay_name: string; r_birthdate: string
  }>>(`
    SELECT DISTINCT
      LOWER(TRIM(r.first_name))    as r_first_name,
      LOWER(TRIM(r.last_name))     as r_last_name,
      LOWER(TRIM(b.barangay_name)) as b_barangay_name,
      r.birthdate::text            as r_birthdate
    FROM public.residents r
    JOIN public.barangays b ON b.id = r.barangay_id
    JOIN public.senior_citizen_beneficiaries sc ON sc.resident_id = r.id
    WHERE r.barangay_id IN (SELECT id FROM public.barangays WHERE municipality_id = $1)
  `, MUNICIPALITY_ID);

  const existingKeys = new Set<string>();
  for (const row of existingSC) {
    existingKeys.add(
      `${row.r_first_name}|${row.r_last_name}|${row.b_barangay_name}|${row.r_birthdate}`
    );
  }
  console.log(`Found ${existingKeys.size} existing senior citizens`);

  // ── 5. Get current SC ID counter ───────────────────────────────────────────
  const lastSC = await prisma.$queryRawUnsafe<Array<{ senior_citizen_id: string }>>(`
    SELECT senior_citizen_id FROM public.senior_citizen_beneficiaries
    WHERE senior_citizen_id LIKE 'SC-${new Date().getFullYear()}-%'
    ORDER BY senior_citizen_id DESC LIMIT 1
  `);
  let scCounter = 0;
  if (lastSC.length > 0) {
    const parts = lastSC[0].senior_citizen_id.split('-');
    scCounter = parseInt(parts[parts.length - 1], 10) || 0;
  }
  console.log(`Starting SC counter at: SC-${new Date().getFullYear()}-${String(scCounter + 1).padStart(4, '0')}`);

  // ── 6. Validate rows ────────────────────────────────────────────────────────
  const validRows: ValidatedRow[] = [];
  const skipReasons: Record<string, number> = {};

  for (const row of rawRows) {
    const firstName = (row['First Name'] || '').trim();
    const lastName = (row['Last Name'] || '').trim();
    if (!firstName || !lastName) {
      skipReasons['missing_name'] = (skipReasons['missing_name'] ?? 0) + 1;
      continue;
    }

    const barangayName = normalizeBarangay(row.Barangay || '');
    const barangayId = barangayName ? (barangayMap.get(barangayName) ?? null) : null;
    if (!barangayId) {
      skipReasons['unknown_barangay'] = (skipReasons['unknown_barangay'] ?? 0) + 1;
      continue;
    }

    const birthdate = (row.Birthdate || '').trim();
    if (!birthdate) {
      skipReasons['missing_birthdate'] = (skipReasons['missing_birthdate'] ?? 0) + 1;
      continue;
    }

    // Dedup check (composite key: first_name + last_name + barangay_name + birthdate)
    const key = `${firstName.toLowerCase()}|${lastName.toLowerCase()}|${barangayName}|${birthdate}`;
    if (existingKeys.has(key)) {
      skipReasons['already_imported'] = (skipReasons['already_imported'] ?? 0) + 1;
      continue;
    }

    // Reserve SC ID for this row
    scCounter++;
    const year = new Date().getFullYear();
    const seniorCitizenId = `SC-${year}-${String(scCounter).padStart(4, '0')}`;

    validRows.push({
      ...row,
      rowIndex: row.rowIndex,
      barangayId,
      seniorCitizenId,
      residentUUID: '', // filled below
    });
  }

  if (Object.keys(skipReasons).length > 0) {
    console.log('\nSkipped rows:');
    for (const [reason, count] of Object.entries(skipReasons)) {
      console.log(`  ${reason}: ${count}`);
    }
  }
  console.log(`\n${validRows.length} rows to import`);

  if (validRows.length === 0) {
    console.log('Nothing to import. Exiting.');
    await prisma.$disconnect();
    process.exit(0);
  }

  // Pre-generate UUIDs
  for (const row of validRows) {
    (row as any).residentUUID = crypto.randomUUID();
  }

  // ── 7. Batch import ────────────────────────────────────────────────────────
  let inserted = 0;
  let errors = 0;

  for (let batchStart = 0; batchStart < validRows.length; batchStart += BATCH_SIZE) {
    const batch = validRows.slice(batchStart, batchStart + BATCH_SIZE);
    const batchNum = Math.floor(batchStart / BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(validRows.length / BATCH_SIZE);

    try {
      await importBatch(batch as ValidatedRow[], batchNum, totalBatches);
      inserted += batch.length;
      console.log(
        `  Batch ${batchNum}/${totalBatches} ✓  ` +
        `(${inserted}/${validRows.length} total)`
      );
    } catch (err) {
      errors += batch.length;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  Batch ${batchNum}/${totalBatches} ✗ ERROR: ${msg}`);
    }
  }

  // ── 8. Done ────────────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`✅ Import complete. ${inserted} inserted, ${errors} errors`);
  await prisma.$disconnect();
  process.exit(errors > 0 ? 1 : 0);
}

// ─── Batch import logic ────────────────────────────────────────────────────────

async function importBatch(
  batch: ValidatedRow[],
  batchNum: number,
  _totalBatches: number,
): Promise<void> {
  const N = batch.length;
  const now = new Date().toISOString();

  // ── Build resident rows ────────────────────────────────────────────────────
  const residentRows = batch.map(r => [
    sqlStr((r as any).residentUUID),         // id
    sqlStr(r.seniorCitizenId.replace('SC-', 'RES-')), // resident_id
    r.barangayId,                           // barangay_id
    'NULL',                                  // street_address (no street in CSV)
    sqlStr(r['Last Name']),                  // last_name
    sqlStr(r['First Name']),                 // first_name
    sqlStr(r['Middle Name']),               // middle_name
    sqlStr(r['Extension Name']),            // extension_name
    sqlStr(r.Sex === 'Male' ? 'male' : r.Sex === 'Female' ? 'female' : null), // sex
    'NULL',                                  // civil_status
    sqlStr(r.Birthdate),                     // birthdate
    'NULL',                                  // place_of_birth
    sqlStr('Filipino'),                      // citizenship
    'NULL',                                  // contact_number
    'NULL',                                  // profession
    'NULL',                                  // id_type
    'NULL',                                  // id_document_number
    'NULL',                                  // emergency_contact_person
    'NULL',                                  // emergency_contact_number
    'NULL',                                  // spouse_name
    sqlStr('active'),                        // status
    sqlStr(now),                             // created_at
    sqlStr(now),                             // updated_at
  ].join(', '));

  // ── Build classification_details JSONB ─────────────────────────────────────
  // All extended fields from the CSV go into resident_classifications.classification_details
  const classificationDetailsRows = batch.map(r => {
    // Build pension types array from CSV fields (GSIS, SSS, etc. are stored as withPension field)
    const pensionTypes: string[] = [];
    const withPension = r.withPension?.trim();
    if (withPension && withPension !== '' && withPension !== '0' && withPension !== 'N/A') {
      pensionTypes.push(withPension);
    }

    const details = {
      pensionTypes,
      remarks: r.remarks || null,
      oscaId: r.oscaId || null,
      dateRegistered: r.dateRegistered || null,
      pensionAmount: r.pensionAmount || null,
      socPenStatus: r.socPenStatus || null,
      socPenDate: r.socPenDate || null,
      sourceOfIncome: r.sourceOfIncome || null,
      monthlyIncome: r.monthlyIncome || null,
      regular: r.regular || null,
      withIllness: r.withIllness || null,
      illnessType: r.illnessType || null,
      bedridden: r.bedridden || null,
      pwd: r.pwd || null,
      disabilityType: r.disabilityType || null,
      withGuardian: r.withGuardian || null,
      guardianName: r.guardianName || null,
      guardianContact: r.guardianContact || null,
      withPhilSys: r.withPhilSys || null,
      philSysId: r.philSysId || null,
      bbmVerified: r.bbmVerified || null,
      dateAuth: r.dateAuth || null,
      livingAlone: r.livingAlone || null,
      neglected: r.neglected || null,
      abandoned: r.abandoned || null,
      housing: r.housing || null,
      ageClass: r.ageClass || null,
      ncscStatus: r.ncscStatus || null,
      dateProcess: r.dateProcess || null,
      dateClaimed: r.dateClaimed || null,
    };
    return [
      sqlStr((r as any).residentUUID),  // resident_id
      sqlStr('Senior Citizen'),         // classification_type
      sqlJsonb(details),              // classification_details (jsonb)
    ].join(', ');
  });

  // ── Build senior_citizen_beneficiaries rows ────────────────────────────────
  const scRows = batch.map(r => [
    sqlStr(crypto.randomUUID()),              // id
    sqlStr((r as any).residentUUID),          // resident_id
    sqlStr(r.seniorCitizenId),               // senior_citizen_id
    sqlStr(mapBeneficiaryStatus(r['ncscStatus'] || r.remarks ? '' : '')), // status — always ACTIVE for imported records
    sqlStr(r.remarks || null),               // remarks
    sqlStr(now),                              // created_at
    sqlStr(now),                              // updated_at
  ].join(', '));

  // ── Build government_program_applications rows ──────────────────────────────
  const appRows = batch.map(r => [
    sqlStr(crypto.randomUUID()),              // id
    sqlStr((r as any).residentUUID),          // resident_id
    sqlStr(SENIOR_CITIZEN_PROGRAM_ID),      // program_id
    sqlStr('approved'),                      // status
    'NULL',                                   // admin_notes
    'NULL',                                   // submitted_data
    'NULL',                                   // attachments
    sqlStr(now),                              // applied_at
    sqlStr(now),                              // reviewed_at
    'NULL',                                   // reviewed_by
  ].join(', '));

  // ── Execute in transaction ─────────────────────────────────────────────────
  await prisma.$transaction(async (tx) => {
    // 1. Insert residents
    if (residentRows.length > 0) {
      await tx.$executeRawUnsafe(`
        INSERT INTO public.residents (
          id, resident_id, barangay_id, street_address,
          last_name, first_name, middle_name, extension_name,
          sex, civil_status, birthdate, place_of_birth,
          citizenship, contact_number, profession,
          id_type, id_document_number,
          emergency_contact_person, emergency_contact_number, spouse_name,
          status, created_at, updated_at
        ) VALUES ${residentRows.map(v => `(${v})`).join(', ')}
        ON CONFLICT (id) DO NOTHING
      `);
    }

    // 2. Insert resident_classifications (Senior Citizen classification)
    if (classificationDetailsRows.length > 0) {
      await tx.$executeRawUnsafe(`
        INSERT INTO public.resident_classifications (
          resident_id, classification_type, classification_details
        ) VALUES ${classificationDetailsRows.map(v => `(${v})`).join(', ')}
        ON CONFLICT (resident_id, classification_type) DO NOTHING
      `);
    }

    // 3. Insert senior_citizen_beneficiaries
    if (scRows.length > 0) {
      await tx.$executeRawUnsafe(`
        INSERT INTO public.senior_citizen_beneficiaries (
          id, resident_id, senior_citizen_id, status, remarks, created_at, updated_at
        ) VALUES ${scRows.map(v => `(${v})`).join(', ')}
        ON CONFLICT (resident_id) DO NOTHING
      `);
    }

    // 4. Insert government_program_applications
    if (appRows.length > 0) {
      await tx.$executeRawUnsafe(`
        INSERT INTO public.government_program_applications (
          id, resident_id, program_id, status, admin_notes,
          submitted_data, attachments, applied_at, reviewed_at, reviewed_by
        ) VALUES ${appRows.map(v => `(${v})`).join(', ')}
        ON CONFLICT (resident_id, program_id) DO NOTHING
      `);
    }
  });
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
