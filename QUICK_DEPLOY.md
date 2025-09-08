# Quick Deployment Guide - Share Your App

## Option 1: Using Localtunnel (Temporary Solution)
Once localtunnel installs, you'll get a URL like: https://content-request-app.loca.lt
Share this URL with others. Your computer must stay on.

## Option 2: Deploy with Docker (Production Ready)

### Prerequisites
- Docker Desktop installed
- Your Azure DevOps PAT ready

### Quick Steps:

1. **Stop current services** (Press Ctrl+C in all terminal windows)

2. **Update production environment**
```bash
cd content-request-app
cp .env .env.production.local
```

3. **Build and run with Docker**
```bash
docker-compose up --build -d
```

Your app will be available at:
- Frontend: http://localhost:5178
- API: http://localhost:3002

## Option 3: Deploy to Azure (Recommended for Permanent Access)

### Using Azure Container Instances (Simplest Cloud Option)

1. **Install Azure CLI**
```bash
# Windows
winget install Microsoft.AzureCLI
```

2. **Login to Azure**
```bash
az login
```

3. **Create Resource Group**
```bash
az group create --name content-request-rg --location eastus
```

4. **Deploy Container**
```bash
# First, push your images to Azure Container Registry
az acr create --resource-group content-request-rg --name contentrequestreg --sku Basic
az acr login --name contentrequestreg

# Build and push images
docker build -t contentrequestreg.azurecr.io/content-request-app:latest .
docker push contentrequestreg.azurecr.io/content-request-app:latest

# Deploy to Container Instances
az container create \
  --resource-group content-request-rg \
  --name content-request-app \
  --image contentrequestreg.azurecr.io/content-request-app:latest \
  --dns-name-label content-request-app \
  --ports 80
```

Your app will be available at: http://content-request-app.eastus.azurecontainer.io

## Option 4: Deploy to Azure App Service (Easy Web Hosting)

1. **Create App Service**
```bash
az webapp create \
  --resource-group content-request-rg \
  --plan content-request-plan \
  --name content-request-app \
  --deployment-container-image-name contentrequestreg.azurecr.io/content-request-app:latest
```

2. **Configure Environment Variables**
```bash
az webapp config appsettings set \
  --resource-group content-request-rg \
  --name content-request-app \
  --settings \
    AZURE_DEVOPS_PAT="your-pat-here" \
    AZURE_DEVOPS_ORG_URL="https://dev.azure.com/msft-skilling" \
    AZURE_DEVOPS_PROJECT="Content"
```

Your app will be available at: https://content-request-app.azurewebsites.net

## Quick Decision Guide

- **Just testing/demo?** → Use localtunnel (Option 1)
- **Internal team use?** → Use Docker locally (Option 2)
- **Production deployment?** → Use Azure Container Instances or App Service (Options 3 or 4)

## Important Notes

1. **Security**: For production, ensure:
   - Use HTTPS
   - Store secrets in Azure Key Vault
   - Configure proper authentication

2. **Cost**: 
   - Localtunnel: Free
   - Docker local: Free
   - Azure Container Instances: ~$30-50/month
   - Azure App Service: ~$50-100/month (with free tier available)

3. **Performance**:
   - Best: Azure App Service
   - Good: Azure Container Instances
   - OK: Docker local
   - Slow: Localtunnel/ngrok
