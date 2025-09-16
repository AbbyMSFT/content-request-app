#!/usr/bin/env node
import { promisify } from 'util';
import config from '../config.js';

const sleep = promisify(setTimeout);

/**
 * Real-time health monitoring for the content request app
 * Monitors all components and provides status dashboard
 */

class HealthMonitor {
  constructor() {
    this.verbose = process.argv.includes('--verbose') || process.argv.includes('-v');
    this.continuous = process.argv.includes('--watch') || process.argv.includes('-w');
    this.interval = parseInt(process.argv.find(arg => arg.startsWith('--interval='))?.split('=')[1]) || 10000;
    this.services = {
      backend: { name: 'Backend API', url: `http://localhost:${config.backend.port}`, health: '/health' },
      frontend: { name: 'Frontend App', url: `http://localhost:${config.frontend.port}`, health: '/' },
      mcp: { name: 'MCP Connection', url: `http://localhost:${config.backend.port}`, health: '/api/health' }
    };
  }

  log(message, level = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = {
      info: '📊',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      status: '🔍'
    }[level] || '📝';
    
    console.log(`[${timestamp}] ${prefix} ${message}`);
  }

  async checkService(service) {
    const startTime = Date.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${service.url}${service.health}`, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });
      
      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        let details = {};
        
        try {
          if (response.headers.get('content-type')?.includes('application/json')) {
            details = await response.json();
          }
        } catch (parseError) {
          // Ignore JSON parse errors for non-JSON responses
        }
        
        return {
          status: 'healthy',
          responseTime,
          statusCode: response.status,
          details
        };
      } else {
        return {
          status: 'unhealthy',
          responseTime,
          statusCode: response.status,
          error: `HTTP ${response.status} ${response.statusText}`
        };
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      if (error.name === 'AbortError') {
        return {
          status: 'timeout',
          responseTime,
          error: 'Request timeout (5s)'
        };
      } else if (error.code === 'ECONNREFUSED') {
        return {
          status: 'down',
          responseTime,
          error: 'Connection refused (service not running)'
        };
      } else {
        return {
          status: 'error',
          responseTime,
          error: error.message
        };
      }
    }
  }

  formatStatus(status) {
    const icons = {
      healthy: '🟢',
      unhealthy: '🟡',
      timeout: '🟠',
      down: '🔴',
      error: '❌'
    };
    
    return `${icons[status] || '❓'} ${status.toUpperCase()}`;
  }

  formatResponseTime(ms) {
    if (ms < 100) return `${ms}ms`;
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  }

  async checkAllServices() {
    const results = {};
    const checks = Object.entries(this.services).map(async ([key, service]) => {
      const result = await this.checkService(service);
      results[key] = { ...service, ...result };
    });
    
    await Promise.all(checks);
    return results;
  }

  displayResults(results) {
    console.clear();
    
    const now = new Date();
    console.log(`🏥 Content Request App Health Monitor - ${now.toLocaleString()}`);
    console.log('=' .repeat(70));
    
    let overallHealthy = true;
    
    for (const [key, result] of Object.entries(results)) {
      const statusIcon = this.formatStatus(result.status);
      const responseTime = this.formatResponseTime(result.responseTime || 0);
      
      console.log(`\n${result.name}:`);
      console.log(`  Status: ${statusIcon}`);
      console.log(`  URL: ${result.url}${result.health}`);
      console.log(`  Response Time: ${responseTime}`);
      
      if (result.statusCode) {
        console.log(`  HTTP Status: ${result.statusCode}`);
      }
      
      if (result.error) {
        console.log(`  Error: ${result.error}`);
        overallHealthy = false;
      }
      
      // Show detailed health info for backend
      if (key === 'mcp' && result.details && result.details.mcp) {
        console.log(`  MCP Status: ${result.details.mcp.status}`);
        if (result.details.mcp.error) {
          console.log(`  MCP Error: ${result.details.mcp.error}`);
        }
        if (result.details.environment) {
          console.log(`  PAT Token: ${result.details.environment.hasToken ? '✓' : '✗'}`);
          console.log(`  Organization: ${result.details.environment.organization}`);
          console.log(`  Project: ${result.details.environment.project}`);
        }
      }
      
      if (this.verbose && result.details && Object.keys(result.details).length > 0) {
        console.log(`  Details: ${JSON.stringify(result.details, null, 4)}`);
      }
    }
    
    console.log('\n' + '=' .repeat(70));
    
    const overallStatus = overallHealthy ? '🟢 ALL SYSTEMS OPERATIONAL' : '🔴 SOME SYSTEMS DOWN';
    console.log(`Overall Status: ${overallStatus}`);
    
    if (this.continuous) {
      console.log(`\nNext check in ${this.interval / 1000} seconds... (Press Ctrl+C to stop)`);
    }
  }

  async monitor() {
    if (this.continuous) {
      this.log(`Starting continuous monitoring (${this.interval / 1000}s intervals)...`, 'status');
      
      while (true) {
        const results = await this.checkAllServices();
        this.displayResults(results);
        await sleep(this.interval);
      }
    } else {
      this.log('Performing single health check...', 'status');
      const results = await this.checkAllServices();
      this.displayResults(results);
    }
  }

  async quickCheck() {
    const results = await this.checkAllServices();
    
    const summary = Object.entries(results).map(([key, result]) => {
      return `${result.name}: ${this.formatStatus(result.status)}`;
    }).join(', ');
    
    const allHealthy = Object.values(results).every(r => r.status === 'healthy');
    const overallIcon = allHealthy ? '✅' : '❌';
    
    return {
      healthy: allHealthy,
      summary: `${overallIcon} ${summary}`,
      details: results
    };
  }
}

// CLI interface
async function main() {
  const monitor = new HealthMonitor();
  
  if (process.argv.includes('--quick')) {
    const result = await monitor.quickCheck();
    console.log(result.summary);
    process.exit(result.healthy ? 0 : 1);
  } else {
    await monitor.monitor();
  }
}

// Handle script execution
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Health monitor failed:', error);
    process.exit(1);
  });
}

export default HealthMonitor;
