import { Configuration, PopupRequest } from "@azure/msal-browser";

// Browser-compatible configuration (using current window location)
const getCurrentUrl = () => {
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  const port = window.location.port;
  return `${protocol}//${hostname}${port ? `:${port}` : ''}`;
};

// MSAL configuration
export const msalConfig: Configuration = {
  auth: {
    clientId: "814a7899-b3c7-4e18-bd68-f3ef31dca8c9", // securitydocs01.onmicrosoft.com App Registration
    authority: "https://login.microsoftonline.com/common", // Multi-tenant support
    redirectUri: getCurrentUrl(),
    postLogoutRedirectUri: getCurrentUrl()
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  }
};

// Basic scopes for initial testing (admin consent not required)
export const loginRequest: PopupRequest = {
  scopes: [
    "User.Read", 
    "openid", 
    "profile", 
    "email"
  ]
};

// Add here the endpoints for MS Graph API services you would like to use.
export const graphConfig = {
  graphMeEndpoint: "https://graph.microsoft.com/v1.0/me"
};
