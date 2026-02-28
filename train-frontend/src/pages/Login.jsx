import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../api/axios';
import './Auth.css'

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.post('/login', formData);
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('userEmail', response.data.email);
      toast.success("Welcome back! Accessing Engine...");
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.error || "Login failed. Check credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="auth-root">
        <div className="auth-blob auth-blob-1" />
        <div className="auth-blob auth-blob-2" />

        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-icon-wrap"><Lock size={30} /></div>
            <h1 className="auth-title">Welcome Back</h1>
            <p className="auth-subtitle">Enter your credentials to access the engine</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-field-wrap">
              <label className="auth-label">Email Address</label>
              <div className="auth-input-wrap">
                <Mail size={18} className="auth-input-icon" />
                <input
                  type="email" name="email" required
                  value={formData.email} onChange={handleChange}
                  placeholder="name@email.com"
                  className="auth-input"
                />
              </div>
            </div>

            <div className="auth-field-wrap">
              <label className="auth-label">Password</label>
              <div className="auth-input-wrap">
                <Lock size={18} className="auth-input-icon" />
                <input
                  type="password" name="password" required
                  value={formData.password} onChange={handleChange}
                  placeholder="••••••••"
                  className="auth-input"
                />
              </div>
            </div>

            <Link to="/forgot-password" className="auth-forgot">Forgot Password?</Link>

            <button type="submit" disabled={loading} className="auth-submit">
              {loading ? <Loader2 size={20} className="animate-spin" /> : <>Sign In <ArrowRight size={18} /></>}
            </button>
          </form>

          <div className="auth-divider" style={{ marginTop: '28px' }}>
            <div className="auth-divider-line" />
            <span className="auth-divider-txt">or</span>
            <div className="auth-divider-line" />
          </div>

          <p className="auth-footer">
            Don't have an account?
            <Link to="/register" className="auth-link">Register Now</Link>
          </p>
        </div>
      </div>
    </>
  );
};

export default Login;