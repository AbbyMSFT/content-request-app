// Centralized configuration for port management
// This file is used by both frontend and backend to ensure port coordination

const config = {
  // Port configuration
  frontend: {
    port: parseInt(process.env.VITE_PORT || process.env.PORT || '5179'),
    host: process.env.VITE_HOST || 'localhost'
  },
  backend: {
    port: parseInt(process.env.API_PORT || '3003'),
    host: process.env.API_HOST || 'localhost'
  },

  // Azure configuration
  azure: {
    clientId: process.env.VITE_AZURE_CLIENT_ID || "your-client-id-here",
    authority: process.env.VITE_AZURE_AUTHORITY || "https://login.microsoftonline.com/common",
  },

  // Derived URLs
  get frontendUrl() {
    return `http://${this.frontend.host}:${this.frontend.port}`;
  },

  get backendUrl() {
    return `http://${this.backend.host}:${this.backend.port}`;
  },

  get apiUrl() {
    return `${this.backendUrl}/api`;
  },

  // Azure redirect URIs
  get redirectUri() {
    return this.frontendUrl;
  },

  get postLogoutRedirectUri() {
    return this.frontendUrl;
  }
};

export default config;
