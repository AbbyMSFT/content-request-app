# Azure Deployment - Complete Guide

Your Content Request Application is ready for deployment! Due to quota limitations with App Service, here's your **complete deployment solution** using Azure Static Web Apps for the frontend.

## 🎉 Current Status

✅ **Azure Static Web App Created**: `https://red-moss-0ff10900f.1.azurestaticapps.net`  
✅ **Application Built**: Ready for deployment  
✅ **Deployment Token**: Available  
✅ **Microsoft Authentication**: Pre-configured  

## 📋 Quick Deployment Steps

### Step 1: Install Azure Static Web Apps CLI
```bash
npm install -g @azure/static-web-apps-cli
```

### Step 2: Deploy Your Application
```bash
cd content-request-app
swa deploy ./dist --deployment-token <YOUR_DEPLOYMENT_TOKEN>
```

### Step 3: Update Azure AD Redirect URI
1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Find your app with Client ID: `e3127686-042e-4dc4-9204-4dd4c78e666d`
4. Go to **Authentication**
5. Add redirect URI: `https://red-moss-0ff10900f.1.azurestaticapps.net`
6. **Save**

### Step 4: Configure API Backend
Since Static Web Apps doesn't support your full-stack Node.js app directly, here are your options:

#### Option A: Azure Functions (Recommended)
Create Azure Functions for your API endpoints:
```bash
# Create new Functions app
az functionapp create --resource-group content-request-rg --consumption-plan-location eastus --runtime node --runtime-version 18 --functions-version 4 --name content-request-api --storage-account <storage-account-name>
```

#### Option B: Use Render.com for API Only
Deploy just the API backend to Render.com (free) while keeping frontend on Azure:
- Frontend: `https://red-moss-0ff10900f.1.azurestaticapps.net`
- API: `https://content-request-api.onrender.com`

## 🔧 Current Configuration

### Environment Variables Needed
When you set up the API backend, configure these:
- `ADO_PERSONAL_ACCESS_TOKEN`: `<YOUR_PAT_TOKEN>`
- `ADO_ORGANIZATION_URL`: `https://dev.azure.com/msft-skilling`
- `ADO_PROJECT`: `Content`

### Azure AD Configuration
- **Client ID**: `e3127686-042e-4dc4-9204-4dd4c78e666d`
- **Authority**: `https://login.microsoftonline.com/microsoft.onmicrosoft.com`
- **Tenant**: `microsoft.onmicrosoft.com`

## 🚀 Alternative: Complete Render.com Deployment

If you prefer a simpler all-in-one solution:

### Push to GitHub First
```bash
# Create GitHub repository at https://github.com/new
# Then:
git remote add origin https://github.com/YOUR_USERNAME/content-request-app.git
git push -u origin master
```

### Deploy to Render.com
1. Go to [render.com](https://render.com)
2. Connect your GitHub repository
3. Use these settings:
   - **Build Command**: `npm install && cd mcp-server && npm install && npm run build && cd .. && npm run build`
   - **Start Command**: `node azure-server.js`
   - **Environment Variables**: Add all the variables listed above

## 📞 Support

### Troubleshooting
- **Frontend Issues**: Check browser console on the Static Web App URL
- **Authentication Issues**: Verify Azure AD redirect URIs
- **API Issues**: Check API backend logs

### Next Steps After Deployment
1. Test login functionality
2. Test creating a content request
3. Verify data appears in Azure DevOps
4. Share the URL with your team!

## 🎯 Your Final URLs

- **Live Application**: `https://red-moss-0ff10900f.1.azurestaticapps.net`
- **Azure Portal Management**: [Azure Static Web Apps](https://portal.azure.com/#blade/HubsExtension/BrowseResource/resourceType/Microsoft.Web%2FstaticSites)

**Status**: Ready for final deployment! 🚀
