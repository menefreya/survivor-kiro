#!/usr/bin/env node

/**
 * CSS Performance Testing Tool
 * 
 * This tool tests CSS rendering performance by:
 * 1. Measuring CSS parse time
 * 2. Testing animation performance
 * 3. Checking for layout thrashing
 * 4. Validating smooth transitions
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class CSSPerformanceTester {
  constructor() {
    this.srcDir = path.join(__dirname, '../src');
    this.stylesDir = path.join(this.srcDir, 'styles');
    this.testResults = [];
  }

  // Analyze CSS for performance issues
  analyzeCSSPerformance(content, filename) {
    const issues = [];
    const recommendations = [];
    
    // Check for expensive selectors
    const expensiveSelectors = [
      { pattern: /\*\s*\{/, issue: 'Universal selector (*)', severity: 'high' },
      { pattern: /\[[^=]*\*=/, issue: 'Substring attribute selector', severity: 'medium' },
      { pattern: /:[^:]*:/, issue: 'Multiple pseudo-classes', severity: 'low' },
      { pattern: />\s*\*/, issue: 'Universal child selector', severity: 'medium' },
      { pattern: /(\w+\s+){4,}/, issue: 'Deep descendant selector (4+ levels)', severity: 'high' }
    ];
    
    expensiveSelectors.forEach(({ pattern, issue, severity }) => {
      const matches = content.match(pattern);
      if (matches) {
        issues.push({
          type: 'expensive-selector',
          issue,
          severity,
          count: matches.length,
          file: filename
        });
      }
    });
    
    // Check for layout-triggering properties in animations
    const layoutProperties = [
      'width', 'height', 'padding', 'margin', 'border', 'top', 'left', 'right', 'bottom',
      'font-size', 'line-height', 'text-align', 'vertical-align'
    ];
    
    const animationRegex = /@keyframes[^{]*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/g;
    let animationMatch;
    
    while ((animationMatch = animationRegex.exec(content)) !== null) {
      const animationContent = animationMatch[1];
      
      layoutProperties.forEach(prop => {
        const propRegex = new RegExp(`\\b${prop}\\s*:`, 'g');
        if (propRegex.test(animationContent)) {
          issues.push({
            type: 'layout-animation',
            issue: `Animation uses layout-triggering property: ${prop}`,
            severity: 'high',
            file: filename,
            recommendation: `Use transform or opacity instead of ${prop} for better performance`
          });
        }
      });
    }
    
    // Check for paint-triggering properties in transitions
    const paintProperties = ['color', 'background-color', 'border-color', 'box-shadow'];
    const transitionRegex = /transition[^;]*:\s*([^;]+);/g;
    let transitionMatch;
    
    while ((transitionMatch = transitionRegex.exec(content)) !== null) {
      const transitionValue = transitionMatch[1];
      
      if (transitionValue.includes('all')) {
        issues.push({
          type: 'inefficient-transition',
          issue: 'Transition uses "all" property',
          severity: 'medium',
          file: filename,
          recommendation: 'Specify exact properties to transition for better performance'
        });
      }
    }
    
    // Check for excessive box-shadows
    const boxShadowRegex = /box-shadow[^;]*:[^;]*,.*,.*,/g;
    const complexShadows = content.match(boxShadowRegex);
    if (complexShadows && complexShadows.length > 0) {
      issues.push({
        type: 'complex-shadows',
        issue: 'Complex box-shadows with multiple layers',
        severity: 'medium',
        count: complexShadows.length,
        file: filename,
        recommendation: 'Consider simplifying shadows or using pseudo-elements'
      });
    }
    
    // Check for large background images in CSS
    const backgroundImageRegex = /background-image\s*:\s*url\([^)]+\)/g;
    const backgroundImages = content.match(backgroundImageRegex);
    if (backgroundImages) {
      issues.push({
        type: 'background-images',
        issue: 'CSS contains background images',
        severity: 'low',
        count: backgroundImages.length,
        file: filename,
        recommendation: 'Ensure background images are optimized and consider lazy loading'
      });
    }
    
    // Check for excessive media queries
    const mediaQueryRegex = /@media[^{]+\{/g;
    const mediaQueries = content.match(mediaQueryRegex);
    if (mediaQueries && mediaQueries.length > 10) {
      issues.push({
        type: 'excessive-media-queries',
        issue: 'High number of media queries',
        severity: 'low',
        count: mediaQueries.length,
        file: filename,
        recommendation: 'Consider consolidating similar media queries'
      });
    }
    
    // Performance recommendations based on file size
    const fileSize = Buffer.byteLength(content, 'utf8');
    if (fileSize > 50000) { // 50KB
      recommendations.push({
        type: 'file-size',
        message: `Large CSS file (${Math.round(fileSize / 1024)}KB)`,
        suggestion: 'Consider splitting into smaller, feature-specific files'
      });
    }
    
    return { issues, recommendations, fileSize };
  }

  // Test CSS parsing performance
  testCSSParsingPerformance() {
    console.log('⚡ Testing CSS parsing performance...');
    
    const results = [];
    
    const testFile = (filePath) => {
      const content = fs.readFileSync(filePath, 'utf8');
      const filename = path.relative(this.stylesDir, filePath);
      
      // Simulate CSS parsing time (simplified)
      const startTime = process.hrtime.bigint();
      
      // Count selectors, rules, and properties
      const selectorCount = (content.match(/[^{}]+\{/g) || []).length;
      const ruleCount = (content.match(/[^{}]+\{[^{}]+\}/g) || []).length;
      const propertyCount = (content.match(/[^{}:]+:[^;]+;/g) || []).length;
      
      const endTime = process.hrtime.bigint();
      const parseTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds
      
      const analysis = this.analyzeCSSPerformance(content, filename);
      
      results.push({
        file: filename,
        size: analysis.fileSize,
        parseTime,
        selectorCount,
        ruleCount,
        propertyCount,
        issues: analysis.issues,
        recommendations: analysis.recommendations
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

  // Generate performance recommendations
  generatePerformanceRecommendations(results) {
    const recommendations = [];
    
    // Analyze overall performance
    const totalSize = results.reduce((sum, result) => sum + result.size, 0);
    const totalIssues = results.reduce((sum, result) => sum + result.issues.length, 0);
    const highSeverityIssues = results.reduce((sum, result) => 
      sum + result.issues.filter(issue => issue.severity === 'high').length, 0);
    
    // Bundle size recommendations
    if (totalSize > 200000) { // 200KB
      recommendations.push({
        category: 'Bundle Size',
        priority: 'high',
        title: `CSS bundle is ${Math.round(totalSize / 1024)}KB`,
        description: 'Large CSS bundles can significantly impact page load performance',
        actions: [
          'Implement CSS code splitting by route/component',
          'Remove unused CSS classes and rules',
          'Consider critical CSS extraction for above-the-fold content',
          'Use CSS-in-JS for component-specific styles'
        ]
      });
    }
    
    // Performance issues recommendations
    if (highSeverityIssues > 0) {
      recommendations.push({
        category: 'Rendering Performance',
        priority: 'high',
        title: `${highSeverityIssues} high-severity performance issues found`,
        description: 'These issues can cause layout thrashing and poor animation performance',
        actions: [
          'Replace expensive selectors with class-based selectors',
          'Use transform and opacity for animations instead of layout properties',
          'Optimize complex box-shadows and gradients',
          'Minimize use of universal and deep descendant selectors'
        ]
      });
    }
    
    // Animation performance recommendations
    const animationIssues = results.reduce((sum, result) => 
      sum + result.issues.filter(issue => issue.type === 'layout-animation').length, 0);
    
    if (animationIssues > 0) {
      recommendations.push({
        category: 'Animation Performance',
        priority: 'medium',
        title: `${animationIssues} animation performance issues found`,
        description: 'Animations using layout properties can cause jank and poor performance',
        actions: [
          'Use transform: translateX/Y instead of left/top for movement',
          'Use transform: scale instead of width/height for sizing',
          'Use opacity for fade effects instead of visibility',
          'Add will-change property for elements that will be animated'
        ]
      });
    }
    
    // Selector performance recommendations
    const expensiveSelectors = results.reduce((sum, result) => 
      sum + result.issues.filter(issue => issue.type === 'expensive-selector').length, 0);
    
    if (expensiveSelectors > 5) {
      recommendations.push({
        category: 'Selector Performance',
        priority: 'medium',
        title: `${expensiveSelectors} expensive selectors found`,
        description: 'Complex selectors can slow down CSS parsing and matching',
        actions: [
          'Replace universal selectors (*) with specific class names',
          'Avoid deep descendant selectors (more than 3 levels)',
          'Use child selectors (>) instead of descendant selectors when possible',
          'Prefer class selectors over attribute selectors'
        ]
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

  // Generate detailed performance report
  generateReport(results) {
    console.log('\n🎯 CSS Performance Analysis Report');
    console.log('==================================\n');
    
    // Summary statistics
    const totalSize = results.reduce((sum, result) => sum + result.size, 0);
    const totalIssues = results.reduce((sum, result) => sum + result.issues.length, 0);
    const avgParseTime = results.reduce((sum, result) => sum + result.parseTime, 0) / results.length;
    
    console.log('📊 Performance Summary:');
    console.log(`   Total CSS Size: ${this.formatSize(totalSize)}`);
    console.log(`   Files Analyzed: ${results.length}`);
    console.log(`   Performance Issues: ${totalIssues}`);
    console.log(`   Average Parse Time: ${avgParseTime.toFixed(2)}ms\n`);
    
    // Top performance issues
    const allIssues = results.flatMap(result => result.issues);
    const issuesByType = allIssues.reduce((acc, issue) => {
      acc[issue.type] = (acc[issue.type] || 0) + 1;
      return acc;
    }, {});
    
    if (Object.keys(issuesByType).length > 0) {
      console.log('🚨 Top Performance Issues:');
      Object.entries(issuesByType)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .forEach(([type, count]) => {
          console.log(`   ${type}: ${count} occurrences`);
        });
      console.log('');
    }
    
    // Largest files
    const largestFiles = results
      .sort((a, b) => b.size - a.size)
      .slice(0, 5);
    
    console.log('📁 Largest CSS Files:');
    largestFiles.forEach(result => {
      console.log(`   ${result.file}: ${this.formatSize(result.size)} (${result.selectorCount} selectors)`);
    });
    console.log('');
    
    // Generate recommendations
    const recommendations = this.generatePerformanceRecommendations(results);
    
    if (recommendations.length > 0) {
      console.log('💡 Performance Recommendations:');
      recommendations.forEach((rec, index) => {
        const priorityIcon = rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢';
        console.log(`\n${index + 1}. ${priorityIcon} ${rec.title}`);
        console.log(`   Category: ${rec.category}`);
        console.log(`   ${rec.description}`);
        console.log('   Actions:');
        rec.actions.forEach(action => {
          console.log(`     • ${action}`);
        });
      });
    } else {
      console.log('✅ No major performance issues found!');
    }
    
    // Performance tips
    console.log('\n🚀 General Performance Tips:');
    console.log('   • Use CSS containment (contain: layout style paint) for isolated components');
    console.log('   • Prefer transform and opacity for animations (GPU accelerated)');
    console.log('   • Use will-change sparingly and remove after animation');
    console.log('   • Minimize reflows by batching DOM changes');
    console.log('   • Consider CSS-in-JS for critical path optimization');
    console.log('   • Use CSS custom properties for dynamic theming');
    
    return {
      summary: {
        totalSize,
        filesAnalyzed: results.length,
        totalIssues,
        avgParseTime
      },
      results,
      recommendations
    };
  }

  // Run the complete performance analysis
  async run() {
    console.log('🔍 Starting CSS Performance Analysis...\n');
    
    try {
      const results = this.testCSSParsingPerformance();
      const report = this.generateReport(results);
      
      // Save detailed report
      const reportPath = path.join(__dirname, '../reports/css-performance-report.json');
      const reportsDir = path.dirname(reportPath);
      
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }
      
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`\n📄 Detailed report saved to: ${reportPath}`);
      
      return report;
      
    } catch (error) {
      console.error('❌ Error during performance analysis:', error.message);
      throw error;
    }
  }
}

// Run the performance analysis
const tester = new CSSPerformanceTester();
tester.run().catch(console.error);

export default CSSPerformanceTester;