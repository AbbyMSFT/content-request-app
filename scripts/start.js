#!/usr/bin/env node
import { spawn } from 'child_process';
import { promisify } from 'util';
import config from '../config.js';
import ProcessCleanup from './cleanup.js';

const sleep = promisify(setTimeout);

/**
 * Intelligent startup script for the content request app
 * Ensures clean startup with proper sequencing and validation
 */

class ProjectStarter {
  constructor() {
    this.processes = new Map();
    this.cleanup = new ProcessCleanup();
    this.verbose = process.argv.includes('--verbose') || process.argv.includes('-v');
    this.skipCleanup = process.argv.includes('--skip-cleanup');
  }

  log(message, level = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = {
      info: '🚀',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      step: '📋'
    }[level] || '📝';
    
    console.log(`[${timestamp}] ${prefix} ${message}`);
  }

  async checkPrerequisites() {
    this.log('Checking prerequisites...', 'step');
    
    // Check if package.json exists
    try {
      await import('../package.json', { assert: { type: 'json' } });
      this.log('✓ package.json found');
    } catch (error) {
      this.log('✗ package.json not found', 'error');
      throw new Error('Run this script from the project root directory');
    }

    // Check if config.js is accessible
    try {
      this.log(`✓ Config loaded - Backend: ${config.backend.port}, Frontend: ${config.frontend.port}`);
    } catch (error) {
      this.log('✗ Config file not accessible', 'error');
      throw error;
    }

    // Check if .env file exists
    try {
      const fs = await import('fs/promises');
      await fs.access('.env');
      this.log('✓ .env file found');
    } catch (error) {
      this.log('⚠️ .env file not found - some features may not work', 'warning');
    }

    // Check if MCP server is built
    try {
      const fs = await import('fs/promises');
      await fs.access('mcp-server/build/index.js');
      this.log('✓ MCP server build found');
    } catch (error) {
      this.log('⚠️ MCP server not built - attempting to build...', 'warning');
      await this.buildMCPServer();
    }
  }

  async buildMCPServer() {
    this.log('Building MCP server...', 'step');
    
    return new Promise((resolve, reject) => {
      const buildProcess = spawn('npm', ['run', 'build'], {
        cwd: 'mcp-server',
        stdio: this.verbose ? 'inherit' : 'pipe',
        shell: true
      });

      buildProcess.on('close', (code) => {
        if (code === 0) {
          this.log('✓ MCP server built successfully');
          resolve();
        } else {
          this.log('✗ MCP server build failed', 'error');
          reject(new Error('MCP server build failed'));
        }
      });
    });
  }

  async cleanupExistingProcesses() {
    if (this.skipCleanup) {
      this.log('Skipping cleanup (--skip-cleanup flag)', 'warning');
      return;
    }

    this.log('Cleaning up existing processes...', 'step');
    await this.cleanup.cleanup();
    
    // Wait a bit for processes to fully terminate
    await sleep(2000);
    
    // Verify ports are free
    const portsFree = await this.cleanup.checkPorts();
    if (!portsFree) {
      throw new Error('Some ports are still in use after cleanup');
    }
  }

  async startBackend() {
    this.log('Starting backend server...', 'step');
    
    return new Promise((resolve, reject) => {
      const backendProcess = spawn('node', ['server.js'], {
        stdio: 'pipe',
        env: { ...process.env, NODE_ENV: 'development' }
      });

      this.processes.set('backend', backendProcess);

      let startupOutput = '';
      let hasStarted = false;

      backendProcess.stdout.on('data', (data) => {
        const output = data.toString();
        startupOutput += output;
        
        if (this.verbose) {
          process.stdout.write(`[BACKEND] ${output}`);
        }

        // Look for startup indicators
        if (output.includes('Content Request API server running') || 
            output.includes(`http://localhost:${config.backend.port}`)) {
          hasStarted = true;
          this.log(`✓ Backend server started on port ${config.backend.port}`);
          resolve();
        }
      });

      backendProcess.stderr.on('data', (data) => {
        const output = data.toString();
        startupOutput += output;
        
        if (this.verbose) {
          process.stderr.write(`[BACKEND ERROR] ${output}`);
        }

        // Check for error indicators
        if (output.includes('EADDRINUSE') || output.includes('address already in use')) {
          this.log(`✗ Backend port ${config.backend.port} is already in use`, 'error');
          reject(new Error(`Port ${config.backend.port} is already in use`));
        }
      });

      backendProcess.on('close', (code) => {
        if (!hasStarted) {
          this.log('✗ Backend server failed to start', 'error');
          if (this.verbose) {
            console.log('Backend output:', startupOutput);
          }
          reject(new Error('Backend server exited before starting'));
        }
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (!hasStarted) {
          this.log('✗ Backend server startup timeout', 'error');
          reject(new Error('Backend server startup timeout'));
        }
      }, 30000);
    });
  }

  async waitForBackendHealth() {
    this.log('Waiting for backend health check...', 'step');
    
    const maxAttempts = 10;
    const delayMs = 2000;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await fetch(`http://localhost:${config.backend.port}/health`);
        if (response.ok) {
          const health = await response.json();
          this.log('✓ Backend health check passed');
          if (this.verbose) {
            this.log(`Backend health: ${JSON.stringify(health, null, 2)}`);
          }
          return health;
        }
      } catch (error) {
        if (this.verbose) {
          this.log(`Health check attempt ${attempt}/${maxAttempts} failed: ${error.message}`);
        }
      }

      if (attempt < maxAttempts) {
        await sleep(delayMs);
      }
    }

    throw new Error('Backend health check failed after maximum attempts');
  }

  async startFrontend() {
    this.log('Starting frontend development server...', 'step');
    
    return new Promise((resolve, reject) => {
      const frontendProcess = spawn('npm', ['run', 'dev'], {
        stdio: 'pipe',
        shell: true
      });

      this.processes.set('frontend', frontendProcess);

      let hasStarted = false;

      frontendProcess.stdout.on('data', (data) => {
        const output = data.toString();
        
        if (this.verbose) {
          process.stdout.write(`[FRONTEND] ${output}`);
        }

        // Look for Vite startup indicators
        if (output.includes('Local:') && output.includes(`localhost:${config.frontend.port}`)) {
          hasStarted = true;
          this.log(`✓ Frontend server started on port ${config.frontend.port}`);
          resolve();
        }
      });

      frontendProcess.stderr.on('data', (data) => {
        const output = data.toString();
        
        if (this.verbose) {
          process.stderr.write(`[FRONTEND ERROR] ${output}`);
        }

        if (output.includes('EADDRINUSE')) {
          this.log(`✗ Frontend port ${config.frontend.port} is already in use`, 'error');
          reject(new Error(`Port ${config.frontend.port} is already in use`));
        }
      });

      frontendProcess.on('close', (code) => {
        if (!hasStarted) {
          this.log('✗ Frontend server failed to start', 'error');
          reject(new Error('Frontend server exited before starting'));
        }
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (!hasStarted) {
          this.log('✗ Frontend server startup timeout', 'error');
          reject(new Error('Frontend server startup timeout'));
        }
      }, 30000);
    });
  }

  async waitForFrontendReady() {
    this.log('Waiting for frontend to be ready...', 'step');
    
    const maxAttempts = 10;
    const delayMs = 2000;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await fetch(`http://localhost:${config.frontend.port}`);
        if (response.ok) {
          this.log('✓ Frontend is responding');
          return;
        }
      } catch (error) {
        if (this.verbose) {
          this.log(`Frontend check attempt ${attempt}/${maxAttempts} failed: ${error.message}`);
        }
      }

      if (attempt < maxAttempts) {
        await sleep(delayMs);
      }
    }

    this.log('⚠️ Frontend health check failed, but it might still be working', 'warning');
  }

  async setupGracefulShutdown() {
    const shutdownHandler = async (signal) => {
      this.log(`\nReceived ${signal}, shutting down gracefully...`, 'step');
      
      for (const [name, process] of this.processes) {
        this.log(`Stopping ${name}...`);
        try {
          if (process.kill) {
            process.kill('SIGTERM');
          }
        } catch (error) {
          this.log(`Error stopping ${name}: ${error.message}`, 'warning');
        }
      }

      // Wait for processes to terminate
      await sleep(3000);

      // Force cleanup if needed
      try {
        await this.cleanup.cleanup();
      } catch (error) {
        this.log(`Cleanup during shutdown failed: ${error.message}`, 'warning');
      }

      this.log('Shutdown complete', 'success');
      process.exit(0);
    };

    process.on('SIGINT', shutdownHandler);
    process.on('SIGTERM', shutdownHandler);
  }

  async start() {
    try {
      this.log('🚀 Starting Content Request App...', 'step');
      
      // Setup graceful shutdown
      await this.setupGracefulShutdown();
      
      // Check prerequisites
      await this.checkPrerequisites();
      
      // Clean up existing processes
      await this.cleanupExistingProcesses();
      
      // Start backend
      await this.startBackend();
      
      // Wait for backend to be healthy
      await this.waitForBackendHealth();
      
      // Start frontend
      await this.startFrontend();
      
      // Wait for frontend to be ready
      await this.waitForFrontendReady();
      
      // All good!
      this.log('🎉 All services started successfully!', 'success');
      this.log(`📱 Frontend: http://localhost:${config.frontend.port}`, 'success');
      this.log(`🖥️ Backend: http://localhost:${config.backend.port}`, 'success');
      this.log(`🔍 Health Check: http://localhost:${config.backend.port}/health`, 'success');
      this.log('Press Ctrl+C to stop all services', 'info');
      
      // Keep the script running
      await new Promise(() => {});
      
    } catch (error) {
      this.log(`Startup failed: ${error.message}`, 'error');
      
      // Cleanup on failure
      for (const [name, process] of this.processes) {
        try {
          process.kill('SIGTERM');
        } catch (killError) {
          // Ignore kill errors during cleanup
        }
      }
      
      process.exit(1);
    }
  }
}

// CLI interface
async function main() {
  const starter = new ProjectStarter();
  await starter.start();
}

// Handle script execution
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Startup script failed:', error);
    process.exit(1);
  });
}

export default ProjectStarter;
