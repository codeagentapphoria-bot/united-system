#!/usr/bin/env node

const jscodeshift = require('jscodeshift');
const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Transform function to remove console.log statements
function transform(fileInfo, api) {
  const j = api.jscodeshift;

  return j(fileInfo.source)
    .find(j.ExpressionStatement, {
      expression: {
        type: 'CallExpression',
        callee: {
          type: 'MemberExpression',
          object: { name: 'console' },
          property: { name: 'log' }
        }
      }
    })
    .remove()
    .toSource();
}

// Function to process files
function processFiles(pattern, transform) {
  const files = glob.sync(pattern, { ignore: ['node_modules/**', 'dist/**', 'build/**'] });

  files.forEach(file => {
    try {
      console.log(`Processing ${file}...`);
      const source = fs.readFileSync(file, 'utf8');
      const transformed = transform({ source }, { jscodeshift });
      fs.writeFileSync(file, transformed);
    } catch (error) {
      console.error(`Error processing ${file}: ${error.message}`);
    }
  });
}

// Main execution
if (require.main === module) {
  const patterns = [
    'client/src/**/*.{js,jsx,ts,tsx}',
    'client/**/*.{js,jsx,ts,tsx}',
    // Add more patterns if needed
  ];

  patterns.forEach(pattern => {
    processFiles(pattern, transform);
  });

  console.log('Console.log statements removed successfully!');
}

module.exports = transform;