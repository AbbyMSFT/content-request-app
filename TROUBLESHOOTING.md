# Content Request App - Troubleshooting Guide

This guide helps you resolve common issues with the Content Request App and provides systematic approaches to diagnosing problems.

## Quick Commands for Common Issues

### 🆘 Emergency Reset
If everything is broken and you need to start fresh:
```bash
npm run reset
```
This will clean up all processes and start everything properly.

### 🔍 Check System Status
```bash
npm run status
```
Quick health check of all components.

### 🏥 Detailed Health Monitor
```bash
npm run health
```
One-time detailed health check.

```bash
npm run health:watch
```
Continuous monitoring (updates every 10 seconds).

### 🧹 Clean Up Processes
```bash
npm run cleanup
```
Safely terminate all project-related processes.

## Common Issues and Solutions

### 1. "Port Already in Use" Errors

**Symptoms:**
- `EADDRINUSE` errors
- Frontend or backend won't start
- Multiple processes conflict

**Solution:**
```bash
npm run cleanup
npm run dev:safe
```

**Manual diagnosis:**
```bash
# Check what's using the ports
netstat -ano | findstr :3003
netstat -ano | findstr :5179

# Or use our health check
npm run status
```

### 2. MCP Connection Issues

**Symptoms:**
- "Not connected" errors in backend logs
- Azure DevOps data not loading
- Work items showing as empty

**Quick fix:**
```bash
npm run reset
```

**Detailed diagnosis:**
```bash
npm run health:watch
```

**Common causes:**
1. **MCP server file missing:** Check if `mcp-server/build/index.js` exists
2. **Build required:** Run `cd mcp-server && npm run build`
3. **Environment variables:** Check `.env` file for PAT token
4. **Process conflicts:** Old MCP processes interfering

### 3. Frontend Not Loading

**Symptoms:**
- Blank page or loading errors
- Network connection errors
- API calls failing

**Solution steps:**
1. Check if backend is running: `npm run status`
2. Verify health: `npm run health`
3. Full reset: `npm run reset`

### 4. Azure DevOps Authentication Issues

**Symptoms:**
- "401 Unauthorized" errors
- PAT token errors
- No work items returned

**Check your configuration:**
1. Verify `.env` file contains:
   ```
   ADO_PERSONAL_ACCESS_TOKEN=your_token_here
   ADO_ORGANIZATION_URL=https://dev.azure.com/msft-skilling
   ADO_DEFAULT_PROJECT=Content
   ```

2. Verify PAT token permissions:
   - Work Items (Read & Write)
   - Project and Team (Read)
   - Identity (Read)

3. Test with health check:
   ```bash
   npm run health
   ```

### 5. Build Issues

**Symptoms:**
- TypeScript compilation errors
- Missing dependencies
- Module not found errors

**Solutions:**
1. **Clean install:**
   ```bash
   npm run cleanup
   rm -rf node_modules package-lock.json
   npm install
   npm run dev:safe
   ```

2. **MCP server build:**
   ```bash
   cd mcp-server
   npm run build
   cd ..
   npm run dev:safe
   ```

## Diagnostic Tools

### Health Monitor Features

The health monitor (`npm run health`) checks:
- ✅ Backend API server status
- ✅ Frontend development server
- ✅ MCP connection health
- ✅ Azure DevOps connectivity
- ✅ PAT token validation

### Process Cleanup Features

The cleanup script (`npm run cleanup`) safely:
- 🔍 Finds all project-related processes
- 🛑 Gracefully terminates processes (SIGTERM first)
- ⚡ Force kills if needed (SIGKILL)
- ✅ Verifies ports are free

### Smart Startup Features

The safe startup (`npm run dev:safe`) provides:
- 🔍 Prerequisites checking
- 🧹 Automatic cleanup
- 📋 Proper service sequencing
- 💓 Health validation
- 🔄 Graceful shutdown handling

## Advanced Troubleshooting

### Verbose Logging

For detailed diagnostics:
```bash
node scripts/start.js --verbose
node scripts/cleanup.js --verbose
node scripts/health-monitor.js --verbose
```

### Skip Cleanup

If cleanup is causing issues:
```bash
node scripts/start.js --skip-cleanup
```

### MCP Server Direct Testing

Test MCP server independently:
```bash
# From MCP server directory
cd mcp-server
npm run build
node build/index.js
```

### Manual Process Termination

If scripts fail, manual cleanup:
```bash
# Windows
tasklist | findstr node
taskkill /f /pid <PID>

# Find by port
netstat -ano | findstr :3003
taskkill /f /pid <PID>
```

## Environment Issues

### Missing .env File

Create `.env` in project root:
```
# Azure DevOps Configuration
ADO_PERSONAL_ACCESS_TOKEN=your_pat_token_here
ADO_ORGANIZATION_URL=https://dev.azure.com/msft-skilling
ADO_DEFAULT_PROJECT=Content

# Optional: Custom ports
API_PORT=3003
VITE_PORT=5179
```

### Node.js Version Issues

Ensure you're using Node.js 18+ with ES modules support:
```bash
node --version  # Should be 18.0.0 or higher
```

### Module Resolution Issues

If imports fail:
1. Verify `"type": "module"` in `package.json`
2. Use `.js` extensions in imports
3. Check file paths are correct

## Monitoring and Maintenance

### Continuous Monitoring

For development sessions:
```bash
npm run health:watch
```

This provides real-time monitoring of all components.

### Log Analysis

Key log patterns to watch for:
- ✅ `MCP server connection established successfully`
- ❌ `Failed to initialize MCP connection`
- 💓 `Health check: MCP connection healthy`
- 🔄 `Scheduling retry in X seconds`

### Performance Monitoring

The health monitor shows response times:
- < 100ms: Excellent
- 100ms-1s: Good
- > 1s: May indicate issues

## Getting Help

1. **Check health first:** `npm run health`
2. **Try reset:** `npm run reset`
3. **Enable verbose logging:** `--verbose` flag
4. **Check recent changes:** Git history
5. **Review error logs:** Look for specific error messages

## Prevention

### Best Practices

1. **Always use `npm run dev:safe`** instead of manual startup
2. **Use `npm run cleanup`** before switching branches
3. **Monitor with `npm run health:watch`** during development
4. **Keep PAT token updated** and check permissions regularly
5. **Update MCP server** after making changes

### Regular Maintenance

- Weekly: Clear old processes with `npm run cleanup`
- Monthly: Update dependencies
- As needed: Refresh PAT tokens

## Files Overview

- `scripts/start.js` - Intelligent startup with health checks
- `scripts/cleanup.js` - Safe process termination
- `scripts/health-monitor.js` - System health monitoring
- `server.js` - Enhanced with retry logic and monitoring
- `package.json` - Updated with new npm scripts

This comprehensive system ensures reliable development experience and reduces the recurring startup issues you've been experiencing.
