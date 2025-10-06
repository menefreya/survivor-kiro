#!/usr/bin/env node

/**
 * Legacy CSS Monitor
 * 
 * Monitors the legacy CSS file for overrides and alerts on issues.
 * Used in CI/CD pipeline and pre-build checks.
 */

import fs from 'fs';
import path from 'path';

const LEGACY_CSS_PATH = 'src/styles/09-legacy.css';
const MAX_OVERRIDES = 10;
const MAX_CSS_LINES = 50;
const MAX_AGE_DAYS = 30;

class LegacyCSSMonitor {
  constructor() {
    this.warnings = [];
    this.errors = [];
    this.overrides = [];
  }

  async monitor() {
    console.log('🔍 Monitoring Legacy CSS Overrides...\n');

    try {
      await this.checkFileExists();
      await this.parseOverrides();
      await this.checkOverrideCount();
      await this.checkFileSize();
      await this.checkOverrideAge();
      await this.checkDocumentation();
      
      this.printResults();
      
      // Exit with error code if there are errors
      if (this.errors.length > 0) {
        process.exit(1);
      }
      
      // Exit with warning code if there are warnings
      if (this.warnings.length > 0) {
        process.exit(2);
      }
      
      console.log('✅ Legacy CSS monitoring passed');
      
    } catch (error) {
      console.error('❌ Legacy CSS monitoring failed:', error.message);
      process.exit(1);
    }
  }

  async checkFileExists() {
    if (!fs.existsSync(LEGACY_CSS_PATH)) {
      this.errors.push('Legacy CSS file not found: ' + LEGACY_CSS_PATH);
      return;
    }
  }

  async parseOverrides() {
    const content = fs.readFileSync(LEGACY_CSS_PATH, 'utf8');
    const lines = content.split('\n');
    
    let currentOverride = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Start of override
      if (line.includes('EMERGENCY OVERRIDE -')) {
        const issueMatch = line.match(/EMERGENCY OVERRIDE - (.+)/);
        currentOverride = {
          issue: issueMatch ? issueMatch[1].trim() : 'Unknown',
          startLine: i + 1,
          dateAdded: null,
          urgency: null,
          documented: false
        };
      }
      
      // Parse override details
      if (currentOverride) {
        if (line.includes('Date Added:')) {
          const dateMatch = line.match(/Date Added:\s*(\d{4}-\d{2}-\d{2})/);
          currentOverride.dateAdded = dateMatch ? dateMatch[1] : null;
        }
        
        if (line.includes('Urgency:')) {
          const urgencyMatch = line.match(/Urgency:\s*(\w+)/);
          currentOverride.urgency = urgencyMatch ? urgencyMatch[1] : null;
        }
        
        if (line.includes('Problem Description:') || 
            line.includes('Temporary Solution:') ||
            line.includes('Proper Solution Plan:')) {
          currentOverride.documented = true;
        }
        
        // End of override
        if (line.includes('End Emergency Override')) {
          currentOverride.endLine = i + 1;
          this.overrides.push(currentOverride);
          currentOverride = null;
        }
      }
    }
  }

  async checkOverrideCount() {
    const count = this.overrides.length;
    
    if (count > MAX_OVERRIDES) {
      this.errors.push(`Too many active overrides: ${count} > ${MAX_OVERRIDES}`);
    } else if (count > 5) {
      this.warnings.push(`High number of active overrides: ${count} > 5`);
    }
    
    console.log(`📊 Active overrides: ${count}`);
  }

  async checkFileSize() {
    const content = fs.readFileSync(LEGACY_CSS_PATH, 'utf8');
    const lines = content.split('\n');
    
    // Count actual CSS lines (not comments or empty lines)
    const cssLines = lines.filter(line => {
      const trimmed = line.trim();
      return trimmed && 
             !trimmed.startsWith('/*') && 
             !trimmed.startsWith('*') && 
             !trimmed.startsWith('//') &&
             trimmed !== '*/';
    });
    
    const cssLineCount = cssLines.length;
    
    if (cssLineCount > MAX_CSS_LINES) {
      this.errors.push(`Legacy CSS file too large: ${cssLineCount} > ${MAX_CSS_LINES} lines of CSS`);
    } else if (cssLineCount > 25) {
      this.warnings.push(`Legacy CSS file growing: ${cssLineCount} > 25 lines of CSS`);
    }
    
    console.log(`📏 CSS lines: ${cssLineCount}`);
  }

  async checkOverrideAge() {
    const now = new Date();
    const maxAgeMs = MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
    
    for (const override of this.overrides) {
      if (!override.dateAdded) {
        this.errors.push(`Override ${override.issue} missing date`);
        continue;
      }
      
      const addedDate = new Date(override.dateAdded);
      const age = now - addedDate;
      const ageDays = Math.floor(age / (24 * 60 * 60 * 1000));
      
      if (age > maxAgeMs) {
        this.errors.push(`Override ${override.issue} is ${ageDays} days old (> ${MAX_AGE_DAYS} days)`);
      } else if (ageDays > 14) {
        this.warnings.push(`Override ${override.issue} is ${ageDays} days old`);
      }
    }
  }

  async checkDocumentation() {
    for (const override of this.overrides) {
      if (!override.documented) {
        this.errors.push(`Override ${override.issue} missing required documentation`);
      }
      
      if (!override.urgency) {
        this.warnings.push(`Override ${override.issue} missing urgency level`);
      }
    }
  }

  printResults() {
    console.log('\n📋 Legacy CSS Monitor Results:');
    
    if (this.overrides.length === 0) {
      console.log('✅ No active overrides (ideal state!)');
      return;
    }
    
    // Print override summary
    console.log('\n📝 Active Overrides:');
    this.overrides.forEach((override, index) => {
      const age = override.dateAdded ? 
        Math.floor((new Date() - new Date(override.dateAdded)) / (24 * 60 * 60 * 1000)) : 
        'Unknown';
      
      console.log(`  ${index + 1}. ${override.issue}`);
      console.log(`     Age: ${age} days | Urgency: ${override.urgency || 'Unknown'}`);
      console.log(`     Lines: ${override.startLine}-${override.endLine || '?'}`);
    });
    
    // Print warnings
    if (this.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      this.warnings.forEach(warning => {
        console.log(`  - ${warning}`);
      });
    }
    
    // Print errors
    if (this.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.errors.forEach(error => {
        console.log(`  - ${error}`);
      });
    }
    
    // Print recommendations
    if (this.overrides.length > 0) {
      console.log('\n💡 Recommendations:');
      
      if (this.overrides.length > 3) {
        console.log('  - Schedule dedicated time to resolve overrides');
      }
      
      const oldOverrides = this.overrides.filter(o => {
        if (!o.dateAdded) return false;
        const age = (new Date() - new Date(o.dateAdded)) / (24 * 60 * 60 * 1000);
        return age > 14;
      });
      
      if (oldOverrides.length > 0) {
        console.log('  - Prioritize fixing overrides older than 2 weeks');
      }
      
      const undocumented = this.overrides.filter(o => !o.documented);
      if (undocumented.length > 0) {
        console.log('  - Complete documentation for all overrides');
      }
    }
  }
}

// Run the monitor
const monitor = new LegacyCSSMonitor();
monitor.monitor().catch(error => {
  console.error('Monitor failed:', error);
  process.exit(1);
});