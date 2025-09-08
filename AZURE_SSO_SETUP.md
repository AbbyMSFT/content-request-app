# Azure App Registration Setup for Microsoft SSO

This guide will help you set up real Microsoft SSO authentication for the UX Development Request Manager.

## Step 1: Create Azure App Registration

1. **Go to Azure Portal**
   - Navigate to [https://portal.azure.com](https://portal.azure.com)
   - Sign in with your Microsoft account

2. **Access Azure Active Directory**
   - Search for "Azure Active Directory" in the top search bar
   - Click on "Azure Active Directory" from the results

3. **Create App Registration**
   - In the left sidebar, click "App registrations"
   - Click "New registration" button
   - Fill in the details:
     - **Name**: `UX Development Request Manager`
     - **Supported account types**: Select "Accounts in this organizational directory only (Microsoft only - Single tenant)"
     - **Redirect URI**: Select "Single-page application (SPA)" and enter: `http://localhost:5174`
     - **Service Tree ID**: If prompted (Microsoft internal requirement), you can:
       - Use your team's existing Service Tree ID if you have one
       - Or create a new Service Tree entry at https://servicetree.msftcloudes.com/
       - Or contact your manager/admin for the appropriate Service Tree ID
       - This is typically required for Microsoft internal applications
   - Click "Register"

4. **Note Your Application (Client) ID**
   - After registration, you'll see the "Overview" page
   - Copy the **Application (client) ID** - you'll need this for the next step

## Step 2: Configure Authentication

1. **Set up Authentication**
   - In your app registration, go to "Authentication" in the left sidebar
   - Under "Single-page application", verify `http://localhost:5174` is listed
   - Add additional redirect URIs if needed:
     - `http://localhost:5174/` (with trailing slash)
   - Under "Implicit grant and hybrid flows", check:
     - ✅ Access tokens (used for implicit flows)
     - ✅ ID tokens (used for implicit and hybrid flows)
   - Click "Save"

2. **API Permissions**
   - Go to "API permissions" in the left sidebar
   - Verify these permissions are present (they should be added by default):
     - **Microsoft Graph**: `User.Read` (Delegated)
   - If not present, click "Add a permission" → "Microsoft Graph" → "Delegated permissions" → Search for "User.Read" and add it
   - Click "Grant admin consent" if you have admin privileges

## Step 3: Update Application Configuration

Now update your application's configuration file:

1. **Edit authConfig.ts**
   - Open `content-request-app/src/authConfig.ts`
   - Replace `YOUR_CLIENT_ID` with your actual Application (client) ID from Step 1
   
   ```typescript
   export const msalConfig: Configuration = {
     auth: {
       clientId: "YOUR_ACTUAL_CLIENT_ID_HERE", // Replace with your client ID
       authority: "https://login.microsoftonline.com/microsoft.onmicrosoft.com",
       redirectUri: "http://localhost:5174"
     },
     cache: {
       cacheLocation: "sessionStorage",
       storeAuthStateInCookie: false,
     }
   };
   ```

2. **For Production Deployment**
   - When deploying to production, you'll need to:
   - Add your production URL to the redirect URIs in Azure App Registration
   - Update the `redirectUri` in `authConfig.ts` to your production URL

## Step 4: Test Authentication

1. **Start the Application**
   - Make sure your development server is running: `npm run dev`
   - Navigate to `http://localhost:5174`

2. **Test Microsoft SSO**
   - Click the "Sign in with Microsoft" button
   - You should be redirected to Microsoft's login page
   - Sign in with your Microsoft account
   - You should be redirected back to the application and see your dashboard

## Troubleshooting

### Common Issues:

1. **AADSTS50011: No reply address**
   - Ensure the redirect URI in Azure matches exactly: `http://localhost:5174`
   - Check that you selected "Single-page application (SPA)" as the platform type

2. **AADSTS700016: Application not found**
   - Verify the client ID in `authConfig.ts` matches the Application (client) ID from Azure

3. **AADSTS65001: The user or administrator has not consented**
   - Go to API permissions in Azure and click "Grant admin consent"

4. **Network errors**
   - Ensure your local development server is running on port 5174
   - Check that no firewall is blocking the connection

### Additional Configuration Options:

**For Multi-tenant Applications:**
If you want to allow users from other organizations to sign in, change the authority to:
```typescript
authority: "https://login.microsoftonline.com/common"
```

**For Personal Microsoft Accounts:**
To allow personal Microsoft accounts (outlook.com, hotmail.com, etc.), use:
```typescript
authority: "https://login.microsoftonline.com/consumers"
```

**For Both Work and Personal Accounts:**
```typescript
authority: "https://login.microsoftonline.com/common"
```

## Security Notes

- Never commit your actual client ID to version control if your repository is public
- Consider using environment variables for production deployments
- The current configuration is suitable for development and internal Microsoft use
- For production, implement proper token refresh and error handling

## Next Steps

After completing this setup:
1. Test the authentication flow
2. Verify that user information appears in the navigation bar
3. Test the dashboard functionality with your Microsoft account
4. Create some test UX development requests

The application will now use real Microsoft SSO and show work items assigned to the authenticated user's email address.
