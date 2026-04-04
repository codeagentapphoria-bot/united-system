/**
 * seed.ts — E-Services Prisma seed (DEPRECATED)
 *
 * This file is intentionally kept as a no-op stub.
 *
 * Seeding is now handled by the unified SQL seed file:
 *   united-database/seed.sql
 *
 * Run it once on a fresh database:
 *   psql -U postgres -d your_database -f united-database/seed.sql
 *
 * The SQL seed populates:
 *   - roles, permissions, role_permissions
 *   - social_amelioration_settings
 *   - government_programs
 *   - faqs
 *   - services (including barangay certificate services)
 *
 * The old Prisma-based seed (citizens, subscribers, non-citizens, e-services)
 * was removed in the v2 architecture overhaul. Those tables no longer exist.
 */

console.log('');
console.log('  ℹ  Prisma seed is deprecated in v2.');
console.log('');
console.log('  Seed the database using the unified SQL seed file instead:');
console.log('');
console.log('    psql -U postgres -d <database> -f united-database/seed.sql');
console.log('');
