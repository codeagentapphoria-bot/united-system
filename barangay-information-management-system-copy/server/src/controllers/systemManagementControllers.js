import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import archiver from 'archiver';
import logger from '../utils/logger.js';
import { loadEnvConfig } from '../utils/envLoader.js';

loadEnvConfig();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const execAsync = promisify(exec);

/**
 * Export database as SQL dump
 */
export const exportDatabase = async (req, res) => {
  try {
    const dbUser = process.env.PG_USER;
    const dbHost = process.env.PG_HOST;
    const dbName = process.env.PG_DATABASE;
    const dbPort = process.env.PG_PORT || 5432;
    const dbPassword = process.env.PG_PASSWORD;

    // Create a temporary directory for the dump file
    const tempDir = path.join(__dirname, '../../temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const dumpFileName = `database_export_${timestamp}.sql`;
    const dumpFilePath = path.join(tempDir, dumpFileName);

    // Build pg_dump command
    // Set PGPASSWORD environment variable to avoid password prompt
    const env = { ...process.env, PGPASSWORD: dbPassword };
    
    const command = `PGPASSWORD="${dbPassword}" pg_dump -h ${dbHost} -p ${dbPort} -U ${dbUser} -d ${dbName} -F p > "${dumpFilePath}"`;

    logger.info(`Starting database export to ${dumpFilePath}`);

    // Execute pg_dump
    await execAsync(command, { 
      env,
      maxBuffer: 50 * 1024 * 1024 // 50MB buffer for large databases
    });

    // Check if file was created
    if (!fs.existsSync(dumpFilePath)) {
      throw new Error('Database dump file was not created');
    }

    // Get file stats
    const stats = fs.statSync(dumpFilePath);
    
    logger.info(`Database export completed: ${dumpFilePath} (${stats.size} bytes)`);

    // Set headers for file download
    res.setHeader('Content-Type', 'application/sql');
    res.setHeader('Content-Disposition', `attachment; filename="${dumpFileName}"`);
    res.setHeader('Content-Length', stats.size);

    // Stream the file to response
    const fileStream = fs.createReadStream(dumpFilePath);
    
    fileStream.on('end', () => {
      // Clean up temp file after streaming
      setTimeout(() => {
        try {
          if (fs.existsSync(dumpFilePath)) {
            fs.unlinkSync(dumpFilePath);
            logger.info(`Cleaned up temp file: ${dumpFilePath}`);
          }
        } catch (error) {
          logger.error('Error cleaning up temp file:', error);
        }
      }, 1000);
    });

    fileStream.pipe(res);
  } catch (error) {
    logger.error('Error exporting database:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export database',
      error: error.message
    });
  }
};

/**
 * Export uploads folder as ZIP
 */
export const exportUploads = async (req, res) => {
  try {
    const uploadsDir = path.join(__dirname, '../../uploads');
    
    // Check if uploads directory exists
    if (!fs.existsSync(uploadsDir)) {
      return res.status(404).json({
        success: false,
        message: 'Uploads directory does not exist'
      });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const zipFileName = `uploads_export_${timestamp}.zip`;

    logger.info(`Starting uploads export from ${uploadsDir}`);

    // Set headers for file download
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipFileName}"`);

    // Create archive
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    // Handle archive errors
    archive.on('error', (err) => {
      logger.error('Archive error:', err);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Failed to create zip archive',
          error: err.message
        });
      }
    });

    // Pipe archive data to response
    archive.pipe(res);

    // Add uploads directory to archive
    archive.directory(uploadsDir, 'uploads', false);

    // Finalize the archive
    await archive.finalize();

    logger.info(`Uploads export completed: ${zipFileName}`);
  } catch (error) {
    logger.error('Error exporting uploads:', error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'Failed to export uploads',
        error: error.message
      });
    }
  }
};

