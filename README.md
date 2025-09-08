# UX Development Request Manager

A comprehensive web application for managing UX development requests with Microsoft SSO authentication and Azure DevOps integration.

## 🚀 Features

- **Real Microsoft SSO Authentication** - Secure login using Azure Active Directory
- **Personalized Dashboard** - View work items assigned to you
- **Request Management** - Create, track, and manage UX development requests
- **Azure DevOps Integration** - Automatic work item creation and synchronization
- **Real-time Filtering** - Filter requests by status (New, Active, Resolved, Completed)
- **File Upload Support** - Attach supporting documents to requests
- **Responsive Design** - Works on desktop and mobile devices

## 🏗️ Architecture

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Authentication**: Microsoft MSAL (Azure Active Directory)
- **Backend Integration**: MCP Server with Azure DevOps REST API
- **State Management**: React hooks with error boundaries

## 📋 Prerequisites

- Node.js 18+ and npm
- Azure DevOps organization access
- Azure Active Directory permissions to create app registrations

## 🛠️ Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Azure App Registration
Follow the detailed guide in `AZURE_SSO_SETUP.md` to:
- Create an Azure App Registration
- Configure authentication settings
- Update the client ID in `src/authConfig.ts`

### 3. Set up MCP Server
The MCP server handles Azure DevOps integration. It should already be configured, but verify:
- PAT token is set up for Azure DevOps access
- MCP server is running and connected

### 4. Start Development Server
```bash
npm run dev
```

The application will be available at `http://localhost:5174`

## 🔧 Configuration Files

### Key Configuration Files:
- `src/authConfig.ts` - Microsoft MSAL configuration
- `src/main.tsx` - Application entry point with MSAL provider
- `tailwind.config.js` - Tailwind CSS configuration
- `vite.config.ts` - Vite build configuration

### Environment Setup:
- Development: `http://localhost:5174`
- Redirect URI must match exactly in Azure App Registration

## 📱 Usage

### For End Users:
1. **Sign In**: Click "Sign in with Microsoft" and authenticate
2. **View Dashboard**: See your assigned work items with status indicators
3. **Filter Requests**: Use status filters to find specific requests
4. **Create Request**: Submit new UX development requests with all required details
5. **Track Progress**: Monitor request status and updates

### For Content Developers:
1. **Dashboard View**: See all requests assigned to you
2. **Status Management**: Update request statuses as work progresses
3. **Assignment**: Requests are automatically assigned via Azure DevOps

## 🔍 Project Structure

```
content-request-app/
├── src/
│   ├── components/           # Reusable UI components
│   ├── pages/               # Main application pages
│   │   ├── HomePage.tsx     # Landing page
│   │   ├── LoginPage.tsx    # Microsoft SSO login
│   │   ├── DashboardPage.tsx # User dashboard
│   │   └── CreateRequestPage.tsx # Request creation form
│   ├── authConfig.ts        # Microsoft MSAL configuration
│   ├── App.tsx             # Main application component
│   └── main.tsx            # Application entry point
├── public/                 # Static assets
├── AZURE_SSO_SETUP.md     # Detailed Azure setup guide
└── package.json           # Dependencies and scripts
```

## 🧪 Development

### Available Scripts:
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Development Notes:
- Hot reload is enabled for development
- TypeScript strict mode is enabled
- Tailwind CSS is configured with custom theme
- MSAL handles authentication state automatically

## 🔐 Security

- **Authentication**: Microsoft MSAL with OAuth 2.0/OpenID Connect
- **Session Management**: Secure token storage and automatic refresh
- **API Security**: PAT token authentication for Azure DevOps API
- **Input Validation**: Client-side form validation and error handling

## 🚀 Deployment

### For Production:
1. Update `authConfig.ts` with production redirect URI
2. Add production URL to Azure App Registration redirect URIs
3. Build the application: `npm run build`
4. Deploy the `dist` folder to your hosting platform
5. Ensure HTTPS is enabled for production

### Environment Variables (Optional):
Consider using environment variables for:
- Client ID
- Authority URL
- API endpoints

## 📊 Azure DevOps Integration

The application integrates with Azure DevOps through an MCP server that provides:
- **Work Item Creation**: Automatically creates User Story work items
- **Status Synchronization**: Updates work item status in real-time
- **User Assignment**: Assigns work items to specific users
- **WIQL Queries**: Advanced querying for personalized dashboards

### Supported Work Item Types:
- User Story (primary)
- Bug
- Task

### Status Mapping:
- New → Active → Resolved → Closed
- Custom priority levels (Critical, High, Medium, Low)

## 🤝 Contributing

1. Follow TypeScript best practices
2. Use Tailwind CSS for styling
3. Implement proper error handling
4. Add appropriate TypeScript types
5. Test authentication flows thoroughly

## 📞 Support

For issues related to:
- **Azure App Registration**: Check `AZURE_SSO_SETUP.md`
- **Authentication Errors**: Verify client ID and redirect URIs
- **Azure DevOps Integration**: Check MCP server configuration
- **Development Issues**: Ensure Node.js 18+ and npm are installed

## 🎯 Future Enhancements

- Email notifications for status changes
- Advanced reporting and analytics
- Mobile app development
- Integration with additional Microsoft services
- Bulk request management
- Custom workflow states
# Deployment force trigger - Mon, Sep  8, 2025  8:50:23 PM
# Force deployment - Mon, Sep  8, 2025  9:01:08 PM
