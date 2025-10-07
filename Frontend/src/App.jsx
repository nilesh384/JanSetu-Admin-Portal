import { BrowserRouter as Router, Routes, Route, useParams } from "react-router-dom";
import { AuthProvider } from "./components/AuthContext";
import { PublicRoute, PrivateRoute } from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import AdminManagement from "./pages/AdminManagement";
import EditAdmin from "./pages/EditAdmin";
import CreateAdmin from "./pages/CreateAdmin";
import ActivityLogs from "./pages/ActivityLogs";
import Reports from "./pages/Reports";
import ReportDetails from "./pages/ReportDetails";
import MapOverview from "./pages/MapOverview";



function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route
            path="/"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <PrivateRoute>
                <Layout>
                  <Profile />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/admin-management"
            element={
              <PrivateRoute>
                <Layout>
                  <AdminManagement />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/edit-admin/:id"
            element={
              <PrivateRoute>
                <Layout>
                  <EditAdmin />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/create-admin"
            element={
              <PrivateRoute>
                <Layout>
                  <CreateAdmin />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route
            path="/activity-logs"
            element={
              <PrivateRoute>
                <Layout>
                  <ActivityLogs />
                </Layout>
              </PrivateRoute>
            }
          />
          <Route 
              path="/reports" 
              element={
                <PrivateRoute>
                  <Layout>
                    <Reports />
                  </Layout>
                </PrivateRoute>
              } />
          <Route 
              path="/report/:id" 
              element={
                <PrivateRoute>
                  <Layout>
                    <ReportDetails />
                  </Layout>
                </PrivateRoute>
              } />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Layout>
                  <MapOverview />
                </Layout>
              </PrivateRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
