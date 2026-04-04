# Console Log Removal Integration Guide

This guide explains how to integrate the automated console.log removal tools into your build process for Vite and Webpack.

## Prerequisites

1. Install dependencies:
   ```bash
   npm install
   ```

2. The following tools are now available:
   - ESLint configuration to flag console.log statements
   - Node.js script to automatically remove console.log statements

## ESLint Configuration

The ESLint configuration in `client/eslint.config.js` has been updated to:
- Flag `console.log` statements as errors
- Allow `console.error` statements

Run ESLint to check for console.log statements:
```bash
cd client
npx eslint src/
```

## Automated Removal Script

The script `scripts/remove-console-logs.js` uses jscodeshift to safely remove console.log statements from JavaScript, JSX, TypeScript, and TSX files.

Run the script manually:
```bash
npm run remove-console-logs
```

This will process all files in `client/src/` and `client/` matching the patterns `**/*.{js,jsx,ts,tsx}`, excluding `node_modules`, `dist`, and `build` directories.

## Integration with Build Tools

### Vite Integration

To automatically remove console.log statements during the build process:

1. Modify the build script in `package.json`:
   ```json
   {
     "scripts": {
       "build": "npm run remove-console-logs && npm run build --prefix client"
     }
   }
   ```

2. Or create a separate production build script:
   ```json
   {
     "scripts": {
       "build:prod": "npm run remove-console-logs && npm run build --prefix client"
     }
   }
   ```

3. For Vite-specific integration, you can use a custom plugin. Create `client/vite-plugin-remove-console-logs.js`:
   ```javascript
   import { execSync } from 'child_process';

   export default function removeConsoleLogs() {
     return {
       name: 'remove-console-logs',
       buildStart() {
         console.log('Removing console.log statements...');
         execSync('npm run remove-console-logs', { stdio: 'inherit' });
       }
     };
   }
   ```

   Then in `client/vite.config.js`:
   ```javascript
   import removeConsoleLogs from './vite-plugin-remove-console-logs.js';

   export default {
     plugins: [
       // ... other plugins
       removeConsoleLogs()
     ]
   };
   ```

### Webpack Integration

For Webpack projects:

1. Add to your build script in `package.json`:
   ```json
   {
     "scripts": {
       "build": "npm run remove-console-logs && webpack --mode production"
     }
   }
   ```

2. Or use a Webpack plugin. Install `webpack-shell-plugin`:
   ```bash
   npm install --save-dev webpack-shell-plugin
   ```

   Then in your `webpack.config.js`:
   ```javascript
   const WebpackShellPlugin = require('webpack-shell-plugin');

   module.exports = {
     // ... your config
     plugins: [
       new WebpackShellPlugin({
         onBuildStart: ['npm run remove-console-logs'],
         onBuildEnd: []
       })
     ]
   };
   ```

## Usage in CI/CD

Integrate into your CI/CD pipeline:

```yaml
# Example for GitHub Actions
- name: Remove console logs
  run: npm run remove-console-logs

- name: Build
  run: npm run build
```

## Notes

- The script preserves `console.error` statements
- Multi-line console.log statements are handled correctly
- The script processes files in place, so ensure you have version control
- For development, keep console.log statements and use ESLint to flag them
- For production builds, run the removal script automatically

## Troubleshooting

- If the script doesn't find files, check the glob patterns in `scripts/remove-console-logs.js`
- Ensure jscodeshift and glob are installed: `npm install`
- Test the script on a single file first by modifying the patterns array