import { useKindeAuth } from "@kinde-oss/kinde-auth-react";
import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useKindeAuth();

  if (isLoading) return <p>Loading...</p>;

  if (!isAuthenticated) return <Navigate to="/" />;

  return children;
}
