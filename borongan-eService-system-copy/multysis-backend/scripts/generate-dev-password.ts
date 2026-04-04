/**
 * Script to generate a hashed password for DEV_PASSWORD environment variable
 * 
 * Usage:
 *   npx ts-node scripts/generate-dev-password.ts <your-password>
 * 
 * Example:
 *   npx ts-node scripts/generate-dev-password.ts MySecurePassword123!
 */

import { hashPassword } from '../src/utils/password';

const password = process.argv[2];

if (!password) {
  console.error('❌ Error: Password is required');
  console.log('\nUsage:');
  console.log('  npx ts-node scripts/generate-dev-password.ts <your-password>');
  console.log('\nExample:');
  console.log('  npx ts-node scripts/generate-dev-password.ts MySecurePassword123!');
  process.exit(1);
}

hashPassword(password)
  .then((hashed) => {
    console.log('\n✅ Hashed password generated:');
    console.log(hashed);
    console.log('\n📝 Add this to your .env file:');
    console.log(`DEV_EMAIL=dev@multysis.local`);
    console.log(`DEV_PASSWORD=${hashed}`);
    console.log('\n⚠️  Keep this password secure and never commit it to version control!');
  })
  .catch((error) => {
    console.error('❌ Error generating hashed password:', error);
    process.exit(1);
  });

