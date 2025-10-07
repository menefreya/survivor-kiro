#!/usr/bin/env node

/**
 * Cross-Browser Compatibility Testing Tool
 * 
 * This tool tests CSS compatibility across different browsers by:
 * 1. Checking for unsupported CSS features
 * 2. Validating fallback styles
 * 3. Testing mobile browser compatibility
 * 4. Generating compatibility reports
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class BrowserCompatibilityTester {
  constructor() {
    this.srcDir = path.join(__dirname, '../src');
    this.stylesDir = path.join(this.srcDir, 'styles');
    
    // Browser support data (simplified version of caniuse data)
    this.browserSupport = {
      'css-custom-properties': {
        chrome: 49,
        firefox: 31,
        safari: 9.1,
        edge: 16,
        ios_safari: 9.3,
        android: 62,
        samsung: 5.0
      },
      'backdrop-filter': {
        chrome: 76,
        firefox: 103,
        safari: 9,
        edge: 17,
        ios_safari: 9,
        android: 76,
        samsung: 12.0
      },
      'css-grid': {
        chrome: 57,
        firefox: 52,
        safari: 10.1,
        edge: 16,
        ios_safari: 10.3,
        android: 57,
        samsung: 6.2
      },
      'flexbox': {
        chrome: 29,
        firefox: 28,
        safari: 9,
        edge: 12,
        ios_safari: 9,
        android: 29,
        samsung: 2.1
      },
      'css-transforms': {
        chrome: 36,
        firefox: 16,
        safari: 9,
        edge: 12,
        ios_safari: 9,
        android: 36,
        samsung: 3.0
      },
      'css-transitions': {
        chrome: 26,
        firefox: 16,
        safari: 6.1,
        edge: 12,
        ios_safari: 7,
        android: 26,
        samsung: 1.5
      },
      'css-animations': {
        chrome: 43,
        firefox: 16,
        safari: 9,
        edge: 12,
        ios_safari: 9,
        android: 43,
        samsung: 4.0
      },
      'css-filters': {
        chrome: 53,
        firefox: 35,
        safari: 9.1,
        edge: 13,
        ios_safari: 9.3,
        android: 53,
        samsung: 6.2
      },
      'css-clip-path': {
        chrome: 55,
        firefox: 3.5,
        safari: 13.1,
        edge: 79,
        ios_safari: 13.4,
        android: 55,
        samsung: 6.2
      },
      'css-masks': {
        chrome: 120,
        firefox: 53,
        safari: 15.4,
        edge: 120,
        ios_safari: 15.4,
        android: 120,
        samsung: 25.0
      }
    };
    
    // Target browser versions (minimum supported)
    this.targetBrowsers = {
      chrome: 90,
      firefox: 88,
      safari: 14,
      edge: 90,
      ios_safari: 14,
      android: 90,
      samsung: 15.0
    };
  }

  // Analyze CSS for browser compatibility issues
  analyzeCSSCompatibility(content, filename) {
    const issues = [];
    const warnings = [];
    const fallbacks = [];
    
    // Check for CSS custom properties
    const customPropsRegex = /--[\w-]+\s*:/g;
    const customPropUsageRegex = /var\(\s*--[\w-]+/g;
    
    const customPropDefs = content.match(customPropsRegex);
    const customPropUsages = content.match(customPropUsageRegex);
    
    if (customPropDefs || customPropUsages) {
      const support = this.browserSupport['css-custom-properties'];
      const unsupportedBrowsers = this.checkBrowserSupport(support);
      
      if (unsupportedBrowsers.length > 0) {
        issues.push({
          feature: 'CSS Custom Properties',
          severity: 'high',
          unsupportedBrowsers,
          file: filename,
          recommendation: 'Provide fallback values for older browsers'
        });
      }
      
      // Check for fallbacks
      const fallbackPattern = /([^:]+):\s*([^;]+);\s*\1:\s*var\(/g;
      const hasFallbacks = fallbackPattern.test(content);
      
      if (!hasFallbacks && (customPropDefs || customPropUsages)) {
        warnings.push({
          type: 'missing-fallback',
          message: 'CSS custom properties used without fallback values',
          file: filename
        });
      }
    }
    
    // Check for backdrop-filter
    if (content.includes('backdrop-filter')) {
      const support = this.browserSupport['backdrop-filter'];
      const unsupportedBrowsers = this.checkBrowserSupport(support);
      
      if (unsupportedBrowsers.length > 0) {
        issues.push({
          feature: 'Backdrop Filter',
          severity: 'medium',
          unsupportedBrowsers,
          file: filename,
          recommendation: 'Provide solid background fallback'
        });
      }
      
      // Check for @supports fallback
      const supportsBackdropFilter = /@supports\s*\(\s*backdrop-filter\s*:/i.test(content);
      if (!supportsBackdropFilter) {
        warnings.push({
          type: 'missing-feature-detection',
          message: 'backdrop-filter used without @supports feature detection',
          file: filename
        });
      }
    }
    
    // Check for CSS Grid
    const gridRegex = /(display\s*:\s*grid|grid-template|grid-area|grid-column|grid-row)/g;
    if (gridRegex.test(content)) {
      const support = this.browserSupport['css-grid'];
      const unsupportedBrowsers = this.checkBrowserSupport(support);
      
      if (unsupportedBrowsers.length > 0) {
        issues.push({
          feature: 'CSS Grid',
          severity: 'high',
          unsupportedBrowsers,
          file: filename,
          recommendation: 'Provide flexbox or float fallback'
        });
      }
    }
    
    // Check for advanced CSS features
    const advancedFeatures = [
      { pattern: /clip-path\s*:/, feature: 'css-clip-path', name: 'CSS Clip Path' },
      { pattern: /mask\s*:/, feature: 'css-masks', name: 'CSS Masks' },
      { pattern: /filter\s*:(?!.*none)/, feature: 'css-filters', name: 'CSS Filters' }
    ];
    
    advancedFeatures.forEach(({ pattern, feature, name }) => {
      if (pattern.test(content)) {
        const support = this.browserSupport[feature];
        const unsupportedBrowsers = this.checkBrowserSupport(support);
        
        if (unsupportedBrowsers.length > 0) {
          issues.push({
            feature: name,
            severity: 'medium',
            unsupportedBrowsers,
            file: filename,
            recommendation: `Consider progressive enhancement for ${name}`
          });
        }
      }
    });
    
    // Check for vendor prefixes
    const vendorPrefixes = [
      { pattern: /-webkit-/, prefix: '-webkit-' },
      { pattern: /-moz-/, prefix: '-moz-' },
      { pattern: /-ms-/, prefix: '-ms-' },
      { pattern: /-o-/, prefix: '-o-' }
    ];
    
    vendorPrefixes.forEach(({ pattern, prefix }) => {
      if (pattern.test(content)) {
        fallbacks.push({
          type: 'vendor-prefix',
          prefix,
          file: filename,
          message: `Uses ${prefix} vendor prefix`
        });
      }
    });
    
    // Check for modern CSS units
    const modernUnits = ['vw', 'vh', 'vmin', 'vmax', 'rem', 'ch', 'ex'];
    modernUnits.forEach(unit => {
      const unitRegex = new RegExp(`\\d+${unit}\\b`, 'g');
      if (unitRegex.test(content)) {
        // These are generally well supported, just note usage
        fallbacks.push({
          type: 'modern-unit',
          unit,
          file: filename,
          message: `Uses ${unit} unit (check IE11 support if needed)`
        });
      }
    });
    
    return { issues, warnings, fallbacks };
  }

  // Check browser support for a feature
  checkBrowserSupport(supportData) {
    const unsupported = [];
    
    Object.entries(this.targetBrowsers).forEach(([browser, targetVersion]) => {
      const supportedVersion = supportData[browser];
      
      if (!supportedVersion || supportedVersion > targetVersion) {
        unsupported.push({
          browser,
          targetVersion,
          supportedVersion: supportedVersion || 'Not supported'
        });
      }
    });
    
    return unsupported;
  }

  // Generate browser-specific CSS
  generateBrowserSpecificCSS() {
    console.log('🌐 Generating browser-specific CSS...');
    
    const browserCSS = {
      ie11: [],
      safari: [],
      firefox: [],
      chrome: [],
      mobile: []
    };
    
    // IE11 specific fixes
    browserCSS.ie11.push(`
/* IE11 Compatibility Fixes */
/* CSS Custom Properties Fallbacks */
.btn-primary {
  background-color: #FF6B35; /* Fallback */
  background-color: var(--color-primary);
}

.card {
  background-color: #1A1A1C; /* Fallback */
  background-color: var(--color-bg-secondary);
}

/* Flexbox fixes for IE11 */
.u-flex {
  display: -ms-flexbox;
  display: flex;
}

.u-flex-center {
  -ms-flex-align: center;
  align-items: center;
  -ms-flex-pack: center;
  justify-content: center;
}

/* Grid fallback for IE11 */
@supports not (display: grid) {
  .dashboard-grid {
    display: -ms-flexbox;
    display: flex;
    -ms-flex-wrap: wrap;
    flex-wrap: wrap;
  }
  
  .dashboard-grid > * {
    -ms-flex: 1 1 300px;
    flex: 1 1 300px;
    margin: 8px;
  }
}
`);
    
    // Safari specific fixes
    browserCSS.safari.push(`
/* Safari Compatibility Fixes */
/* Backdrop filter fallback */
@supports not (backdrop-filter: blur(10px)) {
  .navigation {
    background-color: rgba(10, 10, 11, 0.95);
  }
}

/* Safari flexbox fixes */
.u-flex {
  display: -webkit-flex;
  display: flex;
}

/* Safari transform fixes */
.btn:hover {
  -webkit-transform: translateY(-2px);
  transform: translateY(-2px);
}
`);
    
    // Mobile specific optimizations
    browserCSS.mobile.push(`
/* Mobile Browser Optimizations */
/* Touch action optimization */
.btn, .card, .nav-link {
  touch-action: manipulation;
}

/* iOS Safari fixes */
@supports (-webkit-touch-callout: none) {
  /* iOS specific styles */
  .form-input {
    -webkit-appearance: none;
    border-radius: 0;
  }
  
  /* Fix iOS zoom on input focus */
  .form-input {
    font-size: 16px;
  }
}

/* Android Chrome fixes */
@media screen and (-webkit-min-device-pixel-ratio: 0) {
  /* Android specific styles */
  .btn {
    -webkit-tap-highlight-color: transparent;
  }
}

/* Samsung Internet fixes */
@supports (-webkit-appearance: none) {
  .form-input {
    -webkit-appearance: none;
  }
}
`);
    
    return browserCSS;
  }

  // Test CSS files for compatibility
  testCSSFiles() {
    console.log('🔍 Testing CSS files for browser compatibility...');
    
    const results = [];
    
    const testFile = (filePath) => {
      const content = fs.readFileSync(filePath, 'utf8');
      const filename = path.relative(this.stylesDir, filePath);
      
      const analysis = this.analyzeCSSCompatibility(content, filename);
      
      results.push({
        file: filename,
        size: Buffer.byteLength(content, 'utf8'),
        ...analysis
      });
    };
    
    // Test all CSS files
    const scanDirectory = (dir) => {
      const files = fs.readdirSync(dir);
      
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          scanDirectory(filePath);
        } else if (file.endsWith('.css')) {
          testFile(filePath);
        }
      });
    };
    
    scanDirectory(this.stylesDir);
    
    return results;
  }

  // Generate compatibility recommendations
  generateCompatibilityRecommendations(results) {
    const recommendations = [];
    
    // Count issues by severity
    const allIssues = results.flatMap(result => result.issues);
    const highSeverityIssues = allIssues.filter(issue => issue.severity === 'high');
    const mediumSeverityIssues = allIssues.filter(issue => issue.severity === 'medium');
    
    // High severity issues
    if (highSeverityIssues.length > 0) {
      const issuesByFeature = highSeverityIssues.reduce((acc, issue) => {
        acc[issue.feature] = (acc[issue.feature] || 0) + 1;
        return acc;
      }, {});
      
      recommendations.push({
        priority: 'high',
        category: 'Critical Compatibility Issues',
        title: `${highSeverityIssues.length} critical compatibility issues found`,
        description: 'These features may not work in target browsers',
        issues: Object.entries(issuesByFeature).map(([feature, count]) => ({
          feature,
          count,
          action: this.getFeatureRecommendation(feature)
        }))
      });
    }
    
    // Missing fallbacks
    const allWarnings = results.flatMap(result => result.warnings);
    const missingFallbacks = allWarnings.filter(warning => warning.type === 'missing-fallback');
    
    if (missingFallbacks.length > 0) {
      recommendations.push({
        priority: 'high',
        category: 'Missing Fallbacks',
        title: `${missingFallbacks.length} files missing CSS fallbacks`,
        description: 'Modern CSS features should have fallback values for older browsers',
        action: 'Add fallback values before modern CSS properties'
      });
    }
    
    // Feature detection
    const missingFeatureDetection = allWarnings.filter(warning => warning.type === 'missing-feature-detection');
    
    if (missingFeatureDetection.length > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'Feature Detection',
        title: `${missingFeatureDetection.length} features without @supports detection`,
        description: 'Advanced CSS features should use @supports for progressive enhancement',
        action: 'Wrap advanced features in @supports queries'
      });
    }
    
    // Mobile compatibility
    const mobileIssues = allIssues.filter(issue => 
      issue.unsupportedBrowsers?.some(browser => 
        ['ios_safari', 'android', 'samsung'].includes(browser.browser)
      )
    );
    
    if (mobileIssues.length > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'Mobile Compatibility',
        title: `${mobileIssues.length} mobile browser compatibility issues`,
        description: 'Some features may not work properly on mobile devices',
        action: 'Test on actual mobile devices and provide mobile-specific fallbacks'
      });
    }
    
    return recommendations;
  }

  // Get specific recommendation for a feature
  getFeatureRecommendation(feature) {
    const recommendations = {
      'CSS Custom Properties': 'Add fallback values: color: #FF6B35; color: var(--color-primary);',
      'Backdrop Filter': 'Use solid background fallback with @supports detection',
      'CSS Grid': 'Provide flexbox fallback layout for older browsers',
      'CSS Clip Path': 'Use border-radius or pseudo-elements as fallback',
      'CSS Masks': 'Consider using background images or SVG masks instead',
      'CSS Filters': 'Provide alternative styling without filters for older browsers'
    };
    
    return recommendations[feature] || 'Provide appropriate fallback for older browsers';
  }

  // Format file size for display
  formatSize(bytes) {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
    return `${Math.round(bytes / (1024 * 1024))}MB`;
  }

  // Generate detailed compatibility report
  generateReport(results) {
    console.log('\n🎯 Browser Compatibility Report');
    console.log('===============================\n');
    
    // Summary statistics
    const totalIssues = results.reduce((sum, result) => sum + result.issues.length, 0);
    const totalWarnings = results.reduce((sum, result) => sum + result.warnings.length, 0);
    const filesWithIssues = results.filter(result => result.issues.length > 0).length;
    
    console.log('📊 Compatibility Summary:');
    console.log(`   Files Tested: ${results.length}`);
    console.log(`   Files with Issues: ${filesWithIssues}`);
    console.log(`   Total Issues: ${totalIssues}`);
    console.log(`   Total Warnings: ${totalWarnings}\n`);
    
    // Target browser support
    console.log('🎯 Target Browser Support:');
    Object.entries(this.targetBrowsers).forEach(([browser, version]) => {
      console.log(`   ${browser}: ${version}+`);
    });
    console.log('');
    
    // Issues by severity
    const allIssues = results.flatMap(result => result.issues);
    const issuesBySeverity = allIssues.reduce((acc, issue) => {
      acc[issue.severity] = (acc[issue.severity] || 0) + 1;
      return acc;
    }, {});
    
    if (Object.keys(issuesBySeverity).length > 0) {
      console.log('🚨 Issues by Severity:');
      Object.entries(issuesBySeverity).forEach(([severity, count]) => {
        const icon = severity === 'high' ? '🔴' : severity === 'medium' ? '🟡' : '🟢';
        console.log(`   ${icon} ${severity}: ${count}`);
      });
      console.log('');
    }
    
    // Most problematic files
    const problematicFiles = results
      .filter(result => result.issues.length > 0)
      .sort((a, b) => b.issues.length - a.issues.length)
      .slice(0, 5);
    
    if (problematicFiles.length > 0) {
      console.log('📁 Files with Most Issues:');
      problematicFiles.forEach(result => {
        console.log(`   ${result.file}: ${result.issues.length} issues`);
      });
      console.log('');
    }
    
    // Generate recommendations
    const recommendations = this.generateCompatibilityRecommendations(results);
    
    if (recommendations.length > 0) {
      console.log('💡 Compatibility Recommendations:');
      recommendations.forEach((rec, index) => {
        const priorityIcon = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
        console.log(`\n${index + 1}. ${priorityIcon} ${rec.title}`);
        console.log(`   Category: ${rec.category}`);
        console.log(`   ${rec.description}`);
        
        if (rec.action) {
          console.log(`   Action: ${rec.action}`);
        }
        
        if (rec.issues) {
          console.log('   Issues:');
          rec.issues.forEach(issue => {
            console.log(`     • ${issue.feature}: ${issue.count} occurrences`);
            console.log(`       ${issue.action}`);
          });
        }
      });
    } else {
      console.log('✅ No major compatibility issues found!');
    }
    
    // Browser-specific tips
    console.log('\n🌐 Browser-Specific Testing Tips:');
    console.log('   Chrome/Edge: Test with DevTools device emulation');
    console.log('   Firefox: Use Responsive Design Mode');
    console.log('   Safari: Test on actual macOS/iOS devices when possible');
    console.log('   Mobile: Test on real devices with various screen sizes');
    console.log('   IE11: Use BrowserStack or similar service for testing');
    
    return {
      summary: {
        filesAnalyzed: results.length,
        filesWithIssues,
        totalIssues,
        totalWarnings
      },
      results,
      recommendations,
      browserCSS: this.generateBrowserSpecificCSS()
    };
  }

  // Run the complete compatibility analysis
  async run() {
    console.log('🔍 Starting Browser Compatibility Analysis...\n');
    
    try {
      const results = this.testCSSFiles();
      const report = this.generateReport(results);
      
      // Save detailed report
      const reportPath = path.join(__dirname, '../reports/browser-compatibility-report.json');
      const reportsDir = path.dirname(reportPath);
      
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }
      
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      
      // Save browser-specific CSS files
      Object.entries(report.browserCSS).forEach(([browser, css]) => {
        if (css.length > 0) {
          const cssPath = path.join(reportsDir, `${browser}-compatibility.css`);
          fs.writeFileSync(cssPath, css.join('\n'));
          console.log(`\n📄 ${browser} compatibility CSS saved to: ${cssPath}`);
        }
      });
      
      console.log(`\n📄 Detailed report saved to: ${reportPath}`);
      
      return report;
      
    } catch (error) {
      console.error('❌ Error during compatibility analysis:', error.message);
      throw error;
    }
  }
}

// Run the compatibility analysis
const tester = new BrowserCompatibilityTester();
tester.run().catch(console.error);

export default BrowserCompatibilityTester;