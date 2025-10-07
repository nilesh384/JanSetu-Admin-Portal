import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
import logo from '../assets/logo.png';

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
    <header className="sticky top-0 z-50 glass border-b border-white/20 shadow-lg">
      <div className="px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo and Brand */}
          <Link to="/dashboard" className="flex items-center gap-4 group">
            <div className="relative">
              <img
                src={logo}
                alt="JanSetu Logo"
                className="w-12 h-12 object-contain transition-transform group-hover:scale-110"
              />
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full opacity-20 group-hover:opacity-30 transition-opacity"></div>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold text-gradient">JanSetu</h1>
              <p className="text-xs text-neutral-600 font-medium">Admin Portal</p>
            </div>
          </Link>

          {/* User Actions */}
          <div className="flex items-center gap-4">
            {/* User Info */}
            {adminData && (
              <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-white/10 rounded-full backdrop-blur-sm">
                <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                  {(adminData.name || adminData.email || 'A').charAt(0).toUpperCase()}
                </div>
                <div className="text-sm">
                  <p className="font-medium text-neutral-800">
                    {adminData.fullName || adminData.email?.split('@')[0] || 'Admin'}
                  </p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleProfileClick}
                className="hidden sm:flex items-center gap-2 px-4 py-2 text-neutral-700 hover:text-indigo-600 hover:bg-white/20 rounded-lg transition-all duration-200 font-medium"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Profile
              </button>

              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all duration-200 font-medium shadow-md hover:shadow-lg"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile User Info */}
      {adminData && (
        <div className="md:hidden px-4 pb-4">
          <div className="flex items-center gap-3 px-4 py-3 bg-white/10 rounded-xl backdrop-blur-sm">
            <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full flex items-center justify-center text-white font-semibold">
              {(adminData.name || adminData.email || 'A').charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-medium text-neutral-800">
                {adminData.name || adminData.email?.split('@')[0] || 'Admin'}
              </p>
              <p className="text-neutral-600 text-sm capitalize">
                {adminData.role?.toLowerCase().replace('_', ' ') || 'Unknown Role'}
              </p>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;