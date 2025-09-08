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
    clientId: "e3127686-042e-4dc4-9204-4dd4c78e666d", // Application (client) ID from Azure App Registration
    authority: "https://login.microsoftonline.com/72f988bf-86f1-41af-91ab-2d7cd011db47",
    redirectUri: getCurrentUrl(),
    postLogoutRedirectUri: getCurrentUrl()
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  }
};

// Add here scopes for id token to be used at MS Graph API endpoints.
export const loginRequest: PopupRequest = {
  scopes: ["User.Read", "openid", "profile", "email"]
};

// Add here the endpoints for MS Graph API services you would like to use.
export const graphConfig = {
  graphMeEndpoint: "https://graph.microsoft.com/v1.0/me"
};
