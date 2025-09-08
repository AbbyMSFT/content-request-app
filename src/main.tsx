import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { PublicClientApplication, EventType } from '@azure/msal-browser'
import { MsalProvider } from '@azure/msal-react'
import { msalConfig } from './authConfig'
import App from './App.tsx'
import './index.css'

const msalInstance = new PublicClientApplication(msalConfig)

// Add event callbacks for better authentication handling
msalInstance.addEventCallback((event) => {
  console.log('🎯 MSAL Event:', event.eventType, event);
  
  if (event.eventType === EventType.LOGIN_SUCCESS && event.payload) {
    const payload = event.payload as any;
    console.log('✅ Login success event - setting active account:', payload.account);
    msalInstance.setActiveAccount(payload.account);
  }
  
  if (event.eventType === EventType.ACQUIRE_TOKEN_SUCCESS && event.payload) {
    console.log('✅ Token acquired successfully');
  }
  
  if (event.eventType === EventType.LOGIN_FAILURE || event.eventType === EventType.ACQUIRE_TOKEN_FAILURE) {
    console.error('❌ Authentication failed:', event.error);
  }
});

// Handle page redirects from authentication
msalInstance.handleRedirectPromise().then((response) => {
  if (response && response.account) {
    console.log('✅ Redirect handled - setting active account:', response.account);
    msalInstance.setActiveAccount(response.account);
  }
}).catch((error) => {
  console.error('❌ Error handling redirect:', error);
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MsalProvider instance={msalInstance}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </MsalProvider>
  </React.StrictMode>,
)
