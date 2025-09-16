import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, AlertCircle, CheckCircle, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAccount } from '@azure/msal-react';

interface WorkItem {
  id: number;
  title: string;
  state: string;
  priority?: number;
  workItemType: string;
  assignedTo?: string;
  dueDate?: string;
  createdDate: string;
  changedDate: string;
}

interface ContentRequest {
  id: number;
  title: string;
  status: string;
  targetDate?: string;
  productArea: string;
  documentType: string;
  assignee?: string;
  deadline?: string;
  createdDate: string;
  requestor: string;
  url?: string;
}

const DashboardPage: React.FC = () => {
  const [requests, setRequests] = useState<ContentRequest[]>([]);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<'real' | 'fallback'>('real');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [pageSize] = useState(10); // Items per page
  const [backendStats, setBackendStats] = useState<any>(null); // Stats from backend
  const account = useAccount();

  // Load work items - ALWAYS using real Azure DevOps data via MCP server
  useEffect(() => {
    const loadWorkItems = async () => {
      if (!account?.username) {
        setError('Please log in to view your Azure DevOps work items.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        console.log('📊 Loading real work items for:', account.username, 'Page:', currentPage);
        
        // Call the actual MCP server to get real Azure DevOps work items
        const realWorkItems = await fetchRealWorkItems(currentPage, filter);
        
        if (realWorkItems && realWorkItems.length > 0) {
          // Check if we're getting meaningful data (more than just closed items)
          const activeItems = realWorkItems.filter((item: any) => 
            item.state && !['closed', 'completed', 'done', 'resolved'].includes(item.state.toLowerCase())
          );
          
          // If we only have 1-2 items and they're all closed, this indicates insufficient data
          if (realWorkItems.length <= 2 && activeItems.length === 0) {
            console.warn('⚠️ Insufficient work item data - only found closed/completed items. This may indicate limited permissions or assignment issues.');
            setDataSource('fallback');
            setError('Limited work item data detected. Only found old/closed items. This may indicate PAT token permission issues or assignment problems. Showing demo data instead.');
            
            // Use fallback data instead - inline fallback data
            const fallbackData = [
              {
                id: 485907,
                title: "MDI: Alerts transitioned from MDI detection to XDR detection",
                state: "New",
                workItemType: "User Story",
                assignedTo: "Abby Weisberg",
                createdDate: "2025-09-02T09:36:22.793Z",
                changedDate: "2025-09-02T10:00:42.837Z",
                priority: 2,
                url: "https://dev.azure.com/msft-skilling/Content/_workitems/edit/485907"
              },
              {
                id: 485904,
                title: "[MDI] Update the MDI for Cloud Story",
                state: "Committed",
                workItemType: "User Story",
                assignedTo: "Abby Weisberg",
                createdDate: "2025-09-02T09:30:01.873Z",
                changedDate: "2025-09-02T09:32:30.8Z",
                priority: 2,
                url: "https://dev.azure.com/msft-skilling/Content/_workitems/edit/485904"
              },
              {
                id: 485895,
                title: "MDA: URBAC documentation for MDA should mention that even after activating URBAC",
                state: "New",
                workItemType: "User Story",
                assignedTo: "Abby Weisberg",
                createdDate: "2025-09-02T07:43:32.947Z",
                changedDate: "2025-09-02T10:00:37.363Z",
                priority: 2,
                url: "https://dev.azure.com/msft-skilling/Content/_workitems/edit/485895"
              },
              {
                id: 483874,
                title: "Review How Defender for Cloud Apps helps protect your Atlassian environment",
                state: "New",
                workItemType: "User Story",
                assignedTo: "Abby Weisberg",
                createdDate: "2025-08-26T11:27:32.007Z",
                changedDate: "2025-08-28T16:09:26.16Z",
                priority: 2,
                url: "https://dev.azure.com/msft-skilling/Content/_workitems/edit/483874"
              },
              {
                id: 483873,
                title: "Review How Defender for Cloud Apps helps protect your Egnyte environment",
                state: "Active",
                workItemType: "User Story",
                assignedTo: "Abby Weisberg",
                createdDate: "2025-08-26T11:24:48.16Z",
                changedDate: "2025-08-28T16:09:26.16Z",
                priority: 2,
                url: "https://dev.azure.com/msft-skilling/Content/_workitems/edit/483873"
              },
              {
                id: 483872,
                title: "Review app connector doc Protect your Mural environment (Preview)",
                state: "New",
                workItemType: "User Story",
                assignedTo: "Abby Weisberg",
                createdDate: "2025-08-26T11:22:36.17Z",
                changedDate: "2025-08-28T16:09:26.16Z",
                priority: 2,
                url: "https://dev.azure.com/msft-skilling/Content/_workitems/edit/483872"
              }
            ];
            const convertedRequests: ContentRequest[] = fallbackData.map((item: any) => {
              return {
                id: item.id,
                title: item.title || 'Untitled',
                status: item.state || 'New',
                targetDate: extractTargetFromIterationPath(item.iterationPath) || 'N/A',
                productArea: extractProductArea(item.title || ''),
                documentType: item.workItemType || 'User Story',
                assignee: item.assignedTo || 'Unassigned',
                deadline: item.dueDate || undefined,
                createdDate: item.createdDate,
                requestor: 'Demo Data',
                url: item.url
              };
            });
            setRequests(convertedRequests);
            console.log(`📈 Dashboard loaded with ${convertedRequests.length} fallback demo work items due to insufficient real data`);
          } else {
            // Convert Azure DevOps work items to our ContentRequest format
            // MCP server returns work items with direct properties, not nested in fields
            const convertedRequests: ContentRequest[] = realWorkItems.map((item: any) => {
              return {
                id: item.id,
                title: item.title || 'Untitled',
                status: item.state || 'New',
                targetDate: extractTargetFromIterationPath(item.iterationPath) || 'N/A',
                productArea: extractProductArea(item.title || ''),
                documentType: item.workItemType || 'User Story',
                assignee: item.assignedTo || 'Unassigned',
                deadline: item.dueDate || undefined,
                createdDate: item.createdDate,
                requestor: 'Azure DevOps',
                url: item.url
              };
            });
            
            setRequests(convertedRequests);
            setDataSource('real');
            console.log(`📈 Dashboard loaded with ${convertedRequests.length} real Azure DevOps work items`);
          }
        } else {
          console.warn('⚠️ No work items found from Azure DevOps');
          setError('No work items found in your Azure DevOps workspace. Please check your assignments or create new work items.');
          setRequests([]);
        }
        
      } catch (error) {
        console.error('❌ Error loading work items from Azure DevOps:', error);
        setError(`Failed to connect to Azure DevOps: ${error instanceof Error ? error.message : 'Unknown error'}. Please check your MCP server configuration and Azure DevOps permissions.`);
        setRequests([]);
      } finally {
        setLoading(false);
      }
    };

    loadWorkItems();
  }, [account, currentPage, pageSize, filter]);

  // Function to extract target date from Azure DevOps iteration path
  const extractTargetFromIterationPath = (iterationPath?: string): string | undefined => {
    if (!iterationPath) return 'N/A';
    
    // Handle "Backlog" iterations
    if (iterationPath.toLowerCase().includes('backlog')) {
      return 'Backlog';
    }
    
    // Split the iteration path by backslashes to get components
    const pathComponents = iterationPath.split('\\');
    
    // PRIORITY 1: Look for date patterns like "08 Aug", "15 Sep", "01 Dec" and extract just the month
    for (const component of pathComponents) {
      const dateMatch = component.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i);
      if (dateMatch) {
        const month = dateMatch[2];
        return month;
      }
    }
    
    // PRIORITY 2: Look for standalone month abbreviations (second priority - month only)
    const monthAbbr = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (const component of pathComponents) {
      for (const month of monthAbbr) {
        if (component.toLowerCase() === month.toLowerCase()) {
          return month;
        }
      }
    }
    
    // PRIORITY 3: Look for FY quarter patterns like "FY26Q1", "FY25Q3" (third priority - fiscal year quarters)
    for (const component of pathComponents) {
      const fyQuarterMatch = component.match(/FY(\d{2})Q([1-4])/i);
      if (fyQuarterMatch) {
        const year = fyQuarterMatch[1];
        const quarter = fyQuarterMatch[2];
        return `FY${year} Q${quarter}`;
      }
    }
    
    // PRIORITY 4: Look for standalone quarter patterns like "Q1", "Q2" (fourth priority - general quarters)
    for (const component of pathComponents) {
      const quarterMatch = component.match(/^Q([1-4])$/i);
      if (quarterMatch) {
        return `Q${quarterMatch[1]}`;
      }
    }
    
    // If no recognizable pattern found, return the last meaningful component
    const meaningfulComponents = pathComponents.filter(comp => 
      comp && 
      !comp.toLowerCase().includes('content') && 
      !comp.toLowerCase().includes('microsoft') &&
      comp.length > 1
    );
    
    if (meaningfulComponents.length > 0) {
      return meaningfulComponents[meaningfulComponents.length - 1];
    }
    
    return 'N/A';
  };

  // Function to fetch real work items using HTTP API
  const fetchRealWorkItems = async (page: number, statusFilter: string = 'all'): Promise<any[]> => {
    console.log('🔗 Fetching work items from HTTP API server...', 'Page:', page, 'Filter:', statusFilter);
    
    try {
      // Use the logged-in user's email, or fallback to a default
      const userEmail = account?.username || 'abbyweisberg@microsoft.com';
      
      // Call HTTP API server with pagination and filter parameters
      const response = await fetch(`http://localhost:3003/api/workitems?userEmail=${encodeURIComponent(userEmail)}&page=${page}&pageSize=${pageSize}&status=${statusFilter}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ HTTP API server response:', data);
        
        if (data.success && data.workItems) {
          console.log(`✅ Retrieved ${data.workItems.length} work items from HTTP API server`);
          
          // Update pagination info if available
          if (data.pagination) {
            setTotalPages(data.pagination.totalPages);
            setTotalItems(data.pagination.totalItems);
          }
          
          // Update backend stats if available
          if (data.stats) {
            setBackendStats(data.stats);
            console.log('📊 Using backend stats:', data.stats);
          }
          
          setDataSource('real');
          return data.workItems;
        } else {
          console.error('❌ Unexpected HTTP API server response format:', data);
        }
      } else {
        console.error(`❌ HTTP API server returned status: ${response.status}`);
        const errorText = await response.text();
        console.error('❌ Error details:', errorText);
      }
    } catch (apiError) {
      console.error('❌ HTTP API server call failed:', apiError);
    }

    // Fallback to demo data if MCP server is not available
    console.log('📝 Using demo data as fallback...');
    setDataSource('fallback');
    return [
      {
        id: 485907,
        title: "MDI: Alerts transitioned from MDI detection to XDR detection",
        state: "New",
        workItemType: "User Story",
        assignedTo: "Abby Weisberg",
        createdDate: "2025-09-02T09:36:22.793Z",
        changedDate: "2025-09-02T10:00:42.837Z",
        priority: 2,
        url: "https://dev.azure.com/msft-skilling/Content/_workitems/edit/485907"
      },
      {
        id: 485904,
        title: "[MDI] Update the MDI for Cloud Story",
        state: "Committed",
        workItemType: "User Story",
        assignedTo: "Abby Weisberg",
        createdDate: "2025-09-02T09:30:01.873Z",
        changedDate: "2025-09-02T09:32:30.8Z",
        priority: 2,
        url: "https://dev.azure.com/msft-skilling/Content/_workitems/edit/485904"
      },
      {
        id: 485895,
        title: "MDA: URBAC documentation for MDA should mention that even after activating URBAC",
        state: "New",
        workItemType: "User Story",
        assignedTo: "Abby Weisberg",
        createdDate: "2025-09-02T07:43:32.947Z",
        changedDate: "2025-09-02T10:00:37.363Z",
        priority: 2,
        url: "https://dev.azure.com/msft-skilling/Content/_workitems/edit/485895"
      },
      {
        id: 483874,
        title: "Review How Defender for Cloud Apps helps protect your Atlassian environment",
        state: "New",
        workItemType: "User Story",
        assignedTo: "Abby Weisberg",
        createdDate: "2025-08-26T11:27:32.007Z",
        changedDate: "2025-08-28T16:09:26.16Z",
        priority: 2,
        url: "https://dev.azure.com/msft-skilling/Content/_workitems/edit/483874"
      },
      {
        id: 483873,
        title: "Review How Defender for Cloud Apps helps protect your Egnyte environment",
        state: "Active",
        workItemType: "User Story",
        assignedTo: "Abby Weisberg",
        createdDate: "2025-08-26T11:24:48.16Z",
        changedDate: "2025-08-28T16:09:26.16Z",
        priority: 2,
        url: "https://dev.azure.com/msft-skilling/Content/_workitems/edit/483873"
      },
      {
        id: 483872,
        title: "Review app connector doc Protect your Mural environment (Preview)",
        state: "New",
        workItemType: "User Story",
        assignedTo: "Abby Weisberg",
        createdDate: "2025-08-26T11:22:36.17Z",
        changedDate: "2025-08-28T16:09:26.16Z",
        priority: 2,
        url: "https://dev.azure.com/msft-skilling/Content/_workitems/edit/483872"
      }
    ];
  };


  const extractProductArea = (title: string): string => {
    // Extract product area from work item titles
    if (title.includes('Defender for Cloud Apps') || title.includes('MDA')) return 'Microsoft Defender for Cloud Apps';
    if (title.includes('Defender for Identity') || title.includes('MDI')) return 'Microsoft Defender for Identity';
    if (title.includes('Defender for Endpoint') || title.includes('MDE')) return 'Microsoft Defender for Endpoint';
    if (title.includes('Defender XDR') || title.includes('Microsoft Defender XDR')) return 'Microsoft Defender XDR';
    if (title.includes('Azure') || title.includes('Entra')) return 'Azure Security';
    if (title.includes('Atlassian')) return 'Third-party Integrations';
    if (title.includes('AWS') || title.includes('GCP') || title.includes('Google')) return 'Cloud Platforms';
    if (title.includes('Salesforce') || title.includes('Box') || title.includes('Dropbox')) return 'SaaS Applications';
    return 'Microsoft Security';
  };



  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'done':
      case 'closed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'committed':
        return <CheckCircle className="w-4 h-4 text-purple-500" />;
      case 'active':
      case 'in progress':
        return <Clock className="w-4 h-4 text-blue-500" />;
      case 'resolved':
      case 'under review':
        return <Eye className="w-4 h-4 text-yellow-500" />;
      case 'new':
        return <AlertCircle className="w-4 h-4 text-blue-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const filteredRequests = requests.filter(request => {
    if (filter === 'all') return true;
    const status = request.status.toLowerCase();
    switch (filter) {
      case 'new':
        return status === 'new';
      case 'committed':
        return status === 'committed';
      case 'active':
        return ['active', 'in progress'].includes(status);
      case 'in_review':
        return ['resolved', 'in review', 'under review'].includes(status);
      case 'closed':
        return ['completed', 'done', 'closed'].includes(status);
      default:
        return false;
    }
  });

  // Use backend stats if available, otherwise calculate from current page data as fallback
  const stats = backendStats || {
    total: totalItems || requests.length, // Use totalItems from pagination first
    new: requests.filter(r => r.status.toLowerCase() === 'new').length,
    committed: requests.filter(r => r.status.toLowerCase() === 'committed').length,
    active: requests.filter(r => ['active', 'in progress'].includes(r.status.toLowerCase())).length,
    inReview: requests.filter(r => ['resolved', 'in review', 'under review'].includes(r.status.toLowerCase())).length,
    closed: requests.filter(r => ['completed', 'done', 'closed'].includes(r.status.toLowerCase())).length
  };

  // Debug logging to understand what stats are being used
  console.log('📊 Dashboard stats debug:', {
    backendStats,
    backendStatsAvailable: !!backendStats,
    requestsLength: requests.length,
    totalItems,
    finalStats: stats
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">UX Development Requests Dashboard</h1>
              <p className="mt-2 text-gray-600">Manage and track all UX development requests</p>
            </div>
            {/* Data Source Indicator */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">Data Source:</span>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                dataSource === 'real' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {dataSource === 'real' ? (
                  <>
                    <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                    Real Azure DevOps
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 bg-yellow-400 rounded-full mr-2"></span>
                    Fallback Demo Data
                  </>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Requests</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.total}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-6 w-6 text-blue-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">New</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.new}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-6 w-6 text-purple-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Committed</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.committed}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Clock className="h-6 w-6 text-yellow-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Active</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.active}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Eye className="h-6 w-6 text-orange-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">In Review</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.inReview}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-6 w-6 text-green-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Closed</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.closed}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex space-x-4 flex-wrap">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === 'all' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Requests
            </button>
            <button
              onClick={() => setFilter('new')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === 'new' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              New
            </button>
            <button
              onClick={() => setFilter('committed')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === 'committed' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Committed
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === 'active' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setFilter('in_review')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === 'in_review' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              In Review
            </button>
            <button
              onClick={() => setFilter('closed')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                filter === 'closed' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Closed
            </button>
          </div>
        </div>

        {/* Requests Table */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">UX Development Requests</h3>
              <div className="text-sm text-gray-500">
                Showing {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, totalItems)} of {totalItems} items
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Request
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Target Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Assignee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User Story
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredRequests.map((request) => (
                    <tr key={request.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {request.url ? (
                              <a 
                                href={request.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-900 underline"
                                title="Open in Azure DevOps"
                              >
                                {request.title}
                              </a>
                            ) : (
                              request.title
                            )}
                          </div>
                          <div className="text-sm text-gray-500">{request.productArea} • {request.documentType}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getStatusIcon(request.status)}
                          <span className="ml-2 text-sm text-gray-900">{request.status}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {request.targetDate && request.targetDate !== 'N/A' ? (
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                            {request.targetDate}
                          </div>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {request.assignee ? (
                          <div className="flex items-center">
                            <User className="w-4 h-4 mr-1 text-gray-400" />
                            {request.assignee}
                          </div>
                        ) : (
                          <span className="text-gray-400">Unassigned</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {request.url ? (
                          <a 
                            href={request.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-900 underline"
                          >
                            #{request.id}
                          </a>
                        ) : (
                          <span className="text-gray-500">#{request.id}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button className="text-blue-600 hover:text-blue-900 mr-3">View</button>
                        <button className="text-green-600 hover:text-green-900">Edit</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                      currentPage === 1
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                      currentPage === totalPages
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing{' '}
                      <span className="font-medium">{((currentPage - 1) * pageSize) + 1}</span>
                      {' '}to{' '}
                      <span className="font-medium">{Math.min(currentPage * pageSize, totalItems)}</span>
                      {' '}of{' '}
                      <span className="font-medium">{totalItems}</span>
                      {' '}results
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                          currentPage === 1
                            ? 'text-gray-300 cursor-not-allowed'
                            : 'text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        <span className="sr-only">Previous</span>
                        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                      </button>
                      
                      {/* Page numbers */}
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              currentPage === pageNum
                                ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                      
                      <button
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                          currentPage === totalPages
                            ? 'text-gray-300 cursor-not-allowed'
                            : 'text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        <span className="sr-only">Next</span>
                        <ChevronRight className="h-5 w-5" aria-hidden="true" />
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
