# 🧪 Local Testing Setup Guide

## ✅ Your Application is Running!

Your Content Request Application is now running locally at:
**http://localhost:5177/**

## 🔧 Enable Microsoft Authentication for Local Testing

To test Microsoft authentication locally, you need to add the localhost URL to your Azure AD app registration:

### Step 1: Go to Azure Portal
1. Open https://portal.azure.com
2. Navigate to **Azure Active Directory** → **App registrations**
3. Find your app: **"Content Request App"**
4. Click on it to open the configuration

### Step 2: Add Localhost Redirect URI
1. In the left menu, click **"Authentication"**
2. Under **"Redirect URIs"**, click **"Add URI"**
3. Add this exact URL: `http://localhost:5177`
4. Click **"Save"** at the top

### Step 3: Test Authentication
1. Go back to http://localhost:5177
2. You should see your Content Request Application
3. Click **"Sign in with Microsoft"**
4. You'll be redirected to Microsoft login
5. Sign in with your Microsoft credentials
6. You should be redirected back to your local app

## 🎯 What to Test

Once authentication works locally:

### ✅ Authentication Flow
- [ ] Sign in with Microsoft works
- [ ] User profile information displays
- [ ] Sign out works correctly

### ✅ Application Features
- [ ] Home page loads correctly
- [ ] Navigation works
- [ ] Create Request page functionality
- [ ] Dashboard displays (if accessible)

### ✅ Error Handling
- [ ] Authentication errors are handled gracefully
- [ ] Network issues don't break the app
- [ ] UI remains responsive

## 🔍 Current Configuration

- **App ID**: e3127686-042e-4dc4-9204-4dd4c78e666d
- **Tenant**: Microsoft (72f988bf-86f1-41af-91ab-2d7cd011db47)
- **Local URL**: http://localhost:5177
- **Permissions**: Microsoft Graph (User.Read, openid, profile, email)

## 🐛 Troubleshooting

If authentication doesn't work:

1. **Check Azure AD Configuration**
   - Ensure `http://localhost:5177` is added to Redirect URIs
   - Verify the App ID matches in `src/authConfig.ts`

2. **Check Console Errors**
   - Open browser Developer Tools (F12)
   - Look for authentication-related errors
   - Check Network tab for failed requests

3. **Clear Browser Cache**
   - Sometimes cached authentication data causes issues
   - Try incognito/private browsing mode

## 🎉 Next Steps

Once local testing passes:
1. ✅ Authentication working locally
2. ✅ Application features verified
3. 🔄 Deploy to production (Azure Static Web Apps or Netlify)
4. 🔄 Update Azure AD with production URL
5. 🔄 Share production URL with others

Your application is ready for local testing!
