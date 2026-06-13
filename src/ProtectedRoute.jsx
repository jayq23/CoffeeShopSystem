import { Navigate } from "react-router-dom";

function ProtectedRoute({ children }) {
  const isAuth = localStorage.getItem("isAuth");
  const userRole = localStorage.getItem("userRole");
  
  if (!isAuth) {
    console.log("User is not authenticated, redirecting to login.");
    return <Navigate to="/login" replace />;
  }
  
  console.log(`User authenticated as ${userRole}`);
  return children;
}

export default ProtectedRoute;
