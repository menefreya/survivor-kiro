#!/usr/bin/env node

/**
 * Final Validation Script
 * 
 * This script performs final validation of the dark theme implementation:
 * 1. Validates CSS architecture integrity
 * 2. Checks performance optimizations
 * 3. Verifies browser compatibility
 * 4. Tests accessibility compliance
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class FinalValidator {
  constructor() {
    this.srcDir = path.join(__dirname, '../src');
    this.stylesDir = path.join(this.srcDir, 'styles');
    this.validationResults = {
      architecture: [],
      performance: [],
      compatibility: [],
      accessibility: [],
      overall: 'pending'
    };
  }

  // Validate CSS architecture integrity
  validateCSSArchitecture() {
    console.log('🏗️  Validating CSS Architecture...');
    
    const results = [];
    
    // Check if all required files exist
    const requiredFiles = [
      '01-reset.css',
      '02-tokens.css',
      '03-base.css',
      '04-layout.css',
      '08-utilities.css'
    ];
    
    requiredFiles.forEach(file => {
      const filePath = path.join(this.stylesDir, file);
      if (fs.existsSync(filePath)) {
        results.push({ test: `${file} exists`, status: 'pass' });
      } else {
        results.push({ test: `${file} exists`, status: 'fail', message: 'Required file missing' });
      }
    });
    
    // Check App.css import order
    const appCssPath = path.join(this.srcDir, 'App.css');
    if (fs.existsSync(appCssPath)) {
      const content = fs.readFileSync(appCssPath, 'utf8');
      const expectedOrder = [
        '01-reset.css',
        '02-tokens.css',
        '03-base.css',
        '04-layout.css'
      ];
      
      let orderCorrect = true;
      let lastIndex = -1;
      
      expectedOrder.forEach(file => {
        const index = content.indexOf(file);
        if (index === -1 || index <= lastIndex) {
          orderCorrect = false;
        }
        lastIndex = index;
      });
      
      results.push({
        test: 'CSS import order correct',
        status: orderCorrect ? 'pass' : 'fail',
        message: orderCorrect ? 'Import order follows architecture' : 'Import order is incorrect'
      });
    }
    
    // Check for hardcoded colors (should use CSS custom properties)
    const checkForHardcodedColors = (filePath) => {
      const content = fs.readFileSync(filePath, 'utf8');
      const colorRegex = /#[0-9A-Fa-f]{3,6}|rgb\(|rgba\(|hsl\(|hsla\(/g;
      const matches = content.match(colorRegex);
      
      if (matches) {
        // Filter out acceptable hardcoded colors (in tokens file, fallbacks, etc.)
        const filename = path.basename(filePath);
        if (filename === '02-tokens.css' || filename === '01-reset.css') {
          return { hasHardcodedColors: false, count: 0 };
        }
        
        // Check if they're fallback values
        const fallbackPattern = /[^:]+:\s*#[0-9A-Fa-f]{3,6}[^;]*;\s*[^:]+:\s*var\(/g;
        const fallbacks = content.match(fallbackPattern);
        const fallbackCount = fallbacks ? fallbacks.length : 0;
        
        const problematicColors = matches.length - fallbackCount;
        return { hasHardcodedColors: problematicColors > 0, count: problematicColors };
      }
      
      return { hasHardcodedColors: false, count: 0 };
    };
    
    // Check component files for hardcoded colors
    const componentFiles = [
      '05-components/buttons.css',
      '05-components/cards.css',
      '05-components/forms.css',
      '05-components/navigation.css'
    ];
    
    let totalHardcodedColors = 0;
    componentFiles.forEach(file => {
      const filePath = path.join(this.stylesDir, file);
      if (fs.existsSync(filePath)) {
        const result = checkForHardcodedColors(filePath);
        totalHardcodedColors += result.count;
      }
    });
    
    results.push({
      test: 'No hardcoded colors in components',
      status: totalHardcodedColors === 0 ? 'pass' : 'warn',
      message: totalHardcodedColors === 0 ? 'All colors use design tokens' : `${totalHardcodedColors} hardcoded colors found`
    });
    
    this.validationResults.architecture = results;
    return results;
  }

  // Validate performance optimizations
  validatePerformance() {
    console.log('⚡ Validating Performance Optimizations...');
    
    const results = [];
    
    // Check total CSS bundle size
    let totalSize = 0;
    const scanDirectory = (dir) => {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          scanDirectory(filePath);
        } else if (file.endsWith('.css')) {
          totalSize += stat.size;
        }
      });
    };
    
    scanDirectory(this.stylesDir);
    
    const totalKB = Math.round(totalSize / 1024);
    results.push({
      test: 'CSS bundle size reasonable',
      status: totalKB < 400 ? 'pass' : totalKB < 600 ? 'warn' : 'fail',
      message: `Total CSS size: ${totalKB}KB`,
      details: totalKB < 400 ? 'Excellent size' : totalKB < 600 ? 'Acceptable size' : 'Consider optimization'
    });
    
    // Check for expensive selectors
    const checkExpensiveSelectors = (content) => {
      const expensivePatterns = [
        /\*\s*\{/g, // Universal selector
        /(\w+\s+){4,}/g, // Deep nesting (4+ levels)
        /\[[^=]*\*=/g // Substring attribute selectors
      ];
      
      let expensiveCount = 0;
      expensivePatterns.forEach(pattern => {
        const matches = content.match(pattern);
        if (matches) expensiveCount += matches.length;
      });
      
      return expensiveCount;
    };
    
    let totalExpensiveSelectors = 0;
    scanDirectory(this.stylesDir);
    
    const checkAllFiles = (dir) => {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          checkAllFiles(filePath);
        } else if (file.endsWith('.css')) {
          const content = fs.readFileSync(filePath, 'utf8');
          totalExpensiveSelectors += checkExpensiveSelectors(content);
        }
      });
    };
    
    checkAllFiles(this.stylesDir);
    
    results.push({
      test: 'Minimal expensive selectors',
      status: totalExpensiveSelectors < 10 ? 'pass' : totalExpensiveSelectors < 25 ? 'warn' : 'fail',
      message: `${totalExpensiveSelectors} expensive selectors found`,
      details: totalExpensiveSelectors < 10 ? 'Good selector performance' : 'Consider optimizing selectors'
    });
    
    // Check for animation performance
    const checkAnimationPerformance = (content) => {
      const layoutProperties = ['width', 'height', 'padding', 'margin', 'top', 'left', 'right', 'bottom'];
      const animationRegex = /@keyframes[^{]*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/g;
      let layoutAnimations = 0;
      
      let match;
      while ((match = animationRegex.exec(content)) !== null) {
        const animationContent = match[1];
        layoutProperties.forEach(prop => {
          const propRegex = new RegExp(`\\b${prop}\\s*:`, 'g');
          if (propRegex.test(animationContent)) {
            layoutAnimations++;
          }
        });
      }
      
      return layoutAnimations;
    };
    
    let totalLayoutAnimations = 0;
    checkAllFiles(this.stylesDir);
    
    const checkAnimations = (dir) => {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          checkAnimations(filePath);
        } else if (file.endsWith('.css')) {
          const content = fs.readFileSync(filePath, 'utf8');
          totalLayoutAnimations += checkAnimationPerformance(content);
        }
      });
    };
    
    checkAnimations(this.stylesDir);
    
    results.push({
      test: 'Animations use GPU-accelerated properties',
      status: totalLayoutAnimations === 0 ? 'pass' : totalLayoutAnimations < 5 ? 'warn' : 'fail',
      message: `${totalLayoutAnimations} layout-triggering animations found`,
      details: totalLayoutAnimations === 0 ? 'All animations are optimized' : 'Some animations may cause layout thrashing'
    });
    
    this.validationResults.performance = results;
    return results;
  }

  // Validate browser compatibility
  validateCompatibility() {
    console.log('🌐 Validating Browser Compatibility...');
    
    const results = [];
    
    // Check for CSS custom properties with fallbacks
    const checkCustomPropertyFallbacks = (content) => {
      const customPropUsage = content.match(/var\(\s*--[\w-]+/g);
      if (!customPropUsage) return { hasUsage: false, hasFallbacks: true };
      
      const fallbackPattern = /[^:]+:\s*[^;]+;\s*[^:]+:\s*var\(/g;
      const fallbacks = content.match(fallbackPattern);
      
      return {
        hasUsage: true,
        hasFallbacks: fallbacks && fallbacks.length > 0,
        usageCount: customPropUsage.length,
        fallbackCount: fallbacks ? fallbacks.length : 0
      };
    };
    
    let filesWithCustomProps = 0;
    let filesWithFallbacks = 0;
    
    const checkFallbacks = (dir) => {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          checkFallbacks(filePath);
        } else if (file.endsWith('.css') && !file.includes('02-tokens')) {
          const content = fs.readFileSync(filePath, 'utf8');
          const result = checkCustomPropertyFallbacks(content);
          
          if (result.hasUsage) {
            filesWithCustomProps++;
            if (result.hasFallbacks) {
              filesWithFallbacks++;
            }
          }
        }
      });
    };
    
    checkFallbacks(this.stylesDir);
    
    const fallbackCoverage = filesWithCustomProps > 0 ? (filesWithFallbacks / filesWithCustomProps) * 100 : 100;
    
    results.push({
      test: 'CSS custom properties have fallbacks',
      status: fallbackCoverage > 80 ? 'pass' : fallbackCoverage > 50 ? 'warn' : 'fail',
      message: `${Math.round(fallbackCoverage)}% of files with custom properties have fallbacks`,
      details: `${filesWithFallbacks}/${filesWithCustomProps} files have fallbacks`
    });
    
    // Check for @supports usage for advanced features
    const checkSupportsUsage = (content) => {
      const advancedFeatures = ['backdrop-filter', 'clip-path', 'mask'];
      const supportsUsage = content.match(/@supports\s*\([^)]+\)/g);
      
      let hasAdvancedFeatures = false;
      advancedFeatures.forEach(feature => {
        if (content.includes(feature)) {
          hasAdvancedFeatures = true;
        }
      });
      
      return {
        hasAdvancedFeatures,
        hasSupports: supportsUsage && supportsUsage.length > 0
      };
    };
    
    let filesWithAdvancedFeatures = 0;
    let filesWithSupports = 0;
    
    const checkSupports = (dir) => {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          checkSupports(filePath);
        } else if (file.endsWith('.css')) {
          const content = fs.readFileSync(filePath, 'utf8');
          const result = checkSupportsUsage(content);
          
          if (result.hasAdvancedFeatures) {
            filesWithAdvancedFeatures++;
            if (result.hasSupports) {
              filesWithSupports++;
            }
          }
        }
      });
    };
    
    checkSupports(this.stylesDir);
    
    const supportsCoverage = filesWithAdvancedFeatures > 0 ? (filesWithSupports / filesWithAdvancedFeatures) * 100 : 100;
    
    results.push({
      test: 'Advanced features use @supports',
      status: supportsCoverage > 70 ? 'pass' : supportsCoverage > 40 ? 'warn' : 'fail',
      message: `${Math.round(supportsCoverage)}% of files with advanced features use @supports`,
      details: `${filesWithSupports}/${filesWithAdvancedFeatures} files use feature detection`
    });
    
    this.validationResults.compatibility = results;
    return results;
  }

  // Validate accessibility compliance
  validateAccessibility() {
    console.log('♿ Validating Accessibility Compliance...');
    
    const results = [];
    
    // Check for focus indicators
    const checkFocusIndicators = (content) => {
      const focusSelectors = content.match(/:focus[^{]*\{/g);
      const focusVisibleSelectors = content.match(/:focus-visible[^{]*\{/g);
      
      return {
        hasFocus: focusSelectors && focusSelectors.length > 0,
        hasFocusVisible: focusVisibleSelectors && focusVisibleSelectors.length > 0,
        focusCount: focusSelectors ? focusSelectors.length : 0
      };
    };
    
    let totalFocusSelectors = 0;
    let filesWithFocus = 0;
    
    const checkFocus = (dir) => {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          checkFocus(filePath);
        } else if (file.endsWith('.css')) {
          const content = fs.readFileSync(filePath, 'utf8');
          const result = checkFocusIndicators(content);
          
          if (result.hasFocus) {
            filesWithFocus++;
            totalFocusSelectors += result.focusCount;
          }
        }
      });
    };
    
    checkFocus(this.stylesDir);
    
    results.push({
      test: 'Focus indicators present',
      status: totalFocusSelectors > 10 ? 'pass' : totalFocusSelectors > 5 ? 'warn' : 'fail',
      message: `${totalFocusSelectors} focus selectors found in ${filesWithFocus} files`,
      details: totalFocusSelectors > 10 ? 'Good focus indicator coverage' : 'Consider adding more focus indicators'
    });
    
    // Check for reduced motion support
    const checkReducedMotion = (content) => {
      return content.includes('prefers-reduced-motion');
    };
    
    let filesWithReducedMotion = 0;
    
    const checkMotion = (dir) => {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          checkMotion(filePath);
        } else if (file.endsWith('.css')) {
          const content = fs.readFileSync(filePath, 'utf8');
          if (checkReducedMotion(content)) {
            filesWithReducedMotion++;
          }
        }
      });
    };
    
    checkMotion(this.stylesDir);
    
    results.push({
      test: 'Reduced motion support',
      status: filesWithReducedMotion > 0 ? 'pass' : 'fail',
      message: `${filesWithReducedMotion} files support prefers-reduced-motion`,
      details: filesWithReducedMotion > 0 ? 'Motion preferences respected' : 'Add prefers-reduced-motion support'
    });
    
    // Check for high contrast support
    const checkHighContrast = (content) => {
      return content.includes('prefers-contrast') || content.includes('forced-colors');
    };
    
    let filesWithHighContrast = 0;
    
    const checkContrast = (dir) => {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          checkContrast(filePath);
        } else if (file.endsWith('.css')) {
          const content = fs.readFileSync(filePath, 'utf8');
          if (checkHighContrast(content)) {
            filesWithHighContrast++;
          }
        }
      });
    };
    
    checkContrast(this.stylesDir);
    
    results.push({
      test: 'High contrast support',
      status: filesWithHighContrast > 0 ? 'pass' : 'warn',
      message: `${filesWithHighContrast} files support high contrast modes`,
      details: filesWithHighContrast > 0 ? 'High contrast modes supported' : 'Consider adding high contrast support'
    });
    
    this.validationResults.accessibility = results;
    return results;
  }

  // Calculate overall score
  calculateOverallScore() {
    const allResults = [
      ...this.validationResults.architecture,
      ...this.validationResults.performance,
      ...this.validationResults.compatibility,
      ...this.validationResults.accessibility
    ];
    
    const totalTests = allResults.length;
    const passedTests = allResults.filter(result => result.status === 'pass').length;
    const warnTests = allResults.filter(result => result.status === 'warn').length;
    const failedTests = allResults.filter(result => result.status === 'fail').length;
    
    const score = Math.round(((passedTests + (warnTests * 0.5)) / totalTests) * 100);
    
    let grade;
    if (score >= 90) grade = 'A';
    else if (score >= 80) grade = 'B';
    else if (score >= 70) grade = 'C';
    else if (score >= 60) grade = 'D';
    else grade = 'F';
    
    return {
      score,
      grade,
      totalTests,
      passedTests,
      warnTests,
      failedTests
    };
  }

  // Generate final report
  generateReport() {
    console.log('\n🎯 Final Validation Report');
    console.log('==========================\n');
    
    const overallScore = this.calculateOverallScore();
    
    // Overall score
    console.log('📊 Overall Score:');
    console.log(`   Grade: ${overallScore.grade} (${overallScore.score}%)`);
    console.log(`   Tests: ${overallScore.passedTests} passed, ${overallScore.warnTests} warnings, ${overallScore.failedTests} failed\n`);
    
    // Category results
    const categories = [
      { name: 'Architecture', results: this.validationResults.architecture, icon: '🏗️' },
      { name: 'Performance', results: this.validationResults.performance, icon: '⚡' },
      { name: 'Compatibility', results: this.validationResults.compatibility, icon: '🌐' },
      { name: 'Accessibility', results: this.validationResults.accessibility, icon: '♿' }
    ];
    
    categories.forEach(category => {
      console.log(`${category.icon} ${category.name}:`);
      
      category.results.forEach(result => {
        const statusIcon = result.status === 'pass' ? '✅' : result.status === 'warn' ? '⚠️' : '❌';
        console.log(`   ${statusIcon} ${result.test}`);
        
        if (result.message) {
          console.log(`      ${result.message}`);
        }
        
        if (result.details) {
          console.log(`      ${result.details}`);
        }
      });
      
      console.log('');
    });
    
    // Recommendations
    const failedTests = [
      ...this.validationResults.architecture,
      ...this.validationResults.performance,
      ...this.validationResults.compatibility,
      ...this.validationResults.accessibility
    ].filter(result => result.status === 'fail');
    
    if (failedTests.length > 0) {
      console.log('🔧 Recommendations:');
      failedTests.forEach((test, index) => {
        console.log(`${index + 1}. Fix: ${test.test}`);
        if (test.details) {
          console.log(`   ${test.details}`);
        }
      });
      console.log('');
    }
    
    // Next steps
    console.log('🚀 Next Steps:');
    if (overallScore.grade === 'A') {
      console.log('   ✅ Dark theme implementation is excellent!');
      console.log('   • Deploy to production');
      console.log('   • Monitor performance metrics');
      console.log('   • Gather user feedback');
    } else if (overallScore.grade === 'B') {
      console.log('   ✅ Dark theme implementation is good!');
      console.log('   • Address warning items');
      console.log('   • Test on additional browsers');
      console.log('   • Consider performance optimizations');
    } else {
      console.log('   ⚠️ Dark theme needs improvements');
      console.log('   • Fix failed validation items');
      console.log('   • Re-run validation tests');
      console.log('   • Consider additional testing');
    }
    
    return {
      overallScore,
      categories: this.validationResults,
      failedTests,
      timestamp: new Date().toISOString()
    };
  }

  // Run complete validation
  async run() {
    console.log('🔍 Starting Final Validation...\n');
    
    try {
      this.validateCSSArchitecture();
      this.validatePerformance();
      this.validateCompatibility();
      this.validateAccessibility();
      
      const report = this.generateReport();
      
      // Save report
      const reportPath = path.join(__dirname, '../reports/final-validation-report.json');
      const reportsDir = path.dirname(reportPath);
      
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }
      
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`📄 Detailed report saved to: ${reportPath}`);
      
      return report;
      
    } catch (error) {
      console.error('❌ Error during validation:', error.message);
      throw error;
    }
  }
}

// Run the validation
const validator = new FinalValidator();
validator.run().catch(console.error);

export default FinalValidator;