import React, { useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../authConfig';
import { FileText, Building2, AlertCircle } from 'lucide-react';

const LoginPage: React.FC = () => {
  const { instance } = useMsal();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLoginPopup = async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('🚀 Starting popup login...');
      const response = await instance.loginPopup(loginRequest);
      console.log('✅ Login successful:', response);
      
      // Set the active account immediately after successful login
      if (response.account) {
        instance.setActiveAccount(response.account);
        console.log('🔧 Active account set:', response.account);
      }
    } catch (error: any) {
      console.error('❌ Login failed:', error);
      setError(error.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <FileText className="h-12 w-12 text-blue-600" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
          UX Development Request Manager
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Sign in with your Microsoft account
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="space-y-6">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-center">
                  <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                  <span className="text-sm text-red-700">{error}</span>
                </div>
              </div>
            )}

            <div>
              <button
                onClick={handleLoginPopup}
                disabled={isLoading}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                <Building2 className="h-5 w-5 mr-2" />
                {isLoading ? 'Signing in...' : 'Sign in with Microsoft'}
              </button>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                Click the button above to authenticate with your Microsoft account
              </p>
            </div>
          </div>

          <div className="mt-8 border-t border-gray-200 pt-6">
            <div className="text-center">
              <p className="text-xs text-gray-500">
                Secure authentication through Microsoft Azure Active Directory
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Your credentials are never stored locally
              </p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-green-50 rounded-md border border-green-200">
            <div className="text-sm text-green-800">
              <strong>Microsoft SSO Enabled:</strong> This application is configured with real Microsoft Azure authentication.
              <p className="mt-2">
                You'll be redirected to Microsoft's secure login page to authenticate with your Microsoft account.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
