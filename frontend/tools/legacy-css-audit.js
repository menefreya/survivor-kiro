#!/usr/bin/env node

/**
 * Legacy CSS Audit Tool
 * 
 * Performs comprehensive audit of legacy CSS overrides.
 * Generates detailed reports for monthly reviews.
 */

import fs from 'fs';
import path from 'path';

const LEGACY_CSS_PATH = 'src/styles/09-legacy.css';
const TRACKING_PATH = 'src/styles/LEGACY_OVERRIDE_TRACKING.md';

class LegacyCSSAuditor {
  constructor() {
    this.overrides = [];
    this.resolvedOverrides = [];
    this.removedOverrides = [];
    this.metrics = {
      totalActive: 0,
      averageAge: 0,
      oldestOverride: null,
      newestOverride: null,
      byUrgency: { critical: 0, high: 0, medium: 0, unknown: 0 },
      byCategory: {}
    };
  }

  async audit() {
    console.log('🔍 Starting Legacy CSS Audit...\n');

    try {
      await this.parseOverrides();
      await this.parseResolvedOverrides();
      await this.parseRemovedOverrides();
      await this.calculateMetrics();
      await this.generateReport();
      
      console.log('✅ Legacy CSS audit completed');
      
    } catch (error) {
      console.error('❌ Legacy CSS audit failed:', error.message);
      process.exit(1);
    }
  }

  async parseOverrides() {
    if (!fs.existsSync(LEGACY_CSS_PATH)) {
      console.log('⚠️  Legacy CSS file not found, creating empty state report');
      return;
    }

    const content = fs.readFileSync(LEGACY_CSS_PATH, 'utf8');
    const lines = content.split('\n');
    
    let currentOverride = null;
    let inActiveSection = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Track sections
      if (line.includes('ACTIVE EMERGENCY OVERRIDES')) {
        inActiveSection = true;
        continue;
      }
      
      if (line.includes('RESOLVED OVERRIDES') || line.includes('OVERRIDE REMOVAL LOG')) {
        inActiveSection = false;
        continue;
      }
      
      // Only parse overrides in active section
      if (!inActiveSection) continue;
      
      // Start of override
      if (line.includes('EMERGENCY OVERRIDE -')) {
        const issueMatch = line.match(/EMERGENCY OVERRIDE - (.+)/);
        currentOverride = {
          issue: issueMatch ? issueMatch[1].trim() : 'Unknown',
          startLine: i + 1,
          dateAdded: null,
          urgency: null,
          reporter: null,
          timeline: null,
          category: null,
          description: '',
          solution: '',
          plan: '',
          criteria: '',
          cssLines: 0
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
          currentOverride.urgency = urgencyMatch ? urgencyMatch[1].toLowerCase() : 'unknown';
        }
        
        if (line.includes('Reporter:')) {
          const reporterMatch = line.match(/Reporter:\s*(.+)/);
          currentOverride.reporter = reporterMatch ? reporterMatch[1].trim() : null;
        }
        
        if (line.includes('Estimated Fix Timeline:')) {
          const timelineMatch = line.match(/Estimated Fix Timeline:\s*(.+)/);
          currentOverride.timeline = timelineMatch ? timelineMatch[1].trim() : null;
        }
        
        // Detect category from description
        if (line.toLowerCase().includes('safari') || line.toLowerCase().includes('firefox') || 
            line.toLowerCase().includes('chrome') || line.toLowerCase().includes('edge')) {
          currentOverride.category = 'browser-compatibility';
        } else if (line.toLowerCase().includes('accessibility') || line.toLowerCase().includes('a11y')) {
          currentOverride.category = 'accessibility';
        } else if (line.toLowerCase().includes('third-party') || line.toLowerCase().includes('library')) {
          currentOverride.category = 'third-party';
        } else if (line.toLowerCase().includes('performance')) {
          currentOverride.category = 'performance';
        }
        
        // Count CSS lines (rough estimate)
        if (line.trim().includes('{') || line.trim().includes('}') || 
            (line.trim().includes(':') && line.trim().includes(';'))) {
          currentOverride.cssLines++;
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

  async parseResolvedOverrides() {
    // Parse resolved overrides from legacy CSS comments
    if (!fs.existsSync(LEGACY_CSS_PATH)) return;

    const content = fs.readFileSync(LEGACY_CSS_PATH, 'utf8');
    const resolvedMatches = content.match(/\[RESOLVED-\d{4}-\d{2}-\d{2}\] - (.+)/g);
    
    if (resolvedMatches) {
      this.resolvedOverrides = resolvedMatches.map(match => {
        const parts = match.split(' - ');
        const dateMatch = parts[0].match(/\[RESOLVED-(\d{4}-\d{2}-\d{2})\]/);
        return {
          date: dateMatch ? dateMatch[1] : null,
          issue: parts[1] || 'Unknown',
          description: parts[2] || ''
        };
      });
    }
  }

  async parseRemovedOverrides() {
    // Parse removal log from legacy CSS comments
    if (!fs.existsSync(LEGACY_CSS_PATH)) return;

    const content = fs.readFileSync(LEGACY_CSS_PATH, 'utf8');
    const removedMatches = content.match(/\d{4}-\d{2}-\d{2} - (.+)/g);
    
    if (removedMatches) {
      this.removedOverrides = removedMatches.map(match => {
        const parts = match.split(' - ');
        return {
          date: parts[0],
          issue: parts[1] || 'Unknown',
          description: parts[2] || '',
          location: parts[3] || 'Unknown'
        };
      });
    }
  }

  async calculateMetrics() {
    this.metrics.totalActive = this.overrides.length;
    
    if (this.overrides.length === 0) {
      return;
    }
    
    // Calculate ages
    const now = new Date();
    const ages = this.overrides
      .filter(o => o.dateAdded)
      .map(o => Math.floor((now - new Date(o.dateAdded)) / (24 * 60 * 60 * 1000)));
    
    if (ages.length > 0) {
      this.metrics.averageAge = Math.round(ages.reduce((sum, age) => sum + age, 0) / ages.length);
      
      const oldestAge = Math.max(...ages);
      const newestAge = Math.min(...ages);
      
      this.metrics.oldestOverride = this.overrides.find(o => {
        if (!o.dateAdded) return false;
        const age = Math.floor((now - new Date(o.dateAdded)) / (24 * 60 * 60 * 1000));
        return age === oldestAge;
      });
      
      this.metrics.newestOverride = this.overrides.find(o => {
        if (!o.dateAdded) return false;
        const age = Math.floor((now - new Date(o.dateAdded)) / (24 * 60 * 60 * 1000));
        return age === newestAge;
      });
    }
    
    // Count by urgency
    this.overrides.forEach(override => {
      const urgency = override.urgency || 'unknown';
      this.metrics.byUrgency[urgency] = (this.metrics.byUrgency[urgency] || 0) + 1;
    });
    
    // Count by category
    this.overrides.forEach(override => {
      const category = override.category || 'uncategorized';
      this.metrics.byCategory[category] = (this.metrics.byCategory[category] || 0) + 1;
    });
  }

  async generateReport() {
    const now = new Date();
    const monthYear = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    console.log(`📊 Legacy CSS Audit Report - ${monthYear}`);
    console.log('='.repeat(60));
    
    // Executive Summary
    console.log('\n📋 Executive Summary:');
    console.log(`   Active Overrides: ${this.metrics.totalActive}`);
    console.log(`   Resolved This Period: ${this.resolvedOverrides.length}`);
    console.log(`   Average Age: ${this.metrics.averageAge} days`);
    
    if (this.metrics.totalActive === 0) {
      console.log('   🎉 Status: EXCELLENT - No active overrides!');
    } else if (this.metrics.totalActive <= 3) {
      console.log('   ✅ Status: GOOD - Low override count');
    } else if (this.metrics.totalActive <= 7) {
      console.log('   ⚠️  Status: WARNING - Moderate override count');
    } else {
      console.log('   🚨 Status: CRITICAL - High override count');
    }
    
    // Active Overrides Detail
    if (this.overrides.length > 0) {
      console.log('\n📝 Active Overrides:');
      console.log('   Issue | Age | Urgency | Category | Reporter');
      console.log('   ' + '-'.repeat(55));
      
      this.overrides.forEach(override => {
        const age = override.dateAdded ? 
          Math.floor((now - new Date(override.dateAdded)) / (24 * 60 * 60 * 1000)) : 
          '?';
        const urgency = (override.urgency || 'unknown').padEnd(8);
        const category = (override.category || 'uncategorized').padEnd(12);
        const reporter = (override.reporter || 'unknown').substring(0, 15);
        
        console.log(`   ${override.issue.substring(0, 12).padEnd(12)} | ${String(age).padEnd(3)} | ${urgency} | ${category} | ${reporter}`);
      });
    }
    
    // Metrics Breakdown
    console.log('\n📊 Metrics Breakdown:');
    
    console.log('\n   By Urgency:');
    Object.entries(this.metrics.byUrgency).forEach(([urgency, count]) => {
      if (count > 0) {
        console.log(`     ${urgency}: ${count}`);
      }
    });
    
    if (Object.keys(this.metrics.byCategory).length > 0) {
      console.log('\n   By Category:');
      Object.entries(this.metrics.byCategory).forEach(([category, count]) => {
        console.log(`     ${category}: ${count}`);
      });
    }
    
    // Age Analysis
    if (this.overrides.length > 0) {
      console.log('\n⏰ Age Analysis:');
      
      const oldOverrides = this.overrides.filter(o => {
        if (!o.dateAdded) return false;
        const age = (now - new Date(o.dateAdded)) / (24 * 60 * 60 * 1000);
        return age > 30;
      });
      
      const staleOverrides = this.overrides.filter(o => {
        if (!o.dateAdded) return false;
        const age = (now - new Date(o.dateAdded)) / (24 * 60 * 60 * 1000);
        return age > 14 && age <= 30;
      });
      
      console.log(`   Overdue (>30 days): ${oldOverrides.length}`);
      console.log(`   Stale (14-30 days): ${staleOverrides.length}`);
      console.log(`   Recent (<14 days): ${this.overrides.length - oldOverrides.length - staleOverrides.length}`);
      
      if (this.metrics.oldestOverride) {
        const oldestAge = Math.floor((now - new Date(this.metrics.oldestOverride.dateAdded)) / (24 * 60 * 60 * 1000));
        console.log(`   Oldest Override: ${this.metrics.oldestOverride.issue} (${oldestAge} days)`);
      }
    }
    
    // Recommendations
    console.log('\n💡 Recommendations:');
    
    if (this.metrics.totalActive === 0) {
      console.log('   🎯 Maintain current excellent state');
      console.log('   📚 Consider documenting lessons learned');
      console.log('   🔄 Review process for any improvements');
    } else {
      if (this.metrics.totalActive > 5) {
        console.log('   🚨 URGENT: Schedule dedicated override cleanup sprint');
      }
      
      const oldCount = this.overrides.filter(o => {
        if (!o.dateAdded) return false;
        const age = (now - new Date(o.dateAdded)) / (24 * 60 * 60 * 1000);
        return age > 30;
      }).length;
      
      if (oldCount > 0) {
        console.log(`   ⏰ PRIORITY: Fix ${oldCount} overrides older than 30 days`);
      }
      
      const undocumented = this.overrides.filter(o => !o.urgency || !o.reporter).length;
      if (undocumented > 0) {
        console.log(`   📝 Complete documentation for ${undocumented} overrides`);
      }
      
      // Category-specific recommendations
      if (this.metrics.byCategory['browser-compatibility'] > 2) {
        console.log('   🌐 Consider browser compatibility testing improvements');
      }
      
      if (this.metrics.byCategory['third-party'] > 1) {
        console.log('   📦 Review third-party library integration process');
      }
      
      if (this.metrics.byCategory['accessibility'] > 0) {
        console.log('   ♿ Prioritize accessibility fixes for compliance');
      }
    }
    
    // Trend Analysis
    console.log('\n📈 Trend Analysis:');
    
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    
    const newThisMonth = this.overrides.filter(o => {
      if (!o.dateAdded) return false;
      const date = new Date(o.dateAdded);
      return date.getMonth() === thisMonth && date.getFullYear() === thisYear;
    }).length;
    
    const resolvedThisMonth = this.resolvedOverrides.filter(o => {
      if (!o.date) return false;
      const date = new Date(o.date);
      return date.getMonth() === thisMonth && date.getFullYear() === thisYear;
    }).length;
    
    console.log(`   New this month: ${newThisMonth}`);
    console.log(`   Resolved this month: ${resolvedThisMonth}`);
    console.log(`   Net change: ${newThisMonth - resolvedThisMonth > 0 ? '+' : ''}${newThisMonth - resolvedThisMonth}`);
    
    if (newThisMonth > resolvedThisMonth) {
      console.log('   📊 Trend: INCREASING (concerning)');
    } else if (newThisMonth < resolvedThisMonth) {
      console.log('   📊 Trend: DECREASING (good)');
    } else {
      console.log('   📊 Trend: STABLE');
    }
    
    // Next Steps
    console.log('\n🎯 Next Steps:');
    console.log('   1. Review all overrides older than 14 days');
    console.log('   2. Update issue tracking with current status');
    console.log('   3. Schedule proper fixes for high-priority overrides');
    console.log('   4. Update team on override status');
    
    if (this.metrics.totalActive > 0) {
      console.log('   5. Plan next review for 1 week (high activity)');
    } else {
      console.log('   5. Plan next review for 1 month (low activity)');
    }
    
    // Update tracking file
    await this.updateTrackingFile();
  }

  async updateTrackingFile() {
    if (!fs.existsSync(TRACKING_PATH)) {
      console.log('\n⚠️  Tracking file not found, skipping update');
      return;
    }
    
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    
    // Read current tracking file
    let content = fs.readFileSync(TRACKING_PATH, 'utf8');
    
    // Update the status section
    const statusUpdate = `**Last Updated**: ${dateStr}  
**Active Overrides**: ${this.metrics.totalActive}  
**File Size**: ~${this.overrides.reduce((sum, o) => sum + o.cssLines, 0)} lines of CSS  
**Status**: ${this.getHealthStatus()}`;
    
    // Replace the status section
    content = content.replace(
      /\*\*Last Updated\*\*:.*?\*\*Status\*\*:.*?(?=\n\n|\n##)/s,
      statusUpdate
    );
    
    // Write back to file
    fs.writeFileSync(TRACKING_PATH, content);
    console.log(`\n📝 Updated tracking file: ${TRACKING_PATH}`);
  }

  getHealthStatus() {
    if (this.metrics.totalActive === 0) {
      return '✅ HEALTHY (Target: 0 active overrides)';
    } else if (this.metrics.totalActive <= 3) {
      return '🟡 GOOD (Low override count)';
    } else if (this.metrics.totalActive <= 7) {
      return '🟠 WARNING (Moderate override count)';
    } else {
      return '🔴 CRITICAL (High override count)';
    }
  }
}

// Run the auditor
const auditor = new LegacyCSSAuditor();
auditor.audit().catch(error => {
  console.error('Audit failed:', error);
  process.exit(1);
});