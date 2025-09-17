import React, { useState, useEffect } from 'react';
import { ArrowRight, CheckCircle, Clock, Users, FileText, AlertCircle, Eye } from 'lucide-react';
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

interface Stats {
  total: number;
  new: number;
  active: number;
  committed: number;
  resolved: number;
  closed: number;
}

const HomePage = () => {
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    new: 0,
    active: 0,
    committed: 0,
    resolved: 0,
    closed: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const account = useAccount();

  useEffect(() => {
    const fetchWorkItems = async () => {
      if (!account?.username) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Try to fetch from API server with user email
        const response = await fetch(`/api/workitems?userEmail=${encodeURIComponent(account.username)}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log('🏠 HomePage API response:', data);
          
          const items = data.workItems || [];
          setWorkItems(items);
          
          // Use backend stats if available, otherwise calculate from items
          let finalStats;
          if (data.stats) {
            console.log('🏠 Using backend stats from API:', data.stats);
            finalStats = data.stats;
          } else {
            console.log('🏠 Backend stats not available, calculating from items');
            finalStats = {
              total: items.length,
              new: items.filter((item: WorkItem) => item.state.toLowerCase() === 'new').length,
              active: items.filter((item: WorkItem) => ['active', 'in progress'].includes(item.state.toLowerCase())).length,
              committed: items.filter((item: WorkItem) => item.state.toLowerCase() === 'committed').length,
              resolved: items.filter((item: WorkItem) => ['resolved', 'in review', 'under review'].includes(item.state.toLowerCase())).length,
              closed: items.filter((item: WorkItem) => ['completed', 'done', 'closed'].includes(item.state.toLowerCase())).length
            };
          }
          
          setStats(finalStats);
          console.log('🏠 Final stats set:', finalStats);
        } else {
          throw new Error(`API server returned status: ${response.status}`);
        }
      } catch (apiError) {
        console.error('Failed to fetch work items:', apiError);
        setError('Unable to load work items. Please ensure you are connected.');
        
        // Set default stats when API fails
        setStats({
          total: 0,
          new: 0,
          active: 0,
          committed: 0,
          resolved: 0,
          closed: 0
        });
      } finally {
        setLoading(false);
      }
    };

    fetchWorkItems();
  }, [account]);

  // Get recent work items (latest 3)
  const recentItems = workItems
    .sort((a, b) => new Date(b.changedDate).getTime() - new Date(a.changedDate).getTime())
    .slice(0, 3);

  const getStatusIcon = (state: string) => {
    switch (state.toLowerCase()) {
      case 'completed':
      case 'done':
      case 'closed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'committed':
        return <CheckCircle className="h-5 w-5 text-purple-600" />;
      case 'active':
      case 'in progress':
        return <Clock className="h-5 w-5 text-blue-600" />;
      case 'resolved':
      case 'under review':
        return <Eye className="h-5 w-5 text-orange-600" />;
      case 'new':
        return <AlertCircle className="h-5 w-5 text-blue-600" />;
      default:
        return <FileText className="h-5 w-5 text-gray-600" />;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffDays > 0) {
      return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    } else {
      return 'Recently';
    }
  };
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center py-12">
        <h1 className="text-4xl font-bold text-foreground mb-4">
          UX Development Request Management
        </h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
          Streamline your UX development workflow. Submit requests, track progress, 
          and collaborate with your team all in one place.
        </p>
        <div className="flex gap-4 justify-center">
          <a 
            href="/create" 
            className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Create New Request
            <ArrowRight className="ml-2 h-4 w-4" />
          </a>
          <a 
            href="/dashboard" 
            className="inline-flex items-center px-6 py-3 border border-border rounded-lg hover:bg-accent transition-colors"
          >
            View Dashboard
          </a>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-3 gap-8">
        <div className="text-center p-6 rounded-lg border bg-card">
          <FileText className="h-12 w-12 text-primary mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Easy Request Creation</h3>
          <p className="text-muted-foreground">
            Submit detailed UX development requests with all necessary information in one form.
          </p>
        </div>
        
        <div className="text-center p-6 rounded-lg border bg-card">
          <Clock className="h-12 w-12 text-primary mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Track Progress</h3>
          <p className="text-muted-foreground">
            Monitor the status of your requests from creation to completion.
          </p>
        </div>
        
        <div className="text-center p-6 rounded-lg border bg-card">
          <Users className="h-12 w-12 text-primary mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Team Collaboration</h3>
          <p className="text-muted-foreground">
            Assign tasks, add reviewers, and collaborate seamlessly with your team.
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="bg-muted/50 rounded-lg p-8">
        <h2 className="text-2xl font-semibold mb-6 text-center">
          {account?.username ? `Your Dashboard Overview` : 'Please Sign In to View Your Data'}
        </h2>
        {loading ? (
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading your work items...</p>
          </div>
        ) : error ? (
          <div className="text-center text-red-600">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p>{error}</p>
          </div>
        ) : !account?.username ? (
          <div className="text-center text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2" />
            <p>Sign in with your Microsoft account to view your work items and dashboard statistics.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">{stats.active}</div>
              <div className="text-sm text-muted-foreground">Active Requests</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">{stats.closed}</div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600 mb-2">{stats.resolved}</div>
              <div className="text-sm text-muted-foreground">In Review</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">{stats.committed}</div>
              <div className="text-sm text-muted-foreground">Committed</div>
            </div>
          </div>
        )}
        {account?.username && !loading && !error && (
          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">
              Total work items: <span className="font-semibold">{stats.total}</span> | 
              New: <span className="font-semibold">{stats.new}</span>
            </p>
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Recent Activity</h2>
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading recent activity...</p>
          </div>
        ) : !account?.username ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2" />
            <p>Sign in to view your recent work item activity.</p>
          </div>
        ) : recentItems.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-8 w-8 mx-auto mb-2" />
            <p>No recent activity found. Create your first work item to get started!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentItems.map((item) => (
              <div key={item.id} className="flex items-center p-4 border rounded-lg bg-card">
                {getStatusIcon(item.state)}
                <div className="flex-1 ml-3">
                  <div className="font-medium">{item.title}</div>
                  <div className="text-sm text-muted-foreground">
                    {item.state} • Assigned to {item.assignedTo || 'Unassigned'} • {formatTimeAgo(item.changedDate)}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  #{item.id}
                </div>
              </div>
            ))}
            {recentItems.length > 0 && (
              <div className="text-center pt-4">
                <a 
                  href="/dashboard" 
                  className="text-primary hover:text-primary/80 text-sm font-medium"
                >
                  View all work items →
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default HomePage
