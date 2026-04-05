import matchaLatteImg from "../assets/matchaLatte.jpg";
import chocolateDrinkImg from "../assets/chocolateDrink.jpg";
import caramelHazelnutImg from "../assets/caramelHazelnut.jpg";
import iceAmericanoImg from "../assets/iceAmerikano.jpg";
import espressoImg from "../assets/espresso.jpg";
import milkteaImg from "../assets/milktea.jpg";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import '../styles/staff.css';
import { ShoppingCart, X, Plus, Minus } from "lucide-react";

const API_BASE_URL = "http://localhost:5000";

function StaffDashboard() {
  const navigate = useNavigate();
  const [showCart, setShowCart] = useState(false);
  const [cartItems, setCartItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [customerName, setCustomerName] = useState("");

  // Load products from backend
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/products`);
        const data = await response.json();
        if (!response.ok) {
          alert(data?.message || "Failed to load products.");
          return;
        }
        setProducts(Array.isArray(data?.products) ? data.products : []);
      } catch (error) {
        console.error("Error loading products:", error);
        alert("Cannot connect to server.");
      }
    };

    loadProducts();
  }, []);

  const getProductImage = (product) => {
    if (product?.image) return product.image;
    const name = (product?.name || "").toLowerCase();
    if (name.includes("matcha")) return matchaLatteImg;
    if (name.includes("chocolate")) return chocolateDrinkImg;
    if (name.includes("caramel")) return caramelHazelnutImg;
    if (name.includes("americano") || name.includes("amerikano")) return iceAmericanoImg;
    if (name.includes("espresso")) return espressoImg;
    if (name.includes("milk tea") || name.includes("milktea")) return milkteaImg;
    return null;
  };

  const logOut = () => {
    if(window.confirm(`Are you sure you want to log out?`)){
      localStorage.removeItem("isAuth");
      localStorage.removeItem("currentUser");
      localStorage.removeItem("userRole");
      navigate("/login");
  };
  };

  const addToCart = (product) => {
    const existingItem = cartItems.find(item => item.id === product.id);
    
    if (existingItem) {
      setCartItems(cartItems.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCartItems([...cartItems, { ...product, quantity: 1 }]);
    }
  };

  const removeFromCart = (productId) => {
    setCartItems(cartItems.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
    } else {
      setCartItems(cartItems.map(item =>
        item.id === productId ? { ...item, quantity } : item
      ));
    }
  };

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const submitOrder = async () => {
    if (cartItems.length === 0) {
      alert("Cart is empty!");
      return;
    }

    const normalizedCustomerName = customerName.trim();
    if (!normalizedCustomerName) {
      alert("Please enter customer name before submitting order.");
      return;
    }

    const orderDetails = cartItems.map(item => `${item.name} x${item.quantity}`).join(", ");
    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = calculateTotal();
    const staffName = localStorage.getItem("currentUser") || "Unknown Staff";

    const newOrder = {
      id: 0,
      customer: normalizedCustomerName,
      staff: staffName,
      items: totalItems,
      total: totalAmount,
      date: new Date().toISOString().split("T")[0],
      details: orderDetails,
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: newOrder.customer,
          items: newOrder.items,
          total: newOrder.total,
          date: newOrder.date,
          details: newOrder.details,
          staffName,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        alert(data?.message || "Failed to save order.");
        return;
      }
    } catch (error) {
      console.error("Error creating order:", error);
      alert("Cannot connect to server.");
      return;
    }

    alert(`Order submitted successfully!\nCustomer: ${normalizedCustomerName}\nStaff: ${staffName}\nTotal: ₱${totalAmount.toLocaleString()}`);
    setCartItems([]);
    setCustomerName("");
    setShowCart(false);
  };

  return (
    <div className="staff-container">
      <header className="staff-header">
        <div className="header-left">
          <h1>☕ Neutral Grounds</h1>
        </div>
        <div className="header-right">
          <button className="cart-btn" onClick={() => setShowCart(!showCart)}>
            <ShoppingCart size={24} />
            <span className="cart-count">{cartItems.length}</span>
          </button>
          <button className="logout-btn" onClick={logOut}>Logout</button>
        </div>
      </header>

      <main className="staff-main">
        <section className="products-section">
          <h2>Available Products</h2>
          <div className="products-grid">
            {products.length > 0 ? (
              products.map(product => (
                <div key={product.id} className="product-card">
                  {getProductImage(product) ? (
                    <img src={getProductImage(product)} alt={product.name} className="product-image" />
                  ) : (
                    <div className="product-image-placeholder">{product.name.charAt(0)}</div>
                  )}
                  <h3>{product.name}</h3>
                  <p className="category">{product.category}</p>
                  <p className="price">₱{product.price}</p>
                  <p className="stock">Stock: {product.stock}</p>
                  <button 
                    className="btn-add-to-cart"
                    onClick={() => addToCart(product)}
                    disabled={product.stock === 0}
                  >
                    Add to Cart
                  </button>
                </div>
              ))
            ) : (
              <p className="no-products">No products available</p>
            )}
          </div>
        </section>
      </main>

      {/* Cart Sidebar */}
      <div className={`cart-sidebar ${showCart ? 'open' : ''}`}>
        <div className="cart-header">
          <h2>Order Cart</h2>
          <button className="close-btn" onClick={() => setShowCart(false)}>
            <X size={24} />
          </button>
        </div>

        <div className="cart-content">
          {cartItems.length === 0 ? (
            <p className="empty-cart">Your cart is empty</p>
          ) : (
            <>
              <div className="cart-items">
                {cartItems.map(item => (
                  <div key={item.id} className="cart-item">
                    <div className="item-info">
                      <h4>{item.name}</h4>
                      <p className="item-price">₱{item.price} each</p>
                    </div>
                    <div className="item-quantity">
                      <button 
                        className="qty-btn"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      >
                        <Minus size={16} />
                      </button>
                      <span>{item.quantity}</span>
                      <button 
                        className="qty-btn"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    <div className="item-total">
                      ₱{(item.price * item.quantity).toLocaleString()}
                    </div>
                    <button 
                      className="remove-btn"
                      onClick={() => removeFromCart(item.id)}
                    >
                      <X size={18} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="cart-summary">
                <div className="summary-row" style={{ alignItems: "center", gap: "8px" }}>
                  <span>Customer:</span>
                  <input
                    type="text"
                    placeholder="Enter customer name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="customerName"
                  />
                </div>
                <div className="summary-row">
                  <span>Subtotal:</span>
                  <span>₱{calculateTotal().toLocaleString()}</span>
                </div>
                <div className="summary-row total">
                  <span>Total:</span>
                  <span>₱{calculateTotal().toLocaleString()}</span>
                </div>
              </div>

              <button className="btn-submit-order" onClick={submitOrder}>
                Submit Order
              </button>
            </>
          )}
        </div>
      </div>

      {showCart && <div className="cart-overlay" onClick={() => setShowCart(false)}></div>}
    </div>
  );
}

export default StaffDashboard;