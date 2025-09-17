import Header from './Header';
import { Link } from 'react-router-dom';

const Layout = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="flex">
        <nav className="w-64 bg-white border-r hidden md:block sticky top-0 h-screen overflow-y-auto">
          <div className="p-4">
            <Link to="/dashboard" className="block py-2 px-3 rounded hover:bg-gray-100 transition-colors">Dashboard</Link>
            <Link to="/reports" className="block py-2 px-3 rounded hover:bg-gray-100 transition-colors">Reports</Link>
            <Link to="/admin-management" className="block py-2 px-3 rounded hover:bg-gray-100 transition-colors">Admins</Link>
            <Link to="/profile" className="block py-2 px-3 rounded hover:bg-gray-100 transition-colors">Profile</Link>
          </div>
        </nav>

        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;