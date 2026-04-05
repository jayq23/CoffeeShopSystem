import { Navigate } from "react-router-dom";

function ProtectedRoute({ children }) {
  const isAuth = localStorage.getItem("isAuth");
  if (!isAuth) {
    console.log("User is not authenticated, redirecting to login.");
  } else {
    console.log("User is authenticated, accessing protected route.");
  }

  return isAuth ? children : <Navigate to="/login" replace />;
}

export default ProtectedRoute;
