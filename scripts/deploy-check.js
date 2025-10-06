#!/usr/bin/env node

/**
 * Pre-deployment check script
 * Validates that the project is ready for deployment
 */

import fs from 'fs';
import path from 'path';

const checks = {
  envExample: () => {
    const files = ['backend/.env.example', 'frontend/.env.example'];
    return files.every(file => fs.existsSync(file));
  },
  
  packageJson: () => {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    return pkg.scripts && pkg.scripts.build;
  },
  
  frontendBuild: () => {
    const pkg = JSON.parse(fs.readFileSync('frontend/package.json', 'utf8'));
    return pkg.scripts && pkg.scripts.build;
  },
  
  backendStart: () => {
    const pkg = JSON.parse(fs.readFileSync('backend/package.json', 'utf8'));
    return pkg.scripts && pkg.scripts.start;
  }
};

console.log('🚀 Running deployment checks...\n');

let allPassed = true;

for (const [name, check] of Object.entries(checks)) {
  try {
    const passed = check();
    console.log(`${passed ? '✅' : '❌'} ${name}: ${passed ? 'PASS' : 'FAIL'}`);
    if (!passed) allPassed = false;
  } catch (error) {
    console.log(`❌ ${name}: ERROR - ${error.message}`);
    allPassed = false;
  }
}

console.log(`\n${allPassed ? '✅ All checks passed!' : '❌ Some checks failed!'}`);

if (!allPassed) {
  process.exit(1);
}