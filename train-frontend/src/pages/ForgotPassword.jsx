import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Loader2, ArrowRight, KeyRound } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../api/axios';
import './ForgetPassword.css'

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/forgot-password', { email });
      toast.success("Verification code sent to your email!");
      navigate('/verify-code', { state: { email } });
    } catch (error) {
      toast.error(error.response?.data?.error || "Account not found");
      navigate('/login');
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
            <div className="auth-icon-wrap"><KeyRound size={30} /></div>
            <h1 className="auth-title">Forgot Password?</h1>
            <p className="auth-subtitle">Enter your email to receive a reset code</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="auth-input-wrap">
              <Mail size={18} className="auth-input-icon" />
              <input
                type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="auth-input"
              />
            </div>

            <button type="submit" disabled={loading} className="auth-submit">
              {loading ? <Loader2 size={20} className="animate-spin" /> : <>Send Reset Code <ArrowRight size={18} /></>}
            </button>
          </form>

          <Link to="/login" className="auth-back">← Back to Login</Link>
        </div>
      </div>
    </>
  );
};

export default ForgotPassword;