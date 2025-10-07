/**
 * Keyboard Navigation Test Script
 * 
 * This script helps test and verify keyboard navigation and focus management
 * across the application. It can be run in the browser console to audit
 * tab order and focus indicators.
 */

class KeyboardNavigationTester {
  constructor() {
    this.focusableElements = [];
    this.currentIndex = 0;
    this.isTestMode = false;
    this.testResults = [];
  }

  /**
   * Get all focusable elements on the page
   */
  getFocusableElements() {
    const selectors = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[role="button"]:not([disabled])',
      '[role="link"]',
      '[role="menuitem"]',
      '[role="tab"]'
    ];

    const elements = document.querySelectorAll(selectors.join(', '));
    
    // Filter out hidden elements
    return Array.from(elements).filter(el => {
      const style = window.getComputedStyle(el);
      return style.display !== 'none' && 
             style.visibility !== 'hidden' && 
             style.opacity !== '0' &&
             el.offsetWidth > 0 && 
             el.offsetHeight > 0;
    });
  }

  /**
   * Test tab order and focus indicators
   */
  testTabOrder() {
    console.log('🔍 Testing keyboard navigation and tab order...');
    
    this.focusableElements = this.getFocusableElements();
    this.testResults = [];
    
    console.log(`Found ${this.focusableElements.length} focusable elements`);
    
    this.focusableElements.forEach((element, index) => {
      const result = this.testElement(element, index);
      this.testResults.push(result);
    });
    
    this.generateReport();
  }

  /**
   * Test individual element for accessibility
   */
  testElement(element, index) {
    const result = {
      index,
      element,
      tagName: element.tagName.toLowerCase(),
      id: element.id || null,
      className: element.className || null,
      text: this.getElementText(element),
      issues: [],
      passes: []
    };

    // Test 1: Has visible focus indicator
    element.focus();
    const focusStyles = window.getComputedStyle(element);
    
    if (focusStyles.outline === 'none' || focusStyles.outline === '0px none') {
      if (!focusStyles.boxShadow || focusStyles.boxShadow === 'none') {
        result.issues.push('No visible focus indicator');
      } else {
        result.passes.push('Has box-shadow focus indicator');
      }
    } else {
      result.passes.push('Has outline focus indicator');
    }

    // Test 2: Sufficient color contrast for focus
    const outlineColor = focusStyles.outlineColor;
    const backgroundColor = focusStyles.backgroundColor;
    
    if (outlineColor && backgroundColor) {
      const contrast = this.calculateContrast(outlineColor, backgroundColor);
      if (contrast < 3) {
        result.issues.push(`Low focus contrast ratio: ${contrast.toFixed(2)}:1`);
      } else {
        result.passes.push(`Good focus contrast ratio: ${contrast.toFixed(2)}:1`);
      }
    }

    // Test 3: Minimum touch target size
    const rect = element.getBoundingClientRect();
    if (rect.width < 44 || rect.height < 44) {
      result.issues.push(`Small touch target: ${rect.width}x${rect.height}px (minimum 44x44px)`);
    } else {
      result.passes.push(`Good touch target size: ${rect.width}x${rect.height}px`);
    }

    // Test 4: Has accessible name
    const accessibleName = this.getAccessibleName(element);
    if (!accessibleName) {
      result.issues.push('No accessible name (aria-label, aria-labelledby, or text content)');
    } else {
      result.passes.push(`Has accessible name: "${accessibleName}"`);
    }

    // Test 5: Proper ARIA attributes
    const role = element.getAttribute('role');
    const ariaLabel = element.getAttribute('aria-label');
    const ariaDescribedBy = element.getAttribute('aria-describedby');
    
    if (element.tagName === 'BUTTON' && !element.type) {
      result.issues.push('Button missing type attribute');
    }
    
    if (element.tagName === 'A' && !element.href) {
      result.issues.push('Link missing href attribute');
    }

    // Test 6: Tab index appropriateness
    const tabIndex = element.tabIndex;
    if (tabIndex > 0) {
      result.issues.push(`Positive tabindex (${tabIndex}) - may disrupt natural tab order`);
    }

    return result;
  }

  /**
   * Get accessible name for element
   */
  getAccessibleName(element) {
    // Check aria-label
    if (element.getAttribute('aria-label')) {
      return element.getAttribute('aria-label');
    }

    // Check aria-labelledby
    const labelledBy = element.getAttribute('aria-labelledby');
    if (labelledBy) {
      const labelElement = document.getElementById(labelledBy);
      if (labelElement) {
        return labelElement.textContent.trim();
      }
    }

    // Check associated label
    if (element.id) {
      const label = document.querySelector(`label[for="${element.id}"]`);
      if (label) {
        return label.textContent.trim();
      }
    }

    // Check text content
    const text = this.getElementText(element);
    if (text) {
      return text;
    }

    // Check alt text for images
    if (element.tagName === 'IMG') {
      return element.alt;
    }

    // Check title attribute
    if (element.title) {
      return element.title;
    }

    return null;
  }

  /**
   * Get meaningful text from element
   */
  getElementText(element) {
    if (element.tagName === 'INPUT') {
      return element.placeholder || element.value || element.type;
    }
    
    const text = element.textContent || element.innerText;
    return text ? text.trim().substring(0, 50) : null;
  }

  /**
   * Calculate color contrast ratio (simplified)
   */
  calculateContrast(color1, color2) {
    // This is a simplified version - in practice you'd want a more robust implementation
    const rgb1 = this.parseColor(color1);
    const rgb2 = this.parseColor(color2);
    
    if (!rgb1 || !rgb2) return 1;
    
    const l1 = this.getLuminance(rgb1);
    const l2 = this.getLuminance(rgb2);
    
    const brightest = Math.max(l1, l2);
    const darkest = Math.min(l1, l2);
    
    return (brightest + 0.05) / (darkest + 0.05);
  }

  /**
   * Parse CSS color to RGB
   */
  parseColor(color) {
    const div = document.createElement('div');
    div.style.color = color;
    document.body.appendChild(div);
    const computed = window.getComputedStyle(div).color;
    document.body.removeChild(div);
    
    const match = computed.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
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
   * Calculate relative luminance
   */
  getLuminance(rgb) {
    const { r, g, b } = rgb;
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }

  /**
   * Generate accessibility report
   */
  generateReport() {
    const totalElements = this.testResults.length;
    const elementsWithIssues = this.testResults.filter(r => r.issues.length > 0).length;
    const totalIssues = this.testResults.reduce((sum, r) => sum + r.issues.length, 0);
    
    console.log('\n📊 KEYBOARD NAVIGATION TEST RESULTS');
    console.log('=====================================');
    console.log(`Total focusable elements: ${totalElements}`);
    console.log(`Elements with issues: ${elementsWithIssues}`);
    console.log(`Total issues found: ${totalIssues}`);
    console.log(`Success rate: ${((totalElements - elementsWithIssues) / totalElements * 100).toFixed(1)}%`);
    
    // Group issues by type
    const issueTypes = {};
    this.testResults.forEach(result => {
      result.issues.forEach(issue => {
        if (!issueTypes[issue]) {
          issueTypes[issue] = [];
        }
        issueTypes[issue].push(result);
      });
    });
    
    console.log('\n🚨 ISSUES BY TYPE:');
    Object.entries(issueTypes).forEach(([issue, elements]) => {
      console.log(`\n${issue} (${elements.length} elements):`);
      elements.forEach(el => {
        console.log(`  - ${el.tagName}${el.id ? '#' + el.id : ''}${el.className ? '.' + el.className.split(' ')[0] : ''}: "${el.text}"`);
      });
    });
    
    // Show elements without issues
    const goodElements = this.testResults.filter(r => r.issues.length === 0);
    if (goodElements.length > 0) {
      console.log(`\n✅ ELEMENTS WITHOUT ISSUES (${goodElements.length}):`);
      goodElements.forEach(el => {
        console.log(`  - ${el.tagName}${el.id ? '#' + el.id : ''}${el.className ? '.' + el.className.split(' ')[0] : ''}: "${el.text}"`);
      });
    }
    
    return {
      totalElements,
      elementsWithIssues,
      totalIssues,
      successRate: (totalElements - elementsWithIssues) / totalElements * 100,
      issueTypes,
      results: this.testResults
    };
  }

  /**
   * Test specific keyboard interactions
   */
  testKeyboardInteractions() {
    console.log('\n⌨️  TESTING KEYBOARD INTERACTIONS');
    console.log('==================================');
    
    const interactions = [
      { key: 'Tab', description: 'Navigate forward through focusable elements' },
      { key: 'Shift+Tab', description: 'Navigate backward through focusable elements' },
      { key: 'Enter', description: 'Activate buttons and links' },
      { key: 'Space', description: 'Activate buttons and checkboxes' },
      { key: 'Escape', description: 'Close modals and dropdowns' },
      { key: 'Arrow Keys', description: 'Navigate within components (tabs, menus)' }
    ];
    
    console.log('Manual testing required for:');
    interactions.forEach(({ key, description }) => {
      console.log(`  ${key}: ${description}`);
    });
    
    console.log('\nTo test:');
    console.log('1. Use Tab to navigate through all elements');
    console.log('2. Verify focus indicators are clearly visible');
    console.log('3. Ensure logical tab order');
    console.log('4. Test Enter/Space on interactive elements');
    console.log('5. Verify Escape closes modals/dropdowns');
  }

  /**
   * Highlight current focused element
   */
  highlightFocusedElement() {
    // Remove previous highlights
    document.querySelectorAll('.focus-highlight').forEach(el => {
      el.classList.remove('focus-highlight');
    });
    
    // Add highlight to currently focused element
    const focused = document.activeElement;
    if (focused && focused !== document.body) {
      focused.classList.add('focus-highlight');
    }
  }

  /**
   * Start interactive testing mode
   */
  startInteractiveTest() {
    console.log('🎯 Starting interactive keyboard navigation test...');
    console.log('Use Tab/Shift+Tab to navigate. Press Escape to exit.');
    
    this.isTestMode = true;
    this.focusableElements = this.getFocusableElements();
    
    // Add CSS for highlighting
    const style = document.createElement('style');
    style.textContent = `
      .focus-highlight {
        outline: 4px solid #ff0000 !important;
        outline-offset: 2px !important;
        background-color: rgba(255, 0, 0, 0.1) !important;
      }
    `;
    document.head.appendChild(style);
    
    // Listen for keyboard events
    document.addEventListener('keydown', this.handleTestKeydown.bind(this));
    document.addEventListener('focusin', this.highlightFocusedElement.bind(this));
    
    // Focus first element
    if (this.focusableElements.length > 0) {
      this.focusableElements[0].focus();
    }
  }

  /**
   * Handle keyboard events during testing
   */
  handleTestKeydown(event) {
    if (!this.isTestMode) return;
    
    if (event.key === 'Escape') {
      this.stopInteractiveTest();
      return;
    }
    
    // Log the interaction
    const focused = document.activeElement;
    const elementInfo = this.getElementInfo(focused);
    console.log(`Key: ${event.key}, Element: ${elementInfo}`);
  }

  /**
   * Stop interactive testing mode
   */
  stopInteractiveTest() {
    console.log('🛑 Stopping interactive test mode');
    
    this.isTestMode = false;
    
    // Remove event listeners
    document.removeEventListener('keydown', this.handleTestKeydown);
    document.removeEventListener('focusin', this.highlightFocusedElement);
    
    // Remove highlights
    document.querySelectorAll('.focus-highlight').forEach(el => {
      el.classList.remove('focus-highlight');
    });
    
    // Remove test styles
    const testStyles = document.querySelector('style');
    if (testStyles && testStyles.textContent.includes('focus-highlight')) {
      testStyles.remove();
    }
  }

  /**
   * Get element information for logging
   */
  getElementInfo(element) {
    if (!element || element === document.body) return 'body';
    
    const tag = element.tagName.toLowerCase();
    const id = element.id ? `#${element.id}` : '';
    const className = element.className ? `.${element.className.split(' ')[0]}` : '';
    const text = this.getElementText(element);
    
    return `${tag}${id}${className}${text ? ` ("${text}")` : ''}`;
  }
}

// Create global instance
window.KeyboardTester = new KeyboardNavigationTester();

// Export functions for easy use
window.testKeyboardNavigation = () => window.KeyboardTester.testTabOrder();
window.testKeyboardInteractions = () => window.KeyboardTester.testKeyboardInteractions();
window.startKeyboardTest = () => window.KeyboardTester.startInteractiveTest();

// Auto-run basic test if script is loaded
console.log('🎹 Keyboard Navigation Tester loaded!');
console.log('Available commands:');
console.log('  testKeyboardNavigation() - Test tab order and focus indicators');
console.log('  testKeyboardInteractions() - Show keyboard interaction guide');
console.log('  startKeyboardTest() - Start interactive testing mode');

// Export for Node.js if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports = KeyboardNavigationTester;
}