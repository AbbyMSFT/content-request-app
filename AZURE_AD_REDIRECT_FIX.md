# Fix Azure AD Redirect URI for Current Deployment

## Issue
Your Azure AD app registration has `red-moss-0ff10900f-preview.eastus2.1.azurestaticapps.net` but your current deployment is `brave-field-0e65e2c0f.4.azurestaticapps.net`.

## Solution: Add Missing Redirect URI

### Step 1: Access Your App Registration
1. Go to [Azure Portal](https://portal.azure.com)
2. Search for "Azure Active Directory" 
3. Go to "App registrations"
4. Find your app: **UX Development Request Manager** (Client ID: 814a7899-b3c7-4e18-bd68-f3ef31dca8c9)
5. Click on it to open

### Step 2: Add the Missing Redirect URI
1. In the left sidebar, click **"Authentication"**
2. Under "Single-page application" platform, click **"Add URI"**
3. Add this exact URL: `https://brave-field-0e65e2c0f.4.azurestaticapps.net`
4. Click **"Save"**

### Step 3: Verify Your Configuration
After saving, you should see both redirect URIs:
- ✅ `https://red-moss-0ff10900f-preview.eastus2.1.azurestaticapps.net`
- ✅ `https://brave-field-0e65e2c0f.4.azurestaticapps.net`
- ✅ `http://localhost:5178` (for current local development)

**Note**: If you need other localhost ports, you can add them too since ports can change automatically.

### Step 4: Wait for Propagation
- Wait 5-10 minutes for Azure AD changes to propagate
- This is important - Azure AD changes are not instant

## Next Steps After This Fix
1. Test localhost authentication first
2. Once deployment 404 is fixed, test the deployed version
3. Authentication should work on both URLs once this is complete

## Why This Fixes the Issue
- Azure AD only allows authentication from pre-registered redirect URIs
- The dynamic redirect URI in the code will work once Azure AD knows about the URL
- This maintains security while allowing multiple deployment environments
