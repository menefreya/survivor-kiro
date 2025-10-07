/**
 * Mobile Performance Testing Script
 * Tests the ContestantPerformance page on various mobile devices and screen sizes
 * 
 * Usage: node frontend/tools/mobile-performance-test.js
 * 
 * This script simulates different mobile devices and measures:
 * - Rendering performance
 * - Memory usage
 * - Touch interaction responsiveness
 * - Network performance on slow connections
 */

const puppeteer = require('puppeteer');

// Mobile device configurations
const MOBILE_DEVICES = [
  {
    name: 'iPhone 12',
    viewport: { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
  },
  {
    name: 'iPhone SE',
    viewport: { width: 375, height: 667, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
  },
  {
    name: 'Samsung Galaxy S21',
    viewport: { width: 360, height: 800, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
    userAgent: 'Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36'
  },
  {
    name: 'iPad',
    viewport: { width: 768, height: 1024, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
  }
];

// Network conditions
const NETWORK_CONDITIONS = [
  {
    name: '4G',
    downloadThroughput: 4 * 1024 * 1024 / 8, // 4 Mbps
    uploadThroughput: 3 * 1024 * 1024 / 8,   // 3 Mbps
    latency: 20
  },
  {
    name: '3G',
    downloadThroughput: 1.6 * 1024 * 1024 / 8, // 1.6 Mbps
    uploadThroughput: 750 * 1024 / 8,           // 750 Kbps
    latency: 150
  },
  {
    name: 'Slow 3G',
    downloadThroughput: 500 * 1024 / 8, // 500 Kbps
    uploadThroughput: 500 * 1024 / 8,   // 500 Kbps
    latency: 400
  }
];

class MobilePerformanceTester {
  constructor() {
    this.browser = null;
    this.results = [];
  }

  async initialize() {
    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async testDevice(device, networkCondition) {
    const page = await this.browser.newPage();
    
    try {
      // Set device viewport and user agent
      await page.setViewport(device.viewport);
      await page.setUserAgent(device.userAgent);
      
      // Set network conditions
      const client = await page.target().createCDPSession();
      await client.send('Network.emulateNetworkConditions', {
        offline: false,
        downloadThroughput: networkCondition.downloadThroughput,
        uploadThroughput: networkCondition.uploadThroughput,
        latency: networkCondition.latency
      });

      // Enable performance monitoring
      await page.tracing.start({
        path: `performance-trace-${device.name}-${networkCondition.name}.json`,
        screenshots: true
      });

      console.log(`Testing ${device.name} on ${networkCondition.name}...`);

      // Navigate to the page
      const navigationStart = Date.now();
      await page.goto('http://localhost:5173/contestants', {
        waitUntil: 'networkidle0',
        timeout: 30000
      });
      const navigationEnd = Date.now();

      // Wait for content to load
      await page.waitForSelector('.contestant-performance-container', { timeout: 10000 });

      // Measure rendering performance
      const renderingMetrics = await page.evaluate(() => {
        return new Promise((resolve) => {
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const paintEntries = entries.filter(entry => 
              entry.entryType === 'paint' || entry.entryType === 'largest-contentful-paint'
            );
            
            if (paintEntries.length > 0) {
              observer.disconnect();
              resolve({
                firstPaint: paintEntries.find(e => e.name === 'first-paint')?.startTime || 0,
                firstContentfulPaint: paintEntries.find(e => e.name === 'first-contentful-paint')?.startTime || 0,
                largestContentfulPaint: paintEntries.find(e => e.entryType === 'largest-contentful-paint')?.startTime || 0
              });
            }
          });
          
          observer.observe({ entryTypes: ['paint', 'largest-contentful-paint'] });
          
          // Fallback timeout
          setTimeout(() => {
            observer.disconnect();
            resolve({ firstPaint: 0, firstContentfulPaint: 0, largestContentfulPaint: 0 });
          }, 5000);
        });
      });

      // Test scrolling performance
      const scrollStart = Date.now();
      await page.evaluate(() => {
        return new Promise((resolve) => {
          let scrollTop = 0;
          const scrollStep = 100;
          const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
          
          const scroll = () => {
            scrollTop += scrollStep;
            window.scrollTo(0, scrollTop);
            
            if (scrollTop >= maxScroll) {
              resolve();
            } else {
              requestAnimationFrame(scroll);
            }
          };
          
          scroll();
        });
      });
      const scrollEnd = Date.now();

      // Test touch interactions (simulate tap on first row)
      const touchStart = Date.now();
      const firstRow = await page.$('.contestant-performance-row');
      if (firstRow) {
        await firstRow.tap();
      }
      const touchEnd = Date.now();

      // Measure memory usage
      const memoryMetrics = await page.metrics();

      // Get layout shift score
      const layoutShiftScore = await page.evaluate(() => {
        return new Promise((resolve) => {
          let clsValue = 0;
          
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!entry.hadRecentInput) {
                clsValue += entry.value;
              }
            }
          });
          
          observer.observe({ entryTypes: ['layout-shift'] });
          
          setTimeout(() => {
            observer.disconnect();
            resolve(clsValue);
          }, 2000);
        });
      });

      await page.tracing.stop();

      // Compile results
      const result = {
        device: device.name,
        network: networkCondition.name,
        viewport: `${device.viewport.width}x${device.viewport.height}`,
        performance: {
          navigationTime: navigationEnd - navigationStart,
          firstPaint: renderingMetrics.firstPaint,
          firstContentfulPaint: renderingMetrics.firstContentfulPaint,
          largestContentfulPaint: renderingMetrics.largestContentfulPaint,
          scrollTime: scrollEnd - scrollStart,
          touchResponseTime: touchEnd - touchStart,
          layoutShiftScore: layoutShiftScore
        },
        memory: {
          jsHeapUsedSize: memoryMetrics.JSHeapUsedSize,
          jsHeapTotalSize: memoryMetrics.JSHeapTotalSize,
          jsHeapSizeLimit: memoryMetrics.JSHeapSizeLimit
        },
        passed: this.evaluatePerformance(navigationEnd - navigationStart, renderingMetrics, scrollEnd - scrollStart)
      };

      this.results.push(result);
      this.logResult(result);

    } catch (error) {
      console.error(`Error testing ${device.name} on ${networkCondition.name}:`, error.message);
      this.results.push({
        device: device.name,
        network: networkCondition.name,
        error: error.message,
        passed: false
      });
    } finally {
      await page.close();
    }
  }

  evaluatePerformance(navigationTime, renderingMetrics, scrollTime) {
    // Performance criteria
    const criteria = {
      maxNavigationTime: 5000,    // 5 seconds
      maxFirstPaint: 2000,        // 2 seconds
      maxFirstContentfulPaint: 3000, // 3 seconds
      maxLargestContentfulPaint: 4000, // 4 seconds
      maxScrollTime: 1000         // 1 second
    };

    return (
      navigationTime <= criteria.maxNavigationTime &&
      renderingMetrics.firstPaint <= criteria.maxFirstPaint &&
      renderingMetrics.firstContentfulPaint <= criteria.maxFirstContentfulPaint &&
      renderingMetrics.largestContentfulPaint <= criteria.maxLargestContentfulPaint &&
      scrollTime <= criteria.maxScrollTime
    );
  }

  logResult(result) {
    console.log(`\n📱 ${result.device} (${result.viewport}) on ${result.network}`);
    console.log(`   Navigation: ${result.performance.navigationTime}ms`);
    console.log(`   First Paint: ${result.performance.firstPaint.toFixed(2)}ms`);
    console.log(`   First Contentful Paint: ${result.performance.firstContentfulPaint.toFixed(2)}ms`);
    console.log(`   Largest Contentful Paint: ${result.performance.largestContentfulPaint.toFixed(2)}ms`);
    console.log(`   Scroll Performance: ${result.performance.scrollTime}ms`);
    console.log(`   Touch Response: ${result.performance.touchResponseTime}ms`);
    console.log(`   Layout Shift Score: ${result.performance.layoutShiftScore.toFixed(4)}`);
    console.log(`   Memory Usage: ${Math.round(result.memory.jsHeapUsedSize / 1024 / 1024)}MB`);
    console.log(`   Status: ${result.passed ? '✅ PASSED' : '❌ FAILED'}`);
  }

  generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 MOBILE PERFORMANCE TEST REPORT');
    console.log('='.repeat(80));

    const passedTests = this.results.filter(r => r.passed).length;
    const totalTests = this.results.length;
    const passRate = ((passedTests / totalTests) * 100).toFixed(1);

    console.log(`\nOverall Results: ${passedTests}/${totalTests} tests passed (${passRate}%)`);

    // Group results by device
    const deviceResults = {};
    this.results.forEach(result => {
      if (!deviceResults[result.device]) {
        deviceResults[result.device] = [];
      }
      deviceResults[result.device].push(result);
    });

    // Performance summary by device
    console.log('\n📱 Performance by Device:');
    Object.entries(deviceResults).forEach(([device, results]) => {
      const devicePassed = results.filter(r => r.passed).length;
      const deviceTotal = results.length;
      const devicePassRate = ((devicePassed / deviceTotal) * 100).toFixed(1);
      
      console.log(`   ${device}: ${devicePassed}/${deviceTotal} (${devicePassRate}%)`);
      
      // Show average metrics for this device
      const avgNavigation = results.reduce((sum, r) => sum + (r.performance?.navigationTime || 0), 0) / results.length;
      const avgFCP = results.reduce((sum, r) => sum + (r.performance?.firstContentfulPaint || 0), 0) / results.length;
      
      console.log(`     Avg Navigation: ${avgNavigation.toFixed(0)}ms`);
      console.log(`     Avg First Contentful Paint: ${avgFCP.toFixed(0)}ms`);
    });

    // Network performance summary
    console.log('\n🌐 Performance by Network:');
    const networkResults = {};
    this.results.forEach(result => {
      if (!networkResults[result.network]) {
        networkResults[result.network] = [];
      }
      networkResults[result.network].push(result);
    });

    Object.entries(networkResults).forEach(([network, results]) => {
      const networkPassed = results.filter(r => r.passed).length;
      const networkTotal = results.length;
      const networkPassRate = ((networkPassed / networkTotal) * 100).toFixed(1);
      
      console.log(`   ${network}: ${networkPassed}/${networkTotal} (${networkPassRate}%)`);
    });

    // Recommendations
    console.log('\n💡 Recommendations:');
    const failedResults = this.results.filter(r => !r.passed);
    
    if (failedResults.length === 0) {
      console.log('   ✅ All tests passed! Performance is excellent across all devices and networks.');
    } else {
      console.log('   ⚠️  Performance issues detected:');
      
      failedResults.forEach(result => {
        console.log(`   - ${result.device} on ${result.network}: Consider optimizing for this configuration`);
      });
      
      console.log('\n   Suggested optimizations:');
      console.log('   - Implement image lazy loading');
      console.log('   - Add service worker for caching');
      console.log('   - Consider virtual scrolling for large datasets');
      console.log('   - Optimize bundle size with code splitting');
    }

    console.log('\n' + '='.repeat(80));
  }

  async runAllTests() {
    console.log('🚀 Starting Mobile Performance Tests...\n');
    
    for (const device of MOBILE_DEVICES) {
      for (const network of NETWORK_CONDITIONS) {
        await this.testDevice(device, network);
        
        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    this.generateReport();
  }
}

// Run the tests
async function main() {
  const tester = new MobilePerformanceTester();
  
  try {
    await tester.initialize();
    await tester.runAllTests();
  } catch (error) {
    console.error('Test execution failed:', error);
  } finally {
    await tester.cleanup();
  }
}

// Check if this script is being run directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = MobilePerformanceTester;