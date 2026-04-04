#!/usr/bin/env node

/**
 * Cleanup Script for Orphaned Files
 * 
 * This script finds and removes orphaned image/files that are no longer referenced
 * in the database but still exist in the uploads folder.
 * 
 * Usage: node cleanupOrphanedFiles.js [--dry-run]
 * 
 * Options:
 *   --dry-run: Show what would be deleted without actually deleting
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get the uploads directory path
const uploadsDir = path.join(__dirname, '../../uploads');

async function getAllFilePaths() {
  const files = [];
  
  try {
    const entries = await fs.readdir(uploadsDir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isFile()) {
        files.push(path.join(uploadsDir, entry.name));
      } else if (entry.isDirectory()) {
        // Recursively scan subdirectories
        const subFiles = await scanDirectory(path.join(uploadsDir, entry.name));
        files.push(...subFiles);
      }
    }
  } catch (error) {
    console.error('Error reading uploads directory:', error);
  }
  
  return files;
}

async function scanDirectory(dirPath) {
  const files = [];
  
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isFile()) {
        files.push(fullPath);
      } else if (entry.isDirectory()) {
        const subFiles = await scanDirectory(fullPath);
        files.push(...subFiles);
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dirPath}:`, error);
  }
  
  return files;
}

async function getReferencedFilePaths() {
  const referencedPaths = new Set();
  
  try {
    // Get all file paths from different tables
    const queries = [
      'SELECT picture_path FROM residents WHERE picture_path IS NOT NULL',
      'SELECT picture_path FROM pets WHERE picture_path IS NOT NULL',
      'SELECT household_image_path FROM households WHERE household_image_path IS NOT NULL',
      'SELECT file_path FROM inventories WHERE file_path IS NOT NULL',
      'SELECT file_path FROM archives WHERE file_path IS NOT NULL',
      'SELECT municipality_logo_path FROM municipalities WHERE municipality_logo_path IS NOT NULL',
      'SELECT id_background_front_path FROM municipalities WHERE id_background_front_path IS NOT NULL',
      'SELECT id_background_back_path FROM municipalities WHERE id_background_back_path IS NOT NULL',
      'SELECT barangay_logo_path FROM barangays WHERE barangay_logo_path IS NOT NULL',
      'SELECT certificate_background_path FROM barangays WHERE certificate_background_path IS NOT NULL',
      'SELECT organizational_chart_path FROM barangays WHERE organizational_chart_path IS NOT NULL',
      'SELECT picture_path FROM users WHERE picture_path IS NOT NULL'
    ];
    
    for (const query of queries) {
      try {
        const result = await pool.query(query);
        
        for (const row of result.rows) {
          // Handle different column structures
          let filePath = null;
          
          if (row.picture_path) {
            filePath = row.picture_path;
          } else if (row.file_path) {
            filePath = row.file_path;
          } else if (row.household_image_path) {
            // Handle JSONB array of images (stored as JSON string)
            try {
              let imageArray = row.household_image_path;
              if (typeof imageArray === 'string') {
                imageArray = JSON.parse(imageArray);
              }
              if (Array.isArray(imageArray)) {
                for (const imagePath of imageArray) {
                  if (imagePath && imagePath.trim() !== '') {
                    referencedPaths.add(path.resolve(imagePath));
                  }
                }
              }
            } catch (error) {
              console.warn(`Warning: Could not parse household_image_path:`, error.message);
            }
          } else if (row.municipality_logo_path) {
            filePath = row.municipality_logo_path;
          } else if (row.id_background_front_path) {
            filePath = row.id_background_front_path;
          } else if (row.id_background_back_path) {
            filePath = row.id_background_back_path;
          } else if (row.barangay_logo_path) {
            filePath = row.barangay_logo_path;
          } else if (row.certificate_background_path) {
            filePath = row.certificate_background_path;
          } else if (row.organizational_chart_path) {
            filePath = row.organizational_chart_path;
          }
          
          if (filePath) {
            referencedPaths.add(path.resolve(filePath));
          }
        }
      } catch (error) {
        console.warn(`Warning: Could not execute query "${query}":`, error.message);
      }
    }
  } catch (error) {
    console.error('Error getting referenced file paths:', error);
  }
  
  return referencedPaths;
}

async function findOrphanedFiles(dryRun = false) {
  console.log('🔍 Scanning for orphaned files...\n');
  
  try {
    // Get all files in uploads directory
    const allFiles = await getAllFilePaths();
    console.log(`📁 Found ${allFiles.length} files in uploads directory`);
    
    // Get all referenced file paths from database
    const referencedPaths = await getReferencedFilePaths();
    console.log(`🗄️  Found ${referencedPaths.size} referenced files in database\n`);
    
    // Find orphaned files
    const orphanedFiles = [];
    
    for (const filePath of allFiles) {
      const resolvedPath = path.resolve(filePath);
      
      if (!referencedPaths.has(resolvedPath)) {
        orphanedFiles.push(resolvedPath);
      }
    }
    
    console.log(`🗑️  Found ${orphanedFiles.length} orphaned files:`);
    
    if (orphanedFiles.length === 0) {
      console.log('✅ No orphaned files found!');
      return;
    }
    
    let totalSize = 0;
    
    for (const filePath of orphanedFiles) {
      try {
        const stats = await fs.stat(filePath);
        const sizeKB = Math.round(stats.size / 1024);
        totalSize += stats.size;
        
        const relativePath = path.relative(uploadsDir, filePath);
        console.log(`  - ${relativePath} (${sizeKB} KB)`);
        
        if (!dryRun) {
          await fs.unlink(filePath);
          console.log(`    ✅ Deleted`);
        } else {
          console.log(`    🔍 Would delete (dry run)`);
        }
      } catch (error) {
        console.log(`    ❌ Error: ${error.message}`);
      }
    }
    
    const totalSizeMB = Math.round(totalSize / (1024 * 1024) * 100) / 100;
    
    if (dryRun) {
      console.log(`\n🔍 DRY RUN: Would free up ${totalSizeMB} MB of disk space`);
    } else {
      console.log(`\n✅ Cleanup complete! Freed up ${totalSizeMB} MB of disk space`);
    }
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  
  console.log('🧹 BIMS Orphaned Files Cleanup Script');
  console.log('=====================================\n');
  
  if (dryRun) {
    console.log('🔍 Running in DRY RUN mode - no files will be deleted\n');
  }
  
  try {
    await findOrphanedFiles(dryRun);
  } finally {
    await pool.end();
  }
}

// Run the script
main().catch(console.error);




