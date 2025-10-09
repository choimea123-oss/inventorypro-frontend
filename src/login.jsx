import React, { useState } from "react";
import api from './utils/api';
import { useNavigate, Link } from "react-router-dom";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    console.log("🔵 Login attempt started");
    
    try {
      const res = await api.post("/login", {
        username,
        password,
      });

      console.log("🟢 Server response:", res.data);
      setMessage(res.data.message);

      if (res.data.message === "Login successful") {
        const userData = {
          username: res.data.username,
          role: res.data.role,
          branch_id: res.data.branch_id,
          org_id: res.data.org_id,
          org_name: res.data.org_name,
        };

        console.log("🟡 Saving to localStorage:", userData);
        
        // Save user info in localStorage including org_id
        localStorage.setItem("user", JSON.stringify(userData));
        
        // Verify it was saved
        const savedUser = localStorage.getItem("user");
        console.log("🟣 Retrieved from localStorage:", savedUser);
        console.log("🟣 Parsed:", JSON.parse(savedUser));

        console.log("🔵 Role detected:", res.data.role);

        // Redirect based on role
        if (res.data.role === "admin") {
          console.log("✅ Navigating to /admin");
          navigate("/admin");
        } else if (res.data.role === "manager") {
          console.log("✅ Navigating to /manager");
          navigate("/manager");
        } else if (res.data.role === "staff") {
          console.log("✅ Navigating to /staff");
          navigate("/staff");
        } else {
          console.log("❌ Unknown role, navigating to /");
          navigate("/");
        }
      }
    } catch (err) {
      console.error("🔴 Login error:", err);
      if (err.response) {
        console.error("🔴 Error response:", err.response.data);
        setMessage(err.response.data.message);
      } else {
        console.error("🔴 Network error:", err.message);
        setMessage("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Left side - Branding */}
      <div style={styles.leftPanel}>
        <div style={styles.brandingContent}>
          <div style={styles.iconCircle}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <h1 style={styles.brandTitle}>Inventory Pro</h1>
          <p style={styles.brandSubtitle}>
            Complete inventory management solution for growing businesses
          </p>
          <div style={styles.featureList}>
            <div style={styles.featureItem}>
              <span style={styles.checkmark}>✓</span>
              <span>Multi-branch management</span>
            </div>
            <div style={styles.featureItem}>
              <span style={styles.checkmark}>✓</span>
              <span>Real-time inventory tracking</span>
            </div>
            <div style={styles.featureItem}>
              <span style={styles.checkmark}>✓</span>
              <span>Sales reports</span>
            </div>
            <div style={styles.featureItem}>
              <span style={styles.checkmark}>✓</span>
              <span>Barcode scanning support</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div style={styles.rightPanel}>
        <div style={styles.formContainer}>
          <div style={styles.formHeader}>
            <h2 style={styles.formTitle}>Welcome Back</h2>
            <p style={styles.formSubtitle}>
              Sign in to your account to continue
            </p>
          </div>

          <form onSubmit={handleLogin} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>
                Username
                <span style={styles.required}>*</span>
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
                style={styles.input}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>
                Password
                <span style={styles.required}>*</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={styles.input}
              />
            </div>

            {message && (
              <div style={{
                ...styles.message,
                ...(message.includes("successful") ? styles.messageSuccess : styles.messageError)
              }}>
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                ...styles.submitButton,
                ...(loading ? styles.submitButtonDisabled : {})
              }}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>

            <div style={styles.divider}>
              <span style={styles.dividerText}>or</span>
            </div>

            <button
              type="button"
              onClick={() => navigate("/register")}
              style={styles.registerButton}
            >
              Create New Organization
            </button>

            <p style={styles.footerText}>
              Don't have an organization?{" "}
              <Link to="/register" style={styles.link}>
                Register here
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: "flex",
    minHeight: "100vh",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  leftPanel: {
    flex: 1,
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "60px",
    color: "white",
  },
  brandingContent: {
    maxWidth: "480px",
  },
  iconCircle: {
    width: "80px",
    height: "80px",
    borderRadius: "50%",
    background: "rgba(255, 255, 255, 0.2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "30px",
  },
  brandTitle: {
    fontSize: "42px",
    fontWeight: "700",
    margin: "0 0 16px 0",
    letterSpacing: "-1px",
  },
  brandSubtitle: {
    fontSize: "18px",
    lineHeight: "1.6",
    opacity: 0.9,
    marginBottom: "40px",
  },
  featureList: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  featureItem: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    fontSize: "16px",
  },
  checkmark: {
    width: "24px",
    height: "24px",
    borderRadius: "50%",
    background: "rgba(255, 255, 255, 0.25)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "bold",
    flexShrink: 0,
  },
  rightPanel: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px",
    background: "#f8f9fa",
  },
  formContainer: {
    width: "100%",
    maxWidth: "480px",
    background: "white",
    padding: "48px",
    borderRadius: "16px",
    boxShadow: "0 4px 24px rgba(0, 0, 0, 0.08)",
  },
  formHeader: {
    marginBottom: "32px",
  },
  formTitle: {
    fontSize: "28px",
    fontWeight: "700",
    color: "#1a202c",
    margin: "0 0 8px 0",
  },
  formSubtitle: {
    fontSize: "15px",
    color: "#718096",
    margin: 0,
  },
  form: {
    display: "flex",
    flexDirection: "column",
  },
  inputGroup: {
    marginBottom: "24px",
  },
  label: {
    display: "block",
    fontSize: "14px",
    fontWeight: "600",
    color: "#2d3748",
    marginBottom: "8px",
  },
  required: {
    color: "#e53e3e",
    marginLeft: "4px",
  },
  input: {
    width: "100%",
    padding: "12px 16px",
    fontSize: "15px",
    border: "2px solid #e2e8f0",
    borderRadius: "8px",
    transition: "all 0.2s",
    boxSizing: "border-box",
    outline: "none",
  },
  message: {
    padding: "12px 16px",
    borderRadius: "8px",
    fontSize: "14px",
    marginBottom: "20px",
    fontWeight: "500",
  },
  messageSuccess: {
    background: "#c6f6d5",
    color: "#22543d",
    border: "1px solid #9ae6b4",
  },
  messageError: {
    background: "#fed7d7",
    color: "#742a2a",
    border: "1px solid #fc8181",
  },
  submitButton: {
    width: "100%",
    padding: "14px",
    fontSize: "16px",
    fontWeight: "600",
    color: "white",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.2s",
    marginBottom: "16px",
  },
  submitButtonDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
  },
  divider: {
    position: "relative",
    textAlign: "center",
    margin: "24px 0",
  },
  dividerText: {
    background: "white",
    padding: "0 16px",
    color: "#a0aec0",
    fontSize: "14px",
    position: "relative",
    zIndex: 1,
  },
  registerButton: {
    width: "100%",
    padding: "14px",
    fontSize: "15px",
    fontWeight: "600",
    color: "#667eea",
    background: "white",
    border: "2px solid #667eea",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.2s",
    marginBottom: "20px",
  },
  footerText: {
    textAlign: "center",
    fontSize: "14px",
    color: "#718096",
    margin: 0,
  },
  link: {
    color: "#667eea",
    fontWeight: "600",
    textDecoration: "none",
  },
};

export default Login;