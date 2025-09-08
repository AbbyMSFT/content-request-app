# Fix Azure AD App Registration for Single-Page Application

## The Problem
You're getting this error: `AADSTS9002326: Cross-origin token redemption is permitted only for the 'Single-Page Application' client-type`

This means your Azure AD app registration is configured as a traditional web application instead of a Single-Page Application (SPA).

## Solution: Update App Registration Platform Configuration

### Step 1: Access Your App Registration
1. Go to [Azure Portal](https://portal.azure.com)
2. Search for "Azure Active Directory" 
3. Go to "App registrations"
4. Find your app: **UX Development Request Manager** (Client ID: 814a7899-b3c7-4e18-bd68-f3ef31dca8c9)
5. Click on it to open

### Step 2: Fix Platform Configuration
1. In the left sidebar, click **"Authentication"**
2. You'll see the current platform configurations

### Step 3: Add Single-Page Application Platform
1. Click **"Add a platform"**
2. Select **"Single-page application"**
3. Add these redirect URIs:
   - `https://red-moss-0ff10900f-preview.eastus2.1.azurestaticapps.net`
   - `http://localhost:5174` (for local development)
4. Click **"Configure"**

### Step 4: Remove Old Web Platform (if exists)
1. If you see a "Web" platform configuration, click the **trash/delete icon** next to it
2. This removes the conflicting web app configuration

### Step 5: Configure Implicit Grant Settings
1. Under **"Implicit grant and hybrid flows"** section:
   - ✅ Check **"Access tokens (used for implicit flows)"**
   - ✅ Check **"ID tokens (used for implicit and hybrid flows)"**
2. Click **"Save"**

### Step 6: Verify the Configuration
After saving, your Authentication page should show:
- **Platform configurations:** Single-page application
- **Redirect URIs:** 
  - `https://red-moss-0ff10900f-preview.eastus2.1.azurestaticapps.net`
  - `http://localhost:5174`
- **Implicit grant:** Both Access tokens and ID tokens checked

## What This Fixes
- ✅ Enables popup authentication for SPAs
- ✅ Resolves the "Cross-origin token redemption" error
- ✅ Allows the application to work with modern SPA authentication flows
- ✅ Maintains security while supporting browser-based authentication

## Next Steps
After making these changes:
1. Wait 5-10 minutes for the changes to propagate
2. Test the application at: https://red-moss-0ff10900f-preview.eastus2.1.azurestaticapps.net
3. Click "Sign in with Microsoft" - it should now work without errors

## Additional Notes
- The popup authentication method is the recommended approach for SPAs
- This configuration supports modern browser security requirements
- Your application is configured for multi-tenant authentication, so users from any Microsoft organization can sign in
