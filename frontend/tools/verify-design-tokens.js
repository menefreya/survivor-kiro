#!/usr/bin/env node

/**
 * Design Token Verification Script
 * 
 * This script checks CSS files to ensure:
 * 1. Design tokens (CSS variables) are used instead of hardcoded values
 * 2. No hardcoded colors, spacing, or font sizes
 * 3. Consistency across stylesheets
 * 
 * Usage: node verify-design-tokens.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STYLES_DIR = path.join(__dirname, 'src', 'styles');

// Patterns to detect hardcoded values
const PATTERNS = {
  colors: {
    regex: /#[0-9A-Fa-f]{3,6}|rgb\(|rgba\(/g,
    description: 'Hardcoded color values',
    exceptions: ['#fff', '#ffffff', '#000', '#000000', 'rgba(0, 0, 0,', 'rgba(255, 255, 255,']
  },
  spacing: {
    regex: /:\s*\d+(\.\d+)?(px|rem|em)(?!\s*\/)/g,
    description: 'Hardcoded spacing values',
    exceptions: ['0px', '0rem', '0em', '1px', '2px', '100%']
  },
  fontSizes: {
    regex: /font-size:\s*\d+(\.\d+)?(px|rem|em)/g,
    description: 'Hardcoded font sizes',
    exceptions: []
  }
};

// Files to check
const CSS_FILES = [
  'Dashboard.css',
  'Profile.css',
  'Ranking.css',
  'Admin.css',
  'Auth.css',
  'buttons.css',
  'forms.css',
  'cards.css',
  'typography.css',
  'utilities.css'
];

console.log('🔍 Verifying Design Token Usage\n');
console.log('═'.repeat(60));

let totalIssues = 0;
const results = [];

CSS_FILES.forEach(filename => {
  const filepath = path.join(STYLES_DIR, filename);
  
  if (!fs.existsSync(filepath)) {
    console.log(`⚠️  ${filename} - File not found`);
    return;
  }
  
  const content = fs.readFileSync(filepath, 'utf8');
  const lines = content.split('\n');
  const issues = [];
  
  // Check for hardcoded values
  Object.entries(PATTERNS).forEach(([type, config]) => {
    const matches = content.match(config.regex) || [];
    
    matches.forEach(match => {
      // Check if it's an exception
      const isException = config.exceptions.some(exc => 
        match.includes(exc)
      );
      
      if (!isException) {
        // Find line number
        const lineNum = lines.findIndex(line => line.includes(match)) + 1;
        issues.push({
          type,
          value: match,
          line: lineNum,
          description: config.description
        });
      }
    });
  });
  
  // Report results for this file
  if (issues.length === 0) {
    console.log(`✅ ${filename} - No issues found`);
  } else {
    console.log(`❌ ${filename} - ${issues.length} issue(s) found`);
    issues.forEach(issue => {
      console.log(`   Line ${issue.line}: ${issue.description} - "${issue.value}"`);
    });
    totalIssues += issues.length;
  }
  
  results.push({
    file: filename,
    issues: issues.length,
    details: issues
  });
});

console.log('═'.repeat(60));
console.log(`\nTotal Issues Found: ${totalIssues}\n`);

if (totalIssues === 0) {
  console.log('🎉 Excellent! All CSS files use design tokens correctly.\n');
} else {
  console.log('⚠️  Some CSS files contain hardcoded values.');
  console.log('   Consider replacing them with CSS variables from tokens.css\n');
}

// Check if tokens.css exists and has required variables
const tokensPath = path.join(STYLES_DIR, 'tokens.css');
if (fs.existsSync(tokensPath)) {
  const tokensContent = fs.readFileSync(tokensPath, 'utf8');
  
  const requiredTokens = [
    '--color-primary',
    '--color-secondary',
    '--color-success',
    '--color-danger',
    '--spacing-',
    '--font-size-',
    '--radius-',
    '--shadow-'
  ];
  
  console.log('📋 Checking tokens.css for required variables:\n');
  
  requiredTokens.forEach(token => {
    const found = tokensContent.includes(token);
    const status = found ? '✅' : '❌';
    console.log(`${status} ${token}*`);
  });
  
  console.log('');
} else {
  console.log('❌ tokens.css not found!\n');
}

// Save results to JSON
const outputPath = path.join(__dirname, 'design-token-verification.json');
fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
console.log(`📄 Detailed results saved to: ${outputPath}\n`);

// Exit with error code if issues found
process.exit(totalIssues > 0 ? 1 : 0);
