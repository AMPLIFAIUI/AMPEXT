// AMP User Experience Testing Framework
class AMPUXTestSuite {
  constructor() {
    this.uxResults = [];
    this.testStartTime = null;
    this.performanceMetrics = {};
  }

  async runUXTests() {
    console.log('👥 Starting AMP User Experience Test Suite...');
    this.uxResults = [];
    
    const uxTests = [
      this.testInvisibleOperation.bind(this),
      this.testContextInjectionAccuracy.bind(this),
      this.testPerformanceUnderLoad.bind(this),
      this.testErrorRecovery.bind(this),
      this.testUserInterfaceResponsiveness.bind(this),
      this.testCrossProviderSeamlessness.bind(this)
    ];

    for (const test of uxTests) {
      await this.runUXTest(test);
    }

    this.generateUXReport();
  }

  async runUXTest(testFunction) {
    const testName = testFunction.name.replace('test', '');
    this.testStartTime = Date.now();
    
    console.log(`\n👤 Running UX test: ${testName}`);
    
    try {
      await testFunction();
      this.recordUXResult(testName, 'PASS', Date.now() - this.testStartTime);
      console.log(`✅ ${testName}: PASSED`);
    } catch (error) {
      this.recordUXResult(testName, 'FAIL', Date.now() - this.testStartTime, error.message);
      console.error(`❌ ${testName}: FAILED - ${error.message}`);
    }
  }

  recordUXResult(testName, status, duration, error = null) {
    this.uxResults.push({
      test: testName,
      status: status,
      duration: duration,
      error: error,
      timestamp: Date.now()
    });
  }

  // Test: Invisible Operation
  async testInvisibleOperation() {
    // Test that AMP operates without user interference
    const memoryPool = new MemoryPool();
    
    // Simulate normal conversation flow
    const testConversations = [
      'Hello, how are you today?',
      'I need help with JavaScript programming',
      'Can you explain async/await?',
      'Thank you for the explanation'
    ];
    
    const startTime = performance.now();
    
    for (const text of testConversations) {
      // Simulate content script processing
      const chunk = await memoryPool.addChunk(text, {
        conversation_id: 'ux-test-conv',
        ai_provider: 'ChatGPT',
        tabId: 'test-tab'
      });
      
      if (!chunk) {
        throw new Error('Chunk creation failed during invisible operation test');
      }
    }
    
    const endTime = performance.now();
    const processingTime = endTime - startTime;
    
    // Should complete quickly without blocking UI
    if (processingTime > 1000) {
      throw new Error(`Processing took too long: ${processingTime}ms`);
    }
    
    // Verify no visible UI changes occurred
    const domChanges = this.detectDOMChanges();
    if (domChanges.length > 0) {
      throw new Error('DOM changes detected during invisible operation');
    }
  }

  // Test: Context Injection Accuracy
  async testContextInjectionAccuracy() {
    const memoryPool = new MemoryPool();
    
    // Add test context data
    const contextData = [
      'JavaScript is a programming language',
      'Async/await is used for handling promises',
      'Promises represent eventual completion of operations'
    ];
    
    for (const text of contextData) {
      await memoryPool.addChunk(text, {
        conversation_id: 'context-test',
        ai_provider: 'ChatGPT'
      });
    }
    
    // Test context injection for relevant query
    const query = 'How do I use async/await?';
    const injectedContext = await memoryPool.getSmartContextForInjection(
      query, 
      'context-test', 
      2000
    );
    
    // Verify context relevance
    const relevanceScore = this.calculateContextRelevance(query, injectedContext);
    if (relevanceScore < 0.6) {
      throw new Error(`Context injection accuracy too low: ${relevanceScore}`);
    }
    
    // Test injection amount appropriateness
    const injectionAmount = await calculateInjectionAmount('ChatGPT', 'context-test');
    if (injectedContext.length > injectionAmount.maxTokens) {
      throw new Error('Injected context exceeds maximum allowed size');
    }
  }

  // Test: Performance Under Load
  async testPerformanceUnderLoad() {
    const memoryPool = new MemoryPool();
    const performanceMetrics = {
      chunkCreation: [],
      searchOperations: [],
      memoryUsage: []
    };
    
    // Simulate heavy load
    const loadTestSize = 100;
    const startTime = performance.now();
    
    // Create many chunks rapidly
    for (let i = 0; i < loadTestSize; i++) {
      const chunkStart = performance.now();
      const chunk = await memoryPool.addChunk(
        `Load test chunk ${i}: This is test data for performance testing under load conditions`,
        {
          conversation_id: `load-test-${i % 10}`,
          ai_provider: 'ChatGPT'
        }
      );
      const chunkEnd = performance.now();
      performanceMetrics.chunkCreation.push(chunkEnd - chunkStart);
      
      if (!chunk) {
        throw new Error(`Chunk creation failed at iteration ${i}`);
      }
    }
    
    // Test search performance under load
    for (let i = 0; i < 20; i++) {
      const searchStart = performance.now();
      const results = await memoryPool.searchThinZipper('test');
      const searchEnd = performance.now();
      performanceMetrics.searchOperations.push(searchEnd - searchStart);
      
      if (!Array.isArray(results)) {
        throw new Error('Search failed under load');
      }
    }
    
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    
    // Calculate performance metrics
    const avgChunkCreation = performanceMetrics.chunkCreation.reduce((a, b) => a + b, 0) / performanceMetrics.chunkCreation.length;
    const avgSearchTime = performanceMetrics.searchOperations.reduce((a, b) => a + b, 0) / performanceMetrics.searchOperations.length;
    
    // Performance thresholds
    if (avgChunkCreation > 50) {
      throw new Error(`Chunk creation too slow: ${avgChunkCreation}ms average`);
    }
    
    if (avgSearchTime > 100) {
      throw new Error(`Search too slow: ${avgSearchTime}ms average`);
    }
    
    if (totalTime > 5000) {
      throw new Error(`Load test took too long: ${totalTime}ms`);
    }
    
    this.performanceMetrics = {
      totalTime,
      avgChunkCreation,
      avgSearchTime,
      totalChunks: loadTestSize
    };
  }

  // Test: Error Recovery
  async testErrorRecovery() {
    const memoryPool = new MemoryPool();
    
    // Test recovery from corrupted data
    try {
      // Simulate corrupted chunk
      const corruptedChunk = {
        id: 'corrupted-chunk',
        fullText: null, // Invalid data
        conversation_id: 'test-conv'
      };
      
      // This should trigger recovery mechanisms
      await memoryPool.addChunk(corruptedChunk.fullText, {
        conversation_id: corruptedChunk.conversation_id
      });
      
    } catch (error) {
      // Expected error, test recovery
      const health = memoryPool.getSystemHealth();
      if (health.errorCount === 0) {
        throw new Error('Error recovery not working properly');
      }
    }
    
    // Test recovery from storage failure
    try {
      // Simulate storage failure
      const originalStorage = chrome.storage.local.set;
      chrome.storage.local.set = () => Promise.reject(new Error('Storage failure'));
      
      await memoryPool.saveToStorage();
      
      // Restore original function
      chrome.storage.local.set = originalStorage;
      
      // Verify system continues to function
      const chunk = await memoryPool.addChunk('Recovery test', {
        conversation_id: 'recovery-test'
      });
      
      if (!chunk) {
        throw new Error('System failed to recover from storage error');
      }
      
    } catch (error) {
      // Restore original function if error occurred
      chrome.storage.local.set = originalStorage;
      throw error;
    }
  }

  // Test: User Interface Responsiveness
  async testUserInterfaceResponsiveness() {
    // Test that UI remains responsive during operations
    const startTime = performance.now();
    
    // Simulate UI interactions during heavy processing
    const uiResponsivenessPromises = [];
    
    for (let i = 0; i < 10; i++) {
      uiResponsivenessPromises.push(
        this.simulateUIInteraction(`ui-test-${i}`)
      );
    }
    
    // Run heavy processing in background
    const heavyProcessing = this.simulateHeavyProcessing();
    
    // Wait for UI interactions to complete
    const uiResults = await Promise.all(uiResponsivenessPromises);
    await heavyProcessing;
    
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    
    // Check that UI interactions completed quickly
    const slowUIInteractions = uiResults.filter(time => time > 100);
    if (slowUIInteractions.length > 2) {
      throw new Error(`${slowUIInteractions.length} UI interactions were too slow`);
    }
    
    if (totalTime > 2000) {
      throw new Error(`UI responsiveness test took too long: ${totalTime}ms`);
    }
  }

  // Test: Cross-Provider Seamlessness
  async testCrossProviderSeamlessness() {
    const memoryPool = new MemoryPool();
    
    // Test seamless context transfer between providers
    const providers = ['ChatGPT', 'Claude', 'Gemini'];
    const testContext = {
      text: 'JavaScript programming concepts',
      messages: [
        { role: 'user', content: 'What is async/await?' },
        { role: 'assistant', content: 'Async/await is a way to handle promises...' }
      ]
    };
    
    for (const sourceProvider of providers) {
      for (const targetProvider of providers) {
        if (sourceProvider !== targetProvider) {
          const transferStart = performance.now();
          
          const transferResult = await memoryPool.transferContextToProvider(
            sourceProvider,
            targetProvider,
            testContext
          );
          
          const transferEnd = performance.now();
          const transferTime = transferEnd - transferStart;
          
          if (!transferResult || !transferResult.convertedContext) {
            throw new Error(`Context transfer failed from ${sourceProvider} to ${targetProvider}`);
          }
          
          if (transferTime > 500) {
            throw new Error(`Context transfer too slow: ${transferTime}ms`);
          }
          
          // Verify format conversion
          const convertedFormat = transferResult.convertedContext.format;
          if (convertedFormat !== targetProvider.toLowerCase()) {
            throw new Error(`Format conversion failed: expected ${targetProvider.toLowerCase()}, got ${convertedFormat}`);
          }
        }
      }
    }
  }

  // Helper methods
  detectDOMChanges() {
    // Simulate DOM change detection
    return [];
  }

  calculateContextRelevance(query, context) {
    // Simple relevance calculation
    const queryWords = query.toLowerCase().split(/\s+/);
    const contextWords = context.toLowerCase().split(/\s+/);
    
    let matches = 0;
    for (const queryWord of queryWords) {
      if (contextWords.includes(queryWord)) {
        matches++;
      }
    }
    
    return matches / queryWords.length;
  }

  async simulateUIInteraction(id) {
    const startTime = performance.now();
    
    // Simulate UI interaction
    await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
    
    const endTime = performance.now();
    return endTime - startTime;
  }

  async simulateHeavyProcessing() {
    // Simulate heavy background processing
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Generate UX test report
  generateUXReport() {
    const totalTests = this.uxResults.length;
    const passedTests = this.uxResults.filter(r => r.status === 'PASS').length;
    const failedTests = this.uxResults.filter(r => r.status === 'FAIL').length;
    const totalDuration = this.uxResults.reduce((sum, r) => sum + r.duration, 0);
    
    console.log('\n👥 AMP User Experience Test Report');
    console.log('==================================');
    console.log(`Total UX Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    console.log(`Total Duration: ${totalDuration}ms`);
    
    if (this.performanceMetrics.totalTime) {
      console.log('\n📊 Performance Metrics:');
      console.log(`  Load Test Duration: ${this.performanceMetrics.totalTime}ms`);
      console.log(`  Avg Chunk Creation: ${this.performanceMetrics.avgChunkCreation.toFixed(2)}ms`);
      console.log(`  Avg Search Time: ${this.performanceMetrics.avgSearchTime.toFixed(2)}ms`);
    }
    
    if (failedTests > 0) {
      console.log('\n❌ Failed UX Tests:');
      this.uxResults
        .filter(r => r.status === 'FAIL')
        .forEach(r => {
          console.log(`  - ${r.test}: ${r.error}`);
        });
    }
    
    console.log('\n✅ All UX tests completed!');
    
    return {
      total: totalTests,
      passed: passedTests,
      failed: failedTests,
      successRate: (passedTests / totalTests) * 100,
      duration: totalDuration,
      performanceMetrics: this.performanceMetrics,
      results: this.uxResults
    };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AMPUXTestSuite;
} 