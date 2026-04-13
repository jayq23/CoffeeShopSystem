import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles/login.css'
import './styles/oms.css'
import './styles/register.css'
import './styles/frontpage.css'
import App from './App.jsx'

useEffect(() => {
  fetch("/api/health").catch(() => {}); // wake up the server
}, []);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
