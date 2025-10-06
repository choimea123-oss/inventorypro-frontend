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

const Admin = () => {
  const user = JSON.parse(localStorage.getItem("user"));
  const orgId = user?.org_id;

  const [tab, setTab] = useState("overview");
  const [branches, setBranches] = useState([]);
  const [users, setUsers] = useState([]);
  const [inventorySummary, setInventorySummary] = useState([]);
  const [salesSummary, setSalesSummary] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [salesTrend, setSalesTrend] = useState([]);
  const [loading, setLoading] = useState(false);

  const [selectedBranchInventory, setSelectedBranchInventory] = useState(null);
  const [branchInventoryDetail, setBranchInventoryDetail] = useState([]);

  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("manager");
  const [newBranchId, setNewBranchId] = useState("");

  const [branchName, setBranchName] = useState("");
  const [branchLocation, setBranchLocation] = useState("");

  useEffect(() => {
    if (orgId) {
      api
        .get(`/branches/${orgId}`)
        .then((res) => setBranches(res.data))
        .catch((err) => console.error("Branches error:", err));
    }
  }, [orgId]);

  useEffect(() => {
    if (!orgId) return;

    if (tab === "overview") {
      setLoading(true);
      Promise.all([
        api.get(`/admin/inventory-summary/${orgId}`),
        api.get(`/admin/sales-summary/${orgId}`),
        api.get(`/admin/top-products/${orgId}`),
        api.get(`/admin/sales-trend/${orgId}`),
      ])
        .then(([inv, sales, products, trend]) => {
          setInventorySummary(inv.data);
          setSalesSummary(sales.data);
          setTopProducts(products.data);
          setSalesTrend(trend.data);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Overview error:", err);
          setLoading(false);
        });
    } else if (tab === "users") {
      setLoading(true);
      api
        .get(`/admin/users/${orgId}`)
        .then((res) => {
          setUsers(res.data);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Users error:", err);
          setLoading(false);
        });
    }
  }, [tab, orgId]);

  const fetchBranchInventory = async (branchId, branchName) => {
    if (!orgId || !branchId) return;
    
    setLoading(true);
    try {
      const res = await api.get(`/inventory/${branchId}/${orgId}`);
      setBranchInventoryDetail(res.data);
      setSelectedBranchInventory(branchName);
    } catch (err) {
      console.error("Branch inventory error:", err);
      alert("Failed to load branch inventory");
    } finally {
      setLoading(false);
    }
  };

  const closeBranchInventory = () => {
    setSelectedBranchInventory(null);
    setBranchInventoryDetail([]);
  };

  const generateSalesReport = () => {
    if (!salesSummary || salesSummary.length === 0) {
      alert("No sales data available to generate report");
      return;
    }

    if (typeof window.jspdf === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      script.onload = () => generateReport();
      document.head.appendChild(script);
    } else {
      generateReport();
    }

    function generateReport() {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      
      doc.setFontSize(20);
      doc.setFont(undefined, 'bold');
      doc.text("SALES REPORT", 105, 20, { align: "center" });
      
      doc.setFontSize(12);
      doc.setFont(undefined, 'normal');
      doc.text(`Organization: ${user?.org_name || "N/A"}`, 20, 35);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 42);
      doc.text(`Report Type: All Branches Overview`, 20, 49);
      
      doc.line(20, 55, 190, 55);
      
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text("Overall Summary", 20, 65);
      
      const totalRevenue = salesSummary.reduce((sum, branch) => sum + parseFloat(branch.total_revenue || 0), 0);
      const totalTransactions = salesSummary.reduce((sum, branch) => sum + parseInt(branch.total_transactions || 0), 0);
      const totalBranches = salesSummary.length;
      const avgPerBranch = totalBranches > 0 ? totalRevenue / totalBranches : 0;
      
      doc.setFontSize(11);
      doc.setFont(undefined, 'normal');
      doc.text(`Total Branches: ${totalBranches}`, 20, 75);
      doc.text(`Total Transactions: ${totalTransactions}`, 20, 82);
      doc.text(`Total Revenue: PHP ${totalRevenue.toFixed(2)}`, 20, 89);
      doc.text(`Average Revenue per Branch: PHP ${avgPerBranch.toFixed(2)}`, 20, 96);
      
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text("Sales by Branch", 20, 112);
      
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      let y = 122;
      doc.text("Branch", 20, y);
      doc.text("Location", 70, y);
      doc.text("Trans.", 115, y);
      doc.text("Revenue", 140, y);
      doc.text("Avg/Trans", 170, y);
      
      doc.line(20, y + 2, 190, y + 2);
      
      doc.setFont(undefined, 'normal');
      y += 8;
      
      salesSummary.forEach((branch, idx) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        
        doc.text(branch.branch_name.substring(0, 20), 20, y);
        doc.text(branch.location.substring(0, 18), 70, y);
        doc.text(branch.total_transactions.toString(), 115, y);
        doc.text(`PHP ${parseFloat(branch.total_revenue).toFixed(2)}`, 140, y);
        doc.text(`PHP ${parseFloat(branch.avg_transaction_value).toFixed(2)}`, 170, y);
        
        y += 7;
      });
      
      if (topProducts && topProducts.length > 0 && y < 220) {
        y += 10;
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text("Top 10 Products (Organization-wide)", 20, y);
        
        y += 8;
        doc.setFontSize(9);
        doc.text("Product", 20, y);
        doc.text("Category", 80, y);
        doc.text("Sold", 120, y);
        doc.text("Revenue", 145, y);
        doc.text("Trans.", 175, y);
        
        doc.line(20, y + 2, 190, y + 2);
        
        doc.setFont(undefined, 'normal');
        y += 8;
        
        topProducts.slice(0, 10).forEach((product) => {
          if (y > 275) return;
          
          doc.text(product.product_name.substring(0, 25), 20, y);
          doc.text((product.category || "N/A").substring(0, 15), 80, y);
          doc.text(product.total_sold.toString(), 120, y);
          doc.text(`PHP ${parseFloat(product.total_revenue).toFixed(2)}`, 145, y);
          doc.text(product.transaction_count.toString(), 175, y);
          
          y += 6;
        });
      }
      
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont(undefined, 'italic');
        doc.text(`Page ${i} of ${pageCount}`, 105, 285, { align: "center" });
        doc.text("This is a system-generated report", 105, 290, { align: "center" });
      }
      
      const fileName = `Sales_Report_${user?.org_name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
    }
  };

  const handleCreateBranch = async (e) => {
    e.preventDefault();
    if (!branchName || !branchLocation) {
      alert("Please fill all fields");
      return;
    }

    try {
      await api.post("/branches", {
        branch_name: branchName,
        location: branchLocation,
        org_id: orgId,
      });
      alert("Branch created successfully!");
      setBranchName("");
      setBranchLocation("");
      const res = await api.get(`/branches/${orgId}`);
      setBranches(res.data);
    } catch (err) {
      alert("Error: " + (err.response?.data?.message || "Failed to create branch"));
    }
  };

  const handleRegisterUser = async (e) => {
    e.preventDefault();

    if (!newUsername || !newPassword || !newRole) {
      alert("Please fill all fields");
      return;
    }

    if (newRole !== "admin" && !newBranchId) {
      alert("Please select a branch for this role");
      return;
    }

    try {
      await api.post("/register", {
        username: newUsername,
        password: newPassword,
        role: newRole,
        branch_id: newRole === "admin" ? null : newBranchId,
        org_id: orgId,
      });
      alert(`${newRole} registered successfully!`);
      setNewUsername("");
      setNewPassword("");
      setNewRole("manager");
      setNewBranchId("");
      if (tab === "users") {
        const res = await api.get(`/admin/users/${orgId}`);
        setUsers(res.data);
      }
    } catch (err) {
      alert("Error: " + (err.response?.data?.message || "Failed to register user"));
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;

    try {
      await api.delete(`/admin/users/${userId}`, {
        data: { org_id: orgId },
      });
      alert("User deleted successfully");
      const res = await api.get(`/admin/users/${orgId}`);
      setUsers(res.data);
    } catch (err) {
      alert("Error: " + (err.response?.data?.message || "Failed to delete user"));
    }
  };

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      localStorage.removeItem("user");
      window.location.href = "/";
    }
  };

  const salesTrendData = {
    labels: salesTrend.map((s) => new Date(s.date).toLocaleDateString()),
    datasets: [
      {
        label: "Daily Revenue (₱)",
        data: salesTrend.map((s) => parseFloat(s.daily_revenue || 0)),
        backgroundColor: "rgba(46, 204, 113, 0.7)",
        borderRadius: 8,
      },
    ],
  };

  return (
    <div style={styles.page}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <h2 style={styles.sidebarTitle}>Admin Panel</h2>
          <p style={styles.orgInfo}>
            <strong>{user?.org_name || "Organization"}</strong>
          </p>
          <p style={styles.userInfo}>Admin: {user?.username}</p>
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
            onClick={() => setTab("branches")}
            style={{
              ...styles.navButton,
              ...(tab === "branches" ? styles.navButtonActive : {}),
            }}
          >
            Branches
          </button>

          <button
            onClick={() => setTab("users")}
            style={{
              ...styles.navButton,
              ...(tab === "users" ? styles.navButtonActive : {}),
            }}
          >
            Users
          </button>

          <button
            onClick={() => setTab("register")}
            style={{
              ...styles.navButton,
              ...(tab === "register" ? styles.navButtonActive : {}),
            }}
          >
            Register User
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
            <h1 style={styles.pageTitle}>Organization Overview</h1>

            <h2 style={styles.sectionTitle}>Inventory by Branch</h2>
            <div style={styles.tableCard}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeaderRow}>
                    <th style={styles.th}>Branch</th>
                    <th style={styles.th}>Location</th>
                    <th style={styles.th}>Products</th>
                    <th style={styles.th}>Total Stock</th>
                    <th style={styles.th}>Low Stock Items</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {inventorySummary.map((branch, idx) => (
                    <tr key={idx} style={styles.tableRow}>
                      <td style={styles.td}>{branch.branch_name}</td>
                      <td style={styles.td}>{branch.location}</td>
                      <td style={styles.td}>{branch.total_products}</td>
                      <td style={styles.td}>{branch.total_stock}</td>
                      <td style={styles.td}>
                        <span style={branch.low_stock_items > 0 ? styles.badgeWarning : styles.badgeSuccess}>
                          {branch.low_stock_items}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <button
                          onClick={() => fetchBranchInventory(branch.branch_id, branch.branch_name)}
                          style={styles.viewButton}
                        >
                          View Inventory
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h2 style={styles.sectionTitle}>Sales by Branch</h2>
            <div style={styles.tableCard}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                <h3 style={{ margin: 0, fontSize: "16px", color: "#2c3e50" }}>Sales Performance</h3>
                <button
                  onClick={generateSalesReport}
                  style={{
                    padding: "8px 16px",
                    background: "#e74c3c",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontWeight: "bold",
                    fontSize: "13px",
                  }}
                >
                  Download PDF Report
                </button>
              </div>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeaderRow}>
                    <th style={styles.th}>Branch</th>
                    <th style={styles.th}>Location</th>
                    <th style={styles.th}>Transactions</th>
                    <th style={styles.th}>Total Revenue</th>
                    <th style={styles.th}>Avg Transaction</th>
                  </tr>
                </thead>
                <tbody>
                  {salesSummary.map((branch, idx) => (
                    <tr key={idx} style={styles.tableRow}>
                      <td style={styles.td}>{branch.branch_name}</td>
                      <td style={styles.td}>{branch.location}</td>
                      <td style={styles.td}>{branch.total_transactions}</td>
                      <td style={styles.td}>₱{parseFloat(branch.total_revenue).toFixed(2)}</td>
                      <td style={styles.td}>₱{parseFloat(branch.avg_transaction_value).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h2 style={styles.sectionTitle}>Top 10 Products</h2>
            <div style={styles.tableCard}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeaderRow}>
                    <th style={styles.th}>Product</th>
                    <th style={styles.th}>Category</th>
                    <th style={styles.th}>Total Sold</th>
                    <th style={styles.th}>Revenue</th>
                    <th style={styles.th}>Transactions</th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.slice(0, 10).map((product, idx) => (
                    <tr key={idx} style={styles.tableRow}>
                      <td style={styles.td}>{product.product_name}</td>
                      <td style={styles.td}>{product.category || "N/A"}</td>
                      <td style={styles.td}>{product.total_sold}</td>
                      <td style={styles.td}>₱{parseFloat(product.total_revenue).toFixed(2)}</td>
                      <td style={styles.td}>{product.transaction_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h2 style={styles.sectionTitle}>Sales Trend (Last 30 Days)</h2>
            <div style={styles.chartCard}>
              {salesTrend.length > 0 ? (
                <Bar data={salesTrendData} options={{ responsive: true, maintainAspectRatio: true }} />
              ) : (
                <p style={styles.emptyState}>No sales data available</p>
              )}
            </div>
          </div>
        )}

        {/* BRANCHES TAB */}
        {tab === "branches" && (
          <div style={styles.content}>
            <h1 style={styles.pageTitle}>Manage Branches</h1>

            <div style={styles.formCard}>
              <h3 style={styles.cardTitle}>Create New Branch</h3>
              <form onSubmit={handleCreateBranch} style={styles.form}>
                <input
                  type="text"
                  placeholder="Branch Name"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  style={styles.input}
                  required
                />
                <input
                  type="text"
                  placeholder="Location"
                  value={branchLocation}
                  onChange={(e) => setBranchLocation(e.target.value)}
                  style={styles.input}
                  required
                />
                <button type="submit" style={styles.primaryButton}>
                  Create Branch
                </button>
              </form>
            </div>

            <div style={styles.tableCard}>
              <h3 style={styles.cardTitle}>All Branches</h3>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeaderRow}>
                    <th style={styles.th}>Branch ID</th>
                    <th style={styles.th}>Branch Name</th>
                    <th style={styles.th}>Location</th>
                    <th style={styles.th}>Manager</th>
                  </tr>
                </thead>
                <tbody>
                  {branches.map((branch, idx) => (
                    <tr key={idx} style={styles.tableRow}>
                      <td style={styles.td}>{branch.branch_id}</td>
                      <td style={styles.td}>{branch.branch_name}</td>
                      <td style={styles.td}>{branch.location}</td>
                      <td style={styles.td}>{branch.manager_username || "No manager"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* USERS TAB */}
        {tab === "users" && (
          <div style={styles.content}>
            <h1 style={styles.pageTitle}>Manage Users</h1>
            <div style={styles.tableCard}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeaderRow}>
                    <th style={styles.th}>User ID</th>
                    <th style={styles.th}>Username</th>
                    <th style={styles.th}>Role</th>
                    <th style={styles.th}>Branch</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, idx) => (
                    <tr key={idx} style={styles.tableRow}>
                      <td style={styles.td}>{u.user_id}</td>
                      <td style={styles.td}>{u.username}</td>
                      <td style={styles.td}>
                        <span
                          style={
                            u.role === "admin"
                              ? styles.badgeDanger
                              : u.role === "manager"
                              ? styles.badgeWarning
                              : styles.badgeInfo
                          }
                        >
                          {u.role}
                        </span>
                      </td>
                      <td style={styles.td}>{u.branch_name || "N/A"}</td>
                      <td style={styles.td}>
                        {u.username !== user?.username && (
                          <button
                            onClick={() => handleDeleteUser(u.user_id)}
                            style={styles.deleteButton}
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* REGISTER USER TAB */}
        {tab === "register" && (
          <div style={styles.content}>
            <h1 style={styles.pageTitle}>Register New User</h1>
            <div style={styles.formCard}>
              <form onSubmit={handleRegisterUser}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Username:</label>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    style={styles.input}
                    required
                    minLength={3}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Password:</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    style={styles.input}
                    required
                    minLength={6}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Role:</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    style={styles.input}
                  >
                    <option value="manager">Manager</option>
                  </select>
                </div>

                {newRole !== "admin" && (
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Branch:</label>
                    <select
                      value={newBranchId}
                      onChange={(e) => setNewBranchId(e.target.value)}
                      style={styles.input}
                      required
                    >
                      <option value="">Select Branch</option>
                      {branches.map((b) => (
                        <option key={b.branch_id} value={b.branch_id}>
                          {b.branch_name} - {b.location}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <button type="submit" style={styles.primaryButton}>
                  Register User
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Branch Inventory Detail Modal */}
        {selectedBranchInventory && (
          <div style={styles.modal} onClick={closeBranchInventory}>
            <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div style={styles.modalHeader}>
                <h2 style={{ margin: 0 }}>{selectedBranchInventory} - Inventory Detail</h2>
                <button onClick={closeBranchInventory} style={styles.closeButton}>
                  ×
                </button>
              </div>
              <div style={styles.modalBody}>
                {branchInventoryDetail.length > 0 ? (
                  <table style={styles.table}>
                    <thead>
                      <tr style={styles.tableHeaderRow}>
                        <th style={styles.th}>Product ID</th>
                        <th style={styles.th}>Product Name</th>
                        <th style={styles.th}>Category</th>
                        <th style={styles.th}>Price</th>
                        <th style={styles.th}>Quantity</th>
                        <th style={styles.th}>Barcode</th>
                      </tr>
                    </thead>
                    <tbody>
                      {branchInventoryDetail.map((item, idx) => (
                        <tr 
                          key={idx} 
                          style={{
                            ...styles.tableRow,
                            background: item.quantity < 5 ? "#fee2e2" : idx % 2 === 0 ? "#f9fafb" : "white"
                          }}
                        >
                          <td style={styles.td}>{item.product_id}</td>
                          <td style={styles.td}>{item.product_name}</td>
                          <td style={styles.td}>{item.category || "N/A"}</td>
                          <td style={styles.td}>₱{parseFloat(item.product_price).toFixed(2)}</td>
                          <td style={{
                            ...styles.td,
                            fontWeight: item.quantity < 5 ? "bold" : "normal",
                            color: item.quantity < 5 ? "#dc2626" : "inherit"
                          }}>
                            {item.quantity}
                            {item.quantity < 5 && " (Low!)"}
                          </td>
                          <td style={styles.td}>{item.barcode || "N/A"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p style={styles.emptyState}>No inventory data available for this branch</p>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

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
    textAlign: "center", // Changed from "left" to "center"
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
    textAlign: "center", // Added
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
  form: {
    display: "flex",
    gap: 15,
    flexDirection: "column",
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
  },
  deleteButton: {
    padding: "6px 12px",
    borderRadius: 4,
    border: "none",
    background: "#e74c3c",
    color: "#fff",
    cursor: "pointer",
    fontSize: 12,
  },
  viewButton: {
    padding: "6px 12px",
    borderRadius: 4,
    border: "none",
    background: "#3498db",
    color: "#fff",
    cursor: "pointer",
    fontSize: 12,
  },
  modal: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0, 0, 0, 0.7)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2000,
  },
  modalContent: {
    background: "white",
    borderRadius: 12,
    maxWidth: "90%",
    maxHeight: "90vh",
    width: "1000px",
    display: "flex",
    flexDirection: "column",
    boxShadow: "0 10px 40px rgba(0,0,0,0.3)",
  },
  modalHeader: {
    padding: "20px 30px",
    borderBottom: "2px solid #e5e7eb",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "#f8f9fa",
    borderRadius: "12px 12px 0 0",
  },
  modalBody: {
    padding: "20px 30px",
    overflowY: "auto",
    flex: 1,
  },
  closeButton: {
    background: "none",
    border: "none",
    fontSize: "32px",
    cursor: "pointer",
    color: "#666",
    padding: "0 10px",
    lineHeight: 1,
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
  badgeInfo: {
    padding: "4px 10px",
    borderRadius: 4,
    background: "#d1ecf1",
    color: "#0c5460",
    fontSize: 12,
    fontWeight: "bold",
  },
  emptyState: {
    textAlign: "center",
    padding: "40px",
    color: "#7f8c8d",
  },
};

export default Admin;