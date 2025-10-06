#!/usr/bin/env node

/**
 * Lighthouse Accessibility Audit Script
 * 
 * This script runs Lighthouse audits on key pages of the application
 * and generates accessibility reports.
 * 
 * Usage: node run-lighthouse-audit.js
 * 
 * Prerequisites:
 * - npm install -g lighthouse
 * - Frontend dev server running on http://localhost:5173
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const OUTPUT_DIR = path.join(__dirname, 'lighthouse-reports');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const pages = [
  { name: 'login', path: '/login' },
  { name: 'signup', path: '/signup' },
  { name: 'home', path: '/', requiresAuth: true },
  { name: 'profile', path: '/profile', requiresAuth: true },
  { name: 'ranking', path: '/ranking', requiresAuth: true },
  { name: 'admin', path: '/admin', requiresAuth: true }
];

console.log('🔍 Starting Lighthouse Accessibility Audits...\n');
console.log(`Frontend URL: ${FRONTEND_URL}`);
console.log(`Output Directory: ${OUTPUT_DIR}\n`);

const results = [];

for (const page of pages) {
  const url = `${FRONTEND_URL}${page.path}`;
  const outputPath = path.join(OUTPUT_DIR, `${page.name}-report.html`);
  const jsonPath = path.join(OUTPUT_DIR, `${page.name}-report.json`);
  
  console.log(`\n📄 Auditing: ${page.name} (${url})`);
  
  if (page.requiresAuth) {
    console.log('   ⚠️  Note: This page requires authentication. Results may be limited.');
  }
  
  try {
    // Run Lighthouse with focus on accessibility
    const command = `lighthouse ${url} \
      --only-categories=accessibility \
      --output=html \
      --output=json \
      --output-path=${outputPath.replace('.html', '')} \
      --chrome-flags="--headless --no-sandbox" \
      --quiet`;
    
    execSync(command, { stdio: 'inherit' });
    
    // Read the JSON report to extract score
    if (fs.existsSync(jsonPath)) {
      const report = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      const accessibilityScore = report.categories.accessibility.score * 100;
      
      results.push({
        page: page.name,
        url: url,
        score: accessibilityScore,
        reportPath: outputPath
      });
      
      console.log(`   ✅ Score: ${accessibilityScore}/100`);
    }
  } catch (error) {
    console.error(`   ❌ Error auditing ${page.name}:`, error.message);
    results.push({
      page: page.name,
      url: url,
      score: 'Error',
      error: error.message
    });
  }
}

// Generate summary report
console.log('\n\n📊 Audit Summary\n');
console.log('═'.repeat(60));

let totalScore = 0;
let successfulAudits = 0;

results.forEach(result => {
  const scoreDisplay = typeof result.score === 'number' 
    ? `${result.score}/100` 
    : result.score;
  
  const status = typeof result.score === 'number' && result.score >= 90
    ? '✅'
    : typeof result.score === 'number' && result.score >= 75
    ? '⚠️ '
    : '❌';
  
  console.log(`${status} ${result.page.padEnd(15)} ${scoreDisplay}`);
  
  if (typeof result.score === 'number') {
    totalScore += result.score;
    successfulAudits++;
  }
});

console.log('═'.repeat(60));

if (successfulAudits > 0) {
  const averageScore = (totalScore / successfulAudits).toFixed(1);
  console.log(`\nAverage Accessibility Score: ${averageScore}/100`);
  
  if (averageScore >= 90) {
    console.log('🎉 Excellent! All pages meet high accessibility standards.');
  } else if (averageScore >= 75) {
    console.log('⚠️  Good, but some improvements needed.');
  } else {
    console.log('❌ Accessibility improvements required.');
  }
}

console.log(`\n📁 Reports saved to: ${OUTPUT_DIR}`);
console.log('\nTo view detailed reports, open the HTML files in your browser.\n');

// Save summary as JSON
const summaryPath = path.join(OUTPUT_DIR, 'summary.json');
fs.writeFileSync(summaryPath, JSON.stringify(results, null, 2));
console.log(`📄 Summary saved to: ${summaryPath}\n`);
