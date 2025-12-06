// src/App.jsx
import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoute";
import Landing from "./components/Landing";
import Dashboard from "./components/Dashboard";
import Room from "./components/Room";
import CreateJoin from "./components/CreateJoin";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing with navbar inside it */}
        <Route path="/" element={<Landing />} />

        {/* Public routes */}
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
