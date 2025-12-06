import { Navigate } from "react-router-dom";
import { useKindeAuth } from "@kinde-oss/kinde-auth-react";

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useKindeAuth();

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="relative inline-block mb-4">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur-xl opacity-50 animate-pulse"></div>
            <div className="relative bg-gradient-to-br from-purple-500 to-pink-500 w-16 h-16 rounded-full animate-spin">
              <div className="absolute inset-2 bg-slate-900 rounded-full"></div>
            </div>
          </div>
          <p className="text-white text-lg font-medium">Loading...</p>
          <p className="text-gray-400 text-sm mt-2">Preparing the arena</p>
        </div>
      </div>
    );
  }

  // Redirect to landing page if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Render the protected component
  return children;
}