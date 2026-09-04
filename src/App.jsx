import React from "react";
import { Routes, Route, useLocation } from "react-router-dom";

import Home from "./pages/Home";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Predictions from "./pages/Predictions";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ProtectedRoute from "./components/ProtectedRoute";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

const App = () => {
  const location = useLocation();

  // Admin/auth pages should not have the public Navbar or Footer
  const isAdminPage =
    location.pathname === "/login" ||
    location.pathname.startsWith("/dashboard");

  return (
    <div className="min-h-screen flex flex-col">
      {!isAdminPage && <Navbar />}

      <main className="flex-1">
        <Routes>
          {/* PUBLIC PAGES */}
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/predictions" element={<Predictions />} />
          <Route path="/contact" element={<Contact />} />

          {/* ADMIN LOGIN */}
          <Route path="/login" element={<Login />} />

          {/* PROTECTED ADMIN AREA */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
          </Route>
        </Routes>
      </main>

      {!isAdminPage && <Footer />}
    </div>
  );
};

export default App;
