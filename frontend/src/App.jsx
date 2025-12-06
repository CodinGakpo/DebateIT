import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './components/Home';
import Dashboard from './components/Dashboard';
import Room from './components/Room'
import CreateJoin from './components/CreateJoin'

function App() {
  return (
    <BrowserRouter>
      <Navbar />

      <Routes>
        {/* Initial page with login button */}
        <Route path="/" element={<Home />} />
        <Route path="/room/:roomCode" element={<Room />} />
        <Route path="/create-join" element={<CreateJoin />} />

        {/* Protected dashboard */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;