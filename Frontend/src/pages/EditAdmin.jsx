import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { updateAdmin, getAdminProfile } from '../api/user';
import { useAuth } from '../components/AuthContext';

function EditAdmin() {
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams();
  const { adminData, isAuthenticated } = useAuth();
  
  // Get admin data from location state or fetch it
  const initialAdminData = location.state?.adminData;
  
  const [admin, setAdmin] = useState(initialAdminData || null);
  const [loading, setLoading] = useState(!initialAdminData);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Form data
  const [formData, setFormData] = useState({
    fullName: '',
    department: '',
    role: '',
    isActive: true
  });

  // Check authentication and permissions
  useEffect(() => {
    if (!isAuthenticated || !adminData) {
      navigate('/', { replace: true });
      return;
    }

    if (adminData.role?.toLowerCase() !== 'super_admin') {
      setError('Only super admins can edit admin details');
      return;
    }
  }, [isAuthenticated, adminData, navigate]);

  // Fetch admin data if not provided
  useEffect(() => {
    const fetchAdminData = async () => {
      if (!initialAdminData && id && adminData) {
        try {
          setLoading(true);
          const result = await getAdminProfile(id);
          
          if (result.success) {
            setAdmin(result.data);
            setFormData({
              fullName: result.data.fullName || '',
              department: result.data.department || '',
              role: result.data.role || '',
              isActive: result.data.isActive !== false
            });
          } else {
            setError(result.message || 'Failed to fetch admin details');
          }
        } catch (err) {
          setError('Failed to fetch admin details');
        } finally {
          setLoading(false);
        }
      } else if (initialAdminData) {
        setAdmin(initialAdminData);
        setFormData({
          fullName: initialAdminData.fullName || '',
          department: initialAdminData.department || '',
          role: initialAdminData.role || '',
          isActive: initialAdminData.isActive !== false
        });
        setLoading(false);
      }
    };

    fetchAdminData();
  }, [id, initialAdminData, adminData]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!adminData || adminData.role?.toLowerCase() !== 'super_admin') {
      setError('Only super admins can update admin details');
      return;
    }

    // Validation
    if (!formData.fullName.trim()) {
      setError('Full name is required');
      return;
    }

    if (!formData.department.trim()) {
      setError('Department is required');
      return;
    }

    if (!formData.role) {
      setError('Role is required');
      return;
    }

    try {
      setSaving(true);
      setError('');
      
      const updates = {
        fullName: formData.fullName.trim(),
        department: formData.department.trim(),
        role: formData.role,
        isActive: formData.isActive
      };

      const result = await updateAdmin(id, adminData.role, updates);
      
      if (result.success) {
        setSuccess('Admin updated successfully!');
        setAdmin(result.data);
        
        // Navigate back after a delay
        setTimeout(() => {
          navigate('/admin-management', { 
            state: { message: 'Admin updated successfully!' }
          });
        }, 2000);
      } else {
        setError(result.message || 'Failed to update admin');
      }
    } catch (err) {
      setError('Failed to update admin. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate('/admin-management');
  };

  if (!id) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-slate-50 to-blue-50 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <svg className="w-12 h-12 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-1.960-1.333-2.730 0L3.732 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-3xl font-bold text-gray-900 mb-3">Admin Not Found</h3>
          <p className="text-gray-600 mb-8 leading-relaxed">The admin ID is missing or invalid. Please check the URL and try again.</p>
          <button
            onClick={() => navigate('/admin-management')}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-3.5 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-semibold shadow-lg shadow-blue-500/30 hover:shadow-xl hover:-translate-y-0.5 inline-flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Admin Management
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-slate-50 to-blue-50 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="relative mb-8">
            <div className="w-20 h-20 border-4 border-blue-200 rounded-full mx-auto"></div>
            <div className="absolute top-0 left-1/2 -ml-10 w-20 h-20 border-4 border-t-blue-600 rounded-full animate-spin"></div>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Loading Admin Details</h3>
          <p className="text-gray-600">Please wait while we fetch the information...</p>
          <div className="flex items-center justify-center gap-1 mt-4">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !admin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-slate-50 to-blue-50 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg animate-pulse">
            <svg className="w-12 h-12 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-1.960-1.333-2.730 0L3.732 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-3xl font-bold text-gray-900 mb-3">Oops! Something Went Wrong</h3>
          <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 mb-8">
            <p className="text-red-800 text-sm font-medium">{error}</p>
          </div>
          <button
            onClick={() => navigate('/admin-management')}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-3.5 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 font-semibold shadow-lg shadow-blue-500/30 hover:shadow-xl hover:-translate-y-0.5 inline-flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Admin Management
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-slate-50 to-blue-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Header Section with Breadcrumb */}
        <div className="mb-8">
          <button
            onClick={handleCancel}
            className="group flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 transition-all duration-200 font-medium"
          >
            <svg className="w-5 h-5 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Admin Management
          </button>
          
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Edit Admin Profile</h1>
              <p className="text-gray-600 mt-1">Update administrator details and manage permissions</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Admin Info Card - Left Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Profile Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-300">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-8 text-center">
                <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-3 border-4 border-white/30">
                  <span className="text-3xl font-bold text-white">
                    {admin?.fullName?.charAt(0).toUpperCase() || 'A'}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white">{admin?.fullName || 'Loading...'}</h3>
                <p className="text-blue-100 text-sm mt-1">{admin?.email || ''}</p>
              </div>
              
              {admin && (
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                    <span className="text-sm font-medium text-gray-500">Account Status</span>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                      admin.isActive !== false 
                        ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-600/20' 
                        : 'bg-red-100 text-red-700 ring-1 ring-red-600/20'
                    }`}>
                      <span className={`w-2 h-2 rounded-full ${
                        admin.isActive !== false ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
                      }`}></span>
                      {admin.isActive !== false ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Admin ID</p>
                        <p className="font-mono text-sm text-gray-900 break-all mt-1">{admin.id}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Created</p>
                        <p className="text-sm text-gray-900 mt-1">
                          {admin.createdAt ? new Date(admin.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          }) : 'N/A'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                        <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Last Login</p>
                        <p className="text-sm text-gray-900 mt-1">
                          {admin.lastLogin ? new Date(admin.lastLogin).toLocaleString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : 'Never logged in'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Info Card */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl shadow-sm border border-amber-200 p-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-semibold text-amber-900 mb-1">Important Note</h4>
                  <p className="text-sm text-amber-800 leading-relaxed">
                    Changes will take effect immediately. Make sure to verify all information before updating.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Edit Form - Main Content */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-300">
              {/* Form Header */}
              <div className="border-b border-gray-200 px-8 py-6 bg-gradient-to-r from-gray-50 to-slate-50">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Edit Administrator Details
                </h2>
                <p className="text-sm text-gray-600 mt-1">Required fields are marked with an asterisk (*)</p>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                {/* Full Name */}
                <div className="group">
                  <label htmlFor="fullName" className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Full Name *
                  </label>
                  <input
                    type="text"
                    id="fullName"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3.5 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-all duration-200 outline-none"
                    placeholder="e.g., John Doe"
                  />
                </div>

                {/* Department */}
                <div className="group">
                  <label htmlFor="department" className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    Department *
                  </label>
                  <input
                    type="text"
                    id="department"
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3.5 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-all duration-200 outline-none"
                    placeholder="e.g., IT Department"
                  />
                </div>

                {/* Role */}
                <div className="group">
                  <label htmlFor="role" className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Role *
                  </label>
                  <div className="relative">
                    <select
                      id="role"
                      name="role"
                      value={formData.role}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3.5 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-all duration-200 outline-none appearance-none cursor-pointer"
                    >
                      <option value="">Select a role</option>
                      <option value="viewer" className="text-emerald-700 bg-emerald-50">👁️ Viewer - Read-only access</option>
                      <option value="admin" className="text-blue-700 bg-blue-50 font-semibold">⚙️ Admin - Manage reports and users</option>
                      <option value="super_admin" className="text-purple-700 bg-purple-50 font-bold">👑 Super Admin - Full system access</option>
                    </select>
                    {/* Custom colored role indicator */}
                    {formData.role && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                        <div className={`px-2 py-1 rounded-md text-xs font-medium ${
                          formData.role === 'super_admin'
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                            : formData.role === 'admin'
                            ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {formData.role === 'super_admin' ? '👑' : formData.role === 'admin' ? '⚙️' : '👁️'}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Active Status Toggle */}
                <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                  <div 
                    onClick={() => setFormData(prev => ({ ...prev, isActive: !prev.isActive }))}
                    className="flex items-center justify-between cursor-pointer group"
                  >
                    <div className="flex items-start gap-3">
                      <div>
                        <span className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                          Active Administrator Account
                        </span>
                        <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                          Toggle to activate or deactivate this administrator's system access
                        </p>
                      </div>
                    </div>
                    <div className={`w-14 h-7 rounded-full transition-all duration-300 flex-shrink-0 ${formData.isActive ? 'bg-emerald-500' : 'bg-gray-300'} hover:shadow-md`}>
                      <div className={`w-6 h-6 bg-white rounded-full shadow-lg transform transition-all duration-300 mt-0.5 ${formData.isActive ? 'translate-x-7 ml-0.5' : 'translate-x-0.5'}`}></div>
                    </div>
                  </div>
                </div>

                {/* Error and Success Messages */}
                {error && (
                  <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 animate-shake">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <h4 className="text-sm font-semibold text-red-800">Error</h4>
                        <p className="text-sm text-red-700 mt-0.5">{error}</p>
                      </div>
                    </div>
                  </div>
                )}

                {success && (
                  <div className="bg-emerald-50 border-l-4 border-emerald-500 rounded-lg p-4 animate-slideIn">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <h4 className="text-sm font-semibold text-emerald-800">Success</h4>
                        <p className="text-sm text-emerald-700 mt-0.5">{success}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Form Actions */}
                <div className="flex gap-4 pt-6 border-t border-gray-200">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3.5 px-6 rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:-translate-y-0.5 flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                        <span>Updating...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                  
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={saving}
                    className="px-8 py-3.5 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold hover:-translate-y-0.5"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EditAdmin;
