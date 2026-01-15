import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldCheck, Lock, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../api/axios';

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
    } catch (error) {
      toast.error("Invalid or expired verification code.");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-xl p-8 md:p-12 border border-slate-100">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center size-16 bg-amber-50 text-amber-600 rounded-2xl mb-4"><ShieldCheck size={32} /></div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Verify Account</h1>
          <p className="text-slate-500 mt-2 font-medium">Resetting password for {email}</p>
        </div>
        <form onSubmit={handleVerify} className="space-y-5">
          <input type="text" maxLength="6" placeholder="6-Digit Code" required className="w-full px-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-center text-2xl font-black tracking-widest outline-none focus:ring-2 focus:ring-amber-500" value={formData.code} onChange={(e) => setFormData({...formData, code: e.target.value})} />
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 size-5" />
            <input type="password" placeholder="New Password" required className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-amber-500" value={formData.newPassword} onChange={(e) => setFormData({...formData, newPassword: e.target.value})} />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-amber-600 text-white font-bold py-4 rounded-2xl active:scale-95 disabled:opacity-50 transition-all flex justify-center">
            {loading ? <Loader2 className="animate-spin" /> : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default VerifyCode;