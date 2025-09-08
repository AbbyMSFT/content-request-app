# Azure AD Configuration Verification

## Current Issue
Still getting `AADSTS9002326: Cross-origin token redemption is permitted only for the 'Single-Page Application' client-type` even after adding localhost:5178.

## Complete Azure AD Checklist

### 1. Platform Configuration
Go to Azure Portal → App registrations → Your app → Authentication

**Verify Platform Type:**
- ✅ Should show "Single-page application" (NOT "Web")
- ❌ If you see "Web" platform, delete it

### 2. Redirect URIs
Under "Single-page application" platform, verify these URIs are listed:
- ✅ `https://red-moss-0ff10900f-preview.eastus2.1.azurestaticapps.net`
- ✅ `http://localhost:5178`
- ⚠️ Optional: `http://localhost:5177` (if needed)
- ⚠️ Optional: `http://localhost:5173` (default Vite port)

### 3. Implicit Grant Settings
Under "Implicit grant and hybrid flows":
- ✅ **Access tokens** should be CHECKED
- ✅ **ID tokens** should be CHECKED

### 4. Advanced Settings
Check these additional settings:

**Allow public client flows:**
- ✅ Should be set to "Yes"

**Supported account types:**
- ✅ Should be "Accounts in any organizational directory (Any Azure AD directory - Multitenant)"

## Troubleshooting Steps

### Step 1: Double-Check Platform Type
1. In Authentication page, look at "Platform configurations"
2. You should ONLY see "Single-page application"
3. If you see "Web", click the trash icon to delete it

### Step 2: Wait for Propagation
- Azure AD changes can take 5-15 minutes to propagate
- Try waiting a bit longer before testing

### Step 3: Clear Browser Cache
1. Close all browser windows
2. Open a new incognito/private window
3. Test authentication in the private window

### Step 4: Alternative Ports
If localhost:5178 doesn't work, try adding more common ports:
- `http://localhost:3000`
- `http://localhost:5173`
- `http://localhost:8080`

## Expected Result
After correct configuration, you should see successful authentication without the cross-origin error.

## If Still Not Working
The issue might be:
1. Changes haven't propagated yet (wait longer)
2. Browser cache interference (try incognito mode)
3. Platform type still incorrect (verify no "Web" platform exists)
4. Missing implicit grant settings
