#!/usr/bin/env node

/**
 * CSS Specificity Audit Tool
 * 
 * Analyzes CSS files for high specificity selectors that exceed 0,0,3,0
 * and identifies other CSS architecture issues.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Calculate CSS specificity (a, b, c, d) where:
// a = inline styles (not applicable for CSS files)
// b = IDs
// c = classes, attributes, pseudo-classes
// d = elements, pseudo-elements
function calculateSpecificity(selector) {
  // Remove pseudo-elements and clean up selector
  const cleanSelector = selector
    .replace(/::?[\w-]+(\([^)]*\))?/g, '') // Remove pseudo-classes/elements
    .replace(/\s*[>+~]\s*/g, ' ') // Normalize combinators
    .trim();

  let ids = 0;
  let classes = 0;
  let elements = 0;

  // Count IDs
  const idMatches = cleanSelector.match(/#[\w-]+/g);
  if (idMatches) ids = idMatches.length;

  // Count classes, attributes, pseudo-classes
  const classMatches = cleanSelector.match(/\.[\w-]+|\[[\w-]+[^\]]*\]|:[\w-]+(\([^)]*\))?/g);
  if (classMatches) classes = classMatches.length;

  // Count elements (excluding pseudo-elements)
  const elementMatches = cleanSelector.match(/\b[a-z][\w-]*(?![[\w-])/g);
  if (elementMatches) {
    // Filter out pseudo-class keywords and attribute values
    const validElements = elementMatches.filter(match => 
      !['not', 'is', 'where', 'has', 'nth', 'first', 'last', 'only', 'root', 'empty'].includes(match)
    );
    elements = validElements.length;
  }

  return { ids, classes, elements, total: ids * 100 + classes * 10 + elements };
}

// Parse CSS content and extract selectors
function parseCSS(content) {
  const selectors = [];
  
  // Remove comments
  content = content.replace(/\/\*[\s\S]*?\*\//g, '');
  
  // Match CSS rules
  const ruleRegex = /([^{}]+)\s*\{[^}]*\}/g;
  let match;
  
  while ((match = ruleRegex.exec(content)) !== null) {
    const selectorGroup = match[1].trim();
    
    // Skip @rules
    if (selectorGroup.startsWith('@')) continue;
    
    // Split multiple selectors
    const individualSelectors = selectorGroup.split(',').map(s => s.trim());
    
    individualSelectors.forEach(selector => {
      if (selector) {
        const specificity = calculateSpecificity(selector);
        selectors.push({
          selector: selector,
          specificity: specificity,
          line: content.substring(0, match.index).split('\n').length
        });
      }
    });
  }
  
  return selectors;
}

// Analyze a single CSS file
function analyzeFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const selectors = parseCSS(content);
    
    const issues = {
      highSpecificity: [],
      idSelectors: [],
      importantDeclarations: [],
      deepNesting: []
    };
    
    selectors.forEach(item => {
      const { selector, specificity, line } = item;
      
      // Check for high specificity (more than 3 classes/attributes)
      if (specificity.classes > 3 || specificity.total > 30) {
        issues.highSpecificity.push({
          selector,
          specificity: `${specificity.ids},${specificity.classes},${specificity.elements}`,
          line,
          total: specificity.total
        });
      }
      
      // Check for ID selectors
      if (specificity.ids > 0) {
        issues.idSelectors.push({
          selector,
          line
        });
      }
      
      // Check for deep nesting (more than 4 levels)
      const nestingLevel = (selector.match(/\s+/g) || []).length + 1;
      if (nestingLevel > 4) {
        issues.deepNesting.push({
          selector,
          nestingLevel,
          line
        });
      }
    });
    
    // Check for !important declarations (skip utility and accessibility files)
    const fileName = path.basename(filePath);
    const allowImportant = fileName.includes('utilities') || 
                          fileName.includes('accessibility') || 
                          fileName.includes('reset') ||
                          fileName.includes('tokens');
    
    if (!allowImportant) {
      const importantMatches = content.matchAll(/([^{};]+)\s*:\s*[^;]*!important/g);
      for (const match of importantMatches) {
        const line = content.substring(0, match.index).split('\n').length;
        issues.importantDeclarations.push({
          property: match[1].trim(),
          line
        });
      }
    }
    
    return {
      file: filePath,
      totalSelectors: selectors.length,
      issues
    };
    
  } catch (error) {
    console.error(`Error analyzing ${filePath}:`, error.message);
    return null;
  }
}

// Find all CSS files in a directory
function findCSSFiles(dir) {
  const cssFiles = [];
  
  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    items.forEach(item => {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        traverse(fullPath);
      } else if (item.endsWith('.css')) {
        cssFiles.push(fullPath);
      }
    });
  }
  
  traverse(dir);
  return cssFiles;
}

// Main analysis function
function auditCSS(stylesDir) {
  console.log('🔍 CSS Specificity Audit Report\n');
  console.log('=' .repeat(50));
  
  const cssFiles = findCSSFiles(stylesDir);
  let totalIssues = 0;
  let totalFiles = 0;
  
  cssFiles.forEach(file => {
    const result = analyzeFile(file);
    if (!result) return;
    
    totalFiles++;
    const relativePath = path.relative(stylesDir, file);
    const hasIssues = Object.values(result.issues).some(arr => arr.length > 0);
    
    if (hasIssues) {
      console.log(`\n📁 ${relativePath}`);
      console.log(`   Total selectors: ${result.totalSelectors}`);
      
      // High specificity issues
      if (result.issues.highSpecificity.length > 0) {
        console.log(`\n   ⚠️  High Specificity (>${3} classes):`);
        result.issues.highSpecificity.forEach(issue => {
          console.log(`      Line ${issue.line}: ${issue.selector}`);
          console.log(`      Specificity: 0,${issue.specificity} (total: ${issue.total})`);
        });
        totalIssues += result.issues.highSpecificity.length;
      }
      
      // ID selector issues
      if (result.issues.idSelectors.length > 0) {
        console.log(`\n   🚫 ID Selectors (should use classes):`);
        result.issues.idSelectors.forEach(issue => {
          console.log(`      Line ${issue.line}: ${issue.selector}`);
        });
        totalIssues += result.issues.idSelectors.length;
      }
      
      // Deep nesting issues
      if (result.issues.deepNesting.length > 0) {
        console.log(`\n   🔗 Deep Nesting (>4 levels):`);
        result.issues.deepNesting.forEach(issue => {
          console.log(`      Line ${issue.line}: ${issue.selector} (${issue.nestingLevel} levels)`);
        });
        totalIssues += result.issues.deepNesting.length;
      }
      
      // !important issues
      if (result.issues.importantDeclarations.length > 0) {
        console.log(`\n   ❗ !important Declarations:`);
        result.issues.importantDeclarations.forEach(issue => {
          console.log(`      Line ${issue.line}: ${issue.property}`);
        });
        totalIssues += result.issues.importantDeclarations.length;
      }
    } else {
      console.log(`\n✅ ${relativePath} - No issues found`);
    }
  });
  
  console.log('\n' + '=' .repeat(50));
  console.log(`\n📊 Summary:`);
  console.log(`   Files analyzed: ${totalFiles}`);
  console.log(`   Total issues found: ${totalIssues}`);
  
  if (totalIssues === 0) {
    console.log(`\n🎉 All CSS files follow specificity best practices!`);
  } else {
    console.log(`\n🔧 Recommendations:`);
    console.log(`   • Refactor high specificity selectors to use BEM classes`);
    console.log(`   • Replace ID selectors with classes`);
    console.log(`   • Reduce nesting depth by creating specific BEM classes`);
    console.log(`   • Remove !important declarations (except in accessibility.css)`);
  }
  
  return totalIssues;
}

// Run the audit
if (process.argv[1] && process.argv[1].endsWith('css-specificity-audit.js')) {
  const defaultStylesDir = path.resolve(__dirname, '../src/styles');
  const stylesDir = process.argv[2] || defaultStylesDir;
  
  if (!fs.existsSync(stylesDir)) {
    console.error(`❌ Directory not found: ${stylesDir}`);
    console.error(`   Looked in: ${path.resolve(stylesDir)}`);
    process.exit(1);
  }
  
  const issueCount = auditCSS(stylesDir);
  process.exit(issueCount > 0 ? 1 : 0);
}

export { auditCSS, analyzeFile, calculateSpecificity };