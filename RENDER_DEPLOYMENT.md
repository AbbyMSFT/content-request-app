# Deploy to Render.com (Free)

This guide will help you deploy your Content Request Application to Render.com for free, giving you a public URL that others can access.

## What You'll Get

- ✅ **Free public URL**: `https://content-request-app.onrender.com`
- ✅ **HTTPS included**: Automatic SSL certificate
- ✅ **Microsoft authentication**: Works with your existing Azure AD setup
- ✅ **No credit card required**: Completely free tier
- ✅ **Auto-deploy from GitHub**: Updates automatically when you push changes

## Prerequisites

1. GitHub account
2. Render.com account (free signup)
3. Your Azure DevOps Personal Access Token (PAT)

## Step-by-Step Deployment

### 1. Push to GitHub

First, create a new repository on GitHub:

1. Go to https://github.com/new
2. Repository name: `content-request-app`
3. Make it **Public** (required for free tier)
4. Click "Create repository"

Then push your code:

```bash
cd content-request-app
git remote add origin https://github.com/YOUR_USERNAME/content-request-app.git
git branch -M main
git push -u origin main
```

### 2. Deploy to Render

1. **Sign up at Render.com**
   - Go to https://render.com
   - Sign up with your GitHub account
   - Authorize Render to access your repositories

2. **Create New Web Service**
   - Click "New +" → "Web Service"
   - Select "Build and deploy from a Git repository"
   - Choose your `content-request-app` repository
   - Click "Connect"

3. **Configure the Service**
   - **Name**: `content-request-app`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && cd mcp-server && npm install && npm run build && cd .. && npm run build`
   - **Start Command**: `node azure-server.js`
   - **Plan**: `Free`

4. **Set Environment Variables**
   Click "Advanced" and add these environment variables:

   ```
   NODE_ENV = production
   VITE_API_URL = /api
   ADO_ORGANIZATION_URL = https://dev.azure.com/msft-skilling
   ADO_PROJECT = Content
   ADO_PERSONAL_ACCESS_TOKEN = your-actual-pat-token-here
   VITE_AZURE_CLIENT_ID = e3127686-042e-4dc4-9204-4dd4c78e666d
   VITE_AZURE_AUTHORITY = https://login.microsoftonline.com/microsoft.onmicrosoft.com
   ```

   **Important**: Replace `your-actual-pat-token-here` with your real Azure DevOps PAT

5. **Deploy**
   - Click "Create Web Service"
   - Render will automatically build and deploy your app
   - First deployment takes 5-10 minutes

### 3. Update Azure AD Authentication

Once deployed, you need to add your Render URL to Azure AD:

1. **Get your Render URL**
   - After deployment, your app will be available at: `https://content-request-app.onrender.com`
   - (Replace with your actual service name if different)

2. **Update Azure AD App Registration**
   - Go to Azure Portal → Azure Active Directory → App registrations
   - Find your app with Client ID: `e3127686-042e-4dc4-9204-4dd4c78e666d`
   - Go to "Authentication"
   - Add redirect URI: `https://content-request-app.onrender.com`
   - Save changes

### 4. Test Your Deployment

1. Visit your Render URL: `https://content-request-app.onrender.com`
2. Try logging in with Microsoft credentials
3. Test creating a content request

## Important Notes

### Free Tier Limitations
- **Sleeps after 15 minutes** of inactivity
- **Cold start time**: 10-30 seconds to wake up
- **750 hours/month** of runtime (enough for most use cases)

### Environment Variables
- Never commit your PAT token to GitHub
- Set sensitive values in Render's environment variables section
- Environment variables are encrypted and secure

### Auto-Deployment
- Every push to `main` branch triggers automatic redeployment
- No manual action needed after initial setup
- Check deployment logs in Render dashboard

## Sharing Your App

Once deployed, you can share the URL with anyone:

**Your App URL**: `https://content-request-app.onrender.com`

Users can:
- Log in with their Microsoft credentials
- Create content requests
- View the dashboard
- All data syncs to your Azure DevOps project

## Monitoring and Troubleshooting

### Check Deployment Status
- Render Dashboard → Services → content-request-app
- View build logs and runtime logs
- Monitor performance and uptime

### Common Issues

1. **Build Failures**
   - Check build logs in Render dashboard
   - Verify all dependencies are in package.json
   - Ensure build command is correct

2. **Environment Variable Issues**
   - Double-check all environment variables are set
   - Verify PAT token has correct permissions
   - Ensure no typos in variable names

3. **Authentication Failures**
   - Verify redirect URI is added to Azure AD
   - Check client ID matches your Azure AD app
   - Ensure authority URL is correct

### Upgrading (If Needed)

If you outgrow the free tier:
- **Starter Plan**: $7/month - No sleep, faster builds
- **Pro Plan**: $25/month - More resources, staging environments

## Next Steps

1. ✅ Test your deployed application
2. ✅ Share the URL with your team
3. ✅ Monitor usage in Render dashboard
4. ✅ Consider upgrading if needed

Your Content Request Application is now live and accessible to anyone with the URL!
