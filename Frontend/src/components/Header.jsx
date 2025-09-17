import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from './AuthContext';

const Header = () => {
  const { adminData, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleProfileClick = () => {
    navigate('/profile');
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="flex items-center gap-4 px-4 py-2 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center bg-indigo-600 text-white rounded-md font-bold">CS</div>
          <div>
            <div className="text-sm font-semibold text-gray-900">CrowdSource</div>
            <div className="text-xs text-gray-500">Admin dashboard</div>
          </div>
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-3">
          {adminData && (
            <div className="text-sm text-gray-700">{adminData.name || adminData.email}</div>
          )}
          <button onClick={handleProfileClick} className="px-3 py-1 rounded hover:bg-gray-100 text-sm">Profile</button>
          <button onClick={handleLogout} className="px-3 py-1 bg-red-600 text-white rounded text-sm">Logout</button>
        </div>
      </div>
    </header>
  );
};

export default Header;