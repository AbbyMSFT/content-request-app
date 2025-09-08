# Content Request Application - Quick Deployment Guide

This is a comprehensive content request management system that integrates with Azure DevOps for tracking and managing content development requests.

## 🚀 Quick Start (Docker)

### Prerequisites
- Docker and Docker Compose installed
- Azure DevOps Personal Access Token
- Azure Active Directory App Registration (optional, for SSO)

### 1. Clone and Setup
```bash
# Clone the repository
git clone <your-repo-url>
cd content-request-app

# Copy environment template
cp .env.production .env
```

### 2. Configure Environment
Edit `.env` file with your values:

```bash
# Required: Azure DevOps Configuration
AZURE_DEVOPS_ORG_URL=https://dev.azure.com/your-organization
AZURE_DEVOPS_PROJECT=your-project-name
AZURE_DEVOPS_PAT=your-personal-access-token

# Optional: Azure AD for SSO (can use demo mode without this)
VITE_AZURE_CLIENT_ID=your-azure-client-id
VITE_AZURE_AUTHORITY=https://login.microsoftonline.com/your-tenant-id
```

### 3. Deploy
```bash
# Start all services
docker-compose up -d --build

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### 4. Access Application
- **Frontend**: http://localhost:5178
- **API Health**: http://localhost:3002/health

## 🔧 Configuration Details

### Azure DevOps Personal Access Token
1. Go to Azure DevOps → User Settings → Personal Access Tokens
2. Create token with scopes:
   - **Work items**: Read & write
   - **Project and team**: Read
   - **Analytics**: Read

### Azure AD Application (Optional)
1. Go to Azure Portal → Azure Active Directory → App registrations
2. Create new registration
3. Configure redirect URIs: `http://localhost:5178` (adjust for your domain)
4. Note the Application ID and Tenant ID

## 🔍 Features

- **Dashboard**: View assigned work items from Azure DevOps
- **Create Requests**: Submit new content development requests
- **Real-time Data**: Live integration with Azure DevOps API
- **Visual Indicators**: Shows data source (real vs demo data)
- **Responsive UI**: Works on desktop and mobile

## 🏥 Health Checks

Check if services are running:
```bash
# Frontend health
curl http://localhost:5178/health

# API health  
curl http://localhost:3002/health

# Check work items API
curl "http://localhost:3002/api/workitems?userEmail=your-email@domain.com"
```

## 🐛 Troubleshooting

### Common Issues

1. **API Not Responding**
   ```bash
   # Check container logs
   docker-compose logs api-server
   
   # Restart API server
   docker-compose restart api-server
   ```

2. **No Data Showing**
   - Verify Azure DevOps PAT has correct permissions
   - Check that user email matches Azure DevOps assignment
   - Ensure project and organization URLs are correct

3. **Authentication Issues**
   - Verify Azure AD application configuration
   - Check redirect URIs match your domain
   - Ensure tenant ID is correct

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f frontend
docker-compose logs -f api-server
docker-compose logs -f mcp-server
```

### Reset Everything
```bash
# Stop and remove containers
docker-compose down

# Remove images (optional)
docker-compose down --rmi all

# Rebuild and start
docker-compose up -d --build
```

## 📦 Production Deployment

### Using Cloud Services

#### Azure Container Instances
```bash
# Login to Azure
az login

# Create resource group
az group create --name content-request-rg --location eastus

# Deploy containers (requires docker-compose.yml modification for ACI)
az container create --resource-group content-request-rg --file docker-compose.yml
```

#### AWS ECS / Google Cloud Run
- Build and push images to container registry
- Configure environment variables in cloud service
- Deploy using cloud-specific deployment methods

### Environment Variables for Production
```bash
# Update URLs for production
VITE_API_URL=https://your-api-domain.com
VITE_AZURE_AUTHORITY=https://login.microsoftonline.com/your-tenant-id

# Use production Azure AD app
VITE_AZURE_CLIENT_ID=your-production-client-id

# Configure for production domain
API_HOST=0.0.0.0
VITE_HOST=0.0.0.0
```

## 🔒 Security Notes

- Never commit `.env` files to version control
- Use secure secret management in production (Azure Key Vault, AWS Secrets Manager, etc.)
- Rotate PATs regularly
- Use HTTPS in production
- Configure proper CORS settings for production domains

## 📚 Additional Resources

- [Detailed Deployment Guide](./DEPLOYMENT.md)
- [Azure DevOps Setup Guide](./AZURE_SSO_SETUP.md)
- [Port Coordination](./PORT_COORDINATION.md)

## 🆘 Getting Help

If you encounter issues:
1. Check the logs using `docker-compose logs -f`
2. Verify environment variables are set correctly
3. Ensure Azure credentials have proper permissions
4. Test network connectivity between services

---

**Note**: The application will show demo data if Azure DevOps integration fails, allowing you to test the UI even without proper Azure setup.
