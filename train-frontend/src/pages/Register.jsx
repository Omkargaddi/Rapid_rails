import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, Mail, Lock, Loader2, ArrowRight, ShieldCheck } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../api/axios';
import './Auth.css'


const Register = () => {
  const [formData, setFormData] = useState({ email: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const allowedDomains = ['gmail.com', 'yahoo.com'];
  const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

  const validateEmail = (email) => allowedDomains.includes(email.split('@')[1]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateEmail(formData.email)) return toast.error("Only Gmail or Yahoo emails are allowed.");
    if (!strongPasswordRegex.test(formData.password)) return toast.warning("Password must be 8+ chars with uppercase, lowercase, number & special character.");
    if (formData.password !== formData.confirmPassword) return toast.error("Passwords do not match.");
    setLoading(true);
    try {
      await api.post('/register', { email: formData.email, password: formData.password });
      toast.success("Account created! Please login.");
      navigate('/login');
    } catch (error) {
      toast.error(error.response?.data?.error || "Registration failed. Try again.");
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
            <div className="auth-icon-wrap"><UserPlus size={30} /></div>
            <h1 className="auth-title">Create Account</h1>
            <p className="auth-subtitle">Join the private network for route optimisation</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div>
              <label className="auth-label">Email Address</label>
              <div className="auth-input-wrap">
                <Mail size={18} className="auth-input-icon" />
                <input type="email" name="email" required value={formData.email} onChange={handleChange} placeholder="name@gmail.com" className="auth-input" />
              </div>
            </div>

            <div>
              <label className="auth-label">Password</label>
              <div className="auth-input-wrap">
                <Lock size={18} className="auth-input-icon" />
                <input type="password" name="password" required value={formData.password} onChange={handleChange} placeholder="••••••••" className="auth-input" />
              </div>
              <p className="auth-hint">Min 8 chars · uppercase · number · special character</p>
            </div>

            <div>
              <label className="auth-label">Confirm Password</label>
              <div className="auth-input-wrap">
                <ShieldCheck size={18} className="auth-input-icon" />
                <input type="password" name="confirmPassword" required value={formData.confirmPassword} onChange={handleChange} placeholder="••••••••" className="auth-input" />
              </div>
            </div>

            <button type="submit" disabled={loading} className="auth-submit">
              {loading ? <Loader2 size={20} className="animate-spin" /> : <>Create Account <ArrowRight size={18} /></>}
            </button>
          </form>

          <div className="auth-divider">
            <div className="auth-divider-line" />
            <span className="auth-divider-txt">or</span>
            <div className="auth-divider-line" />
          </div>

          <p className="auth-footer">
            Already have an account?
            <Link to="/login" className="auth-link">Sign In</Link>
          </p>
        </div>
      </div>
    </>
  );
};

export default Register;