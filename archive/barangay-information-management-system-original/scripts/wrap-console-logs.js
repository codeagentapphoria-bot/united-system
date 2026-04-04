#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

// Files to exclude from processing
const EXCLUDE_PATTERNS = [
  'node_modules/**',
  'dist/**',
  'build/**',
  'scripts/**',
  'docs/**',
  'geodata/**',
  'mobile_app/**',
  'server/**'
];

// Function to wrap console statements
function wrapConsoleStatement(line, indent = '') {
  // Skip if already wrapped
  if (line.includes('process.env.NODE_ENV === \'development\'')) {
    return line;
  }

  // Skip if this is part of a multi-line if statement we created
  if (line.includes('if (process.env.NODE_ENV === \'development\') {') ||
      line.includes('}')) {
    return line;
  }

  // Match console.log, console.warn, console.error, console.debug, console.info, console.trace
  const consoleRegex = /^(\s*)(console\.(log|warn|error|debug|info|trace)\([^)]*\);?)$/;
  const match = line.match(consoleRegex);

  if (match) {
    const [, whitespace, consoleStatement] = match;
    return `${whitespace}if (process.env.NODE_ENV === 'development') {\n${whitespace}  ${consoleStatement}\n${whitespace}}`;
  }

  return line;
}

// Function to clean up double-wrapped statements
function cleanDoubleWrapped(content) {
  // Replace double-wrapped if statements
  const doubleWrappedRegex = /if \(process\.env\.NODE_ENV === 'development'\) \{\s*if \(process\.env\.NODE_ENV === 'development'\) \{\s*(console\.(?:log|warn|error|debug|info|trace)\([^)]*\);?)\s*\}\s*\}/g;

  return content.replace(doubleWrappedRegex, (match, consoleStatement) => {
    // Extract the indentation from the original match
    const lines = match.split('\n');
    const indent = lines[0].match(/^(\s*)/)[1];
    return `${indent}if (process.env.NODE_ENV === 'development') {\n${indent}  ${consoleStatement}\n${indent}}`;
  });
}

// Function to process a file
function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    let modified = false;

    const processedLines = lines.map(line => {
      const wrapped = wrapConsoleStatement(line);
      if (wrapped !== line) {
        modified = true;
      }
      return wrapped;
    });

    if (modified) {
      let newContent = processedLines.join('\n');
      // Clean up any double-wrapped statements
      newContent = cleanDoubleWrapped(newContent);
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`✅ Updated: ${filePath}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

// Main function
async function main() {
  console.log('🔍 Finding files with console statements...');

  const files = await glob('client/src/**/*.{js,jsx,ts,tsx}', {
    ignore: EXCLUDE_PATTERNS
  });

  console.log(`📁 Found ${files.length} files to check`);

  let processedCount = 0;
  let modifiedCount = 0;

  for (const file of files) {
    processedCount++;

    // Check if file contains console statements
    try {
      const content = fs.readFileSync(file, 'utf8');
      if (content.includes('console.')) {
        const modified = processFile(file);
        if (modified) {
          modifiedCount++;
        }
      }
    } catch (error) {
      console.error(`❌ Error reading ${file}:`, error.message);
    }

    // Progress indicator
    if (processedCount % 50 === 0) {
      console.log(`⏳ Processed ${processedCount}/${files.length} files...`);
    }
  }

  console.log(`\n🎉 Complete!`);
  console.log(`📊 Processed: ${processedCount} files`);
  console.log(`✏️  Modified: ${modifiedCount} files`);
}

// Run the script
main().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});