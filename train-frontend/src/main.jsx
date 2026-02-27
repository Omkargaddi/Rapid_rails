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
import './Toast.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastContainer
        position="top-center"
        autoClose={3000}
        pauseOnHover
        closeOnClick
        theme="light"
        toastStyle={{
          fontFamily: "'Sora', sans-serif",
          fontSize: '13px',
          fontWeight: 700,
          borderRadius: '18px',
          border: '1.5px solid rgba(251,146,60,0.18)',
          background: '#ffffff',
          color: '#1c1917',
          boxShadow: '0 8px 32px rgba(249,115,22,0.12), 0 2px 8px rgba(0,0,0,0.06)',
          padding: '14px 18px',
        }}
        style={{
          top: '20px',
        }}
        toastClassName={() =>
          'Toastify__toast Toastify__toast--default rr-toast'
        }
      />

      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/verify-code" element={<VerifyCode />} />
        <Route path="/favorites" element={<Favorites />} />
        <Route path="*" element={<NotFound />} />
      </Routes>

    </BrowserRouter>
  </React.StrictMode>
);