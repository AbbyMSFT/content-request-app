# Content Request Application - Deployment Guide

This guide provides instructions for deploying the Content Request Application for production use.

## Overview

The application consists of three main components:
- **MCP Server**: Handles Azure DevOps integration
- **API Server**: HTTP proxy for MCP calls
- **Frontend**: React application with user interface

## Prerequisites

### Required Software
- Docker and Docker Compose
- Git (for cloning the repository)

### Required Credentials
- Azure DevOps Personal Access Token (PAT)
- Azure Active Directory Application Registration

## Quick Start

### 1. Clone the Repository
```bash
git clone <repository-url>
cd content-request-app
```

### 2. Configure Environment Variables
```bash
# Copy the environment template
cp .env.production .env

# Edit the .env file with your actual values
nano .env
```

### 3. Configure Required Values

Edit the `.env` file and replace the placeholder values:

#### Azure DevOps Configuration
```bash
AZURE_DEVOPS_ORG_URL=https://dev.azure.com/your-organization
AZURE_DEVOPS_PROJECT=your-project-name
AZURE_DEVOPS_PAT=your-personal-access-token
```

#### Azure Active Directory Configuration
```bash
VITE_AZURE_CLIENT_ID=your-azure-client-id
VITE_AZURE_AUTHORITY=https://login.microsoftonline.com/your-tenant-id
```

### 4. Deploy with Docker Compose
```bash
# Build and start all services
docker-compose up --build -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f
```

### 5. Access the Application
- Frontend: http://localhost:5178
- API: http://localhost:3002

## Detailed Configuration

### Azure DevOps Setup

1. **Create Personal Access Token (PAT)**
   - Go to Azure DevOps → User Settings → Personal Access Tokens
   - Create new token with following scopes:
     - Work items: Read & write
     - Project and team: Read
     - Analytics: Read

2. **Project Configuration**
   - Ensure your project has the correct area paths configured
   - Verify work item types (User Story, Bug, etc.) are available

### Azure Active Directory Setup

1. **Register Application**
   - Go to Azure Portal → Azure Active Directory → App registrations
   - Create new registration
   - Configure redirect URIs for your domain
   - Note the Application (client) ID and Directory (tenant) ID

2. **Configure Authentication**
   - Enable public client flows if needed
   - Set up proper redirect URIs for production domain

### Port Configuration

The default ports are:
- Frontend: 5178
- API Server: 3002
- MCP Server: 3001 (internal communication)

To change ports, update the `.env` file:
```bash
VITE_PORT=8080
API_PORT=8081
```

## Production Deployment

### Using Docker Compose (Recommended)

1. **Production Environment File**
   ```bash
   cp .env.production .env.prod
   # Edit .env.prod with production values
   ```

2. **Deploy with Production Config**
   ```bash
   docker-compose --env-file .env.prod up -d --build
   ```

### Using Individual Docker Images

1. **Build Images**
   ```bash
   # Build MCP Server
   cd ../../../Users/abbyweisberg/OneDrive - Microsoft/Documents/Cline/MCP/content-request-server
   docker build -t content-request-mcp .
   
   # Build API Server
   cd content-request-app
   docker build -f Dockerfile.api -t content-request-api .
   
   # Build Frontend
   docker build -f Dockerfile.frontend -t content-request-frontend .
   ```

2. **Run Containers**
   ```bash
   # Create network
   docker network create content-request-network
   
   # Run MCP Server
   docker run -d --name mcp-server \
     --network content-request-network \
     -e AZURE_DEVOPS_ORG_URL=your-org-url \
     -e AZURE_DEVOPS_PROJECT=your-project \
     -e AZURE_DEVOPS_PAT=your-pat \
     content-request-mcp
   
   # Run API Server
   docker run -d --name api-server \
     --network content-request-network \
     -p 3002:3002 \
     -e API_PORT=3002 \
     content-request-api
   
   # Run Frontend
   docker run -d --name frontend \
     --network content-request-network \
     -p 5178:80 \
     content-request-frontend
   ```

### Cloud Deployment

#### Azure Container Instances
```bash
# Create resource group
az group create --name content-request-rg --location eastus

# Deploy with Docker Compose
az container create \
  --resource-group content-request-rg \
  --file docker-compose.yml
```

#### Kubernetes
```yaml
# Example Kubernetes deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: content-request-app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: content-request
  template:
    metadata:
      labels:
        app: content-request
    spec:
      containers:
      - name: frontend
        image: content-request-frontend
        ports:
        - containerPort: 80
      - name: api-server
        image: content-request-api
        ports:
        - containerPort: 3002
        env:
        - name: AZURE_DEVOPS_PAT
          valueFrom:
            secretKeyRef:
              name: azure-secrets
              key: pat
```

## Monitoring and Troubleshooting

### Health Checks
- Frontend: http://localhost:5178/health
- API: http://localhost:3002/health

### Logs
```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f frontend
docker-compose logs -f api-server
docker-compose logs -f mcp-server
```

### Common Issues

1. **Authentication Failures**
   - Verify Azure AD application configuration
   - Check redirect URIs match your domain
   - Ensure PAT has correct permissions

2. **API Connection Issues**
   - Check network connectivity between containers
   - Verify environment variables are set correctly
   - Ensure MCP server is running and accessible

3. **Build Failures**
   - Check Docker has sufficient resources
   - Verify all dependencies are available
   - Check for network issues during npm install

## Security Considerations

1. **Environment Variables**
   - Never commit `.env` files to version control
   - Use secure secret management in production
   - Rotate PATs regularly

2. **Network Security**
   - Use HTTPS in production
   - Configure proper firewall rules
   - Consider using a reverse proxy (nginx, traefik)

3. **Access Control**
   - Implement proper Azure AD roles and permissions
   - Use least-privilege access for service accounts
   - Monitor access logs regularly

## Scaling

### Horizontal Scaling
- Frontend: Multiple nginx containers behind load balancer
- API Server: Multiple instances with shared MCP server
- Database: Consider adding Redis for session management

### Vertical Scaling
- Increase Docker container resource limits
- Monitor memory and CPU usage
- Optimize build processes for faster deployments

## Support

For deployment issues:
1. Check the logs for error messages
2. Verify all environment variables are set correctly
3. Ensure Azure credentials have proper permissions
4. Test network connectivity between services

## Version Information

- Node.js: 18.x
- Docker: 20.x or later
- Docker Compose: 2.x or later
