import { BrowserRouter, Routes, Route } from "react-router-dom";

import FrontPage from "./system/frontPage.jsx";
import Login from "./auth/login.jsx";
import Register from "./auth/register.jsx";
import StaffDashboard from "./system/staffDashboard.jsx";
import ProtectedRoute from "./ProtectedRoute.jsx";
import Admin from "./system/adminDashboard.jsx";
import Receipt from "./components/Receipt.jsx";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="" element={<FrontPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/frontPage" element={<FrontPage />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/admin/receipts" element={<Receipt />} />

        <Route
          path="/staffDashboard"
          element={
            <ProtectedRoute>
              <StaffDashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/staff/receipts" element={<Receipt />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;




// import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'; // import for routing pages
// this is example code for routing pages in react
//return (
   // <Router>
     // <Routes>
       // <Route path="/" element={<Intropage />} />
      //  <Route path="/main" element={<RandomQuote />} />
    //  </Routes>
   // </Router>
 // );