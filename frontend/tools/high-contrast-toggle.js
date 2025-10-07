/**
 * High Contrast Mode Toggle Utility
 * 
 * This utility provides functionality to toggle high contrast mode
 * and test accessibility features.
 */

class HighContrastToggle {
  constructor() {
    this.isHighContrast = false;
    this.isForcedColors = false;
    this.originalStyles = new Map();
    this.init();
  }

  /**
   * Initialize the high contrast toggle
   */
  init() {
    // Check if user prefers high contrast
    this.checkSystemPreferences();
    
    // Create toggle button if not in production
    if (this.isDevelopment()) {
      this.createToggleButton();
    }
    
    // Listen for system preference changes
    this.watchSystemPreferences();
  }

  /**
   * Check system accessibility preferences
   */
  checkSystemPreferences() {
    // Check for prefers-contrast: high
    if (window.matchMedia('(prefers-contrast: high)').matches) {
      console.log('🎯 System prefers high contrast');
      this.isHighContrast = true;
    }
    
    // Check for forced-colors: active (Windows High Contrast)
    if (window.matchMedia('(forced-colors: active)').matches) {
      console.log('🎯 Forced colors mode detected (Windows High Contrast)');
      this.isForcedColors = true;
    }
    
    // Check for prefers-reduced-motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      console.log('🎯 User prefers reduced motion');
    }
    
    // Log current accessibility state
    this.logAccessibilityState();
  }

  /**
   * Watch for system preference changes
   */
  watchSystemPreferences() {
    // Watch for contrast preference changes
    const contrastQuery = window.matchMedia('(prefers-contrast: high)');
    contrastQuery.addEventListener('change', (e) => {
      console.log(`🎯 Contrast preference changed: ${e.matches ? 'high' : 'normal'}`);
      this.isHighContrast = e.matches;
      this.updateAccessibilityState();
    });
    
    // Watch for forced colors changes
    const forcedColorsQuery = window.matchMedia('(forced-colors: active)');
    forcedColorsQuery.addEventListener('change', (e) => {
      console.log(`🎯 Forced colors changed: ${e.matches ? 'active' : 'none'}`);
      this.isForcedColors = e.matches;
      this.updateAccessibilityState();
    });
    
    // Watch for reduced motion changes
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    motionQuery.addEventListener('change', (e) => {
      console.log(`🎯 Motion preference changed: ${e.matches ? 'reduce' : 'no-preference'}`);
      this.updateMotionPreference(e.matches);
    });
  }

  /**
   * Check if we're in development mode
   */
  isDevelopment() {
    return window.location.hostname === 'localhost' || 
           window.location.hostname === '127.0.0.1' ||
           window.location.search.includes('debug=true');
  }

  /**
   * Create toggle button for testing
   */
  createToggleButton() {
    const container = document.createElement('div');
    container.id = 'accessibility-controls';
    container.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      z-index: 10000;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 10px;
      border-radius: 8px;
      font-family: monospace;
      font-size: 12px;
      border: 2px solid #ccc;
      min-width: 200px;
    `;
    
    container.innerHTML = `
      <div style="margin-bottom: 8px; font-weight: bold;">🎯 Accessibility Controls</div>
      <button id="toggle-high-contrast" style="display: block; width: 100%; margin: 4px 0; padding: 4px 8px; background: #333; color: white; border: 1px solid #666; border-radius: 4px; cursor: pointer;">
        Toggle High Contrast
      </button>
      <button id="toggle-forced-colors" style="display: block; width: 100%; margin: 4px 0; padding: 4px 8px; background: #333; color: white; border: 1px solid #666; border-radius: 4px; cursor: pointer;">
        Simulate Forced Colors
      </button>
      <button id="test-focus-indicators" style="display: block; width: 100%; margin: 4px 0; padding: 4px 8px; background: #333; color: white; border: 1px solid #666; border-radius: 4px; cursor: pointer;">
        Test Focus Indicators
      </button>
      <button id="test-contrast-ratios" style="display: block; width: 100%; margin: 4px 0; padding: 4px 8px; background: #333; color: white; border: 1px solid #666; border-radius: 4px; cursor: pointer;">
        Test Contrast Ratios
      </button>
      <div id="accessibility-status" style="margin-top: 8px; font-size: 10px; color: #ccc;"></div>
    `;
    
    document.body.appendChild(container);
    
    // Add event listeners
    document.getElementById('toggle-high-contrast').addEventListener('click', () => {
      this.toggleHighContrast();
    });
    
    document.getElementById('toggle-forced-colors').addEventListener('click', () => {
      this.toggleForcedColors();
    });
    
    document.getElementById('test-focus-indicators').addEventListener('click', () => {
      this.testFocusIndicators();
    });
    
    document.getElementById('test-contrast-ratios').addEventListener('click', () => {
      this.testContrastRatios();
    });
    
    // Update initial status
    this.updateAccessibilityState();
  }

  /**
   * Toggle high contrast mode
   */
  toggleHighContrast() {
    const body = document.body;
    
    if (body.classList.contains('high-contrast')) {
      body.classList.remove('high-contrast');
      console.log('🎯 High contrast mode disabled');
    } else {
      body.classList.add('high-contrast');
      console.log('🎯 High contrast mode enabled');
    }
    
    this.updateAccessibilityState();
  }

  /**
   * Toggle forced colors simulation
   */
  toggleForcedColors() {
    const body = document.body;
    
    if (body.classList.contains('test-forced-colors')) {
      body.classList.remove('test-forced-colors');
      console.log('🎯 Forced colors simulation disabled');
    } else {
      body.classList.add('test-forced-colors');
      console.log('🎯 Forced colors simulation enabled');
    }
    
    this.updateAccessibilityState();
  }

  /**
   * Test focus indicators
   */
  testFocusIndicators() {
    console.log('🎯 Testing focus indicators...');
    
    const focusableElements = document.querySelectorAll(
      'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    let currentIndex = 0;
    const testInterval = setInterval(() => {
      if (currentIndex >= focusableElements.length) {
        clearInterval(testInterval);
        console.log('🎯 Focus indicator test complete');
        return;
      }
      
      const element = focusableElements[currentIndex];
      element.focus();
      
      // Check if focus indicator is visible
      const styles = window.getComputedStyle(element);
      const hasOutline = styles.outline !== 'none' && styles.outline !== '0px none';
      const hasBoxShadow = styles.boxShadow !== 'none';
      
      if (!hasOutline && !hasBoxShadow) {
        console.warn(`⚠️ Element may lack visible focus indicator:`, element);
      }
      
      currentIndex++;
    }, 500);
  }

  /**
   * Test contrast ratios
   */
  testContrastRatios() {
    console.log('🎯 Testing contrast ratios...');
    
    // This would integrate with the contrast verification tool
    if (window.testKeyboardNavigation) {
      window.testKeyboardNavigation();
    } else {
      console.log('💡 Load contrast-verification.js to run detailed contrast tests');
    }
    
    // Quick visual test
    this.performQuickContrastTest();
  }

  /**
   * Perform quick visual contrast test
   */
  performQuickContrastTest() {
    const testElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, a, button, .btn');
    const issues = [];
    
    testElements.forEach(element => {
      const styles = window.getComputedStyle(element);
      const color = styles.color;
      const backgroundColor = styles.backgroundColor;
      
      // Simple heuristic check (not accurate, but gives an idea)
      if (color === backgroundColor) {
        issues.push({
          element,
          issue: 'Text color same as background color',
          color,
          backgroundColor
        });
      }
      
      // Check for very light text on light backgrounds
      if (color.includes('rgb(') && backgroundColor.includes('rgb(')) {
        const textRgb = this.parseRgb(color);
        const bgRgb = this.parseRgb(backgroundColor);
        
        if (textRgb && bgRgb) {
          const contrast = this.calculateSimpleContrast(textRgb, bgRgb);
          if (contrast < 3) {
            issues.push({
              element,
              issue: `Low contrast ratio: ~${contrast.toFixed(1)}:1`,
              color,
              backgroundColor
            });
          }
        }
      }
    });
    
    if (issues.length > 0) {
      console.warn(`⚠️ Found ${issues.length} potential contrast issues:`);
      issues.forEach(issue => {
        console.warn(`  - ${issue.issue}`, issue.element);
      });
    } else {
      console.log('✅ No obvious contrast issues found in quick test');
    }
  }

  /**
   * Parse RGB color string
   */
  parseRgb(colorString) {
    const match = colorString.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (match) {
      return {
        r: parseInt(match[1]),
        g: parseInt(match[2]),
        b: parseInt(match[3])
      };
    }
    return null;
  }

  /**
   * Calculate simple contrast ratio (approximation)
   */
  calculateSimpleContrast(rgb1, rgb2) {
    const brightness1 = (rgb1.r * 299 + rgb1.g * 587 + rgb1.b * 114) / 1000;
    const brightness2 = (rgb2.r * 299 + rgb2.g * 587 + rgb2.b * 114) / 1000;
    
    const brightest = Math.max(brightness1, brightness2);
    const darkest = Math.min(brightness1, brightness2);
    
    return (brightest + 5) / (darkest + 5);
  }

  /**
   * Update motion preference
   */
  updateMotionPreference(reduceMotion) {
    const body = document.body;
    
    if (reduceMotion) {
      body.classList.add('reduce-motion');
    } else {
      body.classList.remove('reduce-motion');
    }
  }

  /**
   * Update accessibility state display
   */
  updateAccessibilityState() {
    const statusElement = document.getElementById('accessibility-status');
    if (!statusElement) return;
    
    const state = [];
    
    if (this.isHighContrast) state.push('High Contrast');
    if (this.isForcedColors) state.push('Forced Colors');
    if (document.body.classList.contains('high-contrast')) state.push('Manual HC');
    if (document.body.classList.contains('test-forced-colors')) state.push('Simulated FC');
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) state.push('Reduced Motion');
    
    statusElement.textContent = state.length > 0 ? `Active: ${state.join(', ')}` : 'No accessibility modes active';
  }

  /**
   * Log current accessibility state
   */
  logAccessibilityState() {
    console.log('🎯 Accessibility State:');
    console.log(`  - High Contrast: ${this.isHighContrast}`);
    console.log(`  - Forced Colors: ${this.isForcedColors}`);
    console.log(`  - Reduced Motion: ${window.matchMedia('(prefers-reduced-motion: reduce)').matches}`);
    console.log(`  - Color Scheme: ${window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'}`);
  }

  /**
   * Get accessibility recommendations
   */
  getRecommendations() {
    const recommendations = [];
    
    if (this.isHighContrast) {
      recommendations.push('User prefers high contrast - ensure all UI elements have strong borders and high contrast colors');
    }
    
    if (this.isForcedColors) {
      recommendations.push('Forced colors mode active - avoid relying on custom colors, use semantic HTML and system colors');
    }
    
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      recommendations.push('User prefers reduced motion - disable or minimize animations and transitions');
    }
    
    return recommendations;
  }

  /**
   * Export accessibility report
   */
  exportReport() {
    const report = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      preferences: {
        highContrast: this.isHighContrast,
        forcedColors: this.isForcedColors,
        reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        colorScheme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
      },
      recommendations: this.getRecommendations(),
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    };
    
    console.log('📊 Accessibility Report:', report);
    return report;
  }
}

// Initialize high contrast toggle
const highContrastToggle = new HighContrastToggle();

// Export for global access
window.HighContrastToggle = highContrastToggle;
window.toggleHighContrast = () => highContrastToggle.toggleHighContrast();
window.testAccessibility = () => highContrastToggle.exportReport();

// Auto-announce when loaded
console.log('🎯 High Contrast Toggle loaded!');
console.log('Available commands:');
console.log('  toggleHighContrast() - Toggle high contrast mode');
console.log('  testAccessibility() - Get accessibility report');

// Export for Node.js if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports = HighContrastToggle;
}