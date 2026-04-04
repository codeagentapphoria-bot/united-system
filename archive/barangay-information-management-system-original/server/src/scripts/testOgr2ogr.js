import { exec } from 'child_process';
import { promisify } from 'util';
import logger from '../utils/logger.js';

const execAsync = promisify(exec);

async function testOgr2ogr() {
  try {
    logger.info('Testing ogr2ogr availability...');
    
    // Test if ogr2ogr is installed
    const { stdout, stderr } = await execAsync('ogr2ogr --version');
    
    if (stdout) {
      logger.info('ogr2ogr version:', stdout.trim());
      logger.info('✅ ogr2ogr is available and working');
    }
    
    if (stderr) {
      logger.warn('ogr2ogr stderr:', stderr);
    }
    
    // Test if we can connect to PostgreSQL
    logger.info('Testing PostgreSQL connection...');
    const testCommand = `ogr2ogr -f PostgreSQL "PG:host=localhost port=5432 dbname=bims password=1234 user=postgres" -nln test_connection -sql "SELECT 1" /dev/null`;
    
    try {
      await execAsync(testCommand);
      logger.info('✅ PostgreSQL connection test successful');
    } catch (pgError) {
      logger.warn('⚠️ PostgreSQL connection test failed (this might be expected):', pgError.message);
    }
    
    logger.info('ogr2ogr test completed');
    
  } catch (error) {
    logger.error('❌ ogr2ogr test failed:', error.message);
    logger.error('Please ensure GDAL/ogr2ogr is installed on your system');
    logger.error('Installation instructions:');
    logger.error('- Windows: Download from https://gdal.org/download.html');
    logger.error('- macOS: brew install gdal');
    logger.error('- Ubuntu/Debian: sudo apt-get install gdal-bin');
    throw error;
  }
}

// Run the test if this script is executed directly
const decodedUrl = decodeURIComponent(import.meta.url);
const normalizedArgv = process.argv[1].replace(/\\/g, '/');
const normalizedUrl = decodedUrl.replace(/\\/g, '/');

if (decodedUrl === `file://${process.argv[1]}` || normalizedUrl.includes(normalizedArgv)) {
  console.log("Testing ogr2ogr...");
  testOgr2ogr()
    .then(() => {
      console.log("ogr2ogr test completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("ogr2ogr test failed:", error);
      process.exit(1);
    });
}

export default testOgr2ogr;
