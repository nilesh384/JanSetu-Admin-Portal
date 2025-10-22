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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h3 className="text-3xl font-bold text-red-500 mb-2">Admin not found</h3>
          <p className="text-gray-600 mb-4">The admin ID is missing or invalid.</p>
          <button
            onClick={() => navigate('/admin-management')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Admin Management
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin details...</p>
        </div>
      </div>
    );
  }

  if (error && !admin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h3 className="text-3xl font-bold text-red-500 mb-2">Error</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/admin-management')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Admin Management
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={handleCancel}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4 transition-colors"
          >
            ← Back to Admin Management
          </button>
          <h1 className="text-3xl font-bold text-slate-900">Edit Admin</h1>
          <p className="text-slate-600 mt-2">Update admin details and permissions</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Admin Info Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Admin Information</h3>
              
              {admin && (
                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-slate-500">Email</span>
                    <p className="font-medium text-slate-900">{admin.email}</p>
                  </div>
                  <div>
                    <span className="text-sm text-slate-500">Admin ID</span>
                    <p className="font-medium text-slate-900 font-mono text-xs">{admin.id}</p>
                  </div>
                  <div>
                    <span className="text-sm text-slate-500">Created</span>
                    <p className="font-medium text-slate-900">
                      {admin.createdAt ? new Date(admin.createdAt).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-slate-500">Last Login</span>
                    <p className="font-medium text-slate-900">
                      {admin.lastLogin ? new Date(admin.lastLogin).toLocaleDateString() : 'Never'}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-slate-500">Current Status</span>
                    <div className="mt-1">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
                        admin.isActive !== false 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          admin.isActive !== false ? 'bg-green-500' : 'bg-red-500'
                        }`}></div>
                        {admin.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Edit Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              {/* Form Header */}
              

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Full Name */}
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-slate-700 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    id="fullName"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    required
                    className={`w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                      formData.fullName ? 'bg-blue-50' : ''
                    }`}
                    placeholder={admin?.fullName ? `Current: ${admin.fullName}` : "Enter full name"}
                  />
                  {formData.fullName && (
                    <p className="mt-1 text-xs text-blue-600">✓ Pre-filled with current name</p>
                  )}
                </div>

                {/* Department */}
                <div>
                  <label htmlFor="department" className="block text-sm font-medium text-slate-700 mb-2">
                    Department *
                  </label>
                  <input
                    type="text"
                    id="department"
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    required
                    list="department-options"
                    className={`w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                      formData.department ? 'bg-blue-50' : ''
                    }`}
                    placeholder={admin?.department ? `Current: ${admin.department}` : "Select or type a department"}
                  />
                  {formData.department && (
                    <p className="mt-1 text-xs text-blue-600">✓ Pre-filled with current department • Click for options</p>
                  )}
                  <datalist id="department-options">
                    <option value="All Departments" />
                    <option value="Municipal Engineering Division" />
                    <option value="Municipal Electrical Wing" />
                    <option value="Municipal Sanitation Department" />
                    <option value="Municipal Water Supply & Sewerage" />
                    <option value="Municipal Health Department" />
                    <option value="Municipal Horticulture Division" />
                    <option value="Municipal Traffic Engineering Division" />
                    <option value="Fire & Emergency Services" />
                    <option value="Municipal Public Amenities Department" />
                    <option value="Municipal Urban Planning & Encroachment Removal" />
                    <option value="Municipal Environment Cell" />
                    <option value="Municipal Veterinary Department" />
                    <option value="Municipal Citizen Service Centre" />
                    <option value="General Administrative Office" />
                  </datalist>
                </div>

                {/* Role */}
                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-slate-700 mb-2">
                    Role *
                  </label>
                  <select
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    required
                    className={`w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                      formData.role ? 'bg-blue-50' : ''
                    }`}
                  >
                    <option value="">Select a role</option>
                    <option value="viewer">👁️ Viewer - Read-only access</option>
                    <option value="admin">⚙️ Admin - Manage reports and users</option>
                    <option value="super_admin">👑 Super Admin - Full system access</option>
                  </select>
                  {formData.role && (
                    <p className="mt-1 text-xs text-blue-600">
                      ✓ Current role: <span className="capitalize font-medium">{formData.role.replace('_', ' ')}</span>
                    </p>
                  )}
                </div>

                {/* Active Status */}
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm font-medium text-slate-700">
                        Administrator Status
                      </label>
                      <p className="text-xs text-slate-500 mt-1">
                        Toggle to activate or deactivate this administrator's access
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-medium ${formData.isActive ? 'text-green-600' : 'text-red-600'}`}>
                        {formData.isActive ? '✅ Active' : '❌ Inactive'}
                      </span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          name="isActive"
                          checked={formData.isActive}
                          onChange={handleInputChange}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Unchecking this will deactivate the admin account
                  </p>
                </div>

                {/* Error and Success Messages */}
                {error && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg">
                    {success}
                  </div>
                )}

                {/* Form Actions */}
                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {saving ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Updating...
                      </span>
                    ) : (
                      'Update Admin'
                    )}
                  </button>
                  
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={saving}
                    className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
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
