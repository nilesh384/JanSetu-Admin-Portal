import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createAdmin } from '../api/user';
import { useAuth } from '../components/AuthContext';

function CreateAdmin() {
  const navigate = useNavigate();
  const { adminData, isAuthenticated } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    department: '',
    role: ''
  });

  // Form validation
  const [errors, setErrors] = useState({});

  // Check authentication and permissions
  useEffect(() => {
    if (!isAuthenticated || !adminData) {
      navigate('/', { replace: true });
      return;
    }

    if (adminData.role?.toLowerCase() !== 'super_admin') {
      setShowPermissionModal(true);
    }
  }, [isAuthenticated, adminData, navigate]);

  const validateForm = () => {
    const newErrors = {};

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Full name validation
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = 'Full name must be at least 2 characters';
    }

    // Department validation
    if (!formData.department.trim()) {
      newErrors.department = 'Department is required';
    }

    // Role validation
    if (!formData.role) {
      newErrors.role = 'Role is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear specific error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!adminData || adminData.role?.toLowerCase() !== 'super_admin') {
      setShowPermissionModal(true);
      return;
    }

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const adminDataToCreate = {
        email: formData.email.trim().toLowerCase(),
        fullName: formData.fullName.trim(),
        department: formData.department.trim(),
        role: formData.role
      };

      const result = await createAdmin(adminData.role, adminDataToCreate);
      
      if (result.success) {
        setSuccess('Admin created successfully! Redirecting...');
        
        // Navigate back after a delay
        setTimeout(() => {
          navigate('/admin-management', { 
            state: { message: `Admin "${formData.fullName}" created successfully!` }
          });
        }, 2000);
      } else {
        setError(result.message || 'Failed to create admin');
      }
    } catch (err) {
      setError('Failed to create admin. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/admin-management');
  };

  const resetForm = () => {
    setFormData({
      email: '',
      fullName: '',
      department: '',
      role: ''
    });
    setErrors({});
    setError('');
    setSuccess('');
  };

  const handleModalClose = () => {
    navigate('/admin-management');
  };

  // Permission Denied Modal
  if (showPermissionModal) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 transform transition-all">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>

          {/* Content */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-3">Access Denied</h2>
            <p className="text-slate-600 leading-relaxed">
              You are not permitted to access this page. Only <span className="font-semibold text-slate-800">Super Admins</span> can create new admin accounts.
            </p>
            <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-sm text-slate-700">
                <span className="font-medium">Your current role:</span>{' '}
                <span className="capitalize text-slate-900">{adminData?.role || 'Unknown'}</span>
              </p>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={handleModalClose}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-md hover:shadow-lg"
          >
            Go Back to Admin Management
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-4xl mx-auto px-6 -mt-24">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={handleCancel}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4 transition-colors"
          >
            ← Back to Admin Management
          </button>
          <h1 className="text-3xl font-bold text-slate-900">Create New Admin</h1>
          <p className="text-slate-600 mt-2">Add a new admin to the system</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Instructions Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Instructions</h3>
              
              <div className="space-y-4 text-sm text-slate-600">
                <div>
                  <h4 className="font-medium text-slate-700 mb-1">Email Requirements</h4>
                  <p>Must be a valid email address. This will be used for login and notifications.</p>
                </div>
                
                <div>
                  <h4 className="font-medium text-slate-700 mb-1">Role Permissions</h4>
                  <ul className="space-y-1 ml-3">
                    <li>• <span className="font-medium">Viewer:</span> Read-only access</li>
                    <li>• <span className="font-medium">Admin:</span> Manage reports and users</li>
                    <li>• <span className="font-medium">Super Admin:</span> Full system access</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium text-slate-700 mb-1">After Creation</h4>
                  <p>The new admin will receive a welcome email with login instructions.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Create Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                      errors.email ? 'border-red-300 bg-red-50' : 'border-slate-300'
                    }`}
                    placeholder="admin@example.com"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                  )}
                </div>

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
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                      errors.fullName ? 'border-red-300 bg-red-50' : 'border-slate-300'
                    }`}
                    placeholder="John Doe"
                  />
                  {errors.fullName && (
                    <p className="mt-1 text-sm text-red-600">{errors.fullName}</p>
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
                    list="department-options"
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                      errors.department ? 'border-red-300 bg-red-50' : 'border-slate-300'
                    }`}
                    placeholder="Select or type a department"
                  />
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
                  {errors.department && (
                    <p className="mt-1 text-sm text-red-600">{errors.department}</p>
                  )}
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
                    className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                      errors.role ? 'border-red-300 bg-red-50' : 'border-slate-300'
                    }`}
                  >
                    <option value="">Select a role</option>
                    <option value="viewer">Viewer</option>
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                  {errors.role && (
                    <p className="mt-1 text-sm text-red-600">{errors.role}</p>
                  )}
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
                    disabled={loading}
                    className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Creating Admin...
                      </span>
                    ) : (
                      'Create Admin'
                    )}
                  </button>
                  
                  <button
                    type="button"
                    onClick={resetForm}
                    disabled={loading}
                    className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    Reset
                  </button>
                  
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={loading}
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

export default CreateAdmin;