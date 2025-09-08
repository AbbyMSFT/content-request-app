import express from 'express';
import cors from 'cors';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';
import config from './config.js';

const app = express();
const port = 3003;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
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
const CONNECTION_RETRY_DELAY = 5000; // 5 seconds

// MCP Server Configuration
const MCP_SERVER_PATH = 'C:\\Users\\abbyweisberg\\OneDrive - Microsoft\\Documents\\Cline\\MCP\\content-request-server\\build\\index.js';
const MCP_SERVER_ENV = {
  ADO_PERSONAL_ACCESS_TOKEN: process.env.ADO_PERSONAL_ACCESS_TOKEN || '<YOUR_PAT_TOKEN>',
  ADO_ORGANIZATION_URL: 'https://dev.azure.com/msft-skilling',
  ADO_DEFAULT_PROJECT: 'Content'
};

// Current iteration configuration
const CURRENT_ITERATION_PATH = 'Content\\Bromine\\FY26Q1\\09 Sep';

// Initialize MCP Connection
async function initializeMCPConnection() {
  if (isConnecting || (Date.now() - lastConnectionAttempt < CONNECTION_RETRY_DELAY)) {
    return mcpClient;
  }

  try {
    isConnecting = true;
    lastConnectionAttempt = Date.now();
    
    console.log('🔧 Initializing MCP server connection...');

    // Create stdio transport with command and args (like Cline does)
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
    
    // Test the connection by calling a simple tool
    const testResult = await callMCPTool('get_team_dashboard', {});
    if (testResult.success) {
      console.log('✅ MCP server responding correctly');
    } else {
      console.warn('⚠️ MCP server connected but test call failed:', testResult.error);
    }

    return mcpClient;
  } catch (error) {
    console.error('❌ Failed to initialize MCP connection:', error);
    mcpClient = null;
    throw error;
  } finally {
    isConnecting = false;
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
    console.log('📊 API: Fetching real work items from MCP server...');
    
    const userEmail = req.query.userEmail;
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    
    if (!userEmail) {
      return res.status(400).json({
        success: false,
        error: 'User email is required'
      });
    }

    // Try querying with both email and display name to handle Azure DevOps assignment variations
    let workItems = [];
    let totalCount = 0;
    let querySuccess = false;

    // First try with email address
    console.log(`🔍 Trying query with email: ${userEmail}`);
    const emailResult = await callMCPTool('get_user_work_items', {
      userEmail: userEmail,
      includeStates: ['New', 'Committed', 'Active', 'In Review', 'Closed']
    });
    
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

    // If email query returned no closed items, try with display name
    const closedItems = workItems.filter(item => 
      item.state && ['closed', 'completed', 'done', 'resolved'].includes(item.state.toLowerCase())
    );
    
    console.log(`🔍 Found ${closedItems.length} closed items in email query`);
    
    if (querySuccess && closedItems.length === 0) {
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
        includeStates: ['New', 'Committed', 'Active', 'In Review', 'Closed']
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
        
        if (displayNameClosed.length > 0) {
          console.log(`✅ Found ${displayNameClosed.length} closed items using display name, using display name results`);
          workItems = displayNameItems;
          totalCount = displayNameResult.data.totalCount || displayNameItems.length;
        } else {
          // Merge results - keep email results but add any unique items from display name query
          const existingIds = new Set(workItems.map(item => item.id || item.workItemId));
          const newItems = displayNameItems.filter(item => !existingIds.has(item.id || item.workItemId));
          if (newItems.length > 0) {
            console.log(`🔄 Merging ${newItems.length} unique items from display name query`);
            workItems = [...workItems, ...newItems];
            totalCount = workItems.length;
          }
        }
      }
    }
    
    if (querySuccess) {
      // Apply iteration filtering - only show items from current iteration
      const allWorkItems = [...workItems]; // Keep original for debugging
      
      // Filter by current iteration path
      const currentIterationItems = workItems.filter(item => {
        const iterationPath = item.iterationPath || '';
        return iterationPath === CURRENT_ITERATION_PATH;
      });
      
      // Log filtering results
      console.log(`📅 Iteration filtering results:`);
      console.log(`   Total items before filtering: ${workItems.length}`);
      console.log(`   Items in current iteration (${CURRENT_ITERATION_PATH}): ${currentIterationItems.length}`);
      
      // Debug: Show iteration paths of all items
      const iterationCounts = {};
      allWorkItems.forEach(item => {
        const path = item.iterationPath || 'No iteration';
        iterationCounts[path] = (iterationCounts[path] || 0) + 1;
      });
      console.log('📅 All iteration paths found:', iterationCounts);
      
      // Use filtered items for response
      const filteredWorkItems = currentIterationItems;
      const filteredTotalCount = filteredWorkItems.length;
      
      // Apply pagination
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedItems = filteredWorkItems.slice(startIndex, endIndex);
      const totalPages = Math.ceil(filteredTotalCount / pageSize);
      
      console.log(`✅ Final result: Retrieved ${filteredWorkItems.length} work items from current iteration for user: ${userEmail}`);
      console.log(`📄 Pagination: Page ${page} of ${totalPages}, showing ${paginatedItems.length} items`);
      
      res.json({
        success: true,
        totalCount: filteredTotalCount,
        workItems: paginatedItems,
        userEmail,
        source: 'Azure DevOps via MCP',
        iteration: CURRENT_ITERATION_PATH,
        pagination: {
          currentPage: page,
          pageSize: pageSize,
          totalPages: totalPages,
          totalItems: filteredTotalCount,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        },
        debug: {
          totalBeforeFiltering: workItems.length,
          currentIterationCount: filteredWorkItems.length,
          iterationPaths: iterationCounts
        }
      });
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
        project: MCP_SERVER_ENV.ADO_PROJECT
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
  console.log(`📁 Azure DevOps Project: ${MCP_SERVER_ENV.ADO_PROJECT}`);
  console.log(`🔑 PAT Token: ${MCP_SERVER_ENV.ADO_PERSONAL_ACCESS_TOKEN ? 'Configured' : 'Missing'}`);
});
