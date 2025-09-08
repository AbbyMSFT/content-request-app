# Revert Azure AD to Original Working Configuration

## Current Problem
We added too many localhost ports which may be causing conflicts. Let's go back to the original working setup.

## Steps to Clean Up Azure AD

### Step 1: Go to Azure AD App Registration
1. Go to [Azure Portal](https://portal.azure.com)
2. Search for "Azure Active Directory" 
3. Go to "App registrations"
4. Find your app: **UX Development Request Manager** (Client ID: 814a7899-b3c7-4e18-bd68-f3ef31dca8c9)
5. Click Authentication

### Step 2: Clean Up Redirect URIs
Under "Single-page application" platform, **REMOVE** these extra ports:
- ❌ `http://localhost:5177`
- ❌ `http://localhost:5178` 
- ❌ `http://localhost:5179`

**KEEP** only these essential URIs:
- ✅ `https://red-moss-0ff10900f-preview.eastus2.1.azurestaticapps.net`
- ✅ `http://localhost:5174`

### Step 3: Verify Configuration
Your final configuration should have:
- **Platform**: Single-page application (NO Web platform)
- **Redirect URIs**: Only the 2 listed above
- **Implicit Grant**: Both Access tokens and ID tokens checked

### Step 4: Save and Wait
1. Click **Save**
2. Wait 5-10 minutes for changes to propagate

## Test Plan
After cleanup:
1. Open **http://localhost:5174/** in incognito mode
2. Should show 1 button (latest code)
3. Test authentication - should work without cross-origin error

## Why This Should Work
- Port 5174 was the original working port
- Fewer redirect URIs reduces potential conflicts
- This matches the original working configuration

## If It Works
We can then use ngrok or similar to share localhost:5174 with others!
