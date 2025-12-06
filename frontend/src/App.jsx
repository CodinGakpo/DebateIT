import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { KindeProvider } from "@kinde-oss/kinde-auth-react";
import Landing from "./components/Landing";
import CreateJoin from "./components/CreateJoin";
import Room from "./components/Room";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <KindeProvider
      domain={import.meta.env.VITE_KINDE_DOMAIN}
      clientId={import.meta.env.VITE_KINDE_CLIENT_ID}
      redirectUri={import.meta.env.VITE_KINDE_REDIRECT_URI}
      logoutUri={import.meta.env.VITE_KINDE_LOGOUT_REDIRECT_URI}
      isDangerouslyUseLocalStorage={true}
    >
      <Router>
        <Routes>
          {/* Public route */}
          <Route path="/" element={<Landing />} />

          {/* Protected routes - require authentication */}
          <Route
            path="/create-join"
            element={
              <ProtectedRoute>
                <CreateJoin />
              </ProtectedRoute>
            }
          />
          <Route
            path="/room/:roomCode"
            element={
              <ProtectedRoute>
                <Room />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </KindeProvider>
  );
}

export default App;
