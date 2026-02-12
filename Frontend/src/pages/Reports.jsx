import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getAdminReports } from "../api/user";
import { useAuth } from "../components/AuthContext";
import { detectFraud, getFraudBadgeStyle } from "../utils/fraudDetection";

export default function Dashboard() {
  const navigate = useNavigate();
  const { adminData, isAuthenticated } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [lastScrollPosition, setLastScrollPosition] = useState(0);
  const [filters] = useState({
    isResolved: undefined,
    category: "",
    priority: "",
    department: "",
    limit: 50,
    offset: 0
  });

  // Fetch reports function - defined before useEffects
  const fetchReports = useCallback(async () => {
    if (!adminData?.id) {
      return;
    }
    
    try {
      setLoading(true);
      const result = await getAdminReports(adminData.id, filters);

      if (result.success) {
        setReports(result.reports || result.data || []);
        setError("");
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError("Failed to load reports");
      console.error("Reports fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [adminData, filters]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/", { replace: true });
      return;
    }

    if (adminData) {
      fetchReports();
    }
  }, [isAuthenticated, adminData, fetchReports, navigate]);

  // Restore state from sessionStorage on mount
  useEffect(() => {
    const savedState = sessionStorage.getItem('reportsPageState');
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        setSearchQuery(state.searchQuery || "");
        setStatusFilter(state.statusFilter || "all");
        setSortBy(state.sortBy || "createdAt");
        setSortOrder(state.sortOrder || "desc");
        setLastScrollPosition(state.scrollPosition || 0);
        sessionStorage.removeItem('reportsPageState');
      } catch (err) {
        console.error('Error restoring state:', err);
      }
    }
  }, []);

  // Handle page visibility and refresh flag with sessionStorage
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && adminData) {
        // Check if we should refresh the reports
        const shouldRefresh = sessionStorage.getItem('shouldRefreshReports');
        if (shouldRefresh === 'true') {
          sessionStorage.removeItem('shouldRefreshReports');
          setRefreshTrigger(prev => prev + 1);
        }
      }
    };

    // Also check immediately when component mounts/becomes visible
    if (adminData) {
      const shouldRefresh = sessionStorage.getItem('shouldRefreshReports');
      if (shouldRefresh === 'true') {
        sessionStorage.removeItem('shouldRefreshReports');
        setRefreshTrigger(prev => prev + 1);
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [adminData]);

  // State-based refresh trigger
  useEffect(() => {
    if (refreshTrigger > 0 && adminData) {
      fetchReports();
    }
  }, [refreshTrigger, adminData, fetchReports]);

  // Restore scroll position after data loads
  useEffect(() => {
    if (!loading && lastScrollPosition > 0) {
      setTimeout(() => {
        window.scrollTo(0, lastScrollPosition);
        setLastScrollPosition(0);
      }, 100);
    }
  }, [loading, lastScrollPosition]);

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffHours < 1) return "Just now";
    if (diffHours < 24) return `${Math.floor(diffHours)}h ago`;
    if (diffDays < 7) return `${Math.floor(diffDays)}d ago`;
    return date.toLocaleDateString();
  };

  const getPriorityBadge = (priority) => {
    const p = (priority || '').toLowerCase();
    const badges = {
      critical: { bg: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-500', label: 'Critical' },
      high: { bg: 'bg-orange-100', text: 'text-orange-800', dot: 'bg-orange-500', label: 'High' },
      medium: { bg: 'bg-yellow-100', text: 'text-yellow-800', dot: 'bg-yellow-500', label: 'Medium' },
      low: { bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500', label: 'Low' }
    };
    const badge = badges[p] || { bg: 'bg-gray-100', text: 'text-gray-800', dot: 'bg-gray-500', label: 'N/A' };
    
    return (
      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${badge.bg} ${badge.text}`}>
        <div className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}></div>
        {badge.label}
      </div>
    );
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { bg: 'bg-orange-100', text: 'text-orange-800', dot: 'bg-orange-500 animate-pulse', label: 'Pending' },
      assigned: { bg: 'bg-purple-100', text: 'text-purple-800', dot: 'bg-purple-500', label: 'Assigned' },
      in_progress: { bg: 'bg-blue-100', text: 'text-blue-800', dot: 'bg-blue-500', label: 'In Progress' },
      resolved: { bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500', label: 'Completed' },
      rejected: { bg: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-500', label: 'Rejected' },
    };

    const badge = statusConfig[status?.toLowerCase()] || statusConfig.pending;

    return (
      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${badge.bg} ${badge.text}`}>
        <div className={`w-1.5 h-1.5 rounded-full ${badge.dot}`}></div>
        {badge.label}
      </div>
    );
  };

  const getFraudBadge = (report) => {
    // Detect fraud using report data and social stats if available
    const fraudAnalysis = detectFraud(report, report.socialStats);
    
    if (!fraudAnalysis.isFraud && fraudAnalysis.score < 15) {
      return null; // No badge if no fraud detected
    }

    const style = getFraudBadgeStyle(fraudAnalysis.severity);

    return (
      <div 
        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-bold whitespace-nowrap border ${style.bg} ${style.text} ${style.border}`}
        title={`Fraud Score: ${fraudAnalysis.score}\n${fraudAnalysis.reasons.join('\n')}`}
      >
        <div className={`w-1.5 h-1.5 rounded-full ${style.dot}`}></div>
        <span>{style.icon} {style.label}</span>
      </div>
    );
  };

  const filteredAndSortedReports = useMemo(() => {
    let filtered = reports.filter(report => {
      const matchesSearch = !searchQuery || 
        report.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.userName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.category?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || 
        (statusFilter === "pending" && !report.isResolved) ||
        (statusFilter === "resolved" && report.isResolved);
      
      return matchesSearch && matchesStatus;
    });

    return filtered.sort((a, b) => {
      let aVal = a[sortBy];
      let bVal = b[sortBy];
      
      if (sortBy === 'createdAt') {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      }
      
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      
      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
  }, [reports, searchQuery, statusFilter, sortBy, sortOrder]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (field) => {
    if (sortBy !== field) return '↕️';
    return sortOrder === 'asc' ? '↗️' : '↘️';
  };

  // Stats for the header
  const totalReports = reports.length;
  const pendingReports = reports.filter(r => !r.isResolved).length;
  const resolvedReports = reports.filter(r => r.isResolved).length;


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading reports...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
          <button
            onClick={() => navigate("/profile")}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Back to Profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 py-0">
        {/* Compact Header with Inline Stats */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Reports Dashboard</h1>
            </div>
            <div className="flex gap-3 items-center">
              {/* Refresh Button */}
              <button
                onClick={() => setRefreshTrigger(prev => prev + 1)}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Refresh reports"
              >
                <span className={`text-xs ${loading ? 'animate-spin' : ''}`}>🔄</span>
                {loading ? 'Refreshing...' : 'Refresh'}
              </button>
              <div className="text-center">
                <div className="text-xs text-slate-500">Total</div>
                <div className="font-bold text-slate-900">{totalReports}</div>
              </div>
              <div className="text-center border-l border-gray-300 pl-3">
                <div className="text-xs text-orange-600">Pending</div>
                <div className="font-bold text-orange-600">{pendingReports}</div>
              </div>
              <div className="text-center border-l border-gray-300 pl-3">
                <div className="text-xs text-green-600">Resolved</div>
                <div className="font-bold text-green-600">{resolvedReports}</div>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-200">
            <div className="flex flex-col lg:flex-row gap-3">
              <div className="flex-1">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search reports by title, description, user, or category..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400">
                    🔍
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('title')}
                      className="flex items-center gap-2 hover:text-slate-900 transition-colors"
                    >
                      Report {getSortIcon('title')}
                    </button>
                  </th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Reporter
                  </th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('priority')}
                      className="flex items-center gap-2 hover:text-slate-900 transition-colors"
                    >
                      Priority {getSortIcon('priority')}
                    </button>
                  </th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Fraud Detection
                  </th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('createdAt')}
                      className="flex items-center gap-2 hover:text-slate-900 transition-colors"
                    >
                      Created {getSortIcon('createdAt')}
                    </button>
                  </th>
                  <th className="text-right px-4 py-2 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAndSortedReports.map((report, index) => (
                  <tr 
                    key={report.id}
                    className="hover:bg-slate-50 transition-colors group"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-3">
                        <div>
                          <h3 className="font-medium text-sm text-slate-900 group-hover:text-blue-600 transition-colors">
                            {report.title}
                          </h3>
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                            {report.description || 'No description provided'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-slate-900">
                        {report.userName || 'Anonymous'}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        ID: {report.id.slice(0, 8)}...
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-slate-600 capitalize">
                        {report.category || 'Other'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {getPriorityBadge(report.priority)}
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(report.status)}
                    </td>
                    <td className="px-4 py-3">
                      {getFraudBadge(report)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-slate-600">
                        {formatDate(report.createdAt)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => navigate(`/report/${report.id}`)}
                        className="inline-flex items-center gap-1.5 px-2 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-all transform hover:scale-105"
                      >
                        View →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredAndSortedReports.length === 0 && (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">📋</div>
                <h3 className="text-lg font-medium text-slate-900 mb-2">No reports found</h3>
                <p className="text-slate-500">
                  {searchQuery ? 
                    `No reports match your search "${searchQuery}"` : 
                    statusFilter === "all" ? 
                      "There are no reports available to display." : 
                      `No ${statusFilter} reports found.`
                  }
                </p>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Clear search
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Results Summary */}
        {filteredAndSortedReports.length > 0 && (
          <div className="mt-6 text-center text-sm text-slate-500">
            Showing {filteredAndSortedReports.length} of {totalReports} reports
          </div>
        )}
      </div>
    </div>
  );
}
