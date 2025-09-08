# Azure Free Tier Deployment Guide

This guide will help you deploy your Content Request Application to Azure App Service using the FREE F1 tier.

## What You'll Get (FREE)
- ✅ Public URL: `https://content-request-app.azurewebsites.net`
- ✅ HTTPS/SSL certificate included
- ✅ Automatic deployments from GitHub
- ✅ 1GB storage, 165MB memory
- ✅ No credit card required for F1 tier

## Prerequisites
- Azure account (free signup at https://azure.microsoft.com/free/)
- GitHub account
- Azure CLI installed locally

## Step-by-Step Deployment

### 1. Create GitHub Repository

```bash
# Initialize git in your project
cd content-request-app
git init
git add .
git commit -m "Initial commit"

# Create new repo on GitHub and push
# Go to https://github.com/new
# Create a new repository named "content-request-app"
# Then push your code:
git remote add origin https://github.com/YOUR_USERNAME/content-request-app.git
git branch -M main
git push -u origin main
```

### 2. Set Up Azure App Service (F1 Free Tier)

```bash
# Login to Azure
az login

# Create a resource group
az group create --name content-request-rg --location eastus

# Create an App Service Plan (F1 = Free tier)
az appservice plan create \
  --name content-request-plan \
  --resource-group content-request-rg \
  --sku F1 \
  --is-linux

# Create the Web App
az webapp create \
  --resource-group content-request-rg \
  --plan content-request-plan \
  --name content-request-app \
  --runtime "NODE:18-lts"

# Configure the Web App settings
az webapp config appsettings set \
  --resource-group content-request-rg \
  --name content-request-app \
  --settings \
    ADO_PERSONAL_ACCESS_TOKEN="your-pat-here" \
    ADO_ORGANIZATION_URL="https://dev.azure.com/msft-skilling" \
    ADO_PROJECT="Content" \
    VITE_AZURE_CLIENT_ID="your-client-id" \
    VITE_AZURE_AUTHORITY="https://login.microsoftonline.com/your-tenant-id"
```

### 3. Set Up GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these secrets:

1. **AZURE_CREDENTIALS**
   ```bash
   # Create service principal
   az ad sp create-for-rbac \
     --name "content-request-sp" \
     --role contributor \
     --scopes /subscriptions/{subscription-id}/resourceGroups/content-request-rg \
     --sdk-auth
   ```
   Copy the entire JSON output and paste as the secret value

2. **VITE_AZURE_CLIENT_ID**
   - Your Azure AD app client ID

3. **VITE_AZURE_AUTHORITY**
   - Format: `https://login.microsoftonline.com/your-tenant-id`

### 4. Deploy Your Application

Once you've set up everything:

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Add Azure deployment configuration"
   git push origin main
   ```

2. **Monitor Deployment**
   - Go to your GitHub repo → Actions tab
   - Watch the deployment workflow run
   - First deployment takes ~5-10 minutes

3. **Access Your App**
   - Visit: https://content-request-app.azurewebsites.net
   - Note: First load after sleep takes 10-30 seconds

### 5. Update Azure AD Redirect URIs

Add your production URL to Azure AD app registration:

1. Go to Azure Portal → Azure Active Directory → App registrations
2. Select your app
3. Authentication → Add platform → Single-page application
4. Add: `https://content-request-app.azurewebsites.net`
5. Save changes

## Environment Variables Reference

### Required in Azure App Service
```bash
ADO_PERSONAL_ACCESS_TOKEN=your-azure-devops-pat
ADO_ORGANIZATION_URL=https://dev.azure.com/your-org
ADO_PROJECT=your-project-name
```

### Required in GitHub Secrets
```bash
AZURE_CREDENTIALS={...service principal json...}
VITE_AZURE_CLIENT_ID=your-azure-ad-client-id
VITE_AZURE_AUTHORITY=https://login.microsoftonline.com/tenant-id
```

## Monitoring Your App

### Check App Status
```bash
az webapp show \
  --resource-group content-request-rg \
  --name content-request-app \
  --query state
```

### View Logs
```bash
az webapp log tail \
  --resource-group content-request-rg \
  --name content-request-app
```

### Health Check
Visit: https://content-request-app.azurewebsites.net/api/health

## Troubleshooting

### App Not Loading
- F1 tier apps sleep after 20 minutes of inactivity
- First load takes 10-30 seconds to wake up
- This is normal and expected for free tier

### Authentication Issues
- Verify Azure AD redirect URIs include your production URL
- Check that VITE_AZURE_CLIENT_ID is set correctly
- Ensure your Azure AD app allows public client flows

### API Errors
- Check logs: `az webapp log tail --name content-request-app`
- Verify all environment variables are set
- Ensure Azure DevOps PAT has correct permissions

### Deployment Failures
- Check GitHub Actions logs
- Verify all GitHub secrets are set correctly
- Ensure Azure service principal has correct permissions

## Making Updates

1. **Local Development**
   ```bash
   npm run dev
   ```

2. **Deploy Updates**
   ```bash
   git add .
   git commit -m "Your update message"
   git push origin main
   ```
   GitHub Actions will automatically deploy

3. **Manual Deployment** (if needed)
   - Go to GitHub → Actions → Run workflow

## Scaling Options

If you outgrow the free tier:

### Upgrade to Basic (B1)
```bash
az appservice plan update \
  --name content-request-plan \
  --resource-group content-request-rg \
  --sku B1
```
- Cost: ~$55/month
- Always on (no sleep)
- Custom domains
- SSL certificates

### Alternative: Hybrid Approach
- Frontend: GitHub Pages (free)
- Backend: Azure Functions (1M requests free/month)
- Best performance at lowest cost

## Cost Summary

### F1 Free Tier
- **Monthly Cost**: $0
- **Limitations**: 
  - Sleeps after 20 min inactivity
  - 60 CPU minutes/day
  - No custom domains

### When to Upgrade
- Need custom domain
- Want "always on" (no sleep)
- Require more CPU/memory
- Need staging slots

## Next Steps

1. ✅ Test your deployed app
2. ✅ Share the URL with your team
3. ✅ Monitor usage and logs
4. ✅ Consider custom domain (requires paid tier)

Your app is now live at: **https://content-request-app.azurewebsites.net**

For support or issues, check the logs first:
```bash
az webapp log tail --name content-request-app --resource-group content-request-rg
