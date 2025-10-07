import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllAdmins, deleteAdmin, restoreAdmin, getAdminActivityLogs } from '../api/user';
import { useAuth } from '../components/AuthContext';

export default function AdminManagement() {
  const navigate = useNavigate();
  const { adminData: currentAdmin, isAuthenticated } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState("admins");
  
  // Activity logs state
  const [activityLogs, setActivityLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logsError, setLogsError] = useState("");

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: "asc",
  });

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/", { replace: true });
      return;
    }

    fetchAllAdmins();
  }, [isAuthenticated, navigate]);

  const fetchAllAdmins = async () => {
    try {
      if (!currentAdmin) {
        setError("No admin data found");
        return;
      }

      const result = await getAllAdmins(currentAdmin.role);
      console.log(result.data);

      if (result.success) {
        setAdmins(result.data);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError("Failed to load admin data");
      console.error("Admin fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchActivityLogs = async () => {
    if (currentAdmin?.role !== 'superadmin') {
      return;
    }
    
    try {
      setLoadingLogs(true);
      setLogsError("");
      
      const result = await getAdminActivityLogs(currentAdmin.role, {
        limit: 50,
        offset: 0
      });

      if (result.success) {
        setActivityLogs(result.data || []);
      } else {
        setLogsError(result.message || "Failed to fetch activity logs");
      }
    } catch (err) {
      setLogsError("Failed to load activity logs");
      console.error("Activity logs fetch error:", err);
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === "activity" && activityLogs.length === 0) {
      fetchActivityLogs();
    }
  };

  const handleAdminClick = (admin) => {
    setSelectedAdmin(admin);
    setShowDetailsModal(true);
  };

  const closeModal = () => {
    setShowDetailsModal(false);
    setSelectedAdmin(null);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleString();
  };

  const getRoleColor = (role) => {
    switch (role?.toLowerCase()) {
      case "super_admin":
        return "bg-gradient-to-r from-purple-500 to-pink-500 text-white border-purple-600 shadow-lg";
      case "admin":
        return "bg-gradient-to-r from-blue-500 to-indigo-600 text-white border-blue-600 shadow-md";
      case "viewer":
        return "bg-emerald-100 text-emerald-800 border-emerald-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  // Filter and sort admins
  const filteredAndSortedAdmins = () => {
    let filtered = admins.filter((admin) => {
      const matchesSearch =
        !searchTerm ||
        admin.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        admin.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        admin.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        admin.role?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesRole =
        roleFilter === "all" ||
        admin.role?.toLowerCase() === roleFilter.toLowerCase();
      const matchesDepartment =
        departmentFilter === "all" ||
        admin.department?.toLowerCase() === departmentFilter.toLowerCase();

      return matchesSearch && matchesRole && matchesDepartment;
    });

    // Sort the filtered results
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Handle special cases
        if (sortConfig.key === "lastLogin") {
          aValue = aValue ? new Date(aValue) : new Date(0);
          bValue = bValue ? new Date(bValue) : new Date(0);
        } else if (sortConfig.key === "fullName") {
          aValue = aValue || "";
          bValue = bValue || "";
        } else if (sortConfig.key === "role") {
          const roleOrder = { super_admin: 3, admin: 2, viewer: 1 };
          aValue = roleOrder[aValue?.toLowerCase()] || 0;
          bValue = roleOrder[bValue?.toLowerCase()] || 0;
        }

        if (aValue < bValue) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      });
    }

    return filtered;
  };

  // Handle sorting
  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  // Handle role filter change
  const handleRoleFilterChange = (e) => {
    setRoleFilter(e.target.value);
  };

  // Handle department filter change
  const handleDepartmentFilterChange = (e) => {
    setDepartmentFilter(e.target.value);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-slate-800 mx-auto"></div>
            <p className="mt-4 text-gray-600 font-medium">
              Loading admin data...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-white rounded-xl shadow-lg p-8 border border-red-200 max-w-md">
            <div className="text-red-500 mb-4">
              <svg
                className="w-12 h-12 mx-auto"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Error Loading Data
            </h3>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => navigate("/profile")}
              className="bg-slate-800 text-white px-6 py-2 rounded-lg hover:bg-slate-900 transition-colors font-medium"
            >
              Back to Profile
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Calculate statistics based on filtered results
  const filteredAdmins = filteredAndSortedAdmins();
  const totalAdmins = filteredAdmins.length;
  const activeAdmins = filteredAdmins.filter((admin) => admin.isActive).length;
  const superAdmins = filteredAdmins.filter(
    (admin) => admin.role?.toLowerCase() === "super_admin"
  ).length;
  const regularAdmins = filteredAdmins.filter(
    (admin) => admin.role?.toLowerCase() === "admin"
  ).length;
  const viewers = filteredAdmins.filter(
    (admin) => admin.role?.toLowerCase() === "viewer"
  ).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header Section */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                JanSetu Admin Management
              </h1>
              <p className="text-gray-600 mt-1">
                Manage and monitor administrative team members
                {(searchTerm ||
                  roleFilter !== "all" ||
                  departmentFilter !== "all") && (
                  <span className="ml-2 text-sm font-medium text-slate-600">
                    • {filteredAdmins.length} of {admins.length} results shown
                  </span>
                )}
              </p>
            </div>
            <div className="flex gap-4">
              <div className="bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-200">
                <div className="text-xs text-gray-500 uppercase tracking-wide">
                  Total
                </div>
                <div className="text-2xl font-bold text-gray-900">
                  {totalAdmins}
                </div>
              </div>
              <div className="bg-white rounded-xl px-4 py-3 shadow-sm border border-emerald-200">
                <div className="text-xs text-emerald-600 uppercase tracking-wide">
                  Active
                </div>
                <div className="text-2xl font-bold text-emerald-600">
                  {activeAdmins}
                </div>
              </div>
              <div className="bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-200">
                <div className="text-xs text-gray-600 uppercase tracking-wide">
                  Super Admins
                </div>
                <div className="text-2xl font-bold text-gray-600">
                  {superAdmins}
                </div>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search admins by name, email, department, or role..."
                    value={searchTerm}
                    onChange={handleSearchChange}
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
                  />
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                    🔍
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <select
                  value={roleFilter}
                  onChange={handleRoleFilterChange}
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white"
                >
                  <option value="all">All Roles</option>
                  <option value="super_admin">Super Admin</option>
                  <option value="admin">Admin</option>
                  <option value="viewer">Viewer</option>
                </select>
                <select
                  value={departmentFilter}
                  onChange={handleDepartmentFilterChange}
                  className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent bg-white"
                >
                  <option value="all">All Departments</option>
                  <option value="it">IT</option>
                  <option value="hr">HR</option>
                  <option value="finance">Finance</option>
                  <option value="operations">Operations</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Modern Tabs - Only show for Super Admin */}
        {currentAdmin?.role === 'superadmin' && (
          <div className="mb-8">
            <div className="card-modern">
              <div className="border-b border-white/20">
                <nav className="flex px-6">
                  <button
                    onClick={() => handleTabChange("admins")}
                    className={`flex-1 py-5 px-4 font-medium text-sm transition-all duration-200 relative ${
                      activeTab === "admins"
                        ? "text-indigo-600"
                        : "text-slate-500 hover:text-slate-700 hover:bg-white/30"
                    }`}
                  >
                    <div className="flex items-center justify-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                        activeTab === "admins"
                          ? "bg-indigo-100 text-indigo-600"
                          : "bg-slate-100 text-slate-500"
                      }`}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                        </svg>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold">Admin Management</div>
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                          activeTab === "admins"
                            ? "bg-indigo-100 text-indigo-700"
                            : "bg-slate-100 text-slate-600"
                        }`}>
                          {admins.length} admins
                        </div>
                      </div>
                    </div>
                    {activeTab === "admins" && (
                      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-12 h-0.5 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"></div>
                    )}
                  </button>

                  <button
                    onClick={() => handleTabChange("activity")}
                    className={`flex-1 py-5 px-4 font-medium text-sm transition-all duration-200 relative ${
                      activeTab === "activity"
                        ? "text-indigo-600"
                        : "text-slate-500 hover:text-slate-700 hover:bg-white/30"
                    }`}
                  >
                    <div className="flex items-center justify-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                        activeTab === "activity"
                          ? "bg-indigo-100 text-indigo-600"
                          : "bg-slate-100 text-slate-500"
                      }`}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold">Activity Logs</div>
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                          activeTab === "activity"
                            ? "bg-indigo-100 text-indigo-700"
                            : "bg-slate-100 text-slate-600"
                        }`}>
                          {activityLogs.length} activities
                        </div>
                      </div>
                    </div>
                    {activeTab === "activity" && (
                      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-12 h-0.5 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"></div>
                    )}
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === "admins" ? (
          <div>
            {/* Admin Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th
                        className="text-left px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                        onClick={() => handleSort("fullName")}
                      >
                        <div className="flex items-center gap-1">
                          Admin
                          {sortConfig.key === "fullName" && (
                            <span className="text-gray-400">
                              {sortConfig.direction === "asc" ? "↑" : "↓"}
                            </span>
                          )}
                        </div>
                      </th>
                      <th
                        className="text-left px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                        onClick={() => handleSort("role")}
                      >
                        <div className="flex items-center gap-1">
                          Role
                          {sortConfig.key === "role" && (
                            <span className="text-gray-400">
                              {sortConfig.direction === "asc" ? "↑" : "↓"}
                            </span>
                          )}
                        </div>
                      </th>
                      <th
                        className="text-left px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                        onClick={() => handleSort("department")}
                      >
                        <div className="flex items-center gap-1">
                          Department
                          {sortConfig.key === "department" && (
                            <span className="text-gray-400">
                              {sortConfig.direction === "asc" ? "↑" : "↓"}
                            </span>
                          )}
                        </div>
                      </th>
                      <th
                        className="text-left px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                        onClick={() => handleSort("lastLogin")}
                      >
                        <div className="flex items-center gap-1">
                          Last Login
                          {sortConfig.key === "lastLogin" && (
                            <span className="text-gray-400">
                              {sortConfig.direction === "asc" ? "↑" : "↓"}
                            </span>
                          )}
                        </div>
                      </th>
                      <th className="text-left px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="text-right px-6 py-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredAdmins.map((admin, index) => (
                      <tr
                        key={admin.id}
                        onClick={() => handleAdminClick(admin)}
                        className="hover:bg-gray-50 transition-colors cursor-pointer group"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-slate-600 to-slate-800 rounded-full flex items-center justify-center text-white font-semibold">
                              {admin.fullName?.charAt(0).toUpperCase() || "A"}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 group-hover:text-slate-600 transition-colors">
                                {admin.fullName}
                              </div>
                              <div className="text-sm text-gray-500">
                                {admin.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full border ${getRoleColor(
                              admin.role
                            )}`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${
                                admin.role?.toLowerCase() === "super_admin"
                                  ? "bg-gray-600"
                                  : admin.role?.toLowerCase() === "admin"
                                  ? "bg-slate-600"
                                  : "bg-emerald-600"
                              }`}
                            ></span>
                            {admin.role?.charAt(0).toUpperCase() +
                              admin.role?.slice(1) || "Viewer"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-900 capitalize">
                            {admin.department || "N/A"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-600">
                            {formatDate(admin.lastLogin)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-full ${
                              admin.isActive
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${
                                admin.isActive ? "bg-emerald-600" : "bg-red-600"
                              }`}
                            ></span>
                            {admin.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAdminClick(admin);
                            }}
                            className="bg-blue-700 text-white px-4 py-2 rounded-lg hover:bg-blue-900 transition-colors text-sm font-medium"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredAdmins.length === 0 && (
                <div className="text-center py-16">
                  <div className="text-gray-400 mb-4">
                    <svg
                      className="w-16 h-16 mx-auto"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {admins.length === 0
                      ? "No Admins Found"
                      : "No Results Match Your Search"}
                  </h3>
                  <p className="text-gray-600">
                    {admins.length === 0
                      ? "There are no administrators available to display."
                      : "Try adjusting your search terms or filters to find what you're looking for."}
                  </p>
                  {(searchTerm ||
                    roleFilter !== "all" ||
                    departmentFilter !== "all") && (
                    <button
                      onClick={() => {
                        setSearchTerm("");
                        setRoleFilter("all");
                        setDepartmentFilter("all");
                      }}
                      className="mt-4 bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-900 transition-colors text-sm font-medium"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Activity Logs Tab Content */
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Recent Admin Activity</h2>
                <button
                  onClick={fetchActivityLogs}
                  disabled={loadingLogs}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  {loadingLogs ? "Refreshing..." : "🔄 Refresh"}
                </button>
              </div>
              <p className="text-gray-600 text-sm mt-1">Monitor admin actions and system activities</p>
            </div>
            
            {logsError && (
              <div className="p-6 border-b border-gray-200">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <span className="text-red-600">❌</span>
                    <p className="text-red-800 font-medium">Error loading activity logs</p>
                  </div>
                  <p className="text-red-700 text-sm mt-1">{logsError}</p>
                </div>
              </div>
            )}

            {loadingLogs ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="text-gray-600 mt-2">Loading activity logs...</p>
              </div>
            ) : activityLogs.length > 0 ? (
              <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                {activityLogs.slice(0, 10).map((log) => (
                  <div key={log.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-sm">
                        📋
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 text-sm">
                              {log.adminName || 'Unknown Admin'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {log.adminEmail || 'No Email'}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(log.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          {log.action?.replace(/_/g, ' ')?.toUpperCase() || 'UNKNOWN ACTION'}
                          {log.description && ` - ${log.description}`}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📭</span>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No activity logs found</h3>
                <p className="text-gray-600">No admin activity logs are available at the moment.</p>
              </div>
            )}
            
            {activityLogs.length > 10 && (
              <div className="p-4 border-t border-gray-200 text-center">
                <button
                  onClick={() => window.open('/activity-logs', '_blank')}
                  className="text-indigo-600 hover:text-indigo-700 font-medium text-sm"
                >
                  View All Activity Logs →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Admin Details Modal */}
        {showDetailsModal && selectedAdmin && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-slate-700 to-slate-900 px-6 py-4 rounded-t-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="bg-white rounded-full p-3">
                        <svg
                          className="w-10 h-10 text-slate-700"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <div className="ml-4">
                        <h3 className="text-xl font-bold text-white">
                          {selectedAdmin.fullName}
                        </h3>
                        <p className="text-slate-200">{selectedAdmin.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={closeModal}
                      className="text-white hover:text-gray-200 transition"
                    >
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Modal Body */}
                <div className="px-6 py-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Personal Information */}
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">
                        Personal Information
                      </h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Full Name
                          </label>
                          <p className="mt-1 text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded">
                            {selectedAdmin.fullName}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Email Address
                          </label>
                          <p className="mt-1 text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded">
                            {selectedAdmin.email}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Department
                          </label>
                          <p className="mt-1 text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded">
                            {selectedAdmin.department}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Role
                          </label>
                          <span
                            className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full border ${getRoleColor(
                              selectedAdmin.role
                            )}`}
                          >
                            {selectedAdmin.role?.charAt(0).toUpperCase() +
                              selectedAdmin.role?.slice(1)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Account Information */}
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">
                        Account Information
                      </h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Admin ID
                          </label>
                          <p className="mt-1 text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded font-mono">
                            {selectedAdmin.id}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Account Status
                          </label>
                          <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                            selectedAdmin.isActive
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : "bg-red-100 text-red-800 border border-red-200"
                          }`}>
                            {selectedAdmin.isActive ? "Active" : "Inactive"}
                          </span>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Last Login
                          </label>
                          <p className="mt-1 text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded">
                            {formatDate(selectedAdmin.lastLogin)}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Account Created
                          </label>
                          <p className="mt-1 text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded">
                            {formatDate(selectedAdmin.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Media Section Placeholder */}
                  <div className="mt-8">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">
                      Media & Documents
                    </h4>
                    <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                      <svg
                        className="mx-auto h-12 w-12 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                        />
                      </svg>
                      <h3 className="mt-2 text-sm font-medium text-gray-900">
                        No media files
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Photos, videos, audio files, and documents will be
                        displayed here when available.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="bg-gray-50 px-6 py-4 rounded-b-md flex justify-end space-x-3">
                  <button
                    onClick={closeModal}
                    className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition"
                  >
                    Close
                  </button>
                  <button
                    className="bg-slate-800 text-white px-4 py-2 rounded hover:bg-slate-900 transition"
                    onClick={() =>
                      navigate(`/edit-admin/${selectedAdmin.id}`, {
                        state: { adminData: selectedAdmin },
                      })
                    }
                  >
                    Edit Admin
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}