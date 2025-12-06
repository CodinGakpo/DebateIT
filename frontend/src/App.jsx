import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { KindeProvider } from "@kinde-oss/kinde-auth-react";
import Landing from './components/Landing';
import CreateJoin from './components/CreateJoin';
import Room from './components/Room';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <KindeProvider
      clientId="your_kinde_client_id"
      domain="https://your_domain.kinde.com"
      redirectUri={window.location.origin}
      logoutUri={window.location.origin}
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