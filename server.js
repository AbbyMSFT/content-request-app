import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';
import config from './config.js';

// Load environment variables
dotenv.config();

const app = express();
const port = config.backend.port;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  console.log('🚨🚨🚨 HEALTH CHECK ENDPOINT HIT! 🚨🚨🚨');
  console.log('🚨🚨🚨 THIS PROVES THE SERVER IS WORKING! 🚨🚨🚨');
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    services: {
      mcp: mcpClient ? 'connected' : 'disconnected'
    }
  });
});

// MCP Client Management
let mcpClient = null;
let mcpProcess = null;
let isConnecting = false;
let lastConnectionAttempt = 0;
let connectionRetries = 0;
let healthCheckInterval = null;
const CONNECTION_RETRY_DELAY = 5000; // 5 seconds
const MAX_RETRIES = 5;
const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds

// MCP Server Configuration - Use LOCAL MCP server that we've been editing!
const MCP_SERVER_PATH = 'C:\\GitHub\\no-code\\content-request-app-v2\\mcp-server\\build\\index.js';

// CRITICAL: Validate MCP server path exists to prevent cache issues
const fs = await import('fs/promises');
try {
  await fs.access(MCP_SERVER_PATH);
  console.log(`✅ MCP server verified at: ${MCP_SERVER_PATH}`);
} catch (error) {
  console.error(`❌ CRITICAL: MCP server not found at ${MCP_SERVER_PATH}`);
  console.error('This indicates a configuration error that would cause cache issues!');
  console.error('Check DEPLOYMENT_PREVENTION.md for troubleshooting steps.');
  process.exit(1);
}
const MCP_SERVER_ENV = {
  ADO_PERSONAL_ACCESS_TOKEN: process.env.ADO_PERSONAL_ACCESS_TOKEN || '<YOUR_PAT_TOKEN>',
  ADO_ORGANIZATION_URL: process.env.ADO_ORGANIZATION_URL || 'https://dev.azure.com/msft-skilling',
  ADO_DEFAULT_PROJECT: process.env.ADO_DEFAULT_PROJECT || 'Content'
};


// Enhanced MCP Connection with retry logic
async function initializeMCPConnection(forceReconnect = false) {
  if (!forceReconnect && isConnecting) {
    console.log('🔄 Connection attempt already in progress, waiting...');
    return mcpClient;
  }

  if (!forceReconnect && mcpClient && (Date.now() - lastConnectionAttempt < CONNECTION_RETRY_DELAY)) {
    return mcpClient;
  }

  try {
    isConnecting = true;
    lastConnectionAttempt = Date.now();
    connectionRetries++;
    
    console.log(`🔧 Initializing MCP server connection (attempt ${connectionRetries}/${MAX_RETRIES})...`);

    // Check if MCP server file exists
    const fs = await import('fs/promises');
    try {
      await fs.access(MCP_SERVER_PATH);
    } catch (fsError) {
      throw new Error(`MCP server file not found: ${MCP_SERVER_PATH}`);
    }

    // Create stdio transport with command and args
    const transport = new StdioClientTransport({
      command: 'node',
      args: [MCP_SERVER_PATH],
      env: { ...process.env, ...MCP_SERVER_ENV }
    });

    // Create and initialize client
    mcpClient = new Client({
      name: "content-request-app",
      version: "1.0.0"
    }, {
      capabilities: {}
    });

    await mcpClient.connect(transport);
    console.log('✅ MCP server connection established successfully');
    
    // Reset retry counter on successful connection
    connectionRetries = 0;
    
    // Test the connection by calling a simple tool
    const testResult = await callMCPTool('get_team_dashboard', {});
    if (testResult.success) {
      console.log('✅ MCP server responding correctly');
      
      // Start health monitoring
      startMCPHealthMonitoring();
    } else {
      console.warn('⚠️ MCP server connected but test call failed:', testResult.error);
    }

    return mcpClient;
  } catch (error) {
    console.error(`❌ Failed to initialize MCP connection (attempt ${connectionRetries}/${MAX_RETRIES}):`, error);
    mcpClient = null;
    
    // Schedule retry if we haven't exceeded max attempts
    if (connectionRetries < MAX_RETRIES) {
      const retryDelay = CONNECTION_RETRY_DELAY * Math.pow(2, connectionRetries - 1); // Exponential backoff
      console.log(`🔄 Scheduling retry in ${retryDelay / 1000} seconds...`);
      setTimeout(() => {
        initializeMCPConnection(true).catch(retryError => {
          console.error('❌ Retry failed:', retryError);
        });
      }, retryDelay);
    } else {
      console.error('❌ Max connection attempts reached. MCP server will not be available.');
      connectionRetries = 0; // Reset for future manual retries
    }
    
    throw error;
  } finally {
    isConnecting = false;
  }
}

// Health monitoring for MCP connection
function startMCPHealthMonitoring() {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
  }
  
  console.log(`💓 Starting MCP health monitoring (${HEALTH_CHECK_INTERVAL / 1000}s intervals)`);
  
  healthCheckInterval = setInterval(async () => {
    try {
      if (!mcpClient) {
        console.log('💓 Health check: MCP client not connected, attempting reconnection...');
        await initializeMCPConnection(true);
        return;
      }

      // Simple health check
      const testResult = await callMCPTool('get_team_dashboard', {});
      if (testResult.success) {
        console.log('💓 Health check: MCP connection healthy');
      } else {
        console.warn('💓 Health check: MCP connection unhealthy, reconnecting...', testResult.error);
        mcpClient = null;
        await initializeMCPConnection(true);
      }
    } catch (error) {
      console.error('💓 Health check failed:', error);
      mcpClient = null;
      // Don't immediately retry on health check failure, wait for next interval
    }
  }, HEALTH_CHECK_INTERVAL);
}

// Stop health monitoring
function stopMCPHealthMonitoring() {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
    console.log('💓 Stopped MCP health monitoring');
  }
}

// Call MCP Tool Function
async function callMCPTool(toolName, args = {}) {
  try {
    // Ensure we have a connection
    if (!mcpClient) {
      await initializeMCPConnection();
    }

    if (!mcpClient) {
      throw new Error('MCP client not available');
    }

    console.log(`🔧 Calling MCP tool "${toolName}" with args:`, JSON.stringify(args, null, 2));

    const result = await mcpClient.callTool({
      name: toolName,
      arguments: args
    });

    console.log(`✅ MCP tool "${toolName}" completed successfully`);
    
    // Parse the result content
    if (result.content && result.content.length > 0) {
      const content = result.content[0];
      if (content.type === 'text') {
        try {
          const data = JSON.parse(content.text);
          return { success: true, data };
        } catch (parseError) {
          // If not JSON, return as text
          return { success: true, data: { message: content.text } };
        }
      }
    }

    return { success: true, data: result };
  } catch (error) {
    console.error(`❌ Error calling MCP tool "${toolName}":`, error);
    
    // Reset connection on certain errors
    if (error.message?.includes('connection') || error.message?.includes('transport')) {
      console.log('🔄 Resetting MCP connection due to error');
      mcpClient = null;
      if (mcpProcess) {
        mcpProcess.kill();
        mcpProcess = null;
      }
    }

    return { 
      success: false, 
      error: error.message || error.toString(),
      details: error
    };
  }
}

// MCP endpoint for all MCP server calls
app.post('/api/mcp', async (req, res) => {
  try {
    const { server_name, tool_name, arguments: toolArgs } = req.body;
    
    console.log(`🌐 API: Received MCP request for tool "${tool_name}"`);
    
    if (server_name !== 'content-request-server') {
      return res.status(400).json({
        success: false,
        error: `Unknown server: ${server_name}`
      });
    }
    
    const result = await callMCPTool(tool_name, toolArgs || {});
    
    if (result.success) {
      console.log(`✅ API: MCP call successful for tool "${tool_name}"`);
      res.json(result);
    } else {
      console.error(`❌ API: MCP call failed for tool "${tool_name}":`, result.error);
      res.status(500).json(result);
    }
    
  } catch (error) {
    console.error('❌ API: Error processing MCP request:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message
    });
  }
});

// API endpoint to get work items - USING REAL MCP SERVER
app.get('/api/workitems', async (req, res) => {
  try {
    console.log('🚨 DEBUG: API ENDPOINT HIT - Starting work items fetch...');
    console.log('🚨 DEBUG: Current timestamp:', new Date().toISOString());
    console.log('📊 API: Fetching real work items from MCP server...');
    
    const userEmail = req.query.userEmail;
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const status = req.query.status || 'all';
    
    if (!userEmail) {
      return res.status(400).json({
        success: false,
        error: 'User email is required'
      });
    }

    console.log(`📊 API: Filtering by status: "${status}", Page: ${page}, PageSize: ${pageSize}`);

    // Try querying with both email and display name to handle Azure DevOps assignment variations
    let workItems = [];
    let totalCount = 0;
    let querySuccess = false;

    // Extract month filtering parameters
    const filterByCurrentMonth = req.query.filterByCurrentMonth === 'true';
    const specificMonth = req.query.specificMonth;
    
    console.log(`🔍 Month filtering: filterByCurrentMonth=${filterByCurrentMonth}, specificMonth=${specificMonth || 'none'}`);

    // First try with email address
    console.log(`🔍 Trying query with email: ${userEmail}`);
    const mcpArgs = {
      userEmail: userEmail,
      includeStates: ['New', 'Active', 'Committed', 'In Progress', 'In Review', 'Resolved', 'Done', 'Closed']
    };
    
    // Add month filtering parameters if provided
    if (filterByCurrentMonth) {
      mcpArgs.filterByCurrentMonth = true;
    }
    if (specificMonth) {
      mcpArgs.specificMonth = specificMonth;
    }
    
    console.log(`🔧 Calling MCP with args:`, mcpArgs);
    const emailResult = await callMCPTool('get_user_work_items', mcpArgs);
    
    if (emailResult.success && emailResult.data) {
      workItems = emailResult.data.workItems || [];
      totalCount = emailResult.data.totalCount || workItems.length;
      querySuccess = true;
      console.log(`✅ Retrieved ${workItems.length} work items using email query`);
    }

    // Debug: Log the actual work items and their states
    console.log(`📊 DEBUG: Email query returned ${workItems.length} items. States breakdown:`);
    const stateCount = {};
    workItems.forEach(item => {
      const state = item.state || 'Unknown';
      stateCount[state] = (stateCount[state] || 0) + 1;
    });
    console.log('📊 State counts:', stateCount);
    
    // Check for work item 485743 specifically
    const targetItem = workItems.find(item => item.id === 485743 || item.workItemId === 485743);
    if (targetItem) {
      console.log(`🎯 Found target work item 485743:`, {
        id: targetItem.id || targetItem.workItemId,
        title: targetItem.title,
        state: targetItem.state,
        assignedTo: targetItem.assignedTo
      });
    } else {
      console.log(`🎯 Work item 485743 NOT found in email query results`);
    }

    // Always try display name query in addition to email query to get complete results
    const closedItems = workItems.filter(item => 
      item.state && ['closed', 'completed', 'done', 'resolved'].includes(item.state.toLowerCase())
    );
    
    console.log(`🔍 Found ${closedItems.length} closed items in email query`);
    
    // ALWAYS try display name query to get complete results (not just when no closed items)
    if (querySuccess) {
      // Extract display name from email (e.g., "abbyweisberg@microsoft.com" -> "Abby Weisberg")
      let displayName = userEmail;
      if (userEmail.includes('@')) {
        const localPart = userEmail.split('@')[0];
        console.log(`🔍 DEBUG: Email localPart: "${localPart}"`);
        console.log(`🔍 DEBUG: localPart.toLowerCase(): "${localPart.toLowerCase()}"`);
        console.log(`🔍 DEBUG: Checking if "${localPart.toLowerCase()}" === "abbyweisberg": ${localPart.toLowerCase() === 'abbyweisberg'}`);
        
        // Handle common patterns: firstname.lastname, firstnamelastname
        if (localPart.includes('.')) {
          // Handle firstname.lastname
          displayName = localPart.split('.').map(part => 
            part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
          ).join(' ');
          console.log(`🔍 DEBUG: Generated display name (dot pattern): "${displayName}"`);
        } else {
          // For abbyweisberg -> Abby Weisberg, we need a more specific approach
          if (localPart.toLowerCase() === 'abbyweisberg') {
            displayName = 'Abby Weisberg';
            console.log(`🔍 DEBUG: Using specific mapping for abbyweisberg: "${displayName}"`);
          } else {
            // Generic camelCase splitting
            displayName = localPart.replace(/([a-z])([A-Z])/g, '$1 $2')
                                   .replace(/\b\w/g, l => l.toUpperCase());
            console.log(`🔍 DEBUG: Generated display name (generic): "${displayName}"`);
          }
        }
      }
      
      console.log(`🔍 No closed items found with email, trying display name: ${displayName}`);
      const displayNameResult = await callMCPTool('get_user_work_items', {
        userEmail: displayName,
        includeStates: ['New', 'Active', 'Committed', 'In Progress', 'In Review', 'Resolved', 'Done', 'Closed']
      });
      
      if (displayNameResult.success && displayNameResult.data) {
        const displayNameItems = displayNameResult.data.workItems || [];
        
        // Debug: Log display name query results
        console.log(`📊 DEBUG: Display name query returned ${displayNameItems.length} items. States breakdown:`);
        const displayStateCount = {};
        displayNameItems.forEach(item => {
          const state = item.state || 'Unknown';
          displayStateCount[state] = (displayStateCount[state] || 0) + 1;
        });
        console.log('📊 Display name state counts:', displayStateCount);
        
        // Check for work item 485743 in display name results
        const targetItemDisplay = displayNameItems.find(item => item.id === 485743 || item.workItemId === 485743);
        if (targetItemDisplay) {
          console.log(`🎯 Found target work item 485743 in display name query:`, {
            id: targetItemDisplay.id || targetItemDisplay.workItemId,
            title: targetItemDisplay.title,
            state: targetItemDisplay.state,
            assignedTo: targetItemDisplay.assignedTo
          });
        } else {
          console.log(`🎯 Work item 485743 NOT found in display name query results either`);
        }
        
        const displayNameClosed = displayNameItems.filter(item => 
          item.state && ['closed', 'completed', 'done', 'resolved'].includes(item.state.toLowerCase())
        );
        
        console.log(`🔍 Found ${displayNameClosed.length} closed items in display name query`);
        
        // Always merge results to get the complete set
        const existingIds = new Set(workItems.map(item => item.id || item.workItemId));
        const newItems = displayNameItems.filter(item => !existingIds.has(item.id || item.workItemId));
        
        if (newItems.length > 0) {
          console.log(`🔄 Merging ${newItems.length} unique items from display name query`);
          workItems = [...workItems, ...newItems];
          totalCount = workItems.length;
        } else {
          console.log(`🔍 Display name query found ${displayNameItems.length} items, but all are duplicates of email query`);
        }
        
        // Check if display name has more total items (different query might be more effective)
        if (displayNameResult.data.totalCount > totalCount) {
          console.log(`🎯 Display name query reports ${displayNameResult.data.totalCount} total items vs email ${totalCount} - using display name results`);
          workItems = displayNameItems;
          totalCount = displayNameResult.data.totalCount;
        }
      }
    }
    
    if (querySuccess) {
      // Use all work items - no iteration filtering (restored to working state)
      let filteredWorkItems = workItems;
      
      // Apply status filtering BEFORE pagination
      if (status && status !== 'all') {
        console.log(`🔍 Filtering ${workItems.length} items by status: "${status}"`);
        filteredWorkItems = workItems.filter(item => {
          const itemState = item.state?.toLowerCase();
          switch(status) {
            case 'new':
              return itemState === 'new';
            case 'committed':
              return itemState === 'committed';
            case 'active':
              return ['active', 'in progress'].includes(itemState);
            case 'in_review':
              return ['resolved', 'in review', 'under review'].includes(itemState);
            case 'closed':
              return ['completed', 'done', 'closed'].includes(itemState);
            default:
              return true;
          }
        });
        console.log(`🔍 After filtering by "${status}": ${filteredWorkItems.length} items remain`);
      }
      
      const filteredTotalCount = filteredWorkItems.length;
      
      // Apply pagination to FILTERED results
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedItems = filteredWorkItems.slice(startIndex, endIndex);
      const totalPages = Math.ceil(filteredTotalCount / pageSize);
      
      // Calculate stats for all work items
      const workItemStats = {
        total: filteredWorkItems.length,
        new: filteredWorkItems.filter(item => item.state?.toLowerCase() === 'new').length,
        committed: filteredWorkItems.filter(item => item.state?.toLowerCase() === 'committed').length,
        active: filteredWorkItems.filter(item => ['active', 'in progress'].includes(item.state?.toLowerCase())).length,
        inReview: filteredWorkItems.filter(item => ['resolved', 'in review', 'under review'].includes(item.state?.toLowerCase())).length,
        closed: filteredWorkItems.filter(item => ['completed', 'done', 'closed'].includes(item.state?.toLowerCase())).length
      };

      console.log(`✅ Final result: Retrieved ${filteredWorkItems.length} work items for user: ${userEmail}`);
      console.log(`📄 Pagination: Page ${page} of ${totalPages}, showing ${paginatedItems.length} items`);
      console.log(`📊 Work item stats:`, workItemStats);

      const responseObject = {
        success: true,
        totalCount: filteredTotalCount,
        workItems: paginatedItems,
        userEmail,
        source: 'Azure DevOps via MCP',
        stats: workItemStats,
        pagination: {
          currentPage: page,
          pageSize: pageSize,
          totalPages: totalPages,
          totalItems: filteredTotalCount,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        }
      };

      console.log(`🔍 DEBUG: Response object before sending:`, JSON.stringify(responseObject, null, 2));
      console.log(`🔍 DEBUG: Stats field specifically:`, responseObject.stats);

      res.json(responseObject);
    } else {
      console.error('❌ Failed to get work items from MCP server:', emailResult.error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve work items from Azure DevOps',
        details: emailResult.error,
        userEmail
      });
    }
  } catch (error) {
    console.error('❌ Error fetching work items from MCP server:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while fetching work items',
      details: error.message,
      userEmail: req.query.userEmail
    });
  }
});

// API endpoint to get area paths
app.get('/api/area-paths', async (req, res) => {
  try {
    console.log('📁 API: Fetching area paths from MCP server...');
    
    const result = await callMCPTool('get_area_paths', {
      depth: 5
    });
    
    if (result.success && result.data) {
      console.log('✅ Retrieved area paths from Azure DevOps');
      res.json({
        success: true,
        areaPaths: result.data.areaPaths || [],
        source: 'Azure DevOps via MCP'
      });
    } else {
      console.error('❌ Failed to get area paths from MCP server:', result.error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve area paths from Azure DevOps',
        details: result.error
      });
    }
  } catch (error) {
    console.error('❌ Error fetching area paths from MCP server:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while fetching area paths',
      details: error.message
    });
  }
});

// API endpoint to get iterations
app.get('/api/iterations', async (req, res) => {
  try {
    console.log('📅 API: Fetching iterations from MCP server...');
    
    const result = await callMCPTool('get_iterations', {
      includeCurrentAndFuture: true
    });
    
    if (result.success && result.data) {
      console.log('✅ Retrieved iterations from Azure DevOps');
      res.json({
        success: true,
        iterations: result.data.iterations || [],
        source: 'Azure DevOps via MCP'
      });
    } else {
      console.error('❌ Failed to get iterations from MCP server:', result.error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve iterations from Azure DevOps',
        details: result.error
      });
    }
  } catch (error) {
    console.error('❌ Error fetching iterations from MCP server:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while fetching iterations',
      details: error.message
    });
  }
});

// API endpoint to validate user
app.post('/api/validate-user', async (req, res) => {
  try {
    console.log('👤 API: Validating user via MCP server...');
    
    const { userEmail } = req.body;
    if (!userEmail) {
      return res.status(400).json({
        success: false,
        error: 'User email is required'
      });
    }
    
    const result = await callMCPTool('validate_user', {
      userEmail
    });
    
    if (result.success && result.data) {
      console.log(`✅ User validation completed for: ${userEmail}`);
      res.json({
        success: true,
        ...result.data,
        source: 'Azure DevOps via MCP'
      });
    } else {
      console.error('❌ Failed to validate user via MCP server:', result.error);
      res.status(500).json({
        success: false,
        error: 'Failed to validate user in Azure DevOps',
        details: result.error
      });
    }
  } catch (error) {
    console.error('❌ Error validating user via MCP server:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while validating user',
      details: error.message
    });
  }
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    console.log('🏥 API: Health check requested');
    
    let mcpStatus = 'disconnected';
    let mcpError = null;
    
    try {
      if (mcpClient) {
        // Test with a simple call
        const testResult = await callMCPTool('get_team_dashboard', {});
        if (testResult.success) {
          mcpStatus = 'connected';
        } else {
          mcpStatus = 'error';
          mcpError = testResult.error;
        }
      } else {
        mcpStatus = 'not_initialized';
      }
    } catch (error) {
      mcpStatus = 'error';
      mcpError = error.message;
    }
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      server: 'running',
      mcp: {
        status: mcpStatus,
        error: mcpError,
        processId: mcpProcess?.pid || null
      },
      environment: {
        hasToken: !!MCP_SERVER_ENV.ADO_PERSONAL_ACCESS_TOKEN,
        organization: MCP_SERVER_ENV.ADO_ORGANIZATION_URL,
        project: MCP_SERVER_ENV.ADO_DEFAULT_PROJECT
      }
    });
  } catch (error) {
    console.error('❌ Health check error:', error);
    res.status(500).json({
      success: false,
      error: 'Health check failed',
      details: error.message
    });
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('🔄 Shutting down server...');
  
  if (mcpClient) {
    mcpClient.close?.();
  }
  
  if (mcpProcess) {
    mcpProcess.kill();
  }
  
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('🔄 Received SIGTERM, shutting down...');
  
  if (mcpClient) {
    mcpClient.close?.();
  }
  
  if (mcpProcess) {
    mcpProcess.kill();
  }
  
  process.exit(0);
});

// Initialize MCP connection when server starts
initializeMCPConnection().catch(error => {
  console.error('❌ Failed to initialize MCP connection on startup:', error);
  console.log('⚠️ Server will continue running, but MCP features may not work until connection is established');
});

app.listen(port, () => {
  console.log(`🚀 Content Request API server running at http://localhost:${port}`);
  console.log(`🔧 MCP Server Path: ${MCP_SERVER_PATH}`);
  console.log(`🏢 Azure DevOps Organization: ${MCP_SERVER_ENV.ADO_ORGANIZATION_URL}`);
  console.log(`📁 Azure DevOps Project: ${MCP_SERVER_ENV.ADO_DEFAULT_PROJECT}`);
  console.log(`🔑 PAT Token: ${MCP_SERVER_ENV.ADO_PERSONAL_ACCESS_TOKEN ? 'Configured' : 'Missing'}`);
});
