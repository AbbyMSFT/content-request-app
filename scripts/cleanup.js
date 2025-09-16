#!/usr/bin/env node
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import config from '../config.js';

const execAsync = promisify(exec);

/**
 * Comprehensive cleanup utility for the content request app
 * Safely terminates processes and cleans up resources
 */

class ProcessCleanup {
  constructor() {
    this.projectPorts = [config.backend.port, config.frontend.port];
    this.projectProcesses = [];
    this.verbose = process.argv.includes('--verbose') || process.argv.includes('-v');
  }

  log(message, level = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = {
      info: '🔧',
      success: '✅',
      warning: '⚠️',
      error: '❌'
    }[level] || '📝';
    
    console.log(`[${timestamp}] ${prefix} ${message}`);
  }

  async findProcessesByPort() {
    this.log('Checking for processes using project ports...');
    const portProcesses = [];

    for (const port of this.projectPorts) {
      try {
        if (process.platform === 'win32') {
          const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
          const lines = stdout.trim().split('\n').filter(line => line.trim());
          
          for (const line of lines) {
            const match = line.match(/\s+(\d+)$/);
            if (match) {
              const pid = parseInt(match[1]);
              portProcesses.push({ port, pid, line: line.trim() });
            }
          }
        } else {
          // macOS/Linux
          const { stdout } = await execAsync(`lsof -ti:${port}`);
          const pids = stdout.trim().split('\n').filter(pid => pid);
          for (const pid of pids) {
            portProcesses.push({ port, pid: parseInt(pid) });
          }
        }
      } catch (error) {
        // Port not in use, which is fine
        if (this.verbose) {
          this.log(`Port ${port} is free`, 'info');
        }
      }
    }

    return portProcesses;
  }

  async findNodeProcesses() {
    this.log('Finding Node.js processes...');
    const nodeProcesses = [];

    try {
      if (process.platform === 'win32') {
        const { stdout } = await execAsync('wmic process where "name=\'node.exe\'" get ProcessId,CommandLine /format:csv');
        const lines = stdout.split('\n').filter(line => line.includes('node.exe'));
        
        for (const line of lines) {
          const parts = line.split(',');
          if (parts.length >= 3) {
            const pid = parseInt(parts[parts.length - 1].trim());
            const commandLine = parts.slice(1, -1).join(',').trim();
            
            // Only include processes related to our project
            if (this.isProjectRelated(commandLine)) {
              nodeProcesses.push({ pid, commandLine });
            }
          }
        }
      } else {
        // macOS/Linux
        const { stdout } = await execAsync('ps aux | grep node');
        const lines = stdout.split('\n').filter(line => line.includes('node') && !line.includes('grep'));
        
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          const pid = parseInt(parts[1]);
          const commandLine = parts.slice(10).join(' ');
          
          if (this.isProjectRelated(commandLine)) {
            nodeProcesses.push({ pid, commandLine });
          }
        }
      }
    } catch (error) {
      this.log(`Error finding Node processes: ${error.message}`, 'error');
    }

    return nodeProcesses;
  }

  isProjectRelated(commandLine) {
    const projectIndicators = [
      'server.js',
      'content-request-app',
      'vite',
      'mcp-server',
      'content-request-server',
      config.backend.port.toString(),
      config.frontend.port.toString()
    ];

    return projectIndicators.some(indicator => 
      commandLine.toLowerCase().includes(indicator.toLowerCase())
    );
  }

  async killProcess(pid, signal = 'SIGTERM') {
    try {
      if (process.platform === 'win32') {
        if (signal === 'SIGKILL') {
          await execAsync(`taskkill /f /pid ${pid}`);
        } else {
          await execAsync(`taskkill /pid ${pid}`);
        }
      } else {
        process.kill(pid, signal);
      }
      return true;
    } catch (error) {
      if (this.verbose) {
        this.log(`Failed to kill process ${pid}: ${error.message}`, 'warning');
      }
      return false;
    }
  }

  async waitForProcessToExit(pid, timeoutMs = 5000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      try {
        if (process.platform === 'win32') {
          await execAsync(`tasklist /fi "PID eq ${pid}"`);
        } else {
          process.kill(pid, 0); // Check if process exists
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        // Process no longer exists
        return true;
      }
    }
    
    return false;
  }

  async gracefulKill(processes) {
    this.log(`Attempting graceful shutdown of ${processes.length} processes...`);
    
    // First try SIGTERM
    const killPromises = processes.map(async ({ pid, commandLine, port }) => {
      if (this.verbose) {
        this.log(`Sending SIGTERM to PID ${pid}: ${commandLine || `Port ${port}`}`, 'info');
      }
      
      const killed = await this.killProcess(pid, 'SIGTERM');
      if (!killed) return { pid, killed: false };
      
      const exited = await this.waitForProcessToExit(pid, 3000);
      return { pid, killed: exited, commandLine, port };
    });

    const results = await Promise.all(killPromises);
    
    // Force kill any remaining processes
    const remaining = results.filter(r => !r.killed);
    if (remaining.length > 0) {
      this.log(`Force killing ${remaining.length} remaining processes...`, 'warning');
      
      for (const { pid, commandLine, port } of remaining) {
        if (this.verbose) {
          this.log(`Sending SIGKILL to PID ${pid}: ${commandLine || `Port ${port}`}`, 'info');
        }
        await this.killProcess(pid, 'SIGKILL');
      }
    }

    return results;
  }

  async cleanup() {
    this.log('🧹 Starting comprehensive cleanup...');
    
    try {
      // Find processes by port
      const portProcesses = await this.findProcessesByPort();
      
      // Find Node.js processes
      const nodeProcesses = await this.findNodeProcesses();
      
      // Combine and deduplicate
      const allProcesses = new Map();
      
      portProcesses.forEach(p => {
        allProcesses.set(p.pid, { pid: p.pid, port: p.port, line: p.line });
      });
      
      nodeProcesses.forEach(p => {
        if (allProcesses.has(p.pid)) {
          allProcesses.get(p.pid).commandLine = p.commandLine;
        } else {
          allProcesses.set(p.pid, { pid: p.pid, commandLine: p.commandLine });
        }
      });

      const processesToKill = Array.from(allProcesses.values());
      
      if (processesToKill.length === 0) {
        this.log('No project-related processes found to clean up', 'success');
        return;
      }

      this.log(`Found ${processesToKill.length} processes to clean up:`);
      processesToKill.forEach(p => {
        this.log(`  PID ${p.pid}: ${p.commandLine || `Port ${p.port}`}`, 'info');
      });

      // Perform cleanup
      await this.gracefulKill(processesToKill);
      
      // Verify cleanup
      await new Promise(resolve => setTimeout(resolve, 1000));
      const remainingPortProcesses = await this.findProcessesByPort();
      
      if (remainingPortProcesses.length === 0) {
        this.log('✨ Cleanup completed successfully! All ports are now free.', 'success');
      } else {
        this.log(`⚠️ ${remainingPortProcesses.length} processes still running on project ports`, 'warning');
        remainingPortProcesses.forEach(p => {
          this.log(`  Port ${p.port}: PID ${p.pid}`, 'warning');
        });
      }

    } catch (error) {
      this.log(`Cleanup failed: ${error.message}`, 'error');
      process.exit(1);
    }
  }

  async checkPorts() {
    const portProcesses = await this.findProcessesByPort();
    
    if (portProcesses.length === 0) {
      this.log('All project ports are free', 'success');
      return true;
    } else {
      this.log('Some ports are still in use:', 'warning');
      portProcesses.forEach(p => {
        this.log(`  Port ${p.port}: PID ${p.pid}`, 'warning');
      });
      return false;
    }
  }
}

// CLI interface
async function main() {
  const cleanup = new ProcessCleanup();
  
  if (process.argv.includes('--check')) {
    await cleanup.checkPorts();
  } else {
    await cleanup.cleanup();
  }
}

// Handle script execution
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Cleanup script failed:', error);
    process.exit(1);
  });
}

export default ProcessCleanup;
