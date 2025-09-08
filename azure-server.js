const express = require('express');
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
const path = require('path');
const { spawn } = require('child_process');

const app = express();
app.use(express.json());

// Get port from environment or default
const PORT = process.env.PORT || 8080;

// Serve static files from the React build
app.use(express.static(path.join(__dirname, 'dist')));

// Initialize MCP client
let mcpClient = null;
let mcpProcess = null;

async function initializeMCPConnection() {
  try {
    console.log('🚀 Starting MCP server process...');
    
    // Start the MCP server as a child process
    mcpProcess = spawn('node', ['mcp-server/build/index.js'], {
      env: {
        ...process.env,
        ADO_PERSONAL_ACCESS_TOKEN: process.env.ADO_PERSONAL_ACCESS_TOKEN,
        ADO_ORGANIZATION_URL: process.env.ADO_ORGANIZATION_URL,
        ADO_PROJECT: process.env.ADO_PROJECT
      },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    mcpProcess.stderr.on('data', (data) => {
      console.error(`MCP Server Error: ${data}`);
    });

    mcpProcess.on('close', (code) => {
      console.log(`MCP Server process exited with code ${code}`);
      mcpClient = null;
      // Attempt to restart after a delay
      setTimeout(initializeMCPConnection, 5000);
    });

    // Create transport and client
    const transport = new StdioClientTransport({
      command: 'node',
      args: ['mcp-server/build/index.js'],
      env: {
        ...process.env,
        ADO_PERSONAL_ACCESS_TOKEN: process.env.ADO_PERSONAL_ACCESS_TOKEN,
        ADO_ORGANIZATION_URL: process.env.ADO_ORGANIZATION_URL,
        ADO_PROJECT: process.env.ADO_PROJECT
      }
    });

    mcpClient = new Client({
      name: 'azure-app-service-client',
      version: '1.0.0'
    }, {
      capabilities: {}
    });

    await mcpClient.connect(transport);
    console.log('✅ Connected to MCP server successfully');

    // List available tools
    const tools = await mcpClient.listTools();
    console.log('📋 Available MCP tools:', tools.tools.map(t => t.name));

    return true;
  } catch (error) {
    console.error('❌ Failed to connect to MCP server:', error);
    mcpClient = null;
    return false;
  }
}

// Initialize MCP connection on startup
initializeMCPConnection();

// Health check endpoint
app.get('/api/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      api: 'running',
      mcp: mcpClient ? 'connected' : 'disconnected'
    }
  };
  res.json(health);
});

// Get all work items endpoint
app.get('/api/workitems', async (req, res) => {
  try {
    if (!mcpClient) {
      return res.status(503).json({ 
        error: 'MCP server not connected',
        message: 'The server is initializing. Please try again in a few moments.'
      });
    }

    const userEmail = req.query.userEmail || 'abbyweisberg@microsoft.com';
    console.log(`📊 Fetching work items for user: ${userEmail}`);

    const result = await mcpClient.callTool('get_user_work_items', {
      userEmail: userEmail,
      includeStates: ['New', 'Committed', 'Active', 'In Review', 'Closed']
    });

    console.log(`✅ Retrieved ${result.content[0].text.length} characters of data`);
    
    const workItems = JSON.parse(result.content[0].text);
    res.json({
      success: true,
      count: workItems.length,
      workItems: workItems
    });

  } catch (error) {
    console.error('❌ Error fetching work items:', error);
    res.status(500).json({ 
      error: 'Failed to fetch work items',
      message: error.message 
    });
  }
});

// Create work item endpoint
app.post('/api/workitems', async (req, res) => {
  try {
    if (!mcpClient) {
      return res.status(503).json({ 
        error: 'MCP server not connected',
        message: 'The server is initializing. Please try again in a few moments.'
      });
    }

    console.log('📝 Creating new work item with data:', req.body);

    const result = await mcpClient.callTool('create_content_request', req.body);
    
    const response = JSON.parse(result.content[0].text);
    console.log('✅ Work item created successfully:', response);
    
    res.json({
      success: true,
      workItem: response
    });

  } catch (error) {
    console.error('❌ Error creating work item:', error);
    res.status(500).json({ 
      error: 'Failed to create work item',
      message: error.message 
    });
  }
});

// Get area paths endpoint
app.get('/api/areapaths', async (req, res) => {
  try {
    if (!mcpClient) {
      return res.status(503).json({ 
        error: 'MCP server not connected',
        message: 'The server is initializing. Please try again in a few moments.'
      });
    }

    console.log('🗂️ Fetching area paths...');

    const result = await mcpClient.callTool('get_area_paths', {
      depth: req.query.depth || 5
    });
    
    const areaPaths = JSON.parse(result.content[0].text);
    console.log(`✅ Retrieved ${areaPaths.length} area paths`);
    
    res.json({
      success: true,
      areaPaths: areaPaths
    });

  } catch (error) {
    console.error('❌ Error fetching area paths:', error);
    res.status(500).json({ 
      error: 'Failed to fetch area paths',
      message: error.message 
    });
  }
});

// Get iterations endpoint
app.get('/api/iterations', async (req, res) => {
  try {
    if (!mcpClient) {
      return res.status(503).json({ 
        error: 'MCP server not connected',
        message: 'The server is initializing. Please try again in a few moments.'
      });
    }

    console.log('📅 Fetching iterations...');

    const result = await mcpClient.callTool('get_iterations', {
      includeCurrentAndFuture: true
    });
    
    const iterations = JSON.parse(result.content[0].text);
    console.log(`✅ Retrieved ${iterations.length} iterations`);
    
    res.json({
      success: true,
      iterations: iterations
    });

  } catch (error) {
    console.error('❌ Error fetching iterations:', error);
    res.status(500).json({ 
      error: 'Failed to fetch iterations',
      message: error.message 
    });
  }
});

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Azure App Service running on port ${PORT}`);
  console.log(`🌐 Frontend: http://localhost:${PORT}`);
  console.log(`📡 API endpoints available at: http://localhost:${PORT}/api/*`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  if (mcpProcess) {
    mcpProcess.kill();
  }
  process.exit(0);
});
