// © 2025 AMPIQ All rights reserved.
// Performance Management Module - Keeps extension lightweight
// Version: 4.0.0

/**
 * PERFORMANCE GOALS:
 * - Memory usage: < 50MB total
 * - CPU usage: < 2% when idle
 * - No impact on browser responsiveness
 * - Graceful degradation under load
 */

class PerformanceManager {
    constructor() {
        // Interval management
        this.intervals = new Map();
        this.timeouts = new Map();
        
        // Activity tracking
        this.lastActivity = Date.now();
        this.isIdle = false;
        this.idleThreshold = 60000; // 1 minute of inactivity = idle
        
        // Memory tracking
        this.memoryWarningThreshold = 40 * 1024 * 1024; // 40MB warning
        this.memoryCriticalThreshold = 60 * 1024 * 1024; // 60MB critical
        
        // Throttling
        this.throttleMultiplier = 1; // 1 = normal, 2 = throttled, 4 = heavily throttled
        
        // Start monitoring
        this.startIdleDetection();
        this.startMemoryMonitoring();
    }
    
    /**
     * Register an interval with automatic cleanup and throttling
     */
    registerInterval(name, callback, baseInterval) {
        // Clear existing interval if any
        this.clearInterval(name);
        
        const actualInterval = baseInterval * this.throttleMultiplier;
        const id = setInterval(() => {
            // Skip if idle and non-critical
            if (this.isIdle && !this.isCriticalInterval(name)) {
                return;
            }
            
            try {
                callback();
            } catch (error) {
                console.error(`Interval ${name} error:`, error);
            }
        }, actualInterval);
        
        this.intervals.set(name, { id, baseInterval, callback });
        console.log(`📊 Registered interval: ${name} (${actualInterval}ms)`);
        return id;
    }
    
    /**
     * Clear a registered interval
     */
    clearInterval(name) {
        const interval = this.intervals.get(name);
        if (interval) {
            clearInterval(interval.id);
            this.intervals.delete(name);
        }
    }
    
    /**
     * Clear all intervals
     */
    clearAllIntervals() {
        for (const [name, interval] of this.intervals) {
            clearInterval(interval.id);
        }
        this.intervals.clear();
        console.log('📊 Cleared all intervals');
    }
    
    /**
     * Register a timeout with tracking
     */
    registerTimeout(name, callback, delay) {
        this.clearTimeout(name);
        
        const id = setTimeout(() => {
            this.timeouts.delete(name);
            try {
                callback();
            } catch (error) {
                console.error(`Timeout ${name} error:`, error);
            }
        }, delay);
        
        this.timeouts.set(name, id);
        return id;
    }
    
    /**
     * Clear a registered timeout
     */
    clearTimeout(name) {
        const id = this.timeouts.get(name);
        if (id) {
            clearTimeout(id);
            this.timeouts.delete(name);
        }
    }
    
    /**
     * Check if an interval is critical (should run even when idle)
     */
    isCriticalInterval(name) {
        const criticalIntervals = ['health-check', 'memory-cleanup', 'connection-retry'];
        return criticalIntervals.includes(name);
    }
    
    /**
     * Start idle detection
     */
    startIdleDetection() {
        // Check for idle state every 30 seconds
        setInterval(() => {
            const timeSinceActivity = Date.now() - this.lastActivity;
            const wasIdle = this.isIdle;
            this.isIdle = timeSinceActivity > this.idleThreshold;
            
            if (this.isIdle !== wasIdle) {
                if (this.isIdle) {
                    console.log('📊 Extension entering idle mode - reducing activity');
                    this.throttleMultiplier = 4; // Heavily throttle when idle
                    this.updateIntervalFrequencies();
                } else {
                    console.log('📊 Extension resuming active mode');
                    this.throttleMultiplier = 1;
                    this.updateIntervalFrequencies();
                }
            }
        }, 30000);
    }
    
    /**
     * Record activity to reset idle timer
     */
    recordActivity() {
        this.lastActivity = Date.now();
        if (this.isIdle) {
            this.isIdle = false;
            this.throttleMultiplier = 1;
            this.updateIntervalFrequencies();
        }
    }
    
    /**
     * Update all interval frequencies based on throttle multiplier
     */
    updateIntervalFrequencies() {
        for (const [name, interval] of this.intervals) {
            clearInterval(interval.id);
            const newInterval = interval.baseInterval * this.throttleMultiplier;
            interval.id = setInterval(() => {
                if (this.isIdle && !this.isCriticalInterval(name)) {
                    return;
                }
                try {
                    interval.callback();
                } catch (error) {
                    console.error(`Interval ${name} error:`, error);
                }
            }, newInterval);
        }
    }
    
    /**
     * Start memory monitoring
     */
    startMemoryMonitoring() {
        // Check memory every 60 seconds
        setInterval(() => {
            this.checkMemoryUsage();
        }, 60000);
    }
    
    /**
     * Check current memory usage and take action if needed
     */
    async checkMemoryUsage() {
        try {
            // Use performance.memory if available (Chrome only)
            if (performance && performance.memory) {
                const used = performance.memory.usedJSHeapSize;
                const total = performance.memory.totalJSHeapSize;
                
                console.log(`📊 Memory: ${(used / 1024 / 1024).toFixed(2)}MB / ${(total / 1024 / 1024).toFixed(2)}MB`);
                
                if (used > this.memoryCriticalThreshold) {
                    console.warn('📊 CRITICAL: Memory usage high, triggering cleanup');
                    this.triggerMemoryCleanup('critical');
                } else if (used > this.memoryWarningThreshold) {
                    console.warn('📊 WARNING: Memory usage elevated');
                    this.triggerMemoryCleanup('warning');
                }
            }
        } catch (error) {
            // Memory API not available, that's okay
        }
    }
    
    /**
     * Trigger memory cleanup
     */
    triggerMemoryCleanup(level) {
        // Dispatch event for other modules to respond
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('amp-memory-cleanup', { 
                detail: { level } 
            }));
        }
        
        // Force garbage collection hint (doesn't guarantee GC but helps)
        if (level === 'critical') {
            // Clear any cached data
            this.clearNonEssentialCaches();
        }
    }
    
    /**
     * Clear non-essential caches
     */
    clearNonEssentialCaches() {
        // This will be called by modules that have caches
        console.log('📊 Clearing non-essential caches');
    }
    
    /**
     * Debounce a function
     */
    debounce(func, wait) {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }
    
    /**
     * Throttle a function
     */
    throttle(func, limit) {
        let inThrottle;
        return (...args) => {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
    
    /**
     * Get current performance stats
     */
    getStats() {
        return {
            activeIntervals: this.intervals.size,
            activeTimeouts: this.timeouts.size,
            isIdle: this.isIdle,
            throttleMultiplier: this.throttleMultiplier,
            timeSinceActivity: Date.now() - this.lastActivity
        };
    }
}

// Singleton instance
const performanceManager = new PerformanceManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PerformanceManager, performanceManager };
}

