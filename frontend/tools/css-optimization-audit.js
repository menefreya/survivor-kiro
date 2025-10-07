#!/usr/bin/env node

/**
 * CSS Optimization Audit Tool
 * 
 * This tool analyzes CSS usage and identifies optimization opportunities:
 * 1. Unused CSS classes
 * 2. Duplicate CSS rules
 * 3. Bundle size analysis
 * 4. Performance recommendations
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class CSSOptimizationAuditor {
  constructor() {
    this.srcDir = path.join(__dirname, '../src');
    this.stylesDir = path.join(this.srcDir, 'styles');
    this.componentsDir = path.join(this.srcDir, 'components');
    this.usedClasses = new Set();
    this.definedClasses = new Set();
    this.cssFiles = [];
    this.componentFiles = [];
    this.duplicateRules = new Map();
    this.fileSizes = new Map();
  }

  // Scan all CSS files and extract class definitions
  scanCSSFiles() {
    console.log('📁 Scanning CSS files...');
    
    const scanDirectory = (dir) => {
      const files = fs.readdirSync(dir);
      
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          scanDirectory(filePath);
        } else if (file.endsWith('.css')) {
          this.cssFiles.push(filePath);
          this.analyzeCSSFile(filePath);
        }
      });
    };
    
    scanDirectory(this.stylesDir);
    console.log(`   Found ${this.cssFiles.length} CSS files`);
  }

  // Analyze individual CSS file
  analyzeCSSFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const size = Buffer.byteLength(content, 'utf8');
    this.fileSizes.set(filePath, size);
    
    // Extract class selectors using regex
    const classRegex = /\.([a-zA-Z][a-zA-Z0-9_-]*)/g;
    let match;
    
    while ((match = classRegex.exec(content)) !== null) {
      const className = match[1];
      // Skip CSS custom properties and pseudo-classes
      if (!className.startsWith('-') && !className.includes(':')) {
        this.definedClasses.add(className);
      }
    }
    
    // Check for duplicate rules (simplified)
    const rules = content.match(/\.[^{]+\{[^}]+\}/g) || [];
    rules.forEach(rule => {
      const selector = rule.split('{')[0].trim();
      if (this.duplicateRules.has(selector)) {
        this.duplicateRules.get(selector).push(filePath);
      } else {
        this.duplicateRules.set(selector, [filePath]);
      }
    });
  }

  // Scan all component files and extract used classes
  scanComponentFiles() {
    console.log('🔍 Scanning component files...');
    
    const scanDirectory = (dir) => {
      const files = fs.readdirSync(dir);
      
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          scanDirectory(filePath);
        } else if (file.endsWith('.jsx') || file.endsWith('.js')) {
          this.componentFiles.push(filePath);
          this.analyzeComponentFile(filePath);
        }
      });
    };
    
    scanDirectory(this.componentsDir);
    
    // Also scan App.jsx and main.jsx
    const appFiles = ['App.jsx', 'main.jsx'].map(f => path.join(this.srcDir, f));
    appFiles.forEach(filePath => {
      if (fs.existsSync(filePath)) {
        this.componentFiles.push(filePath);
        this.analyzeComponentFile(filePath);
      }
    });
    
    console.log(`   Found ${this.componentFiles.length} component files`);
  }

  // Analyze individual component file
  analyzeComponentFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Extract className values using regex
    const classNameRegex = /className=["']([^"']+)["']/g;
    let match;
    
    while ((match = classNameRegex.exec(content)) !== null) {
      const classNames = match[1].split(/\s+/);
      classNames.forEach(className => {
        if (className && !className.includes('${') && !className.includes('`')) {
          this.usedClasses.add(className);
        }
      });
    }
    
    // Also check template literals with className
    const templateRegex = /className=\{`([^`]+)`\}/g;
    while ((match = templateRegex.exec(content)) !== null) {
      // Extract static class names from template literals
      const staticClasses = match[1].match(/[a-zA-Z][a-zA-Z0-9_-]*/g) || [];
      staticClasses.forEach(className => {
        this.usedClasses.add(className);
      });
    }
  }

  // Find unused CSS classes
  findUnusedClasses() {
    const unusedClasses = [];
    
    this.definedClasses.forEach(className => {
      if (!this.usedClasses.has(className)) {
        // Skip utility classes and common patterns that might be used dynamically
        const skipPatterns = [
          /^u-/, // utility classes
          /^sr-/, // screen reader classes
          /^fallback-/, // fallback classes
          /^supports-/, // feature detection classes
          /^hc-/, // high contrast classes
          /^motion-/, // motion classes
          /tribe-(kele|hina|uli)/, // tribe classes (might be dynamic)
          /status-(pending|correct|incorrect)/, // status classes
          /btn-(primary|secondary|danger|success|warning)/, // button variants
          /^loading/, // loading states
          /^error/, // error states
          /^success/, // success states
        ];
        
        const shouldSkip = skipPatterns.some(pattern => pattern.test(className));
        
        if (!shouldSkip) {
          unusedClasses.push(className);
        }
      }
    });
    
    return unusedClasses;
  }

  // Find duplicate CSS rules
  findDuplicateRules() {
    const duplicates = [];
    
    this.duplicateRules.forEach((files, selector) => {
      if (files.length > 1) {
        duplicates.push({ selector, files });
      }
    });
    
    return duplicates;
  }

  // Calculate total bundle size
  calculateBundleSize() {
    let totalSize = 0;
    const sizeByCategory = {
      tokens: 0,
      components: 0,
      features: 0,
      pages: 0,
      utilities: 0,
      legacy: 0,
      other: 0
    };
    
    this.fileSizes.forEach((size, filePath) => {
      totalSize += size;
      
      const relativePath = path.relative(this.stylesDir, filePath);
      
      if (relativePath.includes('02-tokens')) {
        sizeByCategory.tokens += size;
      } else if (relativePath.includes('05-components')) {
        sizeByCategory.components += size;
      } else if (relativePath.includes('06-features')) {
        sizeByCategory.features += size;
      } else if (relativePath.includes('07-pages')) {
        sizeByCategory.pages += size;
      } else if (relativePath.includes('08-utilities')) {
        sizeByCategory.utilities += size;
      } else if (relativePath.includes('09-legacy')) {
        sizeByCategory.legacy += size;
      } else {
        sizeByCategory.other += size;
      }
    });
    
    return { totalSize, sizeByCategory };
  }

  // Generate optimization recommendations
  generateRecommendations(unusedClasses, duplicates, bundleSize) {
    const recommendations = [];
    
    // Unused CSS recommendations
    if (unusedClasses.length > 0) {
      recommendations.push({
        type: 'unused-css',
        severity: unusedClasses.length > 50 ? 'high' : unusedClasses.length > 20 ? 'medium' : 'low',
        title: `${unusedClasses.length} potentially unused CSS classes found`,
        description: 'These classes are defined but not found in component usage',
        action: 'Review and remove unused classes to reduce bundle size',
        details: unusedClasses.slice(0, 10) // Show first 10
      });
    }
    
    // Duplicate rules recommendations
    if (duplicates.length > 0) {
      recommendations.push({
        type: 'duplicate-rules',
        severity: duplicates.length > 10 ? 'high' : duplicates.length > 5 ? 'medium' : 'low',
        title: `${duplicates.length} duplicate CSS selectors found`,
        description: 'These selectors appear in multiple files',
        action: 'Consolidate duplicate rules to improve maintainability',
        details: duplicates.slice(0, 5)
      });
    }
    
    // Bundle size recommendations
    const { totalSize, sizeByCategory } = bundleSize;
    const totalKB = Math.round(totalSize / 1024);
    
    if (totalKB > 100) {
      recommendations.push({
        type: 'bundle-size',
        severity: totalKB > 200 ? 'high' : 'medium',
        title: `CSS bundle size is ${totalKB}KB`,
        description: 'Large CSS bundles can impact page load performance',
        action: 'Consider code splitting or removing unused styles',
        details: sizeByCategory
      });
    }
    
    // Legacy CSS recommendations
    if (sizeByCategory.legacy > 1000) {
      recommendations.push({
        type: 'legacy-css',
        severity: 'medium',
        title: `${Math.round(sizeByCategory.legacy / 1024)}KB of legacy CSS found`,
        description: 'Legacy CSS should be refactored into proper architecture',
        action: 'Move legacy styles to appropriate component/feature files',
        details: { size: sizeByCategory.legacy }
      });
    }
    
    return recommendations;
  }

  // Format file size for display
  formatSize(bytes) {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
    return `${Math.round(bytes / (1024 * 1024))}MB`;
  }

  // Generate detailed report
  generateReport() {
    console.log('\n🎯 CSS Optimization Audit Report');
    console.log('================================\n');
    
    const unusedClasses = this.findUnusedClasses();
    const duplicates = this.findDuplicateRules();
    const bundleSize = this.calculateBundleSize();
    const recommendations = this.generateRecommendations(unusedClasses, duplicates, bundleSize);
    
    // Summary
    console.log('📊 Summary:');
    console.log(`   CSS Files: ${this.cssFiles.length}`);
    console.log(`   Component Files: ${this.componentFiles.length}`);
    console.log(`   Defined Classes: ${this.definedClasses.size}`);
    console.log(`   Used Classes: ${this.usedClasses.size}`);
    console.log(`   Total Bundle Size: ${this.formatSize(bundleSize.totalSize)}\n`);
    
    // Bundle size breakdown
    console.log('📦 Bundle Size Breakdown:');
    Object.entries(bundleSize.sizeByCategory).forEach(([category, size]) => {
      if (size > 0) {
        const percentage = Math.round((size / bundleSize.totalSize) * 100);
        console.log(`   ${category}: ${this.formatSize(size)} (${percentage}%)`);
      }
    });
    console.log('');
    
    // Recommendations
    if (recommendations.length > 0) {
      console.log('💡 Optimization Recommendations:');
      recommendations.forEach((rec, index) => {
        const severityIcon = rec.severity === 'high' ? '🔴' : rec.severity === 'medium' ? '🟡' : '🟢';
        console.log(`\n${index + 1}. ${severityIcon} ${rec.title}`);
        console.log(`   ${rec.description}`);
        console.log(`   Action: ${rec.action}`);
        
        if (rec.details && Array.isArray(rec.details)) {
          console.log(`   Examples: ${rec.details.slice(0, 3).join(', ')}${rec.details.length > 3 ? '...' : ''}`);
        }
      });
    } else {
      console.log('✅ No major optimization issues found!');
    }
    
    // Performance tips
    console.log('\n🚀 Performance Tips:');
    console.log('   • Use CSS custom properties for consistent theming');
    console.log('   • Minimize use of complex selectors');
    console.log('   • Consider critical CSS for above-the-fold content');
    console.log('   • Use CSS containment for isolated components');
    console.log('   • Optimize animations with transform and opacity');
    
    return {
      summary: {
        cssFiles: this.cssFiles.length,
        componentFiles: this.componentFiles.length,
        definedClasses: this.definedClasses.size,
        usedClasses: this.usedClasses.size,
        bundleSize: bundleSize.totalSize
      },
      unusedClasses,
      duplicates,
      bundleSize,
      recommendations
    };
  }

  // Run the complete audit
  async run() {
    console.log('🔍 Starting CSS Optimization Audit...\n');
    
    try {
      this.scanCSSFiles();
      this.scanComponentFiles();
      
      const report = this.generateReport();
      
      // Save detailed report to file
      const reportPath = path.join(__dirname, '../reports/css-optimization-report.json');
      const reportsDir = path.dirname(reportPath);
      
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }
      
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`\n📄 Detailed report saved to: ${reportPath}`);
      
      return report;
      
    } catch (error) {
      console.error('❌ Error during CSS audit:', error.message);
      throw error;
    }
  }
}

// Run the audit
console.log('Starting CSS optimization audit...');
const auditor = new CSSOptimizationAuditor();
auditor.run().catch(console.error);

export default CSSOptimizationAuditor;