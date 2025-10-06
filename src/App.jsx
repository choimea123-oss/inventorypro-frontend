import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./login";
import Register from "./register";
import Admin from "./admin";
import ManagerDashboard from "./ManagerDashboard";
import StaffDashboard from "./StaffDashboard";

// ProtectedRoute component to restrict access based on role
const ProtectedRoute = ({ children, role }) => {
  const user = JSON.parse(localStorage.getItem("user"));

  if (!user) {
    // Not logged in
    return <Navigate to="/" />;
  }

  if (role && user.role !== role) {
    // Logged in but wrong role
    if (user.role === "staff") return <Navigate to="/staff" />;
    if (user.role === "manager") return <Navigate to="/manager" />;
    if (user.role === "admin") return <Navigate to="/admin" />;
  }

  return children;
};

// Wrapper components that read fresh data from localStorage
const ManagerDashboardWrapper = () => {
  const manager = JSON.parse(localStorage.getItem("user"));
  console.log("Manager data from wrapper:", manager);
  return <ManagerDashboard manager={manager} />;
};

const StaffDashboardWrapper = () => {
  const user = JSON.parse(localStorage.getItem("user"));
  console.log("Staff data from wrapper:", user);
  return <StaffDashboard user={user} />;
};

const AdminWrapper = () => {
  const user = JSON.parse(localStorage.getItem("user"));
  console.log("Admin data from wrapper:", user);
  return <Admin />;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Staff dashboard */}
        <Route
          path="/staff"
          element={
            <ProtectedRoute role="staff">
              <StaffDashboardWrapper />
            </ProtectedRoute>
          }
        />

        {/* Manager dashboard */}
        <Route
          path="/manager"
          element={
            <ProtectedRoute role="manager">
              <ManagerDashboardWrapper />
            </ProtectedRoute>
          }
        />

        {/* Admin dashboard */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute role="admin">
              <AdminWrapper />
            </ProtectedRoute>
          }
        />

        {/* Catch-all route */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;