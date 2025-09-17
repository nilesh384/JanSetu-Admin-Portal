import { createContext, useContext, useState, useEffect } from "react";

// Create authentication context
const AuthContext = createContext();

// Custom hook to use authentication context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// Authentication provider component
export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminData, setAdminData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check authentication status on app load
  useEffect(() => {
    const checkAuth = () => {
      const storedAdminData = localStorage.getItem("adminData");
      const storedIsLoggedIn = localStorage.getItem("isLoggedIn");

      if (storedAdminData && storedIsLoggedIn === "true") {
        setAdminData(JSON.parse(storedAdminData));
        setIsAuthenticated(true);
      } else {
        setAdminData(null);
        setIsAuthenticated(false);
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  // Login function
  const login = (data) => {
    setAdminData(data);
    setIsAuthenticated(true);
    localStorage.setItem("adminData", JSON.stringify(data));
    localStorage.setItem("isLoggedIn", "true");
  };

  // Logout function
  const logout = () => {
    setAdminData(null);
    setIsAuthenticated(false);
    localStorage.removeItem("adminData");
    localStorage.removeItem("isLoggedIn");
  };

  const value = {
    isAuthenticated,
    adminData,
    loading,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};