# Working Local Setup Configuration

## Issue Resolution Summary
The live data connection stopped working after deployment attempts. The root cause was:

1. **Project Name Case Sensitivity**: Azure DevOps project name needed to be lowercase "content" instead of "Content"
2. **Environment Variable Mismatch**: API server was using `ADO_DEFAULT_PROJECT` instead of `ADO_PROJECT`

## Current Working Configuration

### Ports
- **Frontend**: http://localhost:5179 (Vite auto-selected due to 5178 being occupied)
- **API Server**: http://localhost:3002 
- **MCP Server**: Running on stdio (internal communication)

### Environment Variables
**Location**: `content-request-app/mcp-server/.env` and `C:/Users/abbyweisberg/OneDrive - Microsoft/Documents/Cline/MCP/content-request-server/.env`

```env
ADO_PERSONAL_ACCESS_TOKEN=9ZWvR8E8fpCZxsw8szN1osvR6J2J1beyupnum92XNG74VZWkjXx5JQQJ99BBIACAAAAAAArohAAASAZDO2QCf
ADO_ORGANIZATION_URL=https://dev.azure.com/msft-skilling
ADO_PROJECT=content
```

### API Server Configuration (server.js)
```javascript
const MCP_SERVER_ENV = {
  ADO_PERSONAL_ACCESS_TOKEN: process.env.ADO_PERSONAL_ACCESS_TOKEN || '<YOUR_PAT_TOKEN>',
  ADO_ORGANIZATION_URL: 'https://dev.azure.com/msft-skilling',
  ADO_PROJECT: 'content'  // IMPORTANT: lowercase 'content'
};
```

### Port Configuration (config.ts)
```javascript
frontend: {
  port: parseInt(process.env.VITE_PORT || process.env.PORT || '5178'),
  host: process.env.VITE_HOST || 'localhost'
},
backend: {
  port: parseInt(process.env.API_PORT || '3002'),
  host: process.env.API_HOST || 'localhost'
},
```

## Services Status
✅ **MCP Server**: Connected and responding correctly  
✅ **API Server**: Running on port 3002 with correct project configuration  
✅ **Frontend**: Running on port 5179 with live data connection  
✅ **Azure Authentication**: Configured with Microsoft tenant  

## Key Learnings
1. Azure DevOps project names are case-sensitive in API calls
2. Environment variable naming must be consistent between server.js and .env files
3. The project was working yesterday before deployment attempts changed the configuration
4. Iteration filtering was not the issue - it was the project authentication

## Next Steps for Deployment
- Ensure deployment environment uses lowercase "content" for project name
- Verify PAT token permissions are maintained in deployed environment
- Test authentication flows in deployed environment
- Monitor that environment variables are correctly set in production

## Startup Commands
1. Start MCP Server: Already running via internal stdio transport
2. Start API Server: `cd content-request-app && node server.js`
3. Start Frontend: `cd content-request-app && npm run dev`
4. Open Application: http://localhost:5179

## Authentication Configuration
- **Azure AD App ID**: e3127686-042e-4dc4-9204-4dd4c78e666d
- **Tenant ID**: 72f988bf-86f1-41af-91ab-2d7cd011db47
- **Redirect URI**: http://localhost:5179 (matches frontend port)
