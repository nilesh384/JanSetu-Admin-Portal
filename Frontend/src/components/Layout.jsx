import Header from './Header';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useState } from 'react';

const Layout = ({ children }) => {
  const { adminData } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Debug: Log the admin data to see what role format we're getting
  console.log('Admin Data in Layout:', adminData);
  console.log('Admin Role:', adminData?.role);

  // Check for multiple possible role formats
  const isSuperAdmin = adminData?.role === 'superadmin' ||
                      adminData?.role === 'super_admin' ||
                      adminData?.role === 'SUPERADMIN' ||
                      adminData?.role === 'SUPER_ADMIN';

  const isViewer = adminData?.role === 'viewer' ||
                   adminData?.role === 'VIEWER' ||
                   adminData?.role === 'Viewer';

  console.log('Is Super Admin?', isSuperAdmin);
  console.log('Is Viewer?', isViewer);

  const navigationItems = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
        </svg>
      ),
      show: true
    },
    {
      name: 'Reports',
      href: '/reports',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      show: true
    },
    {
      name: 'Admin Management',
      href: '/admin-management',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
        </svg>
      ),
      show: !isViewer
    },
    {
      name: 'Activity Logs',
      href: '/activity-logs',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      show: isSuperAdmin
    },
    {
      name: 'Create Admin',
      href: '/create-admin',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
      ),
      show: isSuperAdmin
    }
  ];

  const isActiveRoute = (href) => {
    return location.pathname === href;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <Header />

      {/* Sidebar - Always overlay */}
      <aside className={`fixed top-0 left-0 z-40 h-full w-64 bg-white/95 backdrop-blur-xl border-r border-white/30 shadow-2xl transform transition-transform duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full pt-20">
          {/* Navigation Header */}
          <div className="p-6 border-b border-white/30">
            <h2 className="text-lg font-semibold text-neutral-800 flex items-center gap-2 ml-10">
              Navigation
            </h2>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {navigationItems
              .filter(item => item.show)
              .map((item) => {
                const isActive = isActiveRoute(item.href);
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg'
                        : 'text-neutral-700 hover:bg-white/60 hover:text-indigo-600 hover:shadow-md'
                    }`}
                  >
                    <div className={`transition-colors duration-200 ${
                      isActive ? 'text-white' : 'text-neutral-500 group-hover:text-indigo-600'
                    }`}>
                      {item.icon}
                    </div>
                    <span className="font-medium whitespace-nowrap">{item.name}</span>
                    {isActive && (
                      <div className="ml-auto w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    )}
                  </Link>
                );
              })}
          </nav>

          {/* User Info Footer */}
          {adminData && (
            <div className="p-4 border-t border-white/30">
              <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-indigo-50 to-violet-50 rounded-xl">
                <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full flex items-center justify-center text-white font-semibold">
                  {(adminData.name || adminData.email || 'A').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-neutral-800 truncate">
                    {adminData.name || adminData.email?.split('@')[0] || 'Admin'}
                  </p>
                  <p className="text-xs text-neutral-600 capitalize">
                    {adminData.role?.toLowerCase().replace('_', ' ') || 'Unknown Role'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Hamburger Menu Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-24 left-4 z-50 flex items-center justify-center w-10 h-10 bg-white/90 backdrop-blur-xl rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group"
      >
        <div className="flex flex-col w-5 h-5 justify-center items-center">
          <span className={`bg-neutral-700 block transition-all duration-300 h-0.5 w-full rounded-sm ${sidebarOpen ? 'rotate-45 translate-y-1' : '-translate-y-0.5'}`}></span>
          <span className={`bg-neutral-700 block transition-all duration-300 h-0.5 w-full rounded-sm my-0.5 ${sidebarOpen ? 'opacity-0' : 'opacity-100'}`}></span>
          <span className={`bg-neutral-700 block transition-all duration-300 h-0.5 w-full rounded-sm ${sidebarOpen ? '-rotate-45 -translate-y-1' : 'translate-y-0.5'}`}></span>
        </div>
      </button>

      {/* Main Content */}
      <main className={`min-h-screen transition-all duration-300 ease-in-out ${
        sidebarOpen ? 'ml-64' : 'ml-0'
      }`}>
        <div className="p-6 pt-24">
          <div className="animate-fade-in-up">
            {children}
          </div>
        </div>
      </main>

      {/* Mobile Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-white/20 shadow-2xl z-40">
        <div className="flex justify-around px-2 py-2">
          {navigationItems
            .filter(item => item.show)
            .map((item) => {
              const isActive = isActiveRoute(item.href);
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white'
                      : 'text-neutral-600 hover:text-indigo-600 hover:bg-white/50'
                  }`}
                >
                  <div className={isActive ? 'text-white' : 'text-neutral-500'}>
                    {item.icon}
                  </div>
                  <span className="text-xs font-medium">{item.name}</span>
                </Link>
              );
            })}
        </div>
      </nav>
    </div>
  );
};

export default Layout;