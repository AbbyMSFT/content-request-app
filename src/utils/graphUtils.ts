import { IPublicClientApplication } from '@azure/msal-browser';
import { graphConfig } from '../authConfig';

export interface UserInfo {
  id: string;
  displayName: string;
  mail: string;
  userPrincipalName: string;
  givenName?: string;
  surname?: string;
}

export async function fetchUserProfile(instance: IPublicClientApplication): Promise<UserInfo | null> {
  try {
    console.log('🔍 Starting user profile fetch...');
    
    const account = instance.getActiveAccount();
    if (!account) {
      console.error('❌ No active account found');
      throw new Error('No active account');
    }
    
    console.log('✅ Active account found:', account.username);

    // Get access token for Microsoft Graph
    console.log('🔑 Requesting access token...');
    const response = await instance.acquireTokenSilent({
      scopes: ['User.Read'],
      account: account
    });
    
    console.log('✅ Access token acquired');

    // Fetch user profile from Microsoft Graph
    console.log('📡 Fetching user profile from Graph API...');
    const profileResponse = await fetch(graphConfig.graphMeEndpoint, {
      headers: {
        'Authorization': `Bearer ${response.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('📊 Graph API response status:', profileResponse.status);

    if (!profileResponse.ok) {
      const errorText = await profileResponse.text();
      console.error('❌ Graph API error:', errorText);
      throw new Error(`Failed to fetch user profile: ${profileResponse.status} ${errorText}`);
    }

    const userProfile = await profileResponse.json();
    console.log('✅ User profile fetched:', userProfile);
    
    const result = {
      id: userProfile.id,
      displayName: userProfile.displayName,
      mail: userProfile.mail,
      userPrincipalName: userProfile.userPrincipalName,
      givenName: userProfile.givenName,
      surname: userProfile.surname
    };
    
    console.log('📝 Processed user info:', result);
    return result;
  } catch (error) {
    console.error('❌ Error fetching user profile:', error);
    return null;
  }
}
