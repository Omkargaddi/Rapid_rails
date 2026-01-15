import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';

import './index.css';
import 'react-toastify/dist/ReactToastify.css';

import App from './App.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx'; 
import VerifyCode from './pages/VerifyCode.jsx';
import NotFound from './pages/NotFound.jsx';
import Favorites from './components/Favorites.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      {/* Container for toast notifications across all pages */}
      <ToastContainer 
        position="top-right" 
        autoClose={3000} 
        theme="light" 
        pauseOnHover 
      />
      
      <Routes>
        {/* Main search engine (Publicly accessible) */}
        <Route path="/" element={<App />} />
        
        {/* Auth & Security Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/verify-code" element={<VerifyCode />} />
        <Route path="/favorites" element={<Favorites />} />
        {/* Catch-all for undefined URLs */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);