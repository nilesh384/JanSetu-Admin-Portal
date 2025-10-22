import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAdminActivityLogs, getAllAdmins } from '../api/user';
import { useAuth } from '../components/AuthContext';

export default function ActivityLogs() {
  const navigate = useNavigate();
  const { adminData: currentAdmin, isAuthenticated } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [admins, setAdmins] = useState([]);
  
  // Filter and pagination states
  const [selectedAdminId, setSelectedAdminId] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const logsPerPage = 10;

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/", { replace: true });
      return;
    }

    // Check if user is Super Admin - handle different role formats
    const userRole = currentAdmin?.role?.toLowerCase();
    const isSuperAdmin = userRole === 'superadmin' || userRole === 'super_admin' || userRole === 'super admin';
    
    console.log("ActivityLogs - Current admin role:", currentAdmin?.role);
    console.log("ActivityLogs - Is Super Admin:", isSuperAdmin);
    
    if (!isSuperAdmin) {
      navigate("/dashboard", { replace: true });
      return;
    }

    fetchAdmins();
    fetchActivityLogs();
  }, [isAuthenticated, currentAdmin, navigate]);

  useEffect(() => {
    const userRole = currentAdmin?.role?.toLowerCase();
    const isSuperAdmin = userRole === 'superadmin' || userRole === 'super_admin' || userRole === 'super admin';
    
    if (isSuperAdmin) {
      fetchActivityLogs();
    }
  }, [selectedAdminId, currentPage]);

  const fetchAdmins = async () => {
    try {
      const result = await getAllAdmins(currentAdmin?.role);
      if (result.success) {
        setAdmins(result.data);
      }
    } catch (err) {
      console.error("Failed to fetch admins:", err);
    }
  };

  const fetchActivityLogs = async () => {
    try {
      setLoading(true);
      const filters = {
        limit: logsPerPage,
        offset: (currentPage - 1) * logsPerPage
      };
      
      if (selectedAdminId) {
        filters.adminId = selectedAdminId;
      }

      const result = await getAdminActivityLogs(currentAdmin?.role, filters);

      if (result.success) {
        const fetchedLogs = result.data || [];
        setLogs(fetchedLogs);
        
        if (result.pagination) {
          const calculatedTotalPages = Math.ceil(result.pagination.total / logsPerPage);
          setTotalPages(calculatedTotalPages);
          setHasMore(result.pagination.hasMore || false);
          
          // If we're on a page that has no data and it's not page 1, go back to page 1
          if (fetchedLogs.length === 0 && currentPage > 1) {
            setCurrentPage(1);
          }
        } else {
          // Fallback: calculate based on received data
          const calculatedTotalPages = Math.ceil(fetchedLogs.length / logsPerPage);
          setTotalPages(Math.max(1, calculatedTotalPages));
        }
        setError("");
      } else {
        setError(result.message || "Failed to fetch activity logs");
      }
    } catch (err) {
      setError("Failed to load activity logs");
      console.error("Activity logs fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action) => {
    const icons = {
      'login': '🔑',
      'logout': '🚪',
      'create_admin': '👤➕',
      'update_admin': '👤✏️',
      'delete_admin': '👤🗑️',
      'restore_admin': '👤♻️',
      'resolve_report': '✅',
      'create_report': '📝',
      'update_report': '📝✏️',
      'view_report': '👁️',
      'export_data': '📤',
      'system_config': '⚙️'
    };
    return icons[action] || '📋';
  };

  const getActionColor = (action) => {
    const colors = {
      'login': 'text-green-600 bg-green-50',
      'logout': 'text-gray-600 bg-gray-50',
      'create_admin': 'text-blue-600 bg-blue-50',
      'update_admin': 'text-yellow-600 bg-yellow-50',
      'delete_admin': 'text-red-600 bg-red-50',
      'restore_admin': 'text-green-600 bg-green-50',
      'resolve_report': 'text-green-600 bg-green-50',
      'create_report': 'text-blue-600 bg-blue-50',
      'update_report': 'text-yellow-600 bg-yellow-50',
      'view_report': 'text-indigo-600 bg-indigo-50',
      'export_data': 'text-purple-600 bg-purple-50',
      'system_config': 'text-orange-600 bg-orange-50'
    };
    return colors[action] || 'text-gray-600 bg-gray-50';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No date available';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';
    
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minutes ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)} hours ago`;
    } else if (diffInMinutes < 10080) {
      return `${Math.floor(diffInMinutes / 1440)} days ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleAdminFilter = (adminId) => {
    setSelectedAdminId(adminId);
    setCurrentPage(1);
  };

  const handleRefresh = () => {
    fetchActivityLogs();
  };

  if (loading && logs.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-indigo-600 mx-auto"></div>
            <div className="absolute inset-0 rounded-full h-16 w-16 border-4 border-transparent border-t-indigo-300 mx-auto animate-ping"></div>
          </div>
          <p className="mt-4 text-slate-600 font-medium">Loading activity logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-slate-100 -mt-24">
      <div className="max-w-9xl mx-auto px-6 py-4">
        {/* Header Section */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Admin Activity Logs
              </h1>
              <p className="text-gray-600 mt-1">
                Monitor admin actions and system activities in real-time
                <span className="ml-2 text-sm font-medium text-slate-600">
                  • {logs.length} activities tracked
                </span>
              </p>
            </div>
            <div className="flex gap-4">
              <div className="bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-200">
                <div className="text-xs text-gray-500 uppercase tracking-wide">
                  Total Logs
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {logs.length}
                </div>
              </div>
              <div className="bg-white rounded-xl px-4 py-3 shadow-sm border border-emerald-200">
                <div className="text-xs text-emerald-600 uppercase tracking-wide">
                  Today
                </div>
                <div className="text-2xl font-bold text-emerald-600">
                  {logs.filter(log => {
                    const logDate = new Date(log.timestamp);
                    const today = new Date();
                    return logDate.toDateString() === today.toDateString();
                  }).length}
                </div>
              </div>
              <div className="flex items-center">
                <button
                  onClick={handleRefresh}
                  disabled={loading}
                  className="bg-slate-600 text-white px-4 py-3 rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Refreshing...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Refresh
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="space-y-8">
          {/* Modern Filters */}
          <div className="card-modern p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Activity Filters</h2>
                <p className="text-slate-600">Filter and search through admin activities</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Filter by Admin</label>
                <select
                  value={selectedAdminId}
                  onChange={(e) => handleAdminFilter(e.target.value)}
                  className="select-modern w-full"
                >
                  <option value="">All Admins</option>
                  {admins.map((admin) => (
                    <option key={admin.id} value={admin.id}>
                      {admin.fullName} ({admin.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Total Activities</label>
                <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200 rounded-xl">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span className="text-slate-900 font-semibold">
                      {logs.length} activities
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Current Page</label>
                <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200 rounded-xl">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <span className="text-slate-900 font-semibold">
                      {currentPage} of {totalPages}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Quick Actions</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedAdminId("")}
                    className="btn-secondary flex-1 text-sm"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Activity Logs */}
          <div className="card-modern">
            <div className="p-8 border-b border-white/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">Recent Activities</h2>
                    <p className="text-slate-600">Real-time admin activity timeline</p>
                  </div>
                </div>
                <div className="text-sm text-slate-500">
                  {logs.length} activities displayed
                </div>
              </div>
            </div>

            {error && (
              <div className="p-6 border-b border-red-200">
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-red-800 font-semibold">Error loading activity logs</p>
                      <p className="text-red-700 text-sm mt-1">{error}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {logs.length > 0 ? (
              <div className="space-y-6">
                {logs.map((log) => (
                  <div key={log.id} className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-white/40 hover:bg-white/80 hover:shadow-md transition-all duration-200 group">
                    <div className="flex items-start gap-6">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-lg transition-transform group-hover:scale-110 ${getActionColor(log.action)}`}>
                        {getActionIcon(log.action)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-3">
                              <h3 className="font-semibold text-slate-900 text-lg">
                                {log.adminName || 'Unknown Admin'}
                              </h3>
                              <span className="text-sm text-slate-500">
                                {log.adminEmail || 'No Email'}
                              </span>
                            </div>
                            <span className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full ${
                              log.adminRole === 'superadmin'
                                ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                : log.adminRole === 'admin'
                                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                : 'bg-gray-100 text-gray-800 border border-gray-200'
                            }`}>
                              {log.adminRole || 'Unknown Role'}
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-slate-900">
                              {formatDate(log.createdAt)}
                            </div>
                            <div className="text-xs text-slate-500 mt-1">
                              {new Date(log.createdAt).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit'
                              })}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-slate-700">Action:</span>
                            <span className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl shadow-sm ${getActionColor(log.action)}`}>
                              {getActionIcon(log.action)} {log.action?.replace(/_/g, ' ')?.toUpperCase() || 'UNKNOWN'}
                            </span>
                          </div>

                          {log.description && (
                            <div className="bg-white/50 rounded-xl p-4 border border-white/20">
                              <p className="text-slate-700 leading-relaxed">
                                {log.description}
                              </p>
                            </div>
                          )}

                          {log.details && (
                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                              <div className="flex items-center gap-2 mb-2">
                                <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Additional Details</span>
                              </div>
                              <pre className="text-xs text-slate-700 whitespace-pre-wrap break-words font-mono">
                                {typeof log.details === 'object' ? JSON.stringify(log.details, null, 2) : log.details}
                              </pre>
                            </div>
                          )}

                          {log.ipAddress && (
                            <div className="flex items-center gap-6 text-xs text-slate-500 bg-slate-50 rounded-lg px-4 py-2">
                              <div className="flex items-center gap-2">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                <span>IP: {log.ipAddress}</span>
                              </div>
                              {log.userAgent && (
                                <div className="flex items-center gap-2">
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                  </svg>
                                  <span className="truncate max-w-md">Browser: {log.userAgent}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : !loading ? (
              <div className="p-16 text-center">
                <div className="w-20 h-20 bg-gradient-to-r from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <span className="text-3xl">📭</span>
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">No activity logs found</h3>
                <p className="text-slate-600 max-w-md mx-auto">
                  {selectedAdminId
                    ? "No activity logs found for the selected admin."
                    : "No admin activity logs are available at the moment."
                  }
                </p>
                <div className="mt-6">
                  <button
                    onClick={handleRefresh}
                    className="btn-primary"
                  >
                    Refresh Data
                  </button>
                </div>
              </div>
            ) : null}            {/* Modern Pagination */}
            {totalPages > 1 && (
              <div className="p-8 border-t border-white/20">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-slate-600 bg-slate-50 px-4 py-2 rounded-lg">
                    Showing page <span className="font-semibold text-slate-900">{currentPage}</span> of <span className="font-semibold text-slate-900">{totalPages}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1 || loading}
                      className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Previous
                    </button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
                        const isActive = page === currentPage;
                        return (
                          <button
                            key={page}
                            onClick={() => handlePageChange(page)}
                            disabled={loading}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                              isActive
                                ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg transform scale-105'
                                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-indigo-300'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {page}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages || loading}
                      className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  </div>
  );
}