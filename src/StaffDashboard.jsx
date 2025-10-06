// StaffDashboard.jsx
import React, { useState, useEffect } from "react";
import api from './utils/api';
import { BrowserMultiFormatReader } from "@zxing/library";

const StaffDashboard = ({ user }) => {
  const [tab, setTab] = useState("inventory");
  const [products, setProducts] = useState([]);
  const [newProduct, setNewProduct] = useState({
    product_name: "",
    product_desc: "",
    category: "",
    product_price: "",
    quantity: "",
    barcode: "",
    branch_id: user?.branch_id || null,
    org_id: user?.org_id || null,
  });
  const [scanner, setScanner] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [restockModal, setRestockModal] = useState(null);
  const [restockAmount, setRestockAmount] = useState("");

  // POS State
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredProducts, setFilteredProducts] = useState([]);

  const branchId = user?.branch_id;
  const orgId = user?.org_id;

  // Filter products for POS search
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredProducts([]);
    } else {
      const filtered = products.filter(
        (p) =>
          p.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.barcode?.includes(searchTerm) ||
          p.category?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredProducts(filtered);
    }
  }, [searchTerm, products]);

  // Fetch products for branch
  useEffect(() => {
    if (!branchId || !orgId) {
      console.warn("No branch_id or org_id for user, skipping inventory fetch");
      return;
    }
    setLoading(true);
    api
      .get(`/inventory/${branchId}/${orgId}`)
      .then((res) => {
        setProducts(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading products:", err);
        setLoading(false);
        alert("Failed to load inventory");
      });
  }, [branchId, orgId]);

  // Handle form inputs
  const handleChange = (e) => {
    setNewProduct({ ...newProduct, [e.target.name]: e.target.value });
  };

  // Auto-generate barcode
  const generateBarcode = () => {
    const code = "BC" + Date.now();
    setNewProduct((prev) => ({ ...prev, barcode: code }));
  };

  // Add product
  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!branchId || !orgId) {
      alert("Cannot add product without a branch and organization assigned");
      return;
    }

    try {
      setLoading(true);
      const payload = {
        ...newProduct,
        product_price: parseFloat(newProduct.product_price) || 0,
        quantity: parseInt(newProduct.quantity) || 0,
        branch_id: branchId,
        org_id: orgId,
      };

      if (!payload.product_name.trim() || payload.product_price <= 0 || payload.quantity < 0) {
        alert("Please fill required fields correctly (name, positive price, non-negative quantity)");
        setLoading(false);
        return;
      }

      const res = await api.post("/products/add", payload);
      alert(res.data.message);

      const addedProduct = {
        ...payload,
        product_id: res.data.product_id,
        product_desc: payload.product_desc || null,
        category: payload.category || null,
        barcode: payload.barcode || null,
        quantity: payload.quantity,
      };

      setProducts([...products, addedProduct]);

      setNewProduct({
        product_name: "",
        product_desc: "",
        category: "",
        product_price: "",
        quantity: "",
        barcode: "",
        branch_id: branchId,
        org_id: orgId,
      });
    } catch (err) {
      console.error("Failed to add product:", err);
      const errorMsg = err.response?.data?.message || "Failed to add product";
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Barcode scanning
  const startScanner = () => {
    if (scanning || !navigator.mediaDevices) {
      alert("Camera access not available");
      return;
    }
    const codeReader = new BrowserMultiFormatReader();
    setScanner(codeReader);
    setScanning(true);

    setTimeout(() => {
      codeReader
        .decodeOnceFromVideoDevice(undefined, "video")
        .then((result) => {
          console.log("Scanned barcode:", result.text);
          setNewProduct((prev) => ({ ...prev, barcode: result.text }));
          stopScanner();
        })
        .catch((err) => {
          console.error("Scanner error:", err);
          alert("Scan failed. Please try again.");
          stopScanner();
        });
    }, 500);
  };

  const stopScanner = () => {
    if (scanner) {
      scanner.reset();
      setScanner(null);
    }
    const videoElem = document.getElementById("video");
    if (videoElem && videoElem.srcObject) {
      videoElem.srcObject.getTracks().forEach((track) => track.stop());
    }
    setScanning(false);
  };

  // Logout
  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      localStorage.removeItem("user");
      window.location.href = "/";
    }
  };

  // Restock product
  const openRestockModal = (product) => {
    setRestockModal(product);
    setRestockAmount("");
  };

  const closeRestockModal = () => {
    setRestockModal(null);
    setRestockAmount("");
  };

  const handleRestock = async () => {
    if (!restockModal) return;

    const amount = parseInt(restockAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid positive quantity");
      return;
    }

    try {
      setLoading(true);
      const newQuantity = restockModal.quantity + amount;

      await api.put(`/products/restock/${restockModal.product_id}`, {
        quantity: newQuantity,
        branch_id: branchId,
        org_id: orgId,
      });

      alert(`Successfully restocked ${restockModal.product_name}!\nAdded: ${amount}\nNew quantity: ${newQuantity}`);

      setProducts(
        products.map((p) =>
          p.product_id === restockModal.product_id ? { ...p, quantity: newQuantity } : p
        )
      );

      closeRestockModal();
    } catch (err) {
      console.error("Restock error:", err);
      alert("Error: " + (err.response?.data?.message || "Failed to restock product"));
    } finally {
      setLoading(false);
    }
  };

  // POS Functions
  const addToCart = (product) => {
    if (product.quantity <= 0) {
      alert("Product is out of stock!");
      return;
    }

    const existingItem = cart.find((item) => item.product_id === product.product_id);
    
    if (existingItem) {
      if (existingItem.cartQuantity >= product.quantity) {
        alert("Cannot add more than available stock!");
        return;
      }
      setCart(
        cart.map((item) =>
          item.product_id === product.product_id
            ? { ...item, cartQuantity: item.cartQuantity + 1 }
            : item
        )
      );
    } else {
      setCart([...cart, { ...product, cartQuantity: 1 }]);
    }
    setSearchTerm("");
    setFilteredProducts([]);
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter((item) => item.product_id !== productId));
  };

  const updateCartQuantity = (productId, newQuantity) => {
    const product = products.find((p) => p.product_id === productId);
    
    if (newQuantity > product.quantity) {
      alert("Cannot exceed available stock!");
      return;
    }
    
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart(
      cart.map((item) =>
        item.product_id === productId ? { ...item, cartQuantity: newQuantity } : item
      )
    );
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + item.product_price * item.cartQuantity, 0);
  };

  const processSale = async () => {
    if (cart.length === 0) {
      alert("Cart is empty!");
      return;
    }

    if (!branchId || !orgId) {
      alert("Branch or organization information missing!");
      return;
    }

    const saleItems = cart.map((item) => ({
      product_id: item.product_id,
      quantity: item.cartQuantity,
      unit_price: item.product_price,
    }));

    const totalAmount = calculateTotal();

    try {
      setLoading(true);
      await api.post("/sales/create", {
        branch_id: branchId,
        org_id: orgId,
        items: saleItems,
        total_amount: totalAmount,
      });

      alert(`Sale completed! Total: ₱${totalAmount.toFixed(2)}`);
      
      const updatedProducts = products.map((p) => {
        const soldItem = cart.find((item) => item.product_id === p.product_id);
        if (soldItem) {
          return { ...p, quantity: p.quantity - soldItem.cartQuantity };
        }
        return p;
      });
      setProducts(updatedProducts);

      setCart([]);
    } catch (err) {
      console.error("Sale error:", err);
      alert("Error: " + (err.response?.data?.message || "Failed to process sale"));
    } finally {
      setLoading(false);
    }
  };

  const clearCart = () => {
    if (cart.length > 0 && !window.confirm("Clear cart?")) return;
    setCart([]);
  };

  // Download and Print barcode functions
  const downloadBarcode = (product) => {
    if (!product.barcode) {
      alert("This product has no barcode");
      return;
    }

    try {
      if (typeof JsBarcode === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js';
        script.onload = () => generateAndDownload();
        document.head.appendChild(script);
      } else {
        generateAndDownload();
      }
      
      function generateAndDownload() {
        const labelCanvas = document.createElement("canvas");
        const ctx = labelCanvas.getContext("2d");
        
        labelCanvas.width = 400;
        labelCanvas.height = 250;
        
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, labelCanvas.width, labelCanvas.height);
        
        ctx.fillStyle = "black";
        ctx.font = "bold 16px Arial";
        ctx.textAlign = "center";
        ctx.fillText(product.product_name, labelCanvas.width / 2, 30);
        
        ctx.font = "14px Arial";
        ctx.fillText(`₱${parseFloat(product.product_price).toFixed(2)}`, labelCanvas.width / 2, 50);
        
        const barcodeCanvas = document.createElement("canvas");
        
        try {
          JsBarcode(barcodeCanvas, product.barcode, {
            format: "CODE128",
            width: 2,
            height: 80,
            displayValue: true,
            fontSize: 14,
            margin: 10,
          });
          
          ctx.drawImage(barcodeCanvas, (labelCanvas.width - barcodeCanvas.width) / 2, 70);
          
          if (product.category) {
            ctx.font = "12px Arial";
            ctx.fillStyle = "#666";
            ctx.fillText(product.category, labelCanvas.width / 2, labelCanvas.height - 20);
          }
          
          labelCanvas.toBlob((blob) => {
            if (!blob) {
              alert("Failed to generate barcode image");
              return;
            }
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `barcode_${product.barcode}_${product.product_name.replace(/\s+/g, "_")}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          }, "image/png");
          
        } catch (error) {
          console.error("Barcode generation error:", error);
          alert("Invalid barcode format. Please use alphanumeric characters only.");
        }
      }
    } catch (error) {
      console.error("Download error:", error);
      alert("Failed to generate barcode");
    }
  };

  const printBarcode = (product) => {
    if (!product.barcode) {
      alert("This product has no barcode");
      return;
    }

    if (typeof JsBarcode === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js';
      script.onload = () => generateAndPrint();
      document.head.appendChild(script);
    } else {
      generateAndPrint();
    }

    function generateAndPrint() {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        
        const receiptWidth = 220;
        canvas.width = receiptWidth;
        canvas.height = 300;
        
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = "black";
        ctx.font = "bold 11px Arial";
        ctx.textAlign = "center";
        
        const productName = product.product_name;
        const maxWidth = canvas.width - 20;
        const words = productName.split(" ");
        let line = "";
        let y = 20;
        
        for (let i = 0; i < words.length; i++) {
          const testLine = line + words[i] + " ";
          const metrics = ctx.measureText(testLine);
          
          if (metrics.width > maxWidth && i > 0) {
            ctx.fillText(line, canvas.width / 2, y);
            line = words[i] + " ";
            y += 14;
          } else {
            line = testLine;
          }
        }
        ctx.fillText(line, canvas.width / 2, y);
        
        ctx.font = "bold 12px Arial";
        ctx.fillText(`₱${parseFloat(product.product_price).toFixed(2)}`, canvas.width / 2, y + 20);
        
        const barcodeCanvas = document.createElement("canvas");
        
        try {
          JsBarcode(barcodeCanvas, product.barcode, {
            format: "CODE128",
            width: 1.5,
            height: 60,
            displayValue: true,
            fontSize: 10,
            margin: 5,
          });
          
          const barcodeY = y + 35;
          ctx.drawImage(barcodeCanvas, (canvas.width - barcodeCanvas.width) / 2, barcodeY);
          
          if (product.category) {
            ctx.font = "9px Arial";
            ctx.fillStyle = "#666";
            ctx.fillText(product.category, canvas.width / 2, barcodeY + barcodeCanvas.height + 15);
          }
          
          const imageData = canvas.toDataURL("image/png");
          
          const printWindow = window.open("", "_blank");
          
          if (!printWindow) {
            alert("Please allow pop-ups to print barcodes");
            return;
          }
          
          printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>Print Barcode - ${product.product_name}</title>
              <style>
                @page {
                  size: 58mm auto;
                  margin: 0;
                }
                * {
                  margin: 0;
                  padding: 0;
                  box-sizing: border-box;
                }
                body {
                  width: 58mm;
                  font-family: Arial, sans-serif;
                  padding: 5mm 0;
                  background: white;
                }
                .barcode-container {
                  width: 100%;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                }
                img {
                  width: 100%;
                  height: auto;
                  display: block;
                }
                @media print {
                  body {
                    padding: 0;
                  }
                }
              </style>
            </head>
            <body>
              <div class="barcode-container">
                <img src="${imageData}" alt="Barcode" />
              </div>
            </body>
            </html>
          `);
          
          printWindow.document.close();
          
          printWindow.onload = () => {
            setTimeout(() => {
              printWindow.print();
            }, 250);
          };
          
        } catch (error) {
          console.error("Barcode generation error:", error);
          alert("Invalid barcode format. Please use alphanumeric characters only.");
        }
      } catch (error) {
        console.error("Print error:", error);
        alert("Failed to generate barcode for printing");
      }
    }
  };

  return (
    <div style={styles.page}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <h2 style={styles.sidebarTitle}>Staff Panel</h2>
          <p style={styles.orgInfo}>
            <strong>{user?.org_name || "Organization"}</strong>
          </p>
          <p style={styles.userInfo}>Staff: {user?.username}</p>
        </div>

        <nav style={styles.nav}>
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
            onClick={() => setTab("pos")}
            style={{
              ...styles.navButton,
              ...(tab === "pos" ? styles.navButtonActive : {}),
            }}
          >
            Point of Sale
          </button>
        </nav>

        <button onClick={handleLogout} style={styles.logoutButton}>
          Logout
        </button>
      </aside>

      {/* Main Content */}
      <main style={styles.main}>
        {loading && products.length === 0 && (
          <div style={styles.loadingOverlay}>
            <div style={styles.spinner}>Loading...</div>
          </div>
        )}

        {(!branchId || !orgId) && (
          <div style={styles.errorBox}>
            No branch assigned. Contact admin to add products.
          </div>
        )}

        {/* INVENTORY TAB */}
        {tab === "inventory" && (
          <div style={styles.content}>
            <h1 style={styles.pageTitle}>Inventory Management</h1>

            {/* Add Product Form */}
            <div style={styles.formCard}>
              <h3 style={styles.cardTitle}>Add New Product</h3>
              <form onSubmit={handleAddProduct}>
                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Product Name:</label>
                    <input
                      type="text"
                      name="product_name"
                      placeholder="Enter product name"
                      value={newProduct.product_name}
                      onChange={handleChange}
                      required
                      style={styles.input}
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Category:</label>
                    <input
                      type="text"
                      name="category"
                      placeholder="Enter category"
                      value={newProduct.category}
                      onChange={handleChange}
                      style={styles.input}
                    />
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Description:</label>
                  <input
                    type="text"
                    name="product_desc"
                    placeholder="Enter product description"
                    value={newProduct.product_desc}
                    onChange={handleChange}
                    style={styles.input}
                  />
                </div>

                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Price:</label>
                    <input
                      type="number"
                      name="product_price"
                      placeholder="0.00"
                      value={newProduct.product_price}
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                      required
                      style={styles.input}
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Initial Quantity:</label>
                    <input
                      type="number"
                      name="quantity"
                      placeholder="0"
                      value={newProduct.quantity}
                      onChange={handleChange}
                      min="0"
                      required
                      style={styles.input}
                    />
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Barcode:</label>
                  <input
                    type="text"
                    name="barcode"
                    placeholder="Enter or scan barcode"
                    value={newProduct.barcode}
                    onChange={handleChange}
                    style={styles.input}
                  />
                </div>

                <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={generateBarcode}
                    style={styles.secondaryButton}
                  >
                    Generate Barcode
                  </button>
                  {!scanning ? (
                    <button
                      type="button"
                      onClick={startScanner}
                      style={styles.secondaryButton}
                    >
                      Scan Barcode
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopScanner}
                      style={styles.deleteButton}
                    >
                      Stop Scanner
                    </button>
                  )}
                </div>

                {scanning && (
                  <div style={{ marginBottom: "20px", textAlign: "center" }}>
                    <video id="video" width="300" height="200" autoPlay style={{ border: "1px solid #d1d5db", borderRadius: "6px" }} />
                    <p style={styles.helperText}>Scanning... Hold barcode steady.</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !branchId || !orgId}
                  style={{
                    ...styles.primaryButton,
                    opacity: loading || !branchId || !orgId ? 0.6 : 1,
                    cursor: loading || !branchId || !orgId ? "not-allowed" : "pointer",
                  }}
                >
                  {loading ? "Adding..." : "Add Product"}
                </button>
              </form>
            </div>

            {/* Inventory List */}
            <div style={styles.tableCard}>
              <h3 style={styles.cardTitle}>Current Inventory ({products.length} items)</h3>
              {products.length > 0 ? (
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableHeaderRow}>
                      <th style={styles.th}>ID</th>
                      <th style={styles.th}>Name</th>
                      <th style={styles.th}>Category</th>
                      <th style={styles.th}>Qty</th>
                      <th style={styles.th}>Price</th>
                      <th style={styles.th}>Barcode</th>
                      <th style={styles.th}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p) => (
                      <tr
                        key={p.product_id}
                        style={{
                          ...styles.tableRow,
                          background: p.quantity < 5 ? "#fee2e2" : p.product_id % 2 === 0 ? "#f9fafb" : "white",
                        }}
                      >
                        <td style={styles.td}>{p.product_id}</td>
                        <td style={styles.td}>{p.product_name}</td>
                        <td style={styles.td}>{p.category || "N/A"}</td>
                        <td style={{
                          ...styles.td,
                          fontWeight: p.quantity < 5 ? "bold" : "normal",
                          color: p.quantity < 5 ? "#dc2626" : "inherit"
                        }}>
                          {p.quantity}
                          {p.quantity < 5 && p.quantity > 0 && " (Low!)"}
                        </td>
                        <td style={styles.td}>₱{parseFloat(p.product_price).toFixed(2)}</td>
                        <td style={styles.td}>{p.barcode || "N/A"}</td>
                        <td style={styles.td}>
                          <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
                            <button
                              onClick={() => openRestockModal(p)}
                              style={styles.restockButton}
                            >
                              Restock
                            </button>
                            {p.barcode && (
                              <>
                                <button
                                  onClick={() => downloadBarcode(p)}
                                  style={styles.downloadButton}
                                >
                                  Download
                                </button>
                                <button
                                  onClick={() => printBarcode(p)}
                                  style={styles.printButton}
                                >
                                  Print
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p style={styles.emptyState}>No products found for this branch</p>
              )}
            </div>
          </div>
        )}

        {/* POS TAB */}
        {tab === "pos" && (
          <div style={styles.content}>
            <h1 style={styles.pageTitle}>Point of Sale</h1>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: "20px" }}>
              {/* Product Search & List */}
              <div>
                <div style={styles.tableCard}>
                  <h3 style={styles.cardTitle}>Search Products</h3>
                  <input
                    type="text"
                    placeholder="Search by name, category, or barcode..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      ...styles.input,
                      fontSize: "16px",
                      marginBottom: "15px",
                    }}
                  />
                  
                  {filteredProducts.length > 0 && (
                    <div
                      style={{
                        maxHeight: "300px",
                        overflowY: "auto",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                      }}
                    >
                      {filteredProducts.map((product) => (
                        <div
                          key={product.product_id}
                          onClick={() => addToCart(product)}
                          style={{
                            padding: "12px",
                            borderBottom: "1px solid #e5e7eb",
                            cursor: "pointer",
                            background: "white",
                            transition: "background 0.2s",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "white")}
                        >
                          <div style={{ fontWeight: "bold", fontSize: "14px" }}>{product.product_name}</div>
                          <div style={{ fontSize: "13px", color: "#64748b", marginTop: "4px" }}>
                            {product.category || "No category"} • Stock: {product.quantity} • ₱{parseFloat(product.product_price).toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quick Access Products */}
                <div style={styles.tableCard}>
                  <h3 style={styles.cardTitle}>Quick Access</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "10px" }}>
                    {products.slice(0, 12).map((product) => (
                      <button
                        key={product.product_id}
                        onClick={() => addToCart(product)}
                        disabled={product.quantity <= 0}
                        style={{
                          padding: "12px",
                          background: product.quantity > 0 ? "white" : "#e5e7eb",
                          border: "1px solid #d1d5db",
                          borderRadius: "6px",
                          cursor: product.quantity > 0 ? "pointer" : "not-allowed",
                          textAlign: "left",
                        }}
                      >
                        <div style={{ fontWeight: "bold", fontSize: "13px", marginBottom: "5px" }}>
                          {product.product_name}
                        </div>
                        <div style={{ fontSize: "16px", color: "#27ae60", fontWeight: "bold" }}>
                          ₱{parseFloat(product.product_price).toFixed(2)}
                        </div>
                        <div style={{ fontSize: "12px", color: "#64748b", marginTop: "5px" }}>
                          Stock: {product.quantity}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Cart */}
              <div style={{ ...styles.tableCard, height: "fit-content", position: "sticky", top: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                  <h3 style={{ margin: 0, fontSize: "18px" }}>Cart ({cart.length})</h3>
                  {cart.length > 0 && (
                    <button
                      onClick={clearCart}
                      style={styles.deleteButton}
                    >
                      Clear
                    </button>
                  )}
                </div>

                {cart.length === 0 ? (
                  <div style={styles.emptyState}>
                    <p>Cart is empty</p>
                    <p style={styles.helperText}>Search and add products to start a sale</p>
                  </div>
                ) : (
                  <>
                    <div style={{ maxHeight: "400px", overflowY: "auto", marginBottom: "15px" }}>
                      {cart.map((item) => (
                        <div
                          key={item.product_id}
                          style={{
                            padding: "12px",
                            background: "#f9fafb",
                            borderRadius: "6px",
                            marginBottom: "10px",
                            border: "1px solid #e5e7eb",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "8px" }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: "bold", fontSize: "14px" }}>{item.product_name}</div>
                              <div style={{ fontSize: "12px", color: "#64748b" }}>
                                ₱{parseFloat(item.product_price).toFixed(2)} each
                              </div>
                            </div>
                            <button
                              onClick={() => removeFromCart(item.product_id)}
                              style={{
                                background: "none",
                                border: "none",
                                color: "#e74c3c",
                                cursor: "pointer",
                                fontSize: "20px",
                                padding: "0 5px",
                                fontWeight: "bold",
                              }}
                            >
                              ×
                            </button>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <button
                              onClick={() => updateCartQuantity(item.product_id, item.cartQuantity - 1)}
                              style={styles.quantityButton}
                            >
                              -
                            </button>
                            <input
                              type="number"
                              value={item.cartQuantity}
                              onChange={(e) => updateCartQuantity(item.product_id, parseInt(e.target.value) || 0)}
                              min="1"
                              max={item.quantity}
                              style={{
                                width: "60px",
                                padding: "5px",
                                textAlign: "center",
                                border: "1px solid #d1d5db",
                                borderRadius: "4px",
                              }}
                            />
                            <button
                              onClick={() => updateCartQuantity(item.product_id, item.cartQuantity + 1)}
                              style={styles.quantityButton}
                            >
                              +
                            </button>
                            <div style={{ marginLeft: "auto", fontWeight: "bold", fontSize: "15px" }}>
                              ₱{(item.product_price * item.cartQuantity).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Total */}
                    <div style={{ borderTop: "2px solid #d1d5db", paddingTop: "15px", marginBottom: "15px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "22px", fontWeight: "bold" }}>
                        <span>Total:</span>
                        <span style={{ color: "#27ae60" }}>₱{calculateTotal().toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Complete Sale Button */}
                    <button
                      onClick={processSale}
                      disabled={loading}
                      style={{
                        ...styles.primaryButton,
                        opacity: loading ? 0.6 : 1,
                        fontSize: "16px",
                      }}
                    >
                      {loading ? "Processing..." : "Complete Sale"}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Restock Modal */}
      {restockModal && (
        <div
          style={styles.modal}
          onClick={closeRestockModal}
        >
          <div
            style={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={styles.modalHeader}>
              <h2 style={{ margin: 0 }}>Restock Product</h2>
              <button onClick={closeRestockModal} style={styles.closeButton}>
                ×
              </button>
            </div>
            
            <div style={styles.modalBody}>
              <div style={{ marginBottom: "20px" }}>
                <div style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "10px" }}>
                  {restockModal.product_name}
                </div>
                <div style={{ color: "#64748b", marginBottom: "5px" }}>
                  Category: {restockModal.category || "N/A"}
                </div>
                <div style={{ color: "#64748b", marginBottom: "5px" }}>
                  Current Stock: <span style={{ fontWeight: "bold", color: restockModal.quantity < 5 ? "#e74c3c" : "#27ae60" }}>
                    {restockModal.quantity}
                  </span>
                </div>
                <div style={{ color: "#64748b" }}>
                  Price: ₱{parseFloat(restockModal.product_price).toFixed(2)}
                </div>
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={styles.label}>Add Quantity:</label>
                <input
                  type="number"
                  value={restockAmount}
                  onChange={(e) => setRestockAmount(e.target.value)}
                  placeholder="Enter quantity to add"
                  min="1"
                  autoFocus
                  style={styles.input}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") handleRestock();
                  }}
                />
                {restockAmount && !isNaN(parseInt(restockAmount)) && parseInt(restockAmount) > 0 && (
                  <div style={{ marginTop: "10px", padding: "10px", background: "#d4edda", borderRadius: "6px" }}>
                    <span style={{ color: "#155724", fontWeight: "bold" }}>
                      New Total: {restockModal.quantity + parseInt(restockAmount)}
                    </span>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                <button
                  onClick={closeRestockModal}
                  disabled={loading}
                  style={{
                    padding: "10px 20px",
                    background: "#e5e7eb",
                    border: "none",
                    borderRadius: "6px",
                    cursor: loading ? "not-allowed" : "pointer",
                    fontSize: "14px",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleRestock}
                  disabled={loading || !restockAmount || parseInt(restockAmount) <= 0}
                  style={{
                    padding: "10px 20px",
                    background: loading || !restockAmount ? "#9ca3af" : "#f39c12",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: loading || !restockAmount ? "not-allowed" : "pointer",
                    fontSize: "14px",
                    fontWeight: "bold",
                  }}
                >
                  {loading ? "Restocking..." : "Confirm Restock"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
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
  formCard: {
    background: "white",
    padding: 30,
    borderRadius: 10,
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    marginBottom: 30,
  },
  tableCard: {
    background: "white",
    padding: 20,
    borderRadius: 10,
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    marginBottom: 30,
    overflowX: "auto",
  },
  cardTitle: {
    fontSize: 18,
    marginBottom: 20,
    color: "#2c3e50",
  },
  formRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 15,
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
  secondaryButton: {
    padding: "10px 15px",
    borderRadius: 6,
    border: "none",
    background: "#3498db",
    color: "#fff",
    cursor: "pointer",
    fontSize: 14,
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
  restockButton: {
    padding: "6px 12px",
    borderRadius: 4,
    border: "none",
    background: "#8b5cf6",
    color: "#fff",
    cursor: "pointer",
    fontSize: 12,
  },
  downloadButton: {
    padding: "6px 12px",
    borderRadius: 4,
    border: "none",
    background: "#3498db",
    color: "#fff",
    cursor: "pointer",
    fontSize: 12,
  },
  printButton: {
    padding: "6px 12px",
    borderRadius: 4,
    border: "none",
    background: "#27ae60",
    color: "#fff",
    cursor: "pointer",
    fontSize: 12,
  },
  quantityButton: {
    padding: "5px 10px",
    background: "#e5e7eb",
    border: "none",
    borderRadius: 4,
    cursor: "pointer",
    fontSize: 16,
    fontWeight: "bold",
  },
  helperText: {
    fontSize: 13,
    color: "#7f8c8d",
    marginTop: 10,
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
  emptyState: {
    textAlign: "center",
    padding: "40px",
    color: "#7f8c8d",
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
    maxWidth: "500px",
    width: "90%",
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
};

export default StaffDashboard;