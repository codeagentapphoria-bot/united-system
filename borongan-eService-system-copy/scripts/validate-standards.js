#!/usr/bin/env node

/**
 * Multysis v2 Coding Standards Validator
 * 
 * This script validates code against the established coding standards
 * Run with: node scripts/validate-standards.js
 */

const fs = require('fs');
const path = require('path');

// Standards to check
const STANDARDS = {
  // Component definition pattern
  componentPattern: /export const \w+: React\.FC(?:<\w+>)? =/,
  
  // Interface naming with Props suffix
  interfacePropsPattern: /interface \w+Props\s*{/,
  
  // React Hook Form usage
  reactHookFormPattern: /useForm|register|handleSubmit|formState/,
  
  // Zod validation
  zodPattern: /z\.object|z\.string|z\.number|zodResolver/,
  
  // React Select usage
  reactSelectPattern: /import.*react-select|from 'react-select'/,
  
  // ShadCN UI imports
  shadcnPattern: /@\/components\/ui\//,
  
  // cn utility usage
  cnUtilityPattern: /cn\(/,
  
  // Error handling pattern
  errorHandlingPattern: /errors\.\w+\?\.message/,
  
  // Toast usage
  toastPattern: /useToast|toast\(/,
  
  // Phone number validation
  phonePattern: /09\d{9}|\+639\d{9}|\\\+639\d{9}/,
  
  // Password validation
  passwordPattern: /min\(8|uppercase|lowercase|number/,
};

// File patterns to check
const FILE_PATTERNS = {
  components: /\.tsx$/,
  hooks: /use\w+\.ts$/,
  types: /\.ts$/,
  schemas: /\.schema\.ts$/,
  pages: /Page\.tsx$|Dashboard\.tsx$|Login\.tsx$|Signup\.tsx$/,
};

// Validation results
let results = {
  passed: 0,
  failed: 0,
  warnings: 0,
  details: []
};

/**
 * Check if a file matches the standards
 */
function validateFile(filePath, content) {
  const fileName = path.basename(filePath);
  const fileType = getFileType(fileName);
  const issues = [];
  const isUiFile = filePath.includes('/ui/');
  const isWrapper = filePath.includes('/components/layout/') || filePath.includes('/components/common/');
  const isContext = filePath.includes('/context/');
  const isConfig = filePath.includes('/config/');
  const isRoutes = filePath.includes('/routes/');
  const isMainEntry = fileName === 'main.tsx';
  const skipComponentChecks = isUiFile || isWrapper || isContext || isConfig || isRoutes || isMainEntry;

  // Check component pattern for .tsx files (skip for ShadCN UI components that use forwardRef)
  if (fileType === 'component' && !skipComponentChecks && !STANDARDS.componentPattern.test(content)) {
    issues.push('Missing React.FC<Props> pattern');
  }

  // Check interface naming (skip for ShadCN UI components)
  if (fileType === 'component' && !skipComponentChecks && content.includes('interface') && !STANDARDS.interfacePropsPattern.test(content)) {
    issues.push('Interface should end with "Props" suffix');
  }

  // Check React Hook Form usage in forms (avoid matching words like "transform").
  // Consider real RHF usage if useForm is present, react-hook-form is imported, or proxies like form.handleSubmit are used.
  const hasFormMarkup = /<form\b/i.test(content);
  const hasFormWord = /\bform\b/i.test(content);
  const usesRHF = /useForm\s*\(|from\s+'react-hook-form'|from\s+"react-hook-form"/.test(content);
  const usesRHFProxy = /form\.(handleSubmit|register)|formState\./.test(content);
  const usesCustomRHFHook = /use[A-Z][a-zA-Z]+\(/.test(content) || /use(Beneficiary|Citizen|Subscriber)/.test(content);
  if ((hasFormMarkup || hasFormWord) && !(usesRHF || usesRHFProxy || usesCustomRHFHook)) {
    issues.push('Should use React Hook Form for form handling');
  }
  /** Zod check - only fail if file BOTH defines a schema AND uses a local form, not just via props or custom hooks. Honor // validator-ignore Zod comment **/
  const validatorIgnoreZod = /validator-ignore Zod/i.test(content);
  const definesOwnZodSchema = /z\.object\s*\(/.test(content);
  if (!validatorIgnoreZod && !isUiFile && definesOwnZodSchema) {
    // Only require Zod imports/symbols if it defines a schema and has RHF in this file.
    if ((usesRHF || usesRHFProxy || hasFormMarkup) && !STANDARDS.zodPattern.test(content)) {
      issues.push('Should use Zod for validation');
    }
  }

  // Check native HTML select usage – enforce React Select instead (components/pages only)
  // Case-sensitive to avoid matching React components like <Select>
  if ((fileType === 'component' || fileType === 'page') && /<select\b/.test(content)) {
    issues.push('Should use React Select for dropdowns');
  }

  // Check ShadCN UI usage (skip for UI components themselves and wrapper/config/routes/main files)
  if (fileType === 'component' && !skipComponentChecks && !STANDARDS.shadcnPattern.test(content)) {
    issues.push('Should use ShadCN UI components');
  }

  // Check cn utility usage
  if (content.includes('className') && !STANDARDS.cnUtilityPattern.test(content)) {
    issues.push('Should use cn() utility for conditional classes');
  }

  // Check error handling (only when field-level errors are referenced)
  if (/\berrors\./.test(content) && !STANDARDS.errorHandlingPattern.test(content)) {
    issues.push('Should use consistent error handling pattern');
  }

  // Check phone number validation (limit to pages and validation schemas)
  if ((fileType === 'page' || filePath.includes('/validations/')) && content.includes('phone')) {
    // 1. Look for regex definition
    const regexVar = /const\s+phoneRegex\s*=\s*\/\^\\\+639\|09\\d\{9\}\/\$/;
    // 2. Look for inline regex usage in Zod schema
    const inlineRegex = /\.regex\(\s*\/\^\\\+639\|09\\d\{9\}\/\$/;
    // 3. Look for use of previously defined variable in Zod schema
    const usesPhoneRegexVar = /\.regex\(\s*phoneRegex/;
    // Pass if any pattern is found:
    if (!(regexVar.test(content) || inlineRegex.test(content) || usesPhoneRegexVar.test(content))) {
      issues.push('Should use Philippine phone number format (09XXXXXXXXX)');
    }
  }

  // Check password validation (limit to pages and validation schemas)
  if ((fileType === 'page' || filePath.includes('/validations/')) && content.includes('password') && !STANDARDS.passwordPattern.test(content)) {
    issues.push('Should use established password requirements');
  }

  return issues;
}

/**
 * Determine file type based on filename
 */
function getFileType(fileName) {
  if (FILE_PATTERNS.components.test(fileName)) return 'component';
  if (FILE_PATTERNS.hooks.test(fileName)) return 'hook';
  if (FILE_PATTERNS.types.test(fileName)) return 'type';
  if (FILE_PATTERNS.schemas.test(fileName)) return 'schema';
  if (FILE_PATTERNS.pages.test(fileName)) return 'page';
  return 'other';
}

/**
 * Recursively scan directory for files
 */
function scanDirectory(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      scanDirectory(filePath, fileList);
    } else if (stat.isFile() && (file.endsWith('.ts') || file.endsWith('.tsx'))) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

/**
 * Main validation function
 */
function validateStandards() {
  console.log('🔍 Validating Multysis v2 Coding Standards...\n');
  
  const srcDir = path.join(__dirname, '..', 'multysis-frontend', 'src');
  
  if (!fs.existsSync(srcDir)) {
    console.error('❌ Source directory not found:', srcDir);
    process.exit(1);
  }
  
  const files = scanDirectory(srcDir);
  
  files.forEach(filePath => {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const issues = validateFile(filePath, content);
      
      if (issues.length === 0) {
        results.passed++;
        console.log(`✅ ${path.relative(srcDir, filePath)}`);
      } else {
        results.failed++;
        console.log(`❌ ${path.relative(srcDir, filePath)}`);
        issues.forEach(issue => {
          console.log(`   - ${issue}`);
          results.details.push({
            file: path.relative(srcDir, filePath),
            issue: issue
          });
        });
      }
    } catch (error) {
      console.error(`❌ Error reading ${filePath}:`, error.message);
      results.failed++;
    }
  });
  
  // Print summary
  console.log('\n📊 Validation Summary:');
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`⚠️  Warnings: ${results.warnings}`);
  
  if (results.failed > 0) {
    console.log('\n🔧 Issues to fix:');
    results.details.forEach(detail => {
      console.log(`   ${detail.file}: ${detail.issue}`);
    });
    process.exit(1);
  } else {
    console.log('\n🎉 All files pass the coding standards!');
  }
}

// Run validation
validateStandards();
