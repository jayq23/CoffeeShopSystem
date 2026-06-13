import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles/login.css'
import './styles/oms.css'
import './styles/register.css'
import './styles/frontpage.css'
import './styles/admin.css'
import './styles/staff.css'
import './styles/receipt.css'
import './styles/payment.css'
import './styles/order-tracking.css'
import './styles/inventory.css'
import './styles/analytics.css'
import App from './App.jsx'
import API_BASE_URL from './config/api.js'

// Wake up the server
if (API_BASE_URL) {
  fetch(`${API_BASE_URL}/api/health`).catch(() => {});
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
