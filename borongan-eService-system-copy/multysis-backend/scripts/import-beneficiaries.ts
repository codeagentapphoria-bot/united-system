/**
 * import-beneficiaries.ts — FAST BULK VERSION
 *
 * Replaces row-by-row Prisma calls with batched raw SQL inserts.
 * Performance: ~4000 rows in <60s instead of 15-30 minutes.
 *
 * What it does per batch of 500:
 *   1. Pre-loads existing resident IDs from DB (1 query)
 *   2. Reserves N IDs atomically (1 upsert)
 *   3. Bulk inserts residents (1 multi-row INSERT)
 *   4. Bulk inserts student_beneficiaries (1 multi-row INSERT)
 *   5. Bulk inserts government_program_applications (1 multi-row INSERT)
 *   6. Bulk inserts beneficiary_program_pivots (1 multi-row INSERT)
 *
 * Total per batch: ~6 raw SQL calls instead of ~3,000.
 *
 * Usage:
 *   CSV_PATH=/path/to/Direkta\ Ayuda\ Beneficiaries_cleaned.csv \
 *     npx ts-node scripts/import-beneficiaries.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

// ─── Constants ────────────────────────────────────────────────────────────────

const DIREKTA_AYUDA_PROGRAM_ID = '00000501-0501-4001-8001-000000000003';
const LIBRE_SAKAY_PROGRAM_ID = 'gp-all-libre-sakay';
const MUNICIPALITY_ID = 2;
const RESIDENT_ID_YEAR = new Date().getFullYear();
const BATCH_SIZE = 500; // rows per DB transaction

// ─── Types ────────────────────────────────────────────────────────────────────

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

interface ParsedRow extends CsvRow {
  rowIndex: number; // 0-based index in original CSV
}

/** Row with barangayId already resolved — ready for bulk insert */
interface ValidatedRow extends CsvRow {
  rowIndex: number;
  barangayId: number;
  birthdateParsed: string; // YYYY-MM-DD
  sex: string | null;
  civilStatus: string | null;
  idDocumentNumber: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function parseDate(raw: string): string | null {
  if (!raw || raw === '-') return null;
  const m = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!m) return null;
  const [, year, month, day] = m;
  const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  return isNaN(d.getTime()) ? null : `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

function normalizeSex(raw: string | undefined): string | null {
  if (!raw) return null;
  const v = raw.trim().toLowerCase();
  if (v === 'male') return 'male';
  if (v === 'female') return 'female';
  return raw.trim() || null;
}

function normalizeCivilStatus(raw: string | undefined): string | null {
  if (!raw) return null;
  const v = raw.trim().toLowerCase();
  const map: Record<string, string> = {
    single: 'single',
    singe: 'single',            // typo
    married: 'married',
    widow: 'widowed',
    widowed: 'widowed',
    separated: 'separated',
    divorce: 'divorced',
    divorced: 'divorced',
    live_in: 'live_in',
    'live in': 'live_in',
  };
  return map[v] ?? raw.trim();
}

function normalizeBarangay(name: string): string {
  return name
    .trim()
    .replace(/Sta\./gi, 'Santa')
    .replace(/Sto\./gi, 'Santo')
    .replace(/Poblacion/gi, 'Purok')        // "Poblacion A" -> "Purok A"
    .replace(/\s*-\s*/g, '')                // "Purok D-1" -> "Purok D1"
    .replace(/\.\s*/g, '')                  // "Purok E." -> "Purok E"
    .replace(/Locsoon/gi, 'Locso-on')        // typo in source data
    .replace(/H,?\s*Tarusan/gi, 'Purok H')  // "H, Tarusan" -> "Purok H"
    .replace(/^H$/i, 'Purok H')             // "H" standalone -> "Purok H"
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim();
}

// Escape single quotes for SQL string literals
function sqlStr(val: string | null): string {
  if (val === null || val === undefined) return 'NULL';
  return `'${val.replace(/'/g, "''")}'`;
}

// Format a YYYY-MM-DD string as a SQL DATE literal
function sqlDate(val: string): string {
  return `'${val}'`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const csvPath = process.env.CSV_PATH;
  if (!csvPath) {
    console.error('ERROR: CSV_PATH env var not set');
    console.error('Usage: CSV_PATH=/path/to/file.csv npx ts-node scripts/import-beneficiaries.ts');
    process.exit(1);
  }

  if (!fs.existsSync(csvPath)) {
    console.error(`ERROR: CSV file not found at ${csvPath}`);
    process.exit(1);
  }

  // ── 1. Read CSV (async) ────────────────────────────────────────────────────
  console.log('Reading CSV...');
  const raw = await fs.promises.readFile(csvPath, 'utf-8');
  const lines = raw.replace(/^\ufeff/, '').split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) {
    console.error('ERROR: CSV has no data rows');
    process.exit(1);
  }

  const header = parseCsvLine(lines[0]);
  const rawRows: ParsedRow[] = [];
  let garbled = 0;
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const normalized = values.length > header.length
      ? [...values.slice(0, header.length - 1), values.slice(header.length - 1).join(',')]
      : values;
    if (normalized.length < header.length) { garbled++; continue; }
    const row: Record<string, string> = {};
    header.forEach((col, idx) => { row[col] = normalized[idx] || ''; });
    rawRows.push({ ...row as unknown as CsvRow, rowIndex: i });
  }
  if (garbled > 0) console.log(`Skipped ${garbled} garbled rows`);
  console.log(`Loaded ${rawRows.length} rows from CSV`);

  // ── 2. Load barangay map ──────────────────────────────────────────────────
  const barangays = await prisma.barangay.findMany({
    where: { municipalityId: MUNICIPALITY_ID },
    select: { id: true, barangayName: true },
  });
  const barangayMap = new Map<string, number>();
  for (const b of barangays) {
    barangayMap.set(normalizeBarangay(b.barangayName), b.id);
  }
  console.log(`Loaded ${barangayMap.size} barangays`);

  // ── 3. Validate programs ───────────────────────────────────────────────────
  const progIds = [DIREKTA_AYUDA_PROGRAM_ID, LIBRE_SAKAY_PROGRAM_ID];
  const programs = await prisma.governmentProgram.findMany({
    where: { id: { in: progIds } },
    select: { id: true, name: true, isActive: true },
  });
  for (const pid of progIds) {
    const p = programs.find(p => p.id === pid);
    if (!p) { console.error(`ERROR: Program ${pid} not found`); process.exit(1); }
    if (!p.isActive) { console.error(`ERROR: Program ${p.name} is not active`); process.exit(1); }
    console.log(`Program: ${p.name} (${p.id})`);
  }

  // ── 4. Pre-load existing idDocumentNumbers from DB (1 query) ───────────────
  console.log('Pre-loading existing residents from DB...');
  const existingDocs = await prisma.$queryRawUnsafe<Array<{ id_document_number: string }>>(
    `SELECT id_document_number FROM public.residents WHERE id_document_number IS NOT NULL AND id_document_number != ''`
  );
  const existingIdDocSet = new Set(existingDocs.map(r => r.id_document_number.trim()));
  console.log(`Found ${existingIdDocSet.size} existing residents with ID documents`);

  // Also pre-load by composite key (first_name, last_name, barangay_id, birthdate)
  const existingResidents = await prisma.$queryRawUnsafe<Array<{
    first_name: string; last_name: string; barangay_id: number; birthdate: string
  }>>(
    `SELECT first_name, last_name, barangay_id, birthdate
     FROM public.residents
     WHERE resident_id LIKE 'BRGN-2026-%'
       AND first_name IS NOT NULL AND last_name IS NOT NULL
       AND barangay_id IS NOT NULL AND birthdate IS NOT NULL`
  );
  const existingResidentSet = new Set(
    existingResidents.map(r =>
      `${r.first_name.toLowerCase().trim()}|${r.last_name.toLowerCase().trim()}|${r.barangay_id}|${r.birthdate}`
    )
  );
  console.log(`Found ${existingResidentSet.size} existing residents by composite key`);

  // ── 5. Validate rows and build ValidatedRow[] ─────────────────────────────
  const validRows: ValidatedRow[] = [];
  const skipReasons: Record<string, number> = {};

  for (const row of rawRows) {
    const firstName = row['First Name']?.trim();
    const lastName = row['Last Name']?.trim();
    if (!firstName || !lastName) {
      skipReasons['missing_name'] = (skipReasons['missing_name'] ?? 0) + 1;
      continue;
    }

    const barangayName = normalizeBarangay(row['Barangay'] ?? '');
    const barangayId = barangayName ? (barangayMap.get(barangayName) ?? null) : null;
    if (!barangayId) {
      skipReasons['unknown_barangay'] = (skipReasons['unknown_barangay'] ?? 0) + 1;
      continue;
    }

    const birthdateParsed = parseDate(row['Birthdate']);
    if (!birthdateParsed) {
      skipReasons['bad_birthdate'] = (skipReasons['bad_birthdate'] ?? 0) + 1;
      continue;
    }

    const idDoc = row['Resident ID']?.trim() || null;
    if (idDoc && existingIdDocSet.has(idDoc)) {
      skipReasons['already_exists'] = (skipReasons['already_exists'] ?? 0) + 1;
      continue;
    }
    // Also check by composite key (name + barangay + dob) to catch duplicates with null id_doc
    const compositeKey = `${firstName?.toLowerCase()}|${lastName?.toLowerCase()}|${barangayId}|${birthdateParsed}`;
    if (existingResidentSet.has(compositeKey)) {
      skipReasons['already_exists'] = (skipReasons['already_exists'] ?? 0) + 1;
      continue;
    }
    if (idDoc) existingIdDocSet.add(idDoc);

    validRows.push({
      ...row,
      rowIndex: row.rowIndex,
      barangayId,
      birthdateParsed,
      sex: normalizeSex(row['Sex']),
      civilStatus: normalizeCivilStatus(row['Civil Status']),
      idDocumentNumber: idDoc,
    });
  }

  if (Object.keys(skipReasons).length > 0) {
    for (const [reason, count] of Object.entries(skipReasons)) {
      console.log(`  Skipped (${reason}): ${count}`);
    }
  }
  console.log(`\n${validRows.length} rows to import`);

  if (validRows.length === 0) {
    console.log('Nothing to import. Exiting.');
    await prisma.$disconnect();
    process.exit(0);
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
      console.log(`  Batch ${batchNum}/${totalBatches} ✓  (${inserted}/${validRows.length} total)`);
    } catch (err) {
      errors += batch.length;
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  Batch ${batchNum}/${totalBatches} ✗ ERROR: ${msg}`);
    }
  }

  // ── 8. Done ────────────────────────────────────────────────────────────────
  console.log(`\n✅ Import complete. ${inserted} inserted, ${errors} errors`);
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

  // Step A: Reserve N IDs atomically (1 upsert)
  await prisma.$executeRawUnsafe(`
    INSERT INTO public.resident_counters (municipality_id, year, counter, prefix)
    VALUES ($1, $2, $3, 'BRGN')
    ON CONFLICT (municipality_id, year)
    DO UPDATE SET counter = resident_counters.counter + $3
  `, MUNICIPALITY_ID, RESIDENT_ID_YEAR, N);

  // Step B: Fetch the reserved range
  const counterRow = await prisma.$queryRawUnsafe<Array<{ counter: number; prefix: string }>>(
    `SELECT counter, prefix FROM public.resident_counters WHERE municipality_id = $1 AND year = $2 LIMIT 1`,
    MUNICIPALITY_ID, RESIDENT_ID_YEAR
  );
  if (!counterRow.length) throw new Error('Failed to read counter after increment');
  const { counter, prefix } = counterRow[0];
  const startCounter = counter - N; // counter was incremented past our range

  // Step C: Generate IDs for this batch
  const residentDisplayIds: string[] = [];
  const studentIds: string[] = [];
  for (let i = 0; i < N; i++) {
    const cnt = startCounter + i;
    const cntPart = String(cnt).padStart(7, '0');
    residentDisplayIds.push(`${prefix}-${RESIDENT_ID_YEAR}-${cntPart}`);
    studentIds.push(`ST-${RESIDENT_ID_YEAR}-${cntPart}`);
  }

  // Generate UUIDs for each resident (no collision check needed — UUIDs are unique)
  const residentUUIDs = batch.map(() => crypto.randomUUID());

  // ── Step D: Build SQL ─────────────────────────────────────────────────────

  const residentRows = batch.map((r, i) => [
    sqlStr(residentUUIDs[i]),          // id (PK)
    sqlStr(residentDisplayIds[i]),    // resident_id
    r.barangayId,                     // barangay_id
    sqlStr(r['Street']?.trim() || null),  // street_address
    sqlStr(r['Last Name']?.trim()),        // last_name
    sqlStr(r['First Name']?.trim()),       // first_name
    sqlStr(r['Middle Name']?.trim() || null), // middle_name
    sqlStr(r['Extension Name']?.trim() || null), // extension_name
    sqlStr(r.sex),                    // sex
    sqlStr(r.civilStatus),            // civil_status
    sqlDate(r.birthdateParsed),       // birthdate
    sqlStr(r['Place of Birth']?.trim() || null), // place_of_birth
    sqlStr('Filipino'),               // citizenship
    sqlStr(r['Phone Number']?.trim() || null),  // contact_number
    sqlStr(r['Profession']?.trim() || null),     // profession
    sqlStr(r['ID Type']?.trim() || null),       // id_type
    sqlStr(r.idDocumentNumber),        // id_document_number
    sqlStr(r['Emergency Contact Person']?.trim() || null), // emergency_contact_person
    sqlStr(r['Emergency Contact Number']?.trim() || null), // emergency_contact_number
    sqlStr(r['Spouse Name']?.trim() || null),             // spouse_name
    sqlStr('active'),                 // status
    sqlStr(now),                      // created_at
    sqlStr(now),                      // updated_at
  ].join(', '));

  const studentRows = batch.map((_, i) => [
    sqlStr(crypto.randomUUID()),    // id
    sqlStr(residentUUIDs[i]),       // resident_id
    sqlStr(studentIds[i]),          // student_id
    sqlStr('ACTIVE'),               // status
    sqlStr(now),                    // created_at
    sqlStr(now),                    // updated_at
  ].join(', '));

  // Apps: Direkta + Libre Sakay (no created_at/updated_at in this table)
  const direktaAppRows = batch.map((_, i) => [
    sqlStr(crypto.randomUUID()),
    sqlStr(residentUUIDs[i]),
    sqlStr(DIREKTA_AYUDA_PROGRAM_ID),
    sqlStr('approved'),
    sqlStr(now),   // applied_at
    sqlStr(now),   // reviewed_at
  ].join(', '));

  const libreAppRows = batch.map((_, i) => [
    sqlStr(crypto.randomUUID()),
    sqlStr(residentUUIDs[i]),
    sqlStr(LIBRE_SAKAY_PROGRAM_ID),
    sqlStr('approved'),
    sqlStr(now),   // applied_at
    sqlStr(now),   // reviewed_at
  ].join(', '));

  const appsSqlDirekta = `
    INSERT INTO public.government_program_applications
      (id, resident_id, program_id, status, applied_at, reviewed_at)
    VALUES ${direktaAppRows.map(v => `(${v})`).join(', ')}
    ON CONFLICT (resident_id, program_id) DO NOTHING
  `;

  const appsSqlLibre = `
    INSERT INTO public.government_program_applications
      (id, resident_id, program_id, status, applied_at, reviewed_at)
    VALUES ${libreAppRows.map(v => `(${v})`).join(', ')}
    ON CONFLICT (resident_id, program_id) DO NOTHING
  `;

  // Pivots: Direkta + Libre Sakay
  const direktaPivotRows = batch.map((_, i) => [
    sqlStr(crypto.randomUUID()),
    sqlStr('STUDENT'),
    sqlStr(studentIds[i]),             // pivot keyed by student_id
    sqlStr(DIREKTA_AYUDA_PROGRAM_ID),
    sqlStr('active'),
    sqlStr(now),
  ].join(', '));

  const librePivotRows = batch.map((_, i) => [
    sqlStr(crypto.randomUUID()),
    sqlStr('STUDENT'),
    sqlStr(studentIds[i]),
    sqlStr(LIBRE_SAKAY_PROGRAM_ID),
    sqlStr('active'),
    sqlStr(now),
  ].join(', '));

  const pivotsSqlDirekta = `
    INSERT INTO public.beneficiary_program_pivots
      (id, beneficiary_type, beneficiary_id, program_id, status, created_at)
    VALUES ${direktaPivotRows.map(v => `(${v})`).join(', ')}
    ON CONFLICT (beneficiary_type, beneficiary_id, program_id) DO NOTHING
  `;

  const pivotsSqlLibre = `
    INSERT INTO public.beneficiary_program_pivots
      (id, beneficiary_type, beneficiary_id, program_id, status, created_at)
    VALUES ${librePivotRows.map(v => `(${v})`).join(', ')}
    ON CONFLICT (beneficiary_type, beneficiary_id, program_id) DO NOTHING
  `;

  // ── Execute all in one transaction ────────────────────────────────────────
  await prisma.$transaction([
    prisma.$executeRawUnsafe(`
      INSERT INTO public.residents (
        id, resident_id, barangay_id, street_address,
        last_name, first_name, middle_name, extension_name,
        sex, civil_status, birthdate, place_of_birth,
        citizenship, contact_number, profession,
        id_type, id_document_number,
        emergency_contact_person, emergency_contact_number, spouse_name,
        status, created_at, updated_at
      ) VALUES ${residentRows.map(v => `(${v})`).join(', ')}
    `),
    prisma.$executeRawUnsafe(`
      INSERT INTO public.student_beneficiaries
        (id, resident_id, student_id, status, created_at, updated_at)
      VALUES ${studentRows.map(v => `(${v})`).join(', ')}
      ON CONFLICT (resident_id) DO NOTHING
    `),
    prisma.$executeRawUnsafe(appsSqlDirekta),
    prisma.$executeRawUnsafe(appsSqlLibre),
    prisma.$executeRawUnsafe(pivotsSqlDirekta),
    prisma.$executeRawUnsafe(pivotsSqlLibre),
  ]);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
