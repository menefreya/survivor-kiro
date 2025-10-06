#!/usr/bin/env node

/**
 * Legacy CSS Report Generator
 * 
 * Generates formatted reports for team communication and management.
 * Outputs JSON, Markdown, and CSV formats.
 */

import fs from 'fs';
import path from 'path';

const LEGACY_CSS_PATH = 'src/styles/09-legacy.css';
const OUTPUT_DIR = 'reports';

class LegacyCSSReporter {
  constructor() {
    this.overrides = [];
    this.report = {
      generated: new Date().toISOString(),
      summary: {},
      overrides: [],
      metrics: {},
      recommendations: []
    };
  }

  async generateReports() {
    console.log('📊 Generating Legacy CSS Reports...\n');

    try {
      await this.parseOverrides();
      await this.buildReport();
      await this.ensureOutputDir();
      await this.generateJSON();
      await this.generateMarkdown();
      await this.generateCSV();
      await this.generateSlackSummary();
      
      console.log('✅ All reports generated successfully');
      
    } catch (error) {
      console.error('❌ Report generation failed:', error.message);
      process.exit(1);
    }
  }

  async parseOverrides() {
    if (!fs.existsSync(LEGACY_CSS_PATH)) {
      console.log('⚠️  Legacy CSS file not found, generating empty reports');
      return;
    }

    const content = fs.readFileSync(LEGACY_CSS_PATH, 'utf8');
    const lines = content.split('\n');
    
    let currentOverride = null;
    let inActiveSection = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.includes('ACTIVE EMERGENCY OVERRIDES')) {
        inActiveSection = true;
        continue;
      }
      
      if (line.includes('RESOLVED OVERRIDES') || line.includes('OVERRIDE REMOVAL LOG')) {
        inActiveSection = false;
        continue;
      }
      
      if (!inActiveSection) continue;
      
      if (line.includes('EMERGENCY OVERRIDE -')) {
        const issueMatch = line.match(/EMERGENCY OVERRIDE - (.+)/);
        currentOverride = {
          issue: issueMatch ? issueMatch[1].trim() : 'Unknown',
          startLine: i + 1,
          dateAdded: null,
          urgency: null,
          reporter: null,
          timeline: null,
          description: '',
          solution: '',
          plan: '',
          criteria: '',
          age: null,
          status: 'active'
        };
      }
      
      if (currentOverride) {
        if (line.includes('Date Added:')) {
          const dateMatch = line.match(/Date Added:\s*(\d{4}-\d{2}-\d{2})/);
          if (dateMatch) {
            currentOverride.dateAdded = dateMatch[1];
            const now = new Date();
            const addedDate = new Date(dateMatch[1]);
            currentOverride.age = Math.floor((now - addedDate) / (24 * 60 * 60 * 1000));
          }
        }
        
        if (line.includes('Urgency:')) {
          const urgencyMatch = line.match(/Urgency:\s*(\w+)/);
          currentOverride.urgency = urgencyMatch ? urgencyMatch[1] : null;
        }
        
        if (line.includes('Reporter:')) {
          const reporterMatch = line.match(/Reporter:\s*(.+)/);
          currentOverride.reporter = reporterMatch ? reporterMatch[1].trim() : null;
        }
        
        if (line.includes('Estimated Fix Timeline:')) {
          const timelineMatch = line.match(/Estimated Fix Timeline:\s*(.+)/);
          currentOverride.timeline = timelineMatch ? timelineMatch[1].trim() : null;
        }
        
        if (line.includes('Problem Description:')) {
          currentOverride.description = this.extractMultilineContent(lines, i);
        }
        
        if (line.includes('Temporary Solution:')) {
          currentOverride.solution = this.extractMultilineContent(lines, i);
        }
        
        if (line.includes('Proper Solution Plan:')) {
          currentOverride.plan = this.extractMultilineContent(lines, i);
        }
        
        if (line.includes('Removal Criteria:')) {
          currentOverride.criteria = this.extractMultilineContent(lines, i);
        }
        
        if (line.includes('End Emergency Override')) {
          currentOverride.endLine = i + 1;
          this.overrides.push(currentOverride);
          currentOverride = null;
        }
      }
    }
  }

  extractMultilineContent(lines, startIndex) {
    let content = '';
    for (let i = startIndex + 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('*') && (line.includes(':') || line.includes('End Emergency'))) {
        break;
      }
      if (line.trim().startsWith('*')) {
        content += line.replace(/^\s*\*\s*/, '').trim() + ' ';
      }
    }
    return content.trim();
  }

  async buildReport() {
    const now = new Date();
    
    // Summary
    this.report.summary = {
      totalActive: this.overrides.length,
      averageAge: this.overrides.length > 0 ? 
        Math.round(this.overrides.reduce((sum, o) => sum + (o.age || 0), 0) / this.overrides.length) : 0,
      oldestAge: this.overrides.length > 0 ? Math.max(...this.overrides.map(o => o.age || 0)) : 0,
      newestAge: this.overrides.length > 0 ? Math.min(...this.overrides.map(o => o.age || 0)) : 0,
      status: this.getHealthStatus()
    };
    
    // Overrides
    this.report.overrides = this.overrides.map(override => ({
      ...override,
      riskLevel: this.calculateRiskLevel(override),
      priority: this.calculatePriority(override)
    }));
    
    // Metrics
    this.report.metrics = {
      byUrgency: this.groupBy(this.overrides, 'urgency'),
      byAge: {
        recent: this.overrides.filter(o => (o.age || 0) <= 7).length,
        moderate: this.overrides.filter(o => (o.age || 0) > 7 && (o.age || 0) <= 30).length,
        old: this.overrides.filter(o => (o.age || 0) > 30).length
      },
      byReporter: this.groupBy(this.overrides, 'reporter')
    };
    
    // Recommendations
    this.report.recommendations = this.generateRecommendations();
  }

  groupBy(array, key) {
    return array.reduce((groups, item) => {
      const value = item[key] || 'unknown';
      groups[value] = (groups[value] || 0) + 1;
      return groups;
    }, {});
  }

  calculateRiskLevel(override) {
    let risk = 0;
    
    // Age factor
    if ((override.age || 0) > 60) risk += 3;
    else if ((override.age || 0) > 30) risk += 2;
    else if ((override.age || 0) > 14) risk += 1;
    
    // Urgency factor
    if (override.urgency === 'critical') risk += 2;
    else if (override.urgency === 'high') risk += 1;
    
    // Documentation factor
    if (!override.description || !override.plan) risk += 1;
    
    if (risk >= 4) return 'high';
    if (risk >= 2) return 'medium';
    return 'low';
  }

  calculatePriority(override) {
    const age = override.age || 0;
    const urgency = override.urgency || 'unknown';
    
    if (urgency === 'critical' || age > 60) return 1;
    if (urgency === 'high' || age > 30) return 2;
    if (age > 14) return 3;
    return 4;
  }

  generateRecommendations() {
    const recommendations = [];
    
    if (this.overrides.length === 0) {
      recommendations.push({
        type: 'success',
        message: 'Excellent! No active overrides. Maintain current practices.',
        action: 'Continue monitoring and prevention'
      });
      return recommendations;
    }
    
    // High priority recommendations
    const oldOverrides = this.overrides.filter(o => (o.age || 0) > 30);
    if (oldOverrides.length > 0) {
      recommendations.push({
        type: 'urgent',
        message: `${oldOverrides.length} overrides are older than 30 days`,
        action: 'Schedule immediate cleanup sprint'
      });
    }
    
    const criticalOverrides = this.overrides.filter(o => o.urgency === 'critical');
    if (criticalOverrides.length > 0) {
      recommendations.push({
        type: 'urgent',
        message: `${criticalOverrides.length} critical overrides need immediate attention`,
        action: 'Prioritize critical override resolution'
      });
    }
    
    // Medium priority recommendations
    if (this.overrides.length > 5) {
      recommendations.push({
        type: 'warning',
        message: 'High number of active overrides indicates process issues',
        action: 'Review override prevention strategies'
      });
    }
    
    const undocumented = this.overrides.filter(o => !o.description || !o.plan);
    if (undocumented.length > 0) {
      recommendations.push({
        type: 'warning',
        message: `${undocumented.length} overrides lack proper documentation`,
        action: 'Complete documentation for all overrides'
      });
    }
    
    // Low priority recommendations
    const staleOverrides = this.overrides.filter(o => (o.age || 0) > 14 && (o.age || 0) <= 30);
    if (staleOverrides.length > 0) {
      recommendations.push({
        type: 'info',
        message: `${staleOverrides.length} overrides are becoming stale (14-30 days)`,
        action: 'Plan resolution within next sprint'
      });
    }
    
    return recommendations;
  }

  getHealthStatus() {
    if (this.overrides.length === 0) return 'excellent';
    if (this.overrides.length <= 3) return 'good';
    if (this.overrides.length <= 7) return 'warning';
    return 'critical';
  }

  async ensureOutputDir() {
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
  }

  async generateJSON() {
    const filename = `${OUTPUT_DIR}/legacy-css-report.json`;
    fs.writeFileSync(filename, JSON.stringify(this.report, null, 2));
    console.log(`📄 JSON report: ${filename}`);
  }

  async generateMarkdown() {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    let markdown = `# Legacy CSS Override Report\n\n`;
    markdown += `**Generated**: ${dateStr}\n`;
    markdown += `**Status**: ${this.report.summary.status.toUpperCase()}\n\n`;
    
    // Executive Summary
    markdown += `## Executive Summary\n\n`;
    markdown += `- **Active Overrides**: ${this.report.summary.totalActive}\n`;
    markdown += `- **Average Age**: ${this.report.summary.averageAge} days\n`;
    markdown += `- **Oldest Override**: ${this.report.summary.oldestAge} days\n`;
    markdown += `- **Health Status**: ${this.getStatusEmoji()} ${this.report.summary.status}\n\n`;
    
    // Active Overrides
    if (this.overrides.length > 0) {
      markdown += `## Active Overrides\n\n`;
      markdown += `| Issue | Age | Urgency | Risk | Priority | Reporter |\n`;
      markdown += `|-------|-----|---------|------|----------|----------|\n`;
      
      this.report.overrides
        .sort((a, b) => a.priority - b.priority)
        .forEach(override => {
          markdown += `| ${override.issue} | ${override.age || '?'} days | ${override.urgency || 'unknown'} | ${override.riskLevel} | P${override.priority} | ${override.reporter || 'unknown'} |\n`;
        });
      
      markdown += `\n`;
    }
    
    // Metrics
    markdown += `## Metrics\n\n`;
    markdown += `### By Urgency\n`;
    Object.entries(this.report.metrics.byUrgency).forEach(([urgency, count]) => {
      markdown += `- **${urgency}**: ${count}\n`;
    });
    
    markdown += `\n### By Age\n`;
    markdown += `- **Recent (≤7 days)**: ${this.report.metrics.byAge.recent}\n`;
    markdown += `- **Moderate (8-30 days)**: ${this.report.metrics.byAge.moderate}\n`;
    markdown += `- **Old (>30 days)**: ${this.report.metrics.byAge.old}\n\n`;
    
    // Recommendations
    if (this.report.recommendations.length > 0) {
      markdown += `## Recommendations\n\n`;
      this.report.recommendations.forEach(rec => {
        const emoji = rec.type === 'urgent' ? '🚨' : rec.type === 'warning' ? '⚠️' : 'ℹ️';
        markdown += `${emoji} **${rec.message}**\n`;
        markdown += `   - Action: ${rec.action}\n\n`;
      });
    }
    
    // Next Steps
    markdown += `## Next Steps\n\n`;
    markdown += `1. Review all overrides with Priority 1-2\n`;
    markdown += `2. Update issue tracking with current status\n`;
    markdown += `3. Schedule proper fixes for high-risk overrides\n`;
    markdown += `4. Complete documentation for undocumented overrides\n`;
    markdown += `5. Plan next review based on current activity level\n\n`;
    
    markdown += `---\n`;
    markdown += `*Report generated by Legacy CSS Monitor*\n`;
    
    const filename = `${OUTPUT_DIR}/legacy-css-report.md`;
    fs.writeFileSync(filename, markdown);
    console.log(`📄 Markdown report: ${filename}`);
  }

  async generateCSV() {
    let csv = 'Issue,Date Added,Age (days),Urgency,Risk Level,Priority,Reporter,Timeline\n';
    
    this.report.overrides.forEach(override => {
      csv += `"${override.issue}",`;
      csv += `"${override.dateAdded || ''}",`;
      csv += `"${override.age || ''}",`;
      csv += `"${override.urgency || ''}",`;
      csv += `"${override.riskLevel}",`;
      csv += `"P${override.priority}",`;
      csv += `"${override.reporter || ''}",`;
      csv += `"${override.timeline || ''}"\n`;
    });
    
    const filename = `${OUTPUT_DIR}/legacy-css-report.csv`;
    fs.writeFileSync(filename, csv);
    console.log(`📄 CSV report: ${filename}`);
  }

  async generateSlackSummary() {
    const emoji = this.getStatusEmoji();
    const status = this.report.summary.status.toUpperCase();
    
    let message = `${emoji} *Legacy CSS Override Report*\n\n`;
    message += `*Status*: ${status}\n`;
    message += `*Active Overrides*: ${this.report.summary.totalActive}\n`;
    
    if (this.overrides.length > 0) {
      message += `*Average Age*: ${this.report.summary.averageAge} days\n`;
      message += `*Oldest*: ${this.report.summary.oldestAge} days\n\n`;
      
      // High priority items
      const urgent = this.report.recommendations.filter(r => r.type === 'urgent');
      if (urgent.length > 0) {
        message += `*🚨 Urgent Actions Needed:*\n`;
        urgent.forEach(rec => {
          message += `• ${rec.message}\n`;
        });
        message += `\n`;
      }
      
      // Top 3 overrides by priority
      const topOverrides = this.report.overrides
        .sort((a, b) => a.priority - b.priority)
        .slice(0, 3);
      
      if (topOverrides.length > 0) {
        message += `*Top Priority Overrides:*\n`;
        topOverrides.forEach(override => {
          message += `• ${override.issue} (${override.age || '?'} days, ${override.urgency || 'unknown'})\n`;
        });
      }
    } else {
      message += `\n🎉 *Excellent!* No active overrides.\n`;
    }
    
    message += `\n_Full report available in project reports folder_`;
    
    const filename = `${OUTPUT_DIR}/slack-summary.txt`;
    fs.writeFileSync(filename, message);
    console.log(`📄 Slack summary: ${filename}`);
    
    // Also output to console for easy copying
    console.log('\n📱 Slack Summary (copy/paste ready):');
    console.log('─'.repeat(50));
    console.log(message);
    console.log('─'.repeat(50));
  }

  getStatusEmoji() {
    switch (this.report.summary.status) {
      case 'excellent': return '🟢';
      case 'good': return '🟡';
      case 'warning': return '🟠';
      case 'critical': return '🔴';
      default: return '⚪';
    }
  }
}

// Run the reporter
const reporter = new LegacyCSSReporter();
reporter.generateReports().catch(error => {
  console.error('Report generation failed:', error);
  process.exit(1);
});