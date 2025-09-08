import { Routes, Route, Link } from 'react-router-dom'
import { FileText, Layout, Plus, User, LogOut } from 'lucide-react'
import { useIsAuthenticated, useAccount, useMsal } from '@azure/msal-react'
import { useState, useEffect } from 'react'
import { fetchUserProfile, UserInfo } from './utils/graphUtils'
import HomePage from './pages/HomePage'
import DashboardPage from './pages/DashboardPage'
import CreateRequestPage from './pages/CreateRequestPage'
import LoginPage from './pages/LoginPage'

function App() {
  const isAuthenticated = useIsAuthenticated();
  const account = useAccount();
  const { instance } = useMsal();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

  const handleLogout = () => {
    instance.logoutPopup();
  };

  // Fetch user profile information from Microsoft Graph
  useEffect(() => {
    const handleAuthentication = async () => {
      console.log('🔍 App: Authentication state check...');
      console.log('🔍 isAuthenticated:', isAuthenticated);
      
      // Check if we have accounts even if isAuthenticated is false
      const accounts = instance.getAllAccounts();
      console.log('🔍 Available accounts:', accounts.length);
      
      if (accounts.length > 0 || isAuthenticated) {
        const currentAccount = account || accounts[0];
        console.log('🔍 Selected account:', currentAccount);
        
        if (currentAccount) {
          // Set the active account if not already set
          if (!instance.getActiveAccount()) {
            console.log('🔧 Setting active account...');
            instance.setActiveAccount(currentAccount);
          }
          
          try {
            console.log('🚀 App: Starting user profile fetch...');
            const userInfo = await fetchUserProfile(instance);
            console.log('🎯 App: Received user info:', userInfo);
            setUserInfo(userInfo);
          } catch (error) {
            console.error('❌ Error fetching user profile:', error);
          }
        } else {
          console.error('❌ No account available after authentication');
        }
      }
    };

    handleAuthentication();
  }, [isAuthenticated, account, instance]);

  // Additional check for authentication state changes
  useEffect(() => {
    const checkAuthState = () => {
      const accounts = instance.getAllAccounts();
      console.log('🔄 Auth state check - Accounts:', accounts.length, 'isAuthenticated:', isAuthenticated);
      
      // If we have accounts but isAuthenticated is false, try to set active account
      if (accounts.length > 0 && !isAuthenticated) {
        console.log('🔧 Found accounts but not authenticated, setting active account...');
        const currentAccount = accounts[0];
        instance.setActiveAccount(currentAccount);
      }
    };

    // Check immediately and then every 2 seconds for the first 10 seconds
    checkAuthState();
    const interval = setInterval(checkAuthState, 2000);
    const timeout = setTimeout(() => clearInterval(interval), 10000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [instance, isAuthenticated]);

  // Debug current state
  useEffect(() => {
    console.log('🔍 App state - isAuthenticated:', isAuthenticated);
    console.log('🔍 App state - account:', account);
    console.log('🔍 App state - userInfo:', userInfo);
  }, [isAuthenticated, account, userInfo]);

  // Show login page if user is not authenticated
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-primary" />
              <span className="ml-2 text-xl font-semibold">UX Development Request Manager</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link 
                to="/"
                className="flex items-center px-3 py-2 rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground"
              >
                <Layout className="h-4 w-4 mr-2" />
                Home
              </Link>
              <Link 
                to="/dashboard"
                className="flex items-center px-3 py-2 rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground"
              >
                <Layout className="h-4 w-4 mr-2" />
                Dashboard
              </Link>
              <Link 
                to="/create"
                className="flex items-center px-3 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Request
              </Link>
              
              {/* User Menu */}
              <div className="flex items-center space-x-3 border-l pl-4">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <div className="text-sm">
                    <div className="font-medium text-gray-900">
                      {userInfo?.displayName || account?.name || 'User'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {userInfo?.mail || account?.username}
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
                >
                  <LogOut className="h-4 w-4 mr-1" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/create" element={<CreateRequestPage />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
