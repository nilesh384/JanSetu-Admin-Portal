import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAdminProfile } from "../api/user";
import { useAuth } from "../components/AuthContext";
import { User, Mail, Building, Shield, Calendar, LogOut, LayoutDashboard, Users } from "lucide-react";

export default function Profile() {
  const navigate = useNavigate();
  const { adminData: contextAdminData, logout, isAuthenticated } = useAuth();
  const [adminData, setAdminData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/", { replace: true });
      return;
    }

    if (contextAdminData) {
      setAdminData(contextAdminData);
      setLoading(false);
    } else {
      fetchAdminProfile();
    }
  }, [navigate, isAuthenticated, contextAdminData]);

  const fetchAdminProfile = async () => {
    try {
      const storedAdminData = localStorage.getItem("adminData");
      if (!storedAdminData) {
        setError("No admin data found. Please login again.");
        navigate("/", { replace: true });
        return;
      }

      const admin = JSON.parse(storedAdminData);
      const result = await getAdminProfile(admin.id);

      if (result.success) {
        setAdminData(result.data);
      } else {
        setError(result.message);
        setAdminData(admin);
      }
    } catch (err) {
      setError("Failed to load profile data");
      console.error("Profile fetch error:", err);
      const storedAdminData = localStorage.getItem("adminData");
      if (storedAdminData) {
        setAdminData(JSON.parse(storedAdminData));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 p-6">
      <div className="max-w-5xl mx-auto">
        
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-8">
          <div className="flex items-center justify-between p-6 bg-gradient-to-r from-blue-600 to-purple-600">
            <div className="flex items-center space-x-4">
              <div className="bg-white rounded-full h-16 w-16 flex items-center justify-center">
                <User className="w-10 h-10 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">{adminData?.fullName}</h2>
                <p className="text-blue-100">{adminData?.email}</p>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => navigate("/dashboard")}
                className="bg-white text-blue-700 px-4 py-2 rounded-lg shadow hover:bg-gray-100 flex items-center space-x-2"
              >
                <LayoutDashboard size={18} />
                <span>Dashboard</span>
              </button>
              <button
                onClick={() => navigate("/admin-management")}
                className="bg-green-600 text-white px-4 py-2 rounded-lg shadow hover:bg-green-700 flex items-center space-x-2"
              >
                <Users size={18} />
                <span>Manage</span>
              </button>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-lg shadow hover:bg-red-700 flex items-center space-x-2"
              >
                <LogOut size={18} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>

        {/* Details Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Personal Info */}
          <div className="bg-white rounded-xl shadow p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Personal Information</h3>
            <div className="flex items-center space-x-3">
              <User className="text-gray-500" size={18} />
              <span>{adminData?.fullName}</span>
            </div>
            <div className="flex items-center space-x-3">
              <Mail className="text-gray-500" size={18} />
              <span>{adminData?.email}</span>
            </div>
            <div className="flex items-center space-x-3">
              <Building className="text-gray-500" size={18} />
              <span>{adminData?.department}</span>
            </div>
          </div>

          {/* Account Info */}
          <div className="bg-white rounded-xl shadow p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Account Information</h3>
            <div className="flex items-center space-x-3">
              <Shield className="text-gray-500" size={18} />
              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                {adminData?.role?.toUpperCase()}
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="h-2 w-2 rounded-full bg-green-500"></span>
              <span>Active</span>
            </div>
            <div className="flex items-center space-x-3">
              <Calendar className="text-gray-500" size={18} />
              <span>Last Login: {formatDate(adminData?.lastLogin)}</span>
            </div>
            <div className="flex items-center space-x-3">
              <Calendar className="text-gray-500" size={18} />
              <span>Created: {formatDate(adminData?.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
