// ManagerDashboard.jsx
import React, { useState, useEffect } from "react";
import api from './utils/api';
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const ManagerDashboard = ({ manager }) => {
  const [tab, setTab] = useState("overview");
  const [staffUsername, setStaffUsername] = useState("");
  const [staffPassword, setStaffPassword] = useState("");
  const [inventory, setInventory] = useState([]);
  const [sales, setSales] = useState([]);
  const [branchInfo, setBranchInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const branchId = manager?.branch_id;
  const orgId = manager?.org_id;

  // Fetch branch details
  useEffect(() => {
    if (branchId && orgId) {
      api
        .get(`/manager/branch/${branchId}/${orgId}`)
        .then((res) => {
          setBranchInfo(res.data);
        })
        .catch((err) => {
          console.error("Branch info error:", err);
        });
    }
  }, [branchId, orgId]);

  // Fetch inventory when viewing inventory tab
  useEffect(() => {
    if (tab === "inventory" && branchId && orgId) {
      setLoading(true);
      setError(null);
      api
        .get(`/manager/inventory/${branchId}/${orgId}`)
        .then((res) => {
          setInventory(res.data || []);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Inventory error:", err);
          setError("Failed to load inventory");
          setInventory([]);
          setLoading(false);
        });
    }
  }, [tab, branchId, orgId]);

  // Fetch sales when viewing sales tab
  useEffect(() => {
    if (tab === "sales" && branchId && orgId) {
      setLoading(true);
      setError(null);
      api
        .get(`/manager/sales/${branchId}/${orgId}`)
        .then((res) => {
          setSales(res.data || []);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Sales error:", err);
          setError("Failed to load sales data");
          setSales([]);
          setLoading(false);
        });
    }
  }, [tab, branchId, orgId]);

  // Register staff
  const handleStaffRegister = async (e) => {
    e.preventDefault();
    
    if (!staffUsername.trim() || !staffPassword.trim()) {
      alert("Please fill all fields");
      return;
    }
    
    if (staffUsername.length < 3) {
      alert("Username must be at least 3 characters");
      return;
    }
    
    if (staffPassword.length < 6) {
      alert("Password must be at least 6 characters");
      return;
    }
    
    if (!branchId || !orgId) {
      alert("Branch ID or Organization ID not found.");
      return;
    }

    try {
      setLoading(true);
      await api.post("/manager/register-staff", {
        username: staffUsername,
        password: staffPassword,
        branch_id: branchId,
        org_id: orgId,
      });
      alert("Staff registered successfully!");
      setStaffUsername("");
      setStaffPassword("");
    } catch (err) {
      console.error("Register staff error:", err.response?.data || err.message);
      alert("Error: " + (err.response?.data?.message || "Failed to register staff"));
    } finally {
      setLoading(false);
    }
  };

  // Generate PDF Report
  const generatePDFReport = async () => {
    if (typeof window.jspdf === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      script.onload = () => createPDF();
      document.head.appendChild(script);
    } else {
      createPDF();
    }

    function createPDF() {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPos = 20;

      // Header
      doc.setFontSize(20);
      doc.setFont(undefined, 'bold');
      doc.text('Sales Report', pageWidth / 2, yPos, { align: 'center' });
      
      yPos += 10;
      doc.setFontSize(12);
      doc.setFont(undefined, 'normal');
      doc.text(`Branch: ${branchInfo?.branch_name || 'N/A'}`, pageWidth / 2, yPos, { align: 'center' });
      
      yPos += 6;
      doc.setFontSize(10);
      doc.text(`Location: ${branchInfo?.location || 'N/A'}`, pageWidth / 2, yPos, { align: 'center' });
      
      yPos += 6;
      doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, yPos, { align: 'center' });
      
      yPos += 10;
      doc.setLineWidth(0.5);
      doc.line(20, yPos, pageWidth - 20, yPos);
      
      yPos += 10;

      // Summary Stats
      const totalRevenue = sales.reduce((sum, s) => sum + parseFloat(s.total_sales || 0), 0);
      const totalTransactions = sales.reduce((sum, s) => sum + parseInt(s.transaction_count || 0), 0);
      const avgTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('Summary', 20, yPos);
      
      yPos += 8;
      doc.setFontSize(11);
      doc.setFont(undefined, 'normal');
      doc.text(`Total Revenue: PHP ${totalRevenue.toFixed(2)}`, 25, yPos);
      
      yPos += 6;
      doc.text(`Total Transactions: ${totalTransactions}`, 25, yPos);
      
      yPos += 6;
      doc.text(`Average Transaction: PHP ${avgTransaction.toFixed(2)}`, 25, yPos);
      
      yPos += 6;
      doc.text(`Sales Days: ${sales.length}`, 25, yPos);
      
      yPos += 10;

      // Sales Table
      if (sales.length > 0) {
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('Daily Sales Breakdown', 20, yPos);
        
        yPos += 8;

        // Table header
        doc.setFillColor(52, 73, 94);
        doc.rect(20, yPos, pageWidth - 40, 8, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text('Date', 25, yPos + 5.5);
        doc.text('Transactions', 80, yPos + 5.5);
        doc.text('Total Sales (PHP)', 140, yPos + 5.5);
        
        yPos += 8;
        doc.setTextColor(0, 0, 0);
        doc.setFont(undefined, 'normal');

        // Table rows
        sales.forEach((sale, index) => {
          if (yPos > pageHeight - 30) {
            doc.addPage();
            yPos = 20;
          }

          if (index % 2 === 0) {
            doc.setFillColor(249, 249, 249);
            doc.rect(20, yPos, pageWidth - 40, 7, 'F');
          }

          const date = new Date(sale.date).toLocaleDateString();
          const transactions = sale.transaction_count || 0;
          const totalSales = parseFloat(sale.total_sales || 0).toFixed(2);

          doc.text(date, 25, yPos + 5);
          doc.text(String(transactions), 80, yPos + 5);
          doc.text(totalSales, 140, yPos + 5);

          yPos += 7;
        });
      } else {
        doc.setFontSize(11);
        doc.text('No sales data available', 25, yPos);
      }

      // Footer
      const totalPages = doc.internal.pages.length - 1;
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        const footerY = pageHeight - 15;
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(`Manager: ${manager?.username || 'N/A'}`, 20, footerY);
        doc.text(`Page ${i} of ${totalPages}`, pageWidth - 40, footerY);
      }

      // Save PDF
      const filename = `Sales_Report_${branchInfo?.branch_name?.replace(/\s+/g, '_') || 'Branch'}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(filename);
    }
  };

  // Logout
  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      localStorage.removeItem("user");
      window.location.href = "/";
    }
  };

  const salesChartData = {
    labels: (sales || []).map((s) => new Date(s.date).toLocaleDateString()),
    datasets: [
      {
        label: "Daily Sales (₱)",
        data: (sales || []).map((s) => parseFloat(s.total_sales || 0)),
        backgroundColor: "rgba(46, 204, 113, 0.7)",
        borderRadius: 8,
      },
    ],
  };

  // Calculate inventory stats
  const totalProducts = inventory.length;
  const totalStock = inventory.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const lowStock = inventory.filter((item) => item.quantity < 5).length;

  // Calculate sales stats
  const totalRevenue = sales.reduce((sum, s) => sum + parseFloat(s.total_sales || 0), 0);
  const totalTransactions = sales.reduce((sum, s) => sum + parseInt(s.transaction_count || 0), 0);

  return (
    <div style={styles.page}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <h2 style={styles.sidebarTitle}>Manager Panel</h2>
          <p style={styles.orgInfo}>
            <strong>{branchInfo?.branch_name || "Loading..."}</strong>
          </p>
          <p style={styles.locationInfo}>{branchInfo?.location || ""}</p>
          <p style={styles.userInfo}>Manager: {manager?.username}</p>
        </div>

        <nav style={styles.nav}>
          <button
            onClick={() => setTab("overview")}
            style={{
              ...styles.navButton,
              ...(tab === "overview" ? styles.navButtonActive : {}),
            }}
          >
            Overview
          </button>

          <button
            onClick={() => setTab("inventory")}
            style={{
              ...styles.navButton,
              ...(tab === "inventory" ? styles.navButtonActive : {}),
            }}
          >
            Inventory
          </button>

          <button
            onClick={() => setTab("sales")}
            style={{
              ...styles.navButton,
              ...(tab === "sales" ? styles.navButtonActive : {}),
            }}
          >
            Sales Report
          </button>

          <button
            onClick={() => setTab("register")}
            style={{
              ...styles.navButton,
              ...(tab === "register" ? styles.navButtonActive : {}),
            }}
          >
            Register Staff
          </button>
        </nav>

        <button onClick={handleLogout} style={styles.logoutButton}>
          Logout
        </button>
      </aside>

      {/* Main Content */}
      <main style={styles.main}>
        {loading && (
          <div style={styles.loadingOverlay}>
            <div style={styles.spinner}>Loading...</div>
          </div>
        )}

        {/* OVERVIEW TAB */}
        {tab === "overview" && (
          <div style={styles.content}>
            <h1 style={styles.pageTitle}>Branch Overview</h1>

            <h2 style={styles.sectionTitle}>Quick Stats</h2>
            <div style={styles.statsGrid}>
              <div style={styles.statCard}>
                <p style={styles.statLabel}>Total Products</p>
                <p style={styles.statValue}>{totalProducts}</p>
              </div>
              <div style={styles.statCard}>
                <p style={styles.statLabel}>Total Stock</p>
                <p style={styles.statValue}>{totalStock}</p>
              </div>
              <div style={styles.statCard}>
                <p style={styles.statLabel}>Low Stock Items</p>
                <p style={{ ...styles.statValue, color: lowStock > 0 ? "#e74c3c" : "#27ae60" }}>
                  {lowStock}
                </p>
              </div>
            </div>

            <h2 style={styles.sectionTitle}>Sales Summary</h2>
            <div style={styles.statsGrid}>
              <div style={styles.statCard}>
                <p style={styles.statLabel}>Total Revenue</p>
                <p style={styles.statValue}>₱{totalRevenue.toFixed(2)}</p>
              </div>
              <div style={styles.statCard}>
                <p style={styles.statLabel}>Total Transactions</p>
                <p style={styles.statValue}>{totalTransactions}</p>
              </div>
              <div style={styles.statCard}>
                <p style={styles.statLabel}>Sales Days</p>
                <p style={styles.statValue}>{sales.length}</p>
              </div>
            </div>

            <h2 style={styles.sectionTitle}>Recent Inventory (Top 5)</h2>
            <div style={styles.tableCard}>
              {inventory.length > 0 ? (
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableHeaderRow}>
                      <th style={styles.th}>Product Name</th>
                      <th style={styles.th}>Category</th>
                      <th style={styles.th}>Price</th>
                      <th style={styles.th}>Quantity</th>
                      <th style={styles.th}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.slice(0, 5).map((item, idx) => (
                      <tr key={idx} style={styles.tableRow}>
                        <td style={styles.td}>{item.product_name}</td>
                        <td style={styles.td}>{item.category || "N/A"}</td>
                        <td style={styles.td}>₱{parseFloat(item.product_price || 0).toFixed(2)}</td>
                        <td style={styles.td}>{item.quantity}</td>
                        <td style={styles.td}>
                          {item.quantity === 0 ? (
                            <span style={styles.badgeDanger}>Out of Stock</span>
                          ) : item.quantity < 5 ? (
                            <span style={styles.badgeWarning}>Low Stock</span>
                          ) : (
                            <span style={styles.badgeSuccess}>In Stock</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p style={styles.emptyState}>No inventory data available. Visit Inventory tab for details.</p>
              )}
            </div>
          </div>
        )}

        {/* INVENTORY TAB */}
        {tab === "inventory" && (
          <div style={styles.content}>
            <h1 style={styles.pageTitle}>Branch Inventory</h1>

            <div style={styles.statsGrid}>
              <div style={styles.statCard}>
                <p style={styles.statLabel}>Total Products</p>
                <p style={styles.statValue}>{totalProducts}</p>
              </div>
              <div style={styles.statCard}>
                <p style={styles.statLabel}>Total Stock</p>
                <p style={styles.statValue}>{totalStock}</p>
              </div>
              <div style={styles.statCard}>
                <p style={styles.statLabel}>Low Stock Items</p>
                <p style={{ ...styles.statValue, color: lowStock > 0 ? "#e74c3c" : "#27ae60" }}>
                  {lowStock}
                </p>
              </div>
            </div>

            {error && (
              <div style={styles.errorBox}>{error}</div>
            )}

            <div style={styles.tableCard}>
              <h3 style={styles.cardTitle}>All Products</h3>
              {inventory.length > 0 ? (
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableHeaderRow}>
                      <th style={styles.th}>Product Name</th>
                      <th style={styles.th}>Category</th>
                      <th style={styles.th}>Price</th>
                      <th style={styles.th}>Quantity</th>
                      <th style={styles.th}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.map((item, idx) => (
                      <tr
                        key={idx}
                        style={{
                          ...styles.tableRow,
                          background: item.quantity < 5 ? "#fee2e2" : idx % 2 === 0 ? "#f9fafb" : "white",
                        }}
                      >
                        <td style={styles.td}>{item.product_name}</td>
                        <td style={styles.td}>{item.category || "N/A"}</td>
                        <td style={styles.td}>₱{parseFloat(item.product_price || 0).toFixed(2)}</td>
                        <td style={{
                          ...styles.td,
                          fontWeight: item.quantity < 5 ? "bold" : "normal",
                          color: item.quantity < 5 ? "#dc2626" : "inherit"
                        }}>
                          {item.quantity}
                          {item.quantity < 5 && item.quantity > 0 && " (Low!)"}
                        </td>
                        <td style={styles.td}>
                          {item.quantity === 0 ? (
                            <span style={styles.badgeDanger}>Out of Stock</span>
                          ) : item.quantity < 5 ? (
                            <span style={styles.badgeWarning}>Low Stock</span>
                          ) : (
                            <span style={styles.badgeSuccess}>In Stock</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p style={styles.emptyState}>No inventory found for this branch. Staff can add products from their dashboard.</p>
              )}
            </div>
          </div>
        )}

        {/* SALES TAB */}
        {tab === "sales" && (
          <div style={styles.content}>
            <h1 style={styles.pageTitle}>Sales Report</h1>

            <div style={styles.tableCard}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                <h3 style={{ margin: 0, fontSize: "16px", color: "#2c3e50" }}>Sales Performance</h3>
                <button
                  onClick={generatePDFReport}
                  disabled={sales.length === 0}
                  style={{
                    padding: "8px 16px",
                    background: sales.length === 0 ? "#95a5a6" : "#e74c3c",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: sales.length === 0 ? "not-allowed" : "pointer",
                    fontWeight: "bold",
                    fontSize: "13px",
                  }}
                >
                  Download PDF Report
                </button>
              </div>

              <div style={styles.statsGrid}>
                <div style={styles.statCard}>
                  <p style={styles.statLabel}>Total Revenue</p>
                  <p style={styles.statValue}>₱{totalRevenue.toFixed(2)}</p>
                </div>
                <div style={styles.statCard}>
                  <p style={styles.statLabel}>Total Transactions</p>
                  <p style={styles.statValue}>{totalTransactions}</p>
                </div>
                <div style={styles.statCard}>
                  <p style={styles.statLabel}>Sales Days</p>
                  <p style={styles.statValue}>{sales.length}</p>
                </div>
              </div>
            </div>

            {error && (
              <div style={styles.errorBox}>{error}</div>
            )}

            <h2 style={styles.sectionTitle}>Daily Sales Breakdown</h2>
            <div style={styles.tableCard}>
              {sales.length > 0 ? (
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableHeaderRow}>
                      <th style={styles.th}>Date</th>
                      <th style={styles.th}>Transactions</th>
                      <th style={styles.th}>Total Sales</th>
                      <th style={styles.th}>Avg Transaction</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.map((sale, idx) => (
                      <tr key={idx} style={styles.tableRow}>
                        <td style={styles.td}>{new Date(sale.date).toLocaleDateString()}</td>
                        <td style={styles.td}>{sale.transaction_count}</td>
                        <td style={styles.td}>₱{parseFloat(sale.total_sales).toFixed(2)}</td>
                        <td style={styles.td}>
                          ₱{(parseFloat(sale.total_sales) / sale.transaction_count).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p style={styles.emptyState}>No sales data available. Sales will appear here once transactions are recorded.</p>
              )}
            </div>

            <h2 style={styles.sectionTitle}>Sales Trend</h2>
            <div style={styles.chartCard}>
              {sales.length > 0 ? (
                <Bar data={salesChartData} options={{ responsive: true, maintainAspectRatio: true }} />
              ) : (
                <p style={styles.emptyState}>No sales data available</p>
              )}
            </div>
          </div>
        )}

        {/* REGISTER STAFF TAB */}
        {tab === "register" && (
          <div style={styles.content}>
            <h1 style={styles.pageTitle}>Register New Staff</h1>
            <div style={styles.formCard}>
              <form onSubmit={handleStaffRegister}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Username:</label>
                  <input
                    type="text"
                    value={staffUsername}
                    onChange={(e) => setStaffUsername(e.target.value)}
                    style={styles.input}
                    required
                    minLength={3}
                    disabled={loading}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Password:</label>
                  <input
                    type="password"
                    value={staffPassword}
                    onChange={(e) => setStaffPassword(e.target.value)}
                    style={styles.input}
                    required
                    minLength={6}
                    disabled={loading}
                  />
                </div>

                <p style={styles.helperText}>
                  Staff will be automatically assigned to your branch: <strong>{branchInfo?.branch_name || "Your Branch"}</strong>
                </p>

                <button type="submit" style={styles.primaryButton} disabled={loading}>
                  {loading ? "Registering..." : "Register Staff"}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

/* ---------- Styles ---------- */
const styles = {
  page: {
    display: "flex",
    minHeight: "100vh",
    fontFamily: "Arial, sans-serif",
    background: "#f4f6f8",
  },
  sidebar: {
    width: 260,
    background: "#1a1a2e",
    color: "#fff",
    padding: "20px 20px 15px 20px",
    display: "flex",
    flexDirection: "column",
    position: "fixed",
    height: "100vh",
    left: 0,
    top: 0,
    overflowY: "auto",
    boxSizing: "border-box",
  },
  sidebarHeader: {
    marginBottom: 20,
    flexShrink: 0,
  },
  sidebarTitle: {
    textAlign: "center",
    paddingBottom: 10,
    borderBottom: "1px solid rgba(255,255,255,0.1)",
    margin: 0,
    fontSize: 22,
    color: "#f39c12",
  },
  orgInfo: {
    textAlign: "center",
    fontSize: 14,
    marginTop: 10,
    marginBottom: 0,
    color: "#ecf0f1",
  },
  locationInfo: {
    textAlign: "center",
    fontSize: 12,
    color: "#95a5a6",
    marginTop: 5,
    marginBottom: 5,
  },
  userInfo: {
    textAlign: "center",
    fontSize: 12,
    color: "#95a5a6",
    marginTop: 5,
    marginBottom: 0,
  },
  nav: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    flex: 1,
    minHeight: 0,
    paddingBottom: 15,
  },
  navButton: {
    padding: "12px",
    borderRadius: 6,
    border: "none",
    cursor: "pointer",
    background: "#16213e",
    color: "#fff",
    textAlign: "center",
    fontSize: 14,
    transition: "all 0.2s",
    flexShrink: 0,
  },
  navButtonActive: {
    background: "#f39c12",
    fontWeight: "bold",
  },
  logoutButton: {
    padding: "12px",
    borderRadius: 6,
    border: "none",
    cursor: "pointer",
    background: "#e74c3c",
    color: "#fff",
    fontWeight: "bold",
    flexShrink: 0,
    textAlign: "center",
  },
  main: {
    flex: 1,
    marginLeft: 260,
    padding: 30,
    overflowY: "auto",
    position: "relative",
    minHeight: "100vh",
  },
  loadingOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  spinner: {
    background: "white",
    padding: "20px 40px",
    borderRadius: 8,
    fontSize: 18,
    fontWeight: "bold",
  },
  content: {
    maxWidth: 1400,
    margin: "0 auto",
  },
  pageTitle: {
    fontSize: 32,
    marginBottom: 30,
    color: "#2c3e50",
  },
  sectionTitle: {
    fontSize: 22,
    marginTop: 40,
    marginBottom: 15,
    color: "#34495e",
  },
  formCard: {
    background: "white",
    padding: 30,
    borderRadius: 10,
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    marginBottom: 30,
    maxWidth: 600,
  },
  tableCard: {
    background: "white",
    padding: 20,
    borderRadius: 10,
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    marginBottom: 30,
    overflowX: "auto",
  },
  chartCard: {
    background: "white",
    padding: 20,
    borderRadius: 10,
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    marginBottom: 30,
  },
  cardTitle: {
    fontSize: 18,
    marginBottom: 20,
    color: "#2c3e50",
  },
  formGroup: {
    marginBottom: 15,
  },
  label: {
    display: "block",
    marginBottom: 5,
    fontWeight: "bold",
    color: "#34495e",
  },
  input: {
    width: "100%",
    padding: 12,
    borderRadius: 6,
    border: "1px solid #d0d7de",
    fontSize: 14,
    boxSizing: "border-box",
  },
  primaryButton: {
    padding: "12px 24px",
    borderRadius: 6,
    border: "none",
    background: "#f39c12",
    color: "#fff",
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: 15,
    width: "100%",
  },
  helperText: {
    fontSize: 13,
    color: "#7f8c8d",
    marginBottom: 15,
    marginTop: 10,
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 20,
    marginBottom: 30,
  },
  statCard: {
    background: "white",
    padding: 20,
    borderRadius: 10,
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    textAlign: "center",
  },
  statLabel: {
    fontSize: 12,
    color: "#7f8c8d",
    margin: 0,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  statValue: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#2c3e50",
    margin: 0,
  },
  errorBox: {
    background: "#fee2e2",
    color: "#dc2626",
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    textAlign: "center",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  tableHeaderRow: {
    background: "#34495e",
    color: "#fff",
  },
  th: {
    padding: 12,
    textAlign: "left",
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  tableRow: {
    borderBottom: "1px solid #ecf0f1",
  },
  td: {
    padding: 12,
    fontSize: 14,
  },
  badgeSuccess: {
    padding: "4px 10px",
    borderRadius: 4,
    background: "#d4edda",
    color: "#155724",
    fontSize: 12,
    fontWeight: "bold",
  },
  badgeWarning: {
    padding: "4px 10px",
    borderRadius: 4,
    background: "#fff3cd",
    color: "#856404",
    fontSize: 12,
    fontWeight: "bold",
  },
  badgeDanger: {
    padding: "4px 10px",
    borderRadius: 4,
    background: "#f8d7da",
    color: "#721c24",
    fontSize: 12,
    fontWeight: "bold",
  },
  emptyState: {
    textAlign: "center",
    padding: "40px",
    color: "#7f8c8d",
  },
};

export default ManagerDashboard;