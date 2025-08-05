// AMP System Testing Framework
class AMPTestSuite {
  constructor() {
    this.testResults = [];
    this.currentTest = null;
    this.testStartTime = null;
  }

  // Test runner
  async runAllTests() {
    console.log('🧪 Starting AMP System Test Suite...');
    this.testResults = [];
    
    const tests = [
      this.testDualZipperSystem.bind(this),
      this.testS1S9Progression.bind(this),
      this.testSearchAndRetrieval.bind(this),
      this.testContextInjection.bind(this),
      this.testCrossProviderContext.bind(this),
      this.testPerformanceOptimization.bind(this),
      this.testHealthMonitoring.bind(this),
      this.testAnalyticsSystem.bind(this),
      this.testSettingsManagement.bind(this),
      this.testDesktopIntegration.bind(this)
    ];

    for (const test of tests) {
      await this.runTest(test);
    }

    this.generateTestReport();
  }

  async runTest(testFunction) {
    const testName = testFunction.name.replace('test', '');
    this.currentTest = testName;
    this.testStartTime = Date.now();
    
    console.log(`\n🔍 Running test: ${testName}`);
    
    try {
      await testFunction();
      this.recordTestResult(testName, 'PASS', Date.now() - this.testStartTime);
      console.log(`✅ ${testName}: PASSED`);
    } catch (error) {
      this.recordTestResult(testName, 'FAIL', Date.now() - this.testStartTime, error.message);
      console.error(`❌ ${testName}: FAILED - ${error.message}`);
    }
  }

  recordTestResult(testName, status, duration, error = null) {
    this.testResults.push({
      test: testName,
      status: status,
      duration: duration,
      error: error,
      timestamp: Date.now()
    });
  }

  // Test: Dual Zipper System
  async testDualZipperSystem() {
    const memoryPool = new MemoryPool();
    
    // Test fat zipper storage
    const testChunk = {
      id: 'test-chunk-1',
      fullText: 'This is a test chunk for fat zipper storage',
      conversation_id: 'test-conv-1',
      ai_provider: 'ChatGPT',
      timestamp: Date.now()
    };
    
    const s1s9Data = {
      sq1: { content: 'Raw text', timestamp: Date.now() },
      sq9: { canonical: 'Test summary', keywords: ['test'], entities: {} }
    };
    
    const fatAddress = await memoryPool.storeInFatZipper(testChunk, s1s9Data);
    if (!fatAddress) throw new Error('Fat zipper storage failed');
    
    // Test thin zipper storage
    const thinAddress = await memoryPool.storeInThinZipper(testChunk, s1s9Data);
    if (!thinAddress) throw new Error('Thin zipper storage failed');
    
    // Test fat zipper retrieval
    const retrievedFat = await memoryPool.retrieveFromFatZipper(fatAddress);
    if (!retrievedFat || retrievedFat.chunk.id !== testChunk.id) {
      throw new Error('Fat zipper retrieval failed');
    }
    
    // Test thin zipper search
    const searchResults = await memoryPool.searchThinZipper('test');
    if (!searchResults || searchResults.length === 0) {
      throw new Error('Thin zipper search failed');
    }
  }

  // Test: S1-S9 Progression
  async testS1S9Progression() {
    const memoryPool = new MemoryPool();
    
    const testText = 'This is a test conversation that should progress through S1-S9';
    const conversationId = 'test-conv-s1s9';
    const metadata = {
      provider: 'ChatGPT',
      tabId: 'test-tab',
      messageType: 'user'
    };
    
    // Test S1-S9 progression
    const s1s9Data = await memoryPool.processS1S9Progression(testText, conversationId, metadata);
    
    if (!s1s9Data || !s1s9Data.sq1 || !s1s9Data.sq9) {
      throw new Error('S1-S9 progression failed');
    }
    
    // Test square progression logic
    const squareToUpdate = memoryPool.determineSquareToUpdate(testText, 1, s1s9Data);
    if (squareToUpdate !== 1) {
      throw new Error('Square progression logic failed');
    }
    
    // Test S9 generation
    if (!s1s9Data.sq9.canonical || !s1s9Data.sq9.keywords) {
      throw new Error('S9 generation failed');
    }
  }

  // Test: Search and Retrieval
  async testSearchAndRetrieval() {
    const memoryPool = new MemoryPool();
    
    // Add test data
    const testChunks = [
      { id: 'search-1', fullText: 'JavaScript programming language', conversation_id: 'conv-1' },
      { id: 'search-2', fullText: 'Python programming language', conversation_id: 'conv-2' },
      { id: 'search-3', fullText: 'Web development with HTML and CSS', conversation_id: 'conv-3' }
    ];
    
    for (const chunk of testChunks) {
      const s1s9Data = await memoryPool.processS1S9Progression(chunk.fullText, chunk.conversation_id, {});
      await memoryPool.storeInFatZipper(chunk, s1s9Data);
      await memoryPool.storeInThinZipper(chunk, s1s9Data);
    }
    
    // Test search functionality
    const searchResults = await memoryPool.searchThinZipper('programming');
    if (searchResults.length < 2) {
      throw new Error('Search returned insufficient results');
    }
    
    // Test relevance scoring
    const relevance = memoryPool.calculateRelevance(testChunks[0], 'JavaScript');
    if (relevance <= 0) {
      throw new Error('Relevance scoring failed');
    }
  }

  // Test: Context Injection
  async testContextInjection() {
    const memoryPool = new MemoryPool();
    
    // Test context injection amount calculation
    const injectionAmount = await calculateInjectionAmount('ChatGPT', 'test-conv');
    if (!injectionAmount || !injectionAmount.maxTokens || !injectionAmount.preferredTokens) {
      throw new Error('Injection amount calculation failed');
    }
    
    // Test smart context retrieval
    const context = await memoryPool.getSmartContextForInjection('test query', 'test-conv', 2000);
    if (!context || typeof context !== 'string') {
      throw new Error('Smart context retrieval failed');
    }
  }

  // Test: Cross-Provider Context
  async testCrossProviderContext() {
    const memoryPool = new MemoryPool();
    
    // Test cross-provider context retrieval
    const crossProviderContext = memoryPool.getCrossProviderContext('test', 2);
    if (!Array.isArray(crossProviderContext)) {
      throw new Error('Cross-provider context retrieval failed');
    }
    
    // Test context transfer
    const transferResult = await memoryPool.transferContextToProvider(
      'ChatGPT', 
      'Claude', 
      { text: 'Test context data' }
    );
    
    if (!transferResult || !transferResult.transferId || !transferResult.convertedContext) {
      throw new Error('Context transfer failed');
    }
    
    // Test format conversion
    const chatGPTFormat = memoryPool.convertToChatGPTFormat({ messages: [] });
    if (!chatGPTFormat || chatGPTFormat.format !== 'chatgpt') {
      throw new Error('ChatGPT format conversion failed');
    }
  }

  // Test: Performance Optimization
  async testPerformanceOptimization() {
    const memoryPool = new MemoryPool();
    
    // Test memory optimization
    memoryPool.optimizeMemoryUsage();
    
    // Test search optimization
    const optimizedResults = await memoryPool.optimizedSearch('test query');
    if (!Array.isArray(optimizedResults)) {
      throw new Error('Optimized search failed');
    }
    
    // Test query optimization
    const optimizedQuery = memoryPool.optimizeQuery('the quick brown fox');
    if (optimizedQuery.includes('the')) {
      throw new Error('Query optimization failed to remove stop words');
    }
  }

  // Test: Health Monitoring
  async testHealthMonitoring() {
    const memoryPool = new MemoryPool();
    
    // Test system health
    const health = memoryPool.getSystemHealth();
    if (!health || !health.memoryUsage || !health.searchPerformance) {
      throw new Error('Health monitoring failed');
    }
    
    // Test memory usage metrics
    const memoryMetrics = memoryPool.getMemoryUsageMetrics();
    if (!memoryMetrics || typeof memoryMetrics.utilizationPercent !== 'number') {
      throw new Error('Memory usage metrics failed');
    }
    
    // Test search performance metrics
    const searchMetrics = memoryPool.getSearchPerformanceMetrics();
    if (!searchMetrics || typeof searchMetrics.cacheHitRate !== 'number') {
      throw new Error('Search performance metrics failed');
    }
  }

  // Test: Analytics System
  async testAnalyticsSystem() {
    const analytics = new AMPAnalytics();
    
    // Test event tracking
    analytics.trackEvent('test_event', { test: true });
    
    // Test analytics retrieval
    const analyticsData = analytics.getAnalytics();
    if (!analyticsData || !analyticsData.metrics) {
      throw new Error('Analytics retrieval failed');
    }
    
    // Test analytics export
    const exportData = analytics.exportAnalytics();
    if (!exportData || !exportData.analytics) {
      throw new Error('Analytics export failed');
    }
  }

  // Test: Settings Management
  async testSettingsManagement() {
    const testSettings = {
      injection: {
        autoInject: true,
        threshold: 0.5,
        maxSize: 4000
      },
      storage: {
        autoCleanup: true,
        cleanupDays: 7,
        maxSize: 100
      },
      performance: {
        enableCaching: true,
        cacheDuration: 5,
        optimizeMemory: true
      },
      security: {
        encryptionLevel: 'aes-256',
        keyRotation: true,
        rotationInterval: 24
      }
    };
    
    // Test settings update
    await updateAMPSettings(testSettings);
    
    // Test settings retrieval from storage
    const storedSettings = await chrome.storage.local.get('amp-settings');
    if (!storedSettings['amp-settings']) {
      throw new Error('Settings storage failed');
    }
  }

  // Test: Desktop Integration
  async testDesktopIntegration() {
    // Test desktop retry queue
    const testChunk = { id: 'test-desktop', fullText: 'Test for desktop integration' };
    queueForDesktopRetry(testChunk, 'test-fat-address', 'test-thin-tag');
    
    // Test retry queue processing
    await processDesktopRetryQueue();
    
    // Test connection status update
    updateConnectionStatus(true);
    updateConnectionStatus(false);
  }

  // Generate test report
  generateTestReport() {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.status === 'PASS').length;
    const failedTests = this.testResults.filter(r => r.status === 'FAIL').length;
    const totalDuration = this.testResults.reduce((sum, r) => sum + r.duration, 0);
    
    console.log('\n📊 AMP System Test Report');
    console.log('========================');
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    console.log(`Total Duration: ${totalDuration}ms`);
    
    if (failedTests > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults
        .filter(r => r.status === 'FAIL')
        .forEach(r => {
          console.log(`  - ${r.test}: ${r.error}`);
        });
    }
    
    console.log('\n✅ All tests completed!');
    
    return {
      total: totalTests,
      passed: passedTests,
      failed: failedTests,
      successRate: (passedTests / totalTests) * 100,
      duration: totalDuration,
      results: this.testResults
    };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AMPTestSuite;
} 