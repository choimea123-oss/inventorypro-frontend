import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from './utils/api';

const Register = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const res = await api.post("/register-organization", {
        username,
        password,
        organizationName,
      });

      setMessage(res.data.message);

      if (res.data.success) {
        setTimeout(() => {
          navigate("/");
        }, 2000);
      }
    } catch (err) {
      if (err.response) {
        setMessage(err.response.data.message);
      } else {
        setMessage("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
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

      <div style={styles.rightPanel}>
        <div style={styles.formContainer}>
          <div style={styles.formHeader}>
            <h2 style={styles.formTitle}>Create Your Organization</h2>
            <p style={styles.formSubtitle}>
              Get started with your free account in minutes
            </p>
          </div>

          <form onSubmit={handleRegister} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>
                Organization Name
                <span style={styles.required}>*</span>
              </label>
              <input
                type="text"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                placeholder="ABC Hardware Store"
                required
                style={styles.input}
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>
                Admin Username
                <span style={styles.required}>*</span>
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                required
                minLength={3}
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
                minLength={6}
                style={styles.input}
              />
              <small style={styles.hint}>
                Minimum 6 characters
              </small>
            </div>

            {message && (
              <div style={{
                ...styles.message,
                ...(message.includes("success") ? styles.messageSuccess : styles.messageError)
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
              {loading ? "Creating..." : "Create Organization"}
            </button>

            <button
              type="button"
              onClick={() => navigate("/")}
              style={styles.backButton}
            >
              Already have an account? Sign in
            </button>
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
  hint: {
    display: "block",
    fontSize: "13px",
    color: "#718096",
    marginTop: "6px",
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
    marginBottom: "12px",
  },
  submitButtonDisabled: {
    opacity: 0.6,
    cursor: "not-allowed",
  },
  backButton: {
    width: "100%",
    padding: "14px",
    fontSize: "15px",
    fontWeight: "500",
    color: "#667eea",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    transition: "all 0.2s",
  },
};

export default Register;