# Deployment Issue Prevention Guide

## 🚨 Critical Issue: MCP Server Cache/Path Problems

### Root Cause Analysis
The recurring deployment issue was caused by:
1. **Wrong MCP Server Path** in server.js pointing to external location
2. **Persistent MCP Processes** surviving server restarts
3. **Multiple Node Processes** running simultaneously with different code versions

### Prevention Measures

## 1. Always Verify MCP Server Path
**Before any restart, confirm server.js uses the correct path:**

```javascript
// CORRECT PATH (in server.js):
const MCP_SERVER_PATH = 'C:\\GitHub\\no-code\\content-request-app-v2\\mcp-server\\build\\index.js';

// WRONG PATH (causes cache issues):
const MCP_SERVER_PATH = 'C:\\Users\\abbyweisberg\\OneDrive - Microsoft\\Documents\\Cline\\MCP\\content-request-server\\build\\index.js';
```

## 2. Complete Process Cleanup Procedure
**Always follow this sequence for deployments:**

```powershell
# 1. Kill ALL node processes
taskkill /F /IM node.exe

# 2. Verify no MCP processes are running
Get-WmiObject Win32_Process | Where-Object {$_.CommandLine -like "*content-request-server*" -or $_.CommandLine -like "*mcp-server*"} | Select-Object ProcessId, CommandLine

# 3. Kill any remaining MCP processes by PID
taskkill /F /PID [process_id]

# 4. Rebuild MCP server
Set-Location "c:\GitHub\no-code\content-request-app-v2\mcp-server"
npm run build

# 5. Start fresh
cd "c:\GitHub\no-code\content-request-app-v2"
node server.js
```

## 3. Deployment Verification Checklist
**After any deployment, verify these indicators:**

✅ **Correct MCP Path in Logs:**
```
🔧 MCP Server Path: C:\GitHub\no-code\content-request-app-v2\mcp-server\build\index.js
```

✅ **Version Markers Appear:**
```
🚀🚀🚀 VERSION [timestamp] DEPLOYED!
```

✅ **Debug Messages Present:**
```
🎯 MONTH FILTER: Looking for items in iteration UNDER paths containing '09 Sep'
```

✅ **Correct API Results:**
- More than 1 item returned for Abby
- September iteration paths only
- No July items

## 4. Warning Signs of Cache Issues
**Stop deployment if you see:**

❌ **Wrong MCP path in logs**
❌ **Missing version markers**
❌ **Old debug messages not appearing**
❌ **Still getting 1 item instead of 66**
❌ **July items appearing in results**

## 5. Emergency Recovery Procedure
**If cache issues recur:**

1. **Check running processes:**
```powershell
Get-Process -Name "node" | Select-Object Id, ProcessName, StartTime
```

2. **Find persistent MCP servers:**
```powershell
Get-WmiObject Win32_Process | Where-Object {$_.CommandLine -like "*mcp-server*"}
```

3. **Nuclear option - kill everything:**
```powershell
taskkill /F /IM node.exe
```

4. **Verify clean slate:**
```powershell
Get-Process -Name "node" -ErrorAction SilentlyContinue
# Should return nothing
```

## 6. Code-Level Safeguards

### A. Add Path Validation to server.js
```javascript
// Add this validation at startup
const fs = require('fs');
if (!fs.existsSync(MCP_SERVER_PATH)) {
  console.error(`❌ CRITICAL: MCP server not found at ${MCP_SERVER_PATH}`);
  console.error('Check MCP_SERVER_PATH configuration!');
  process.exit(1);
}
console.log(`✅ MCP server verified at: ${MCP_SERVER_PATH}`);
```

### B. Add Version Checking
```javascript
// Add this to MCP server getUserWorkItems method
const BUILD_TIMESTAMP = new Date().toISOString();
console.log(`🏗️ BUILD: ${BUILD_TIMESTAMP} - MCP Server getUserWorkItems called`);
```

## 7. Best Practices Going Forward

1. **Always use the complete cleanup procedure** before deployments
2. **Verify path configuration** in server.js before starting
3. **Check for version markers** in logs after startup
4. **Test API endpoint** immediately after deployment
5. **Document any path changes** in this file
6. **Never assume cache is cleared** - always verify

## 8. Quick Health Check Command
```powershell
# Quick test to verify deployment worked
(Invoke-WebRequest -Uri "http://localhost:3003/api/workitems?userEmail=abbyweisberg@microsoft.com&filterByCurrentMonth=true&page=1&pageSize=5&status=all" -Method GET).Content | ConvertFrom-Json | Select-Object totalCount
```

**Expected result:** `totalCount: 66` (or similar high number)
**Bad result:** `totalCount: 1` (indicates cache issue)

---

**Remember:** The user was right about the endless cache clearing cycle. This guide ensures we never fall into that trap again.
