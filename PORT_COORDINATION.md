# Port Coordination System

This document explains the centralized port configuration system implemented to avoid manual port coordination issues between frontend, backend, and Azure App Registration.

## How It Works

### 1. Centralized Configuration (`config.ts`)
- Single source of truth for all port settings
- Supports environment variables with fallback defaults
- Used by both frontend (Vite) and backend (Express) servers
- Automatically generates Azure redirect URIs

### 2. Environment Variables (`.env`)
```
VITE_PORT=5177          # Frontend port
API_PORT=3001           # Backend port
VITE_HOST=localhost     # Frontend host
API_HOST=localhost      # Backend host
```

### 3. Configuration Structure
```typescript
const config = {
  frontend: { port: 5177, host: 'localhost' },
  backend: { port: 3001, host: 'localhost' },
  frontendUrl: 'http://localhost:5177',
  backendUrl: 'http://localhost:3001',
  redirectUri: 'http://localhost:5177',
  postLogoutRedirectUri: 'http://localhost:5177'
}
```

## Components That Use This System

### Frontend (Vite)
- `vite.config.ts` - Uses `config.frontend.port` and `config.backendUrl` for proxy
- `src/authConfig.ts` - Uses `config.redirectUri` and `config.postLogoutRedirectUri`

### Backend (Express)
- `server.js` - Uses `config.backend.port` for server listening

## Benefits

✅ **Single Point of Change**: Update ports in one place (`.env` file)  
✅ **No Manual Coordination**: All services automatically use the same configuration  
✅ **Environment Flexibility**: Different ports for dev/staging/prod environments  
✅ **Azure Compatibility**: Redirect URIs automatically match frontend URL  
✅ **Developer Experience**: No more port conflicts or manual updates  

## Changing Ports

To change ports for your environment:

1. Update the `.env` file:
```
VITE_PORT=3000
API_PORT=3001
```

2. Both frontend and backend will automatically use the new ports
3. Azure authentication will automatically use the new frontend URL

## Azure App Registration

For Azure App Registration, you have two options:

### Option 1: Multiple Registered URIs (Recommended)
Register several common development ports in your Azure App Registration:
- `http://localhost:5173`
- `http://localhost:5174`
- `http://localhost:5175`
- `http://localhost:5176`
- `http://localhost:5177`
- `http://localhost:3000`

### Option 2: Environment-Specific Registrations
Create separate app registrations for different environments:
- Development: `http://localhost:5177`
- Staging: `http://staging.example.com`
- Production: `http://app.example.com`

## Scripts

New npm scripts for easier development:

```json
{
  "dev": "vite",                                    // Frontend only
  "server": "node server.js",                      // Backend only  
  "dev:full": "concurrently \"npm run server\" \"npm run dev\""  // Both servers
}
```

## Troubleshooting

### Port Already in Use
If you get "port already in use" errors:
1. Update the port in `.env`
2. Restart both servers

### Azure Authentication Issues
1. Verify your Azure App Registration includes the redirect URI shown in the browser
2. Check that `redirectUri` in the auth config matches your current frontend URL
3. Make sure you're using the correct client ID in your Azure configuration

### Configuration Not Loading
1. Ensure `.env` file is in the project root
2. Restart the development servers after changing `.env`
3. Check that `config.ts` is properly imported in all components
