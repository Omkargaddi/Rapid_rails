import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, Lock, Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../api/axios';
import './Auth.css'

const VerifyCode = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ code: '', newPassword: '' });

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!email) return navigate('/login');
    setLoading(true);
    try {
      await api.post('/verify-reset-code', { email, code: formData.code, newPassword: formData.newPassword });
      toast.success("Password reset successfully! Please login.");
      navigate('/login');
    } catch {
      toast.error("Invalid or expired verification code.");
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
            <div className="auth-icon-wrap"><ShieldCheck size={30} /></div>
            <h1 className="auth-title">Verify Account</h1>
            <p className="auth-subtitle">Enter the 6-digit code sent to</p>
            {email && <span className="auth-email-highlight">{email}</span>}
          </div>

          <form className="auth-form" onSubmit={handleVerify}>
            <div className="auth-otp-wrap">
              <label className="auth-otp-label">Verification Code</label>
              <input
                type="text" maxLength="6" required
                placeholder="— — — — — —"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="auth-otp-input"
              />
            </div>

            <div>
              <label className="auth-field-label">New Password</label>
              <div className="auth-input-wrap">
                <Lock size={18} className="auth-input-icon" />
                <input
                  type="password" required
                  placeholder="Enter new password"
                  value={formData.newPassword}
                  onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                  className="auth-input"
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="auth-submit">
              {loading ? <Loader2 size={20} className="animate-spin" /> : <>Update Password <ArrowRight size={18} /></>}
            </button>
          </form>
        </div>
      </div>
    </>
  );
};

export default VerifyCode;