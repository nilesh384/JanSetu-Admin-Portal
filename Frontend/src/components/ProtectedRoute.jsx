import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

// Utility function to check if user is authenticated
export const isAuthenticated = () => {
  const adminData = localStorage.getItem("adminData");
  const isLoggedIn = localStorage.getItem("isLoggedIn");

  return adminData && isLoggedIn === "true";
};

// Protected Route component for pages that should only be accessible when NOT logged in
export const PublicRoute = ({ children }) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated()) {
      // If user is already logged in, redirect to profile
      navigate("/profile", { replace: true });
    }
  }, [navigate]);

  // If user is not authenticated, show the login page
  return !isAuthenticated() ? children : null;
};

// Protected Route component for pages that require authentication
export const PrivateRoute = ({ children }) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated()) {
      // If user is not logged in, redirect to login
      navigate("/", { replace: true });
    }
  }, [navigate]);

  // If user is authenticated, show the protected page
  return isAuthenticated() ? children : null;
};