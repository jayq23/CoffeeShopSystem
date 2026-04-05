import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import '../styles/admin.css';
import { Users, Package, ShoppingCart, TrendingUp, Settings, LogOut, X, Edit, Trash2, Plus, Search } from "lucide-react";

const API_BASE_URL = "http://localhost:5000";

function Admin() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [staffs, setStaffs] = useState([]);
  const [registeredUsers, setRegisteredUsers] = useState([]);

  const [formData, setFormData] = useState({
    name: "", stock: "", price: "", category: "Coffee", position: "Cashier", email: "", joinDate: "", username: "", password: "", image: "",
  });

  // Settings State
  const [shopSettings, setShopSettings] = useState({
    shopName: "",
    address: "",
    phone: "",
    email: "",
  });

  const [settingsForm, setSettingsForm] = useState({
    shopName: "",
    address: "",
    phone: "",
    email: "",
  });

  const fetchDashboardData = async () => {
    try {
      const [ordersRes, productsRes, customersRes, staffsRes, settingsRes, usersRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/orders`),
        fetch(`${API_BASE_URL}/api/products`),
        fetch(`${API_BASE_URL}/api/customers`),
        fetch(`${API_BASE_URL}/api/staffs`),
        fetch(`${API_BASE_URL}/api/shop-settings`),
        fetch(`${API_BASE_URL}/api/users`),
      ]);

      const [ordersData, productsData, customersData, staffsData, settingsData, usersData] = await Promise.all([
        ordersRes.json(),
        productsRes.json(),
        customersRes.json(),
        staffsRes.json(),
        settingsRes.json(),
        usersRes.json(),
      ]);

      if (!ordersRes.ok || !productsRes.ok || !customersRes.ok || !staffsRes.ok || !settingsRes.ok || !usersRes.ok) {
        throw new Error('Failed to load dashboard data');
      }

      setOrders(Array.isArray(ordersData?.orders) ? ordersData.orders : []);
      setProducts(Array.isArray(productsData?.products) ? productsData.products : []);
      setCustomers(Array.isArray(customersData?.customers) ? customersData.customers : []);
      setStaffs(Array.isArray(staffsData?.staffs) ? staffsData.staffs : []);
      setShopSettings(settingsData?.shopSettings || { shopName: "", address: "", phone: "", email: "" });
      setRegisteredUsers(Array.isArray(usersData?.users) ? usersData.users : []);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      alert('Cannot load dashboard data from server.');
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const stats = [
    { title: "Total Orders", value: orders.length.toString(), icon: ShoppingCart, color: "#8B4513" },
    { title: "Total Revenue", value: `₱${orders.reduce((sum, order) => sum + order.total, 0).toLocaleString()}`, icon: TrendingUp, color: "#A0522D" },
    { title: "Products", value: products.length.toString(), icon: Package, color: "#CD853F" },
    { title: "Customers", value: customers.length.toString(), icon: Users, color: "#D2691E" },
  ];

  const logOut = () => {
    if(window.confirm("Are you sure you want to log out?")) {
      localStorage.removeItem("isAuth");
      navigate("/login");
    }
  };

  const openModal = (type, item = null) => {
    setModalType(type);
    setSelectedItem(item);
    if (item) {
      setFormData({
        name: item.name || "", stock: item.stock || item.orders || "", price: item.price || item.totalSpent || "",
        category: item.category || "Coffee", position: "Cashier", email: item.email || "", joinDate: item.joinDate || "", username: item.username || "", password: item.password || "", image: item.image || "",
      });
    } else {
      setFormData({ name: "", stock: "", price: "", category: "Coffee", position: "Cashier", email: "", joinDate: "", username: "", password: "", image: "" });
    }
    
    // Handle settings modals
    if (type === 'shopInfo') {
      setSettingsForm({
        shopName: shopSettings.shopName,
        address: shopSettings.address,
        phone: shopSettings.phone,
        email: shopSettings.email,
      });
    }
    
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedItem(null);
    setFormData({ name: "", stock: "", price: "", category: "Coffee", position: "Cashier", email: "", joinDate: "", username: "", password: "", image: "" });
  };

  const handleProductImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const imageData = typeof reader.result === "string" ? reader.result : "";
      setFormData((prev) => ({ ...prev, image: imageData }));
    };
    reader.readAsDataURL(file);
  };

  const addProduct = () => {
    const createProduct = async () => {
      const payload = {
        name: formData.name.trim(),
        stock: parseInt(formData.stock),
        price: parseInt(formData.price),
        category: formData.category,
        sales: 0,
      };

      try {
        const response = await fetch(`${API_BASE_URL}/api/products`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await response.json();

        if (!response.ok) {
          alert(data?.message || "Failed to save product.");
          return;
        }

        const saved = data?.product;
        const newProduct = {
          id: Number(saved?.id) || (products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1),
          name: saved?.name || payload.name,
          stock: Number(saved?.stock) || payload.stock,
          price: Number(saved?.price) || payload.price,
          category: saved?.category || payload.category,
          sales: Number(saved?.sales) || 0,
          image: formData.image || "",
        };

        setProducts([...products, newProduct]);
        closeModal();
      } catch (error) {
        console.error("Error creating product:", error);
        alert("Cannot connect to server.");
      }
    };

    createProduct();
  };

  const updateProduct = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/products/${selectedItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          stock: parseInt(formData.stock),
          price: parseInt(formData.price),
          category: formData.category,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        alert(data?.message || "Failed to update product.");
        return;
      }

      await fetchDashboardData();
      closeModal();
    } catch (error) {
      console.error("Error updating product:", error);
      alert("Cannot connect to server.");
    }
  };

  const deleteProduct = async (id) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/products/${id}`, { method: "DELETE" });
        const data = await response.json();
        if (!response.ok) {
          alert(data?.message || "Failed to delete product.");
          return;
        }
        setProducts(products.filter(p => p.id !== id));
      } catch (error) {
        console.error("Error deleting product:", error);
        alert("Cannot connect to server.");
      }
    }
  };

  const addCustomer = () => {
    const customerName = formData.name.trim();

    if (customers.some((customer) => customer.name.toLowerCase() === customerName.toLowerCase())) {
      alert("Customer name already exists.");
      return;
    }

    const createCustomer = async () => {
      const payload = {
        name: customerName,
        orders: Number(formData.stock) || 0,
        totalSpent: Number(formData.price) || 0,
      };

      try {
        const response = await fetch(`${API_BASE_URL}/api/customers`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await response.json();

        if (!response.ok) {
          alert(data?.message || "Failed to save customer.");
          return;
        }

        const saved = data?.customer;
        const newCustomer = {
          id: Number(saved?.id) || (customers.length > 0 ? Math.max(...customers.map(c => c.id)) + 1 : 1),
          name: saved?.name || payload.name,
          orders: Number(saved?.orders) || payload.orders,
          totalSpent: Number(saved?.totalSpent) || payload.totalSpent,
        };
        setCustomers([...customers, newCustomer]);
        closeModal();
      } catch (error) {
        console.error("Error creating customer:", error);
        alert("Cannot connect to server.");
      }
    };

    createCustomer();
  };

  const updateCustomer = async () => {
    const customerName = formData.name.trim();

    if (!customerName) {
      alert("Please enter a customer name.");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/customers/${selectedItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: customerName,
          orders: Number(formData.stock) || 0,
          totalSpent: Number(formData.price) || 0,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        alert(data?.message || "Failed to update customer.");
        return;
      }
      await fetchDashboardData();
      closeModal();
    } catch (error) {
      console.error("Error updating customer:", error);
      alert("Cannot connect to server.");
    }
  };

  const deleteCustomer = async (id) => {
    if (window.confirm("Are you sure you want to delete this customer?")) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/customers/${id}`, { method: "DELETE" });
        const data = await response.json();
        if (!response.ok) {
          alert(data?.message || "Failed to delete customer.");
          return;
        }
        setCustomers(customers.filter(c => c.id !== id));
      } catch (error) {
        console.error("Error deleting customer:", error);
        alert("Cannot connect to server.");
      }
    }
  };

  const addStaff = () => {
    const normalizedUsername = formData.username.trim().toLowerCase();

    if (!normalizedUsername || !formData.password) {
      alert("Please provide username and password for staff login.");
      return;
    }

    if (registeredUsers.some((u) => (u.username || "").trim().toLowerCase() === normalizedUsername)) {
      alert("Username already exists. Please choose another username.");
      return;
    }

    const createStaff = async () => {
      const payload = {
        name: formData.name.trim(),
        position: "Cashier",
        email: formData.email.trim(),
        joinDate: formData.joinDate,
        username: normalizedUsername,
        password: formData.password,
      };

      try {
        const response = await fetch(`${API_BASE_URL}/api/staffs`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await response.json();

        if (!response.ok) {
          alert(data?.message || "Failed to save staff.");
          return;
        }

        const savedStaff = data?.staff;
        const newStaff = {
          id: Number(savedStaff?.id) || (staffs.length > 0 ? Math.max(...staffs.map(s => s.id)) + 1 : 1),
          name: savedStaff?.name || payload.name,
          position: savedStaff?.position || payload.position,
          email: savedStaff?.email || payload.email,
          joinDate: savedStaff?.joinDate || payload.joinDate,
          username: savedStaff?.username || payload.username,
          password: savedStaff?.password || payload.password,
        };

        setStaffs([...staffs, newStaff]);
        setRegisteredUsers((prevUsers) => ([
          ...prevUsers,
          {
            username: newStaff.username,
            password: newStaff.password,
            role: "user",
            email: newStaff.email,
            number: "",
            name: newStaff.name,
            staffId: newStaff.id,
          }
        ]));
        closeModal();
      } catch (error) {
        console.error("Error creating staff:", error);
        alert("Cannot connect to server.");
      }
    };

    createStaff();
  };

  const updateStaff = async () => {
    const normalizedUsername = formData.username.trim().toLowerCase();
    const duplicateUsername = registeredUsers.some(
      (u) =>
        (u.username || "").trim().toLowerCase() === normalizedUsername &&
        normalizedUsername !== (selectedItem?.username || "").trim().toLowerCase()
    );

    if (duplicateUsername) {
      alert("Username already exists. Please choose another username.");
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/staffs/${selectedItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          position: "Cashier",
          email: formData.email.trim(),
          joinDate: formData.joinDate,
          username: normalizedUsername,
          password: formData.password,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        alert(data?.message || "Failed to update staff.");
        return;
      }
      await fetchDashboardData();
      closeModal();
    } catch (error) {
      console.error("Error updating staff:", error);
      alert("Cannot connect to server.");
    }
  };

  const deleteStaff = async (id) => {
    if (window.confirm("Are you sure you want to delete this staff?")) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/staffs/${id}`, { method: "DELETE" });
        const data = await response.json();
        if (!response.ok) {
          alert(data?.message || "Failed to delete staff.");
          return;
        }
        await fetchDashboardData();
      } catch (error) {
        console.error("Error deleting staff:", error);
        alert("Cannot connect to server.");
      }
    }
  };

  // Settings operations
  const saveShopInfo = () => {
    const saveSettings = async () => {
      const payload = {
        shopName: settingsForm.shopName,
        address: settingsForm.address,
        phone: settingsForm.phone,
        email: settingsForm.email,
      };

      try {
        const response = await fetch(`${API_BASE_URL}/api/shop-settings`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await response.json();

        if (!response.ok) {
          alert(data?.message || "Failed to save shop info.");
          return;
        }

        setShopSettings({ ...shopSettings, ...payload });
        closeModal();
      } catch (error) {
        console.error("Error saving shop settings:", error);
        alert("Cannot connect to server.");
      }
    };

    saveSettings();
  };



  const deleteOrder = async (id) => {
    if (window.confirm("Are you sure you want to delete this order?")) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/orders/${id}`, { method: "DELETE" });
        const data = await response.json();
        if (!response.ok) {
          alert(data?.message || "Failed to delete order.");
          return;
        }
        setOrders(orders.filter(o => o.id !== id));
      } catch (error) {
        console.error("Error deleting order:", error);
        alert("Cannot connect to server.");
      }
    }
  };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredOrders = orders.filter(o => 
    String(o.id).includes(searchTerm) || o.customer.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredCustomers = customers.filter(c =>
    String(c.id).includes(searchTerm) || c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="admin-container">
      <aside className="admin-sidebar">
        <div className="admin-logo">
          <h2>Neutral Grounds</h2>
        </div>
        <nav className="admin-nav">
          <button className={`nav-item ${activeTab === "dashboard" ? "active" : ""}`} onClick={() => { setActiveTab("dashboard"); setSearchTerm(""); }}>
            <TrendingUp size={20} /><span>Dashboard</span>
          </button>
          <button className={`nav-item ${activeTab === "orders" ? "active" : ""}`} onClick={() => { setActiveTab("orders"); setSearchTerm(""); }}>
            <ShoppingCart size={20} /><span>Orders</span>
          </button>
          <button className={`nav-item ${activeTab === "products" ? "active" : ""}`} onClick={() => { setActiveTab("products"); setSearchTerm(""); }}>
            <Package size={20} /><span>Products</span>
          </button>
          <button className={`nav-item ${activeTab === "customers" ? "active" : ""}`} onClick={() => { setActiveTab("customers"); setSearchTerm(""); }}>
            <Users size={20} /><span>Customers</span>
          </button>
          <button className={`nav-item ${activeTab === "staffs" ? "active" : ""}`} onClick={() => { setActiveTab("staffs"); setSearchTerm(""); }}>
            <Users size={20} /><span>Cashiers</span>
          </button>
          <button className={`nav-item ${activeTab === "settings" ? "active" : ""}`} onClick={() => { setActiveTab("settings"); setSearchTerm(""); }}>
            <Settings size={20} /><span>Settings</span>
          </button>
        </nav>
        <button className="admin-logout" onClick={logOut}>
          <LogOut size={20} /><span>Logout</span>
        </button>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <h1>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h1>
          <div className="admin-user">
            <span style={{ fontSize: "25px" }}>{localStorage.getItem("currentUser")?.slice(0,3).toUpperCase() || "U"}</span>
            <div className="user-avatar">{localStorage.getItem("currentUser")?.charAt(0)?.toUpperCase() || "U"}</div>
          </div>
        </header>

        <div className="admin-content">
          {activeTab === "dashboard" && (
            <>
              <div className="stats-grid">
                {stats.map((stat, index) => (
                  <div key={index} className="stat-card">
                    <div className="stat-icon" style={{ backgroundColor: stat.color }}>
                      <stat.icon size={24} color="white" />
                    </div>
                    <div className="stat-info">
                      <p className="stat-title">{stat.title}</p>
                      <h3 className="stat-value">{stat.value}</h3>
                    </div>
                  </div>
                ))}
              </div>

              <div className="dashboard-section">
                <h2>Recent Orders</h2>
                <div className="table-container">
                  <table className="admin-table">
                    <thead>
                      <tr><th>Order ID</th><th>Items</th><th>Total</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                      {[...orders].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5).map((order) => (
                        <tr key={order.id}>
                          <td>{order.id}</td><td>{order.items}</td><td>₱{order.total}</td>
                          <td><button className="btn-action" onClick={() => openModal('viewOrder', order)}>View</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="dashboard-section">
                <h2>Low Stock Products</h2>
                <div className="table-container">
                  <table className="admin-table">
                    <thead><tr><th>Product Name</th><th>Stock</th><th>Price</th><th>Actions</th></tr></thead>
                    <tbody>
                      {products.filter(p => p.stock < 35).map((product) => (
                        <tr key={product.id}>
                          <td>{product.name}</td>
                          <td><span className="low-stock">{product.stock} units</span></td>
                          <td>₱{product.price}</td>
                          <td><button className="btn-action" onClick={() => openModal('editProduct', product)}>Restock</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {activeTab === "orders" && (
            <div className="dashboard-section">
              <div className="section-header">
                <h2>All Orders ({orders.length})</h2>
                <div className="search-bar">
                  <Search size={18} />
                  <input type="text" placeholder="Search orders..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
              </div>
              <div className="table-container">
                <table className="admin-table">
                  <thead><tr><th>Order ID</th><th>Items</th><th>Total</th><th>Date</th><th>Actions</th></tr></thead>
                  <tbody>
                    {filteredOrders.map((order) => (
                      <tr key={order.id}>
                        <td>{order.id}</td><td>{order.items}</td><td>₱{order.total}</td><td>{order.date}</td>
                        <td>
                          <div className="action-buttons">
                            <button className="btn-action" onClick={() => openModal('viewOrder', order)}>View</button>
                            <button className="btn-action-delete" onClick={() => deleteOrder(order.id)}><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "products" && (
            <div className="dashboard-section">
              <div className="section-header">
                <h2>Product Inventory ({products.length})</h2>
                <div className="header-actions">
                  <div className="search-bar">
                    <Search size={18} />
                    <input type="text" placeholder="Search products..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                  </div>
                  <button className="btn-primary" onClick={() => openModal('addProduct')}>
                    <Plus size={18} />Add Product
                  </button>
                </div>
              </div>
              <div className="table-container">
                <table className="admin-table">
                  <thead><tr><th>Product Name</th><th>Category</th><th>Stock</th><th>Price</th><th>Total Sales</th><th>Actions</th></tr></thead>
                  <tbody>
                    {filteredProducts.map((product) => (
                      <tr key={product.id}>
                        <td>{product.name}</td><td>{product.category}</td>
                        <td><span className={product.stock < 30 ? "low-stock" : ""}>{product.stock} units</span></td>
                        <td>₱{product.price}</td><td>{product.sales} sold</td>
                        <td>
                          <div className="action-buttons">
                            <button className="btn-action" onClick={() => openModal('editProduct', product)}>
                              <Edit size={14} /> Edit
                            </button>
                            <button className="btn-action-delete" onClick={() => deleteProduct(product.id)}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "customers" && (
            <div className="dashboard-section">
              <div className="section-header">
                <h2>Customer Management ({customers.length})</h2>
                <div className="header-actions">
                  <div className="search-bar">
                    <Search size={18} />
                    <input type="text" placeholder="Search customers..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                  </div>
                  <button className="btn-primary" onClick={() => openModal('addCustomer')}>
                    <Plus size={18} />Add Customer
                  </button>
                </div>
              </div>
              <div className="table-container">
                <table className="admin-table">
                  <thead><tr><th>Customer ID</th><th>Name</th><th>Total Orders</th><th>Total Spent</th><th>Actions</th></tr></thead>
                  <tbody>
                    {filteredCustomers.map((customer) => (
                      <tr key={customer.id}>
                        <td>#{customer.id}</td>
                        <td>{customer.name}</td>
                        <td>{customer.orders}</td><td>₱{customer.totalSpent.toLocaleString()}</td>
                        <td>
                          <div className="action-buttons">
                            <button className="btn-action" onClick={() => openModal('editCustomer', customer)}>
                              <Edit size={14} /> Edit
                            </button>
                            <button className="btn-action-delete" onClick={() => deleteCustomer(customer.id)}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "staffs" && (
            <div className="dashboard-section">
              <div className="section-header">
                <h2>Cashier Management ({staffs.length})</h2>
                <div className="header-actions">
                  <div className="search-bar">
                    <Search size={18} />
                    <input type="text" placeholder="Search cashiers..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                  </div>
                  <button className="btn-primary" onClick={() => openModal('addStaff')}>
                    <Plus size={18} />Add Cashier
                  </button>
                </div>
              </div>
              <div className="table-container">
                <table className="admin-table">
                  <thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Email</th><th>Join Date</th><th>Actions</th></tr></thead>
                  <tbody>
                    {staffs.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())).map((staff) => (
                      <tr key={staff.id}>
                        <td>{staff.name}</td><td>{staff.username || "-"}</td><td>Cashier</td><td>{staff.email}</td><td>{staff.joinDate}</td>
                        <td>
                          <div className="action-buttons">
                            <button className="btn-action" onClick={() => openModal('editStaff', staff)}>
                              <Edit size={14} /> 
                            </button>
                            <button className="btn-action-delete" onClick={() => deleteStaff(staff.id)}>
                              <Trash2 size={20} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "settings" && (
            <div className="dashboard-section">
              <h2>System Settings</h2>
              
              {/* Current Settings Display */}
              <div className="current-settings">
                <div className="settings-info-card">
                  <h3>Current Shop Information</h3>
                  <div className="info-grid">
                    <div className="info-item">
                      <span className="info-label">Shop Name:</span>
                      <span className="info-value">{shopSettings.shopName}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Address:</span>
                      <span className="info-value">{shopSettings.address}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Phone:</span>
                      <span className="info-value">{shopSettings.phone}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Email:</span>
                      <span className="info-value">{shopSettings.email}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="settings-grid">
                <div className="setting-item">
                  <h3>Shop Information</h3>
                  <p>Update shop name, address, and contact details</p>
                  <button className="btn-secondary" onClick={() => openModal('shopInfo')}>Edit</button>
                </div>
                <div className="setting-item">
                  <h3>Payment Methods</h3>
                  <p>Configure accepted payment options</p>
                  <button className="btn-secondary" onClick={() => openModal('paymentMethods')}>Configure</button>
                </div>
                <div className="setting-item">
                  <h3>User Accounts</h3>
                  <p>Manage admin and staff accounts</p>
                  <button className="btn-secondary" onClick={() => openModal('userAccounts')}>Manage</button>
                </div>
                <div className="setting-item">
                  <h3>Backup Data</h3>
                  <p>Export all system data for backup</p>
                  <button className="btn-secondary" onClick={() => {
                    const data = { orders, products, customers, staffs, shopSettings };
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `backup-${new Date().toISOString().split('T')[0]}.json`;
                    a.click();
                  }}>Download Backup</button>
                </div>
                <div className="setting-item">
                  <h3>Clear All Data</h3>
                  <p>Reset system to default state</p>
                  <button className="btn-danger" onClick={async () => {
                    if (window.confirm("Are you sure? This will delete all data!")) {
                      try {
                        const response = await fetch(`${API_BASE_URL}/api/reset`, { method: "POST" });
                        const data = await response.json();
                        if (!response.ok) {
                          alert(data?.message || "Failed to reset system data.");
                          return;
                        }
                        await fetchDashboardData();
                      } catch (error) {
                        console.error("Error resetting system:", error);
                        alert("Cannot connect to server.");
                      }
                    }
                  }}>Reset System</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {modalType === 'addProduct' && 'Add New Product'}
                {modalType === 'editProduct' && 'Edit Product'}
                {modalType === 'viewOrder' && 'Order Details'}
                {modalType === 'addCustomer' && 'Add New Customer'}
                {modalType === 'editCustomer' && 'Edit Customer'}
                {modalType === 'addStaff' && 'Add New Cashier'}
                {modalType === 'editStaff' && 'Edit Cashier'}
                {modalType === 'shopInfo' && 'Shop Information'}
                {modalType === 'paymentMethods' && 'Payment Methods'}
                {modalType === 'userAccounts' && 'User Accounts'}
              </h2>
              <button className="modal-close" onClick={closeModal}><X size={24} /></button>
            </div>

            <div className="modal-body">
              {(modalType === 'addProduct' || modalType === 'editProduct') && (
                <form onSubmit={(e) => {
                  e.preventDefault();
                  modalType === 'addProduct' ? addProduct() : updateProduct();
                }}>
                  <div className="form-group">
                    <label>Product Name</label>
                    <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label>Category</label>
                    <select value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})}>
                      <option value="Coffee">Coffee</option>
                      <option value="Tea">Tea</option>
                      <option value="Special">Special</option>
                    </select>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Stock</label>
                      <input type="number" value={formData.stock} onChange={(e) => setFormData({...formData, stock: e.target.value})} required min="0" />
                    </div>
                    <div className="form-group">
                      <label>Price (₱)</label>
                      <input type="number" value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} required min="0" />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Product Image</label>
                    <input type="file" accept="image/*" onChange={handleProductImageChange} />
                    {formData.image && (
                      <img
                        src={formData.image}
                        alt="Product preview"
                        className="product-image-preview"
                      />
                    )}
                  </div>
                  <div className="modal-actions">
                    <button type="button" className="btn-secondary" onClick={closeModal}>Cancel</button>
                    <button type="submit" className="btn-primary">
                      {modalType === 'addProduct' ? 'Add Product' : 'Update Product'}
                    </button>
                  </div>
                </form>
              )}

              {(modalType === 'addCustomer' || modalType === 'editCustomer') && (
                <form onSubmit={(e) => {
                  e.preventDefault();
                  modalType === 'addCustomer' ? addCustomer() : updateCustomer();
                }}>
                  <div className="form-group">
                    <label>Customer Name</label>
                    <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label>Total Orders</label>
                    <input type="number" value={formData.stock} onChange={(e) => setFormData({...formData, stock: e.target.value})} required min="0" />
                  </div>
                  <div className="form-group">
                    <label>Total Spent (₱)</label>
                    <input type="number" value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} required min="0" />
                  </div>
                  <div className="modal-actions">
                    <button type="button" className="btn-secondary" onClick={closeModal}>Cancel</button>
                    <button type="submit" className="btn-primary">
                      {modalType === 'addCustomer' ? 'Add Customer' : 'Update Customer'}
                    </button>
                  </div>
                </form>
              )}

              {modalType === 'viewOrder' && selectedItem && (
                <div className="order-details">
                  <div className="detail-row"><span className="detail-label">Order ID:</span><span className="detail-value">{selectedItem.id}</span></div>
                  <div className="detail-row"><span className="detail-label">Date:</span><span className="detail-value">{selectedItem.date}</span></div>
                  <div className="detail-row"><span className="detail-label">Items:</span><span className="detail-value">{selectedItem.details}</span></div>
                  <div className="detail-row"><span className="detail-label">Total Items:</span><span className="detail-value">{selectedItem.items}</span></div>
                  <div className="detail-row total"><span className="detail-label">Total Amount:</span><span className="detail-value">₱{selectedItem.total}</span></div>
                  <div className="modal-actions">
                    <button className="btn-secondary" onClick={closeModal}>Close</button>
                  </div>
                </div>
              )}

              {(modalType === 'addStaff' || modalType === 'editStaff') && (
                <form onSubmit={(e) => {
                  e.preventDefault();
                  modalType === 'addStaff' ? addStaff() : updateStaff();
                }}>
                  <div className="form-group">
                    <label>Full Name</label>
                    <input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label>Role</label>
                    <input type="text" value="Cashier" disabled />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label>Username</label>
                    <input type="text" value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label>Password</label>
                    <input type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label>Join Date</label>
                    <input type="date" value={formData.joinDate} onChange={(e) => setFormData({...formData, joinDate: e.target.value})} required />
                  </div>
                  <div className="modal-actions">
                    <button type="button" className="btn-secondary" onClick={closeModal}>Cancel</button>
                    <button type="submit" className="btn-primary">
                      {modalType === 'addStaff' ? 'Add Cashier' : 'Update Cashier'}
                    </button>
                  </div>
                </form>
              )}

              {/* Shop Information Form */}
              {modalType === 'shopInfo' && (
                <form onSubmit={(e) => {
                  e.preventDefault();
                  saveShopInfo();
                }}>
                  <div className="form-group">
                    <label>Shop Name</label>
                    <input 
                      type="text" 
                      value={settingsForm.shopName}
                      onChange={(e) => setSettingsForm({...settingsForm, shopName: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Address</label>
                    <textarea 
                      rows="3"
                      value={settingsForm.address}
                      onChange={(e) => setSettingsForm({...settingsForm, address: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone Number</label>
                    <input 
                      type="tel" 
                      value={settingsForm.phone}
                      onChange={(e) => setSettingsForm({...settingsForm, phone: e.target.value})}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Email Address</label>
                    <input 
                      type="email" 
                      value={settingsForm.email}
                      onChange={(e) => setSettingsForm({...settingsForm, email: e.target.value})}
                      required
                    />
                  </div>
                  <div className="modal-actions">
                    <button type="button" className="btn-secondary" onClick={closeModal}>Cancel</button>
                    <button type="submit" className="btn-primary">Save Changes</button>
                  </div>
                </form>
              )}

              {/* Tax & Currency Form */}
              {modalType === 'taxCurrency' && (
                <form onSubmit={(e) => {
                  e.preventDefault();
                  saveTaxCurrency();
                }}>
                  <div className="form-group">
                    <label>Tax Rate (%)</label>
                    <input 
                      type="number" 
                      value={settingsForm.taxRate}
                      onChange={(e) => setSettingsForm({...settingsForm, taxRate: e.target.value})}
                      required
                      min="0"
                      max="100"
                      step="0.01"
                    />
                  </div>
                  <div className="form-group">
                    <label>Currency</label>
                    <select 
                      value={settingsForm.currency}
                      onChange={(e) => setSettingsForm({...settingsForm, currency: e.target.value})}
                    >
                      <option value="PHP">PHP (₱) - Philippine Peso</option>
                      <option value="USD">USD ($) - US Dollar</option>
                      <option value="EUR">EUR (€) - Euro</option>
                      <option value="GBP">GBP (£) - British Pound</option>
                      <option value="JPY">JPY (¥) - Japanese Yen</option>
                    </select>
                  </div>
                  <div className="modal-actions">
                    <button type="button" className="btn-secondary" onClick={closeModal}>Cancel</button>
                    <button type="submit" className="btn-primary">Save Changes</button>
                  </div>
                </form>
              )}

              {/* Payment Methods */}
              {modalType === 'paymentMethods' && (
                <div className="settings-content">
                  <p className="settings-description">Configure which payment methods your shop accepts.</p>
                  <div className="payment-methods-list">
                    <label className="payment-method-item">
                      <input type="checkbox" defaultChecked />
                      <span>Cash</span>
                    </label>
                    <label className="payment-method-item">
                      <input type="checkbox" defaultChecked />
                      <span>Credit/Debit Card</span>
                    </label>
                    <label className="payment-method-item">
                      <input type="checkbox" defaultChecked />
                      <span>GCash</span>
                    </label>
                    <label className="payment-method-item">
                      <input type="checkbox" />
                      <span>PayMaya</span>
                    </label>
                    <label className="payment-method-item">
                      <input type="checkbox" />
                      <span>Bank Transfer</span>
                    </label>
                  </div>
                  <div className="modal-actions">
                    <button className="btn-secondary" onClick={closeModal}>Close</button>
                    <button className="btn-primary" onClick={() => {
                      alert('Payment methods updated successfully!');
                      closeModal();
                    }}>Save Changes</button>
                  </div>
                </div>
              )}

              {/* User Accounts */}
              {modalType === 'userAccounts' && (
                <div className="settings-content">
                  <p className="settings-description">Manage admin and cashier access to the system.</p>
                  <div className="user-accounts-list">
                    {registeredUsers.map((account, index) => (
                      <div className="user-account-item" key={`${account.username}-${index}`}>
                        <div className="user-info">
                          <div className="user-avatar-small">{account.username?.charAt(0)?.toUpperCase() || "U"}</div>
                          <div>
                            <div className="user-name">{account.name || account.username}</div>
                            <div className="user-role">@{account.username} • {account.role === "admin" ? "Admin" : "Cashier"}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="modal-actions">
                    <button className="btn-secondary" onClick={closeModal}>Close</button>
                    <button className="btn-primary" onClick={() => {
                      closeModal();
                      navigate("/register");
                    }}>
                      <Plus size={16} />
                      Add New Account
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Admin;