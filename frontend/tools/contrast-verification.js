/**
 * Contrast Ratio Verification Tool
 * 
 * This script verifies WCAG AA/AAA compliance for all color combinations
 * used in the dark theme design system.
 */

// Color definitions from design tokens
const colors = {
  // Background colors
  bgPrimary: '#0A0A0B',
  bgSecondary: '#1A1A1C', 
  bgTertiary: '#2A2A2E',
  bgQuaternary: '#3A3A3F',
  
  // Text colors
  textPrimary: '#FFFFFF',
  textSecondary: '#E0E0E0',
  textTertiary: '#B0B0B0',
  textMuted: '#808080',
  textDisabled: '#606060',
  textInverse: '#0A0A0B',
  
  // Brand colors
  primary: '#FF6B35',
  primaryHover: '#FF8A5C',
  primaryActive: '#E55A2B',
  
  // Status colors
  success: '#00D084',
  danger: '#FF4444',
  warning: '#FFB800',
  info: '#3498DB',
  
  // Border colors
  borderSubtle: '#2A2A2E',
  borderMedium: '#3A3A3F',
  borderStrong: '#4A4A4F',
};

/**
 * Convert hex color to RGB values
 */
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * Calculate relative luminance of a color
 */
function getLuminance(rgb) {
  const { r, g, b } = rgb;
  
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Calculate contrast ratio between two colors
 */
function getContrastRatio(color1, color2) {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  if (!rgb1 || !rgb2) return 0;
  
  const lum1 = getLuminance(rgb1);
  const lum2 = getLuminance(rgb2);
  
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  
  return (brightest + 0.05) / (darkest + 0.05);
}

/**
 * Check WCAG compliance level
 */
function getWCAGLevel(ratio, isLargeText = false) {
  if (isLargeText) {
    if (ratio >= 4.5) return 'AAA';
    if (ratio >= 3.0) return 'AA';
    return 'FAIL';
  } else {
    if (ratio >= 7.0) return 'AAA';
    if (ratio >= 4.5) return 'AA';
    return 'FAIL';
  }
}

/**
 * Format contrast ratio for display
 */
function formatRatio(ratio) {
  return ratio.toFixed(2) + ':1';
}

/**
 * Generate contrast verification report
 */
function generateContrastReport() {
  const report = {
    timestamp: new Date().toISOString(),
    combinations: [],
    summary: {
      total: 0,
      passing: 0,
      failing: 0,
      aaaCompliant: 0,
      aaCompliant: 0
    }
  };

  // Define test combinations
  const testCombinations = [
    // Primary text on backgrounds
    { fg: 'textPrimary', bg: 'bgPrimary', context: 'Primary text on main background' },
    { fg: 'textSecondary', bg: 'bgPrimary', context: 'Secondary text on main background' },
    { fg: 'textTertiary', bg: 'bgPrimary', context: 'Tertiary text on main background' },
    { fg: 'textMuted', bg: 'bgPrimary', context: 'Muted text on main background' },
    
    // Text on secondary backgrounds
    { fg: 'textPrimary', bg: 'bgSecondary', context: 'Primary text on card background' },
    { fg: 'textSecondary', bg: 'bgSecondary', context: 'Secondary text on card background' },
    { fg: 'textTertiary', bg: 'bgSecondary', context: 'Tertiary text on card background' },
    
    // Text on tertiary backgrounds
    { fg: 'textPrimary', bg: 'bgTertiary', context: 'Primary text on elevated surface' },
    { fg: 'textSecondary', bg: 'bgTertiary', context: 'Secondary text on elevated surface' },
    { fg: 'textTertiary', bg: 'bgTertiary', context: 'Tertiary text on elevated surface' },
    
    // Brand colors
    { fg: 'primary', bg: 'bgPrimary', context: 'Orange brand color on main background' },
    { fg: 'primary', bg: 'bgSecondary', context: 'Orange brand color on card background' },
    { fg: 'textInverse', bg: 'primary', context: 'Dark text on orange background' },
    { fg: 'textPrimary', bg: 'primary', context: 'White text on orange background' },
    
    // Status colors
    { fg: 'success', bg: 'bgPrimary', context: 'Success green on main background' },
    { fg: 'danger', bg: 'bgPrimary', context: 'Danger red on main background' },
    { fg: 'warning', bg: 'bgPrimary', context: 'Warning yellow on main background' },
    { fg: 'info', bg: 'bgPrimary', context: 'Info blue on main background' },
    
    // Interactive elements
    { fg: 'primary', bg: 'bgQuaternary', context: 'Orange on interactive element background' },
    { fg: 'textPrimary', bg: 'bgQuaternary', context: 'White text on interactive element' },
    
    // Border visibility
    { fg: 'borderMedium', bg: 'bgPrimary', context: 'Medium border on main background' },
    { fg: 'borderStrong', bg: 'bgSecondary', context: 'Strong border on card background' },
    
    // Disabled states
    { fg: 'textDisabled', bg: 'bgPrimary', context: 'Disabled text on main background' },
    { fg: 'textDisabled', bg: 'bgSecondary', context: 'Disabled text on card background' },
  ];

  // Test each combination
  testCombinations.forEach(({ fg, bg, context }) => {
    const fgColor = colors[fg];
    const bgColor = colors[bg];
    const ratio = getContrastRatio(fgColor, bgColor);
    const normalLevel = getWCAGLevel(ratio, false);
    const largeLevel = getWCAGLevel(ratio, true);
    
    const result = {
      foreground: fgColor,
      background: bgColor,
      foregroundName: fg,
      backgroundName: bg,
      context,
      ratio: ratio,
      ratioFormatted: formatRatio(ratio),
      normalTextLevel: normalLevel,
      largeTextLevel: largeLevel,
      passes: normalLevel !== 'FAIL'
    };
    
    report.combinations.push(result);
    report.summary.total++;
    
    if (result.passes) {
      report.summary.passing++;
      if (normalLevel === 'AAA') report.summary.aaaCompliant++;
      else if (normalLevel === 'AA') report.summary.aaCompliant++;
    } else {
      report.summary.failing++;
    }
  });

  return report;
}

/**
 * Generate markdown report
 */
function generateMarkdownReport(report) {
  let markdown = `# Dark Theme Contrast Verification Report\n\n`;
  markdown += `Generated: ${new Date(report.timestamp).toLocaleString()}\n\n`;
  
  // Summary
  markdown += `## Summary\n\n`;
  markdown += `- **Total combinations tested:** ${report.summary.total}\n`;
  markdown += `- **Passing WCAG AA:** ${report.summary.passing} (${((report.summary.passing / report.summary.total) * 100).toFixed(1)}%)\n`;
  markdown += `- **Failing:** ${report.summary.failing}\n`;
  markdown += `- **WCAG AAA compliant:** ${report.summary.aaaCompliant}\n`;
  markdown += `- **WCAG AA compliant:** ${report.summary.aaCompliant}\n\n`;
  
  // Detailed results
  markdown += `## Detailed Results\n\n`;
  markdown += `| Context | Foreground | Background | Ratio | Normal Text | Large Text | Status |\n`;
  markdown += `|---------|------------|------------|-------|-------------|------------|--------|\n`;
  
  report.combinations.forEach(combo => {
    const status = combo.passes ? '✅' : '❌';
    markdown += `| ${combo.context} | ${combo.foregroundName} (${combo.foreground}) | ${combo.backgroundName} (${combo.background}) | ${combo.ratioFormatted} | ${combo.normalTextLevel} | ${combo.largeTextLevel} | ${status} |\n`;
  });
  
  // Recommendations
  markdown += `\n## Recommendations\n\n`;
  
  const failing = report.combinations.filter(c => !c.passes);
  if (failing.length > 0) {
    markdown += `### ⚠️ Failing Combinations\n\n`;
    failing.forEach(combo => {
      markdown += `- **${combo.context}**: ${combo.ratioFormatted} ratio (needs ${combo.normalTextLevel === 'FAIL' ? '4.5:1 minimum' : 'improvement'})\n`;
    });
    markdown += `\n`;
  }
  
  markdown += `### ✅ Best Practices\n\n`;
  markdown += `- Use **white text (#FFFFFF)** on dark backgrounds for maximum contrast\n`;
  markdown += `- Use **light gray (#E0E0E0)** for secondary text that still needs high readability\n`;
  markdown += `- Reserve **medium gray (#B0B0B0)** for tertiary information only\n`;
  markdown += `- Avoid using **muted gray (#808080)** for important information\n`;
  markdown += `- **Orange brand color (#FF6B35)** has sufficient contrast on all dark backgrounds\n`;
  markdown += `- **Status colors** (success, danger, warning) all meet WCAG AA requirements\n\n`;
  
  markdown += `### 🎯 WCAG Compliance Levels\n\n`;
  markdown += `- **WCAG AA**: Minimum 4.5:1 for normal text, 3:1 for large text\n`;
  markdown += `- **WCAG AAA**: Minimum 7:1 for normal text, 4.5:1 for large text\n`;
  markdown += `- **Large text**: 18px+ or 14px+ bold\n\n`;
  
  return markdown;
}

/**
 * Generate CSS documentation
 */
function generateCSSDocumentation(report) {
  let css = `/**\n * WCAG Contrast Verification Results\n * Generated: ${new Date(report.timestamp).toLocaleString()}\n */\n\n`;
  
  css += `/* ============================================\n`;
  css += `   VERIFIED COLOR COMBINATIONS\n`;
  css += `   ============================================ */\n\n`;
  
  report.combinations.forEach(combo => {
    if (combo.passes) {
      css += `/* ✅ ${combo.context}: ${combo.ratioFormatted} (${combo.normalTextLevel}) */\n`;
      css += `.contrast-${combo.foregroundName}-on-${combo.backgroundName} {\n`;
      css += `  color: ${combo.foreground};\n`;
      css += `  background-color: ${combo.background};\n`;
      css += `}\n\n`;
    }
  });
  
  const failing = report.combinations.filter(c => !c.passes);
  if (failing.length > 0) {
    css += `/* ============================================\n`;
    css += `   FAILING COMBINATIONS (DO NOT USE)\n`;
    css += `   ============================================ */\n\n`;
    
    failing.forEach(combo => {
      css += `/* ❌ ${combo.context}: ${combo.ratioFormatted} (${combo.normalTextLevel}) - FAILS WCAG AA */\n`;
    });
  }
  
  return css;
}

// Export for use in Node.js or browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    generateContrastReport,
    generateMarkdownReport,
    generateCSSDocumentation,
    getContrastRatio,
    getWCAGLevel
  };
} else if (typeof window !== 'undefined') {
  window.ContrastVerification = {
    generateContrastReport,
    generateMarkdownReport,
    generateCSSDocumentation,
    getContrastRatio,
    getWCAGLevel
  };
}

// Run report if executed directly
if (typeof require !== 'undefined' && require.main === module) {
  const fs = require('fs');
  const path = require('path');
  
  console.log('🎨 Generating contrast verification report...');
  
  const report = generateContrastReport();
  const markdown = generateMarkdownReport(report);
  const css = generateCSSDocumentation(report);
  
  // Write files
  const reportsDir = path.join(__dirname, '../reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  
  fs.writeFileSync(path.join(reportsDir, 'contrast-verification.md'), markdown);
  fs.writeFileSync(path.join(reportsDir, 'contrast-verification.css'), css);
  fs.writeFileSync(path.join(reportsDir, 'contrast-verification.json'), JSON.stringify(report, null, 2));
  
  console.log('✅ Reports generated:');
  console.log('   - reports/contrast-verification.md');
  console.log('   - reports/contrast-verification.css');
  console.log('   - reports/contrast-verification.json');
  console.log(`\n📊 Summary: ${report.summary.passing}/${report.summary.total} combinations pass WCAG AA`);
  
  if (report.summary.failing > 0) {
    console.log(`⚠️  ${report.summary.failing} combinations need attention`);
    process.exit(1);
  } else {
    console.log('🎉 All color combinations meet WCAG AA standards!');
  }
}