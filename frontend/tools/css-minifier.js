#!/usr/bin/env node

/**
 * CSS Minification and Optimization Tool
 * 
 * This tool optimizes CSS for production by:
 * 1. Removing comments and whitespace
 * 2. Combining duplicate rules
 * 3. Optimizing CSS custom properties
 * 4. Removing unused CSS (with safe patterns)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class CSSMinifier {
  constructor() {
    this.srcDir = path.join(__dirname, '../src');
    this.stylesDir = path.join(this.srcDir, 'styles');
    this.outputDir = path.join(__dirname, '../dist-css');
  }

  // Minify CSS content
  minifyCSS(content) {
    return content
      // Remove comments
      .replace(/\/\*[\s\S]*?\*\//g, '')
      // Remove unnecessary whitespace
      .replace(/\s+/g, ' ')
      // Remove whitespace around specific characters
      .replace(/\s*([{}:;,>+~])\s*/g, '$1')
      // Remove trailing semicolons before closing braces
      .replace(/;}/g, '}')
      // Remove leading/trailing whitespace
      .trim();
  }

  // Optimize CSS custom properties by removing unused ones
  optimizeCustomProperties(content) {
    // Extract all custom property definitions
    const definedProps = new Set();
    const propDefRegex = /--([\w-]+):\s*[^;]+;/g;
    let match;
    
    while ((match = propDefRegex.exec(content)) !== null) {
      definedProps.add(`--${match[1]}`);
    }
    
    // Extract all custom property usages
    const usedProps = new Set();
    const propUseRegex = /var\(\s*(--([\w-]+))/g;
    
    while ((match = propUseRegex.exec(content)) !== null) {
      usedProps.add(match[1]);
    }
    
    // Remove unused custom properties (be conservative)
    const safeToRemovePatterns = [
      /--temp-/, // temporary variables
      /--debug-/, // debug variables
      /--test-/, // test variables
    ];
    
    definedProps.forEach(prop => {
      if (!usedProps.has(prop)) {
        const shouldRemove = safeToRemovePatterns.some(pattern => pattern.test(prop));
        if (shouldRemove) {
          const regex = new RegExp(`\\s*${prop.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}:\\s*[^;]+;`, 'g');
          content = content.replace(regex, '');
        }
      }
    });
    
    return content;
  }

  // Remove duplicate CSS rules
  removeDuplicateRules(content) {
    const rules = new Map();
    const ruleRegex = /([^{}]+)\{([^{}]+)\}/g;
    let match;
    let result = content;
    
    // Find duplicate rules with same selector and properties
    while ((match = ruleRegex.exec(content)) !== null) {
      const selector = match[1].trim();
      const properties = match[2].trim();
      const fullRule = match[0];
      
      const key = `${selector}|${properties}`;
      
      if (rules.has(key)) {
        // Remove duplicate rule
        result = result.replace(fullRule, '');
      } else {
        rules.set(key, fullRule);
      }
    }
    
    return result;
  }

  // Optimize media queries by combining similar ones
  optimizeMediaQueries(content) {
    const mediaQueries = new Map();
    const mediaRegex = /@media\s*([^{]+)\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g;
    let match;
    
    while ((match = mediaRegex.exec(content)) !== null) {
      const condition = match[1].trim();
      const rules = match[2].trim();
      
      if (mediaQueries.has(condition)) {
        mediaQueries.set(condition, mediaQueries.get(condition) + rules);
        // Remove the duplicate media query
        content = content.replace(match[0], '');
      } else {
        mediaQueries.set(condition, rules);
      }
    }
    
    // Rebuild combined media queries
    mediaQueries.forEach((rules, condition) => {
      const combinedQuery = `@media ${condition}{${rules}}`;
      const originalRegex = new RegExp(`@media\\s*${condition.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}\\{[^{}]*(?:\\{[^{}]*\\}[^{}]*)*\\}`, 'g');
      content = content.replace(originalRegex, combinedQuery);
    });
    
    return content;
  }

  // Process a single CSS file
  processFile(inputPath, outputPath) {
    console.log(`Processing: ${path.relative(this.stylesDir, inputPath)}`);
    
    let content = fs.readFileSync(inputPath, 'utf8');
    const originalSize = Buffer.byteLength(content, 'utf8');
    
    // Apply optimizations
    content = this.optimizeCustomProperties(content);
    content = this.removeDuplicateRules(content);
    content = this.optimizeMediaQueries(content);
    content = this.minifyCSS(content);
    
    const optimizedSize = Buffer.byteLength(content, 'utf8');
    const savings = Math.round(((originalSize - optimizedSize) / originalSize) * 100);
    
    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, content);
    
    console.log(`  ${this.formatSize(originalSize)} → ${this.formatSize(optimizedSize)} (${savings}% reduction)`);
    
    return { originalSize, optimizedSize, savings };
  }

  // Process all CSS files
  processAllFiles() {
    console.log('🚀 Starting CSS optimization...\n');
    
    let totalOriginalSize = 0;
    let totalOptimizedSize = 0;
    let processedFiles = 0;
    
    const processDirectory = (inputDir, outputDir) => {
      const files = fs.readdirSync(inputDir);
      
      files.forEach(file => {
        const inputPath = path.join(inputDir, file);
        const outputPath = path.join(outputDir, file);
        const stat = fs.statSync(inputPath);
        
        if (stat.isDirectory()) {
          processDirectory(inputPath, outputPath);
        } else if (file.endsWith('.css')) {
          const result = this.processFile(inputPath, outputPath);
          totalOriginalSize += result.originalSize;
          totalOptimizedSize += result.optimizedSize;
          processedFiles++;
        }
      });
    };
    
    processDirectory(this.stylesDir, path.join(this.outputDir, 'styles'));
    
    // Also process App.css
    const appCssPath = path.join(this.srcDir, 'App.css');
    if (fs.existsSync(appCssPath)) {
      const result = this.processFile(appCssPath, path.join(this.outputDir, 'App.css'));
      totalOriginalSize += result.originalSize;
      totalOptimizedSize += result.optimizedSize;
      processedFiles++;
    }
    
    const totalSavings = Math.round(((totalOriginalSize - totalOptimizedSize) / totalOriginalSize) * 100);
    
    console.log('\n📊 Optimization Summary:');
    console.log(`   Files processed: ${processedFiles}`);
    console.log(`   Original size: ${this.formatSize(totalOriginalSize)}`);
    console.log(`   Optimized size: ${this.formatSize(totalOptimizedSize)}`);
    console.log(`   Total savings: ${this.formatSize(totalOriginalSize - totalOptimizedSize)} (${totalSavings}%)`);
    
    return {
      filesProcessed: processedFiles,
      originalSize: totalOriginalSize,
      optimizedSize: totalOptimizedSize,
      savings: totalSavings
    };
  }

  // Create a production-ready bundle
  createProductionBundle() {
    console.log('\n📦 Creating production CSS bundle...');
    
    const bundlePath = path.join(this.outputDir, 'bundle.min.css');
    let bundleContent = '';
    
    // Import order for the bundle (same as App.css)
    const importOrder = [
      'styles/01-reset.css',
      'styles/02-tokens.css',
      'styles/03-base.css',
      'styles/04-layout.css',
      'styles/05-components/buttons.css',
      'styles/05-components/forms.css',
      'styles/05-components/cards.css',
      'styles/05-components/navigation.css',
      'styles/06-features/loading.css',
      'styles/06-features/accessibility.css',
      'styles/06-features/high-contrast.css',
      'styles/06-features/demo.css',
      'styles/06-features/event-entry.css',
      'styles/06-features/hero-section.css',
      'styles/06-features/responsive-layout.css',
      'styles/06-features/responsive-mobile.css',
      'styles/06-features/responsive-tablet.css',
      'styles/06-features/responsive-desktop.css',
      'styles/07-pages/dashboard.css',
      'styles/07-pages/profile.css',
      'styles/07-pages/ranking.css',
      'styles/07-pages/admin.css',
      'styles/07-pages/auth.css',
      'styles/08-utilities.css',
      'styles/09-legacy.css'
    ];
    
    importOrder.forEach(relativePath => {
      const filePath = path.join(this.outputDir, relativePath);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        bundleContent += `/* ${relativePath} */\n${content}\n\n`;
      }
    });
    
    // Final minification of the bundle
    bundleContent = this.minifyCSS(bundleContent);
    
    fs.writeFileSync(bundlePath, bundleContent);
    
    const bundleSize = Buffer.byteLength(bundleContent, 'utf8');
    console.log(`   Bundle created: ${this.formatSize(bundleSize)}`);
    console.log(`   Location: ${bundlePath}`);
    
    return { bundlePath, bundleSize };
  }

  // Format file size for display
  formatSize(bytes) {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
    return `${Math.round(bytes / (1024 * 1024))}MB`;
  }

  // Run the complete optimization
  async run() {
    try {
      const optimizationResult = this.processAllFiles();
      const bundleResult = this.createProductionBundle();
      
      console.log('\n✅ CSS optimization complete!');
      console.log('\n🎯 Next Steps:');
      console.log('   • Review optimized files in dist-css/');
      console.log('   • Test the production bundle');
      console.log('   • Update build process to use optimized CSS');
      console.log('   • Consider implementing CSS-in-JS for critical path');
      
      return { ...optimizationResult, ...bundleResult };
      
    } catch (error) {
      console.error('❌ Error during CSS optimization:', error.message);
      throw error;
    }
  }
}

// Run the optimization
const minifier = new CSSMinifier();
minifier.run().catch(console.error);

export default CSSMinifier;