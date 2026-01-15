import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Loader2, ArrowRight, KeyRound } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../api/axios';

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
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-xl p-8 md:p-12 border border-slate-100">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center size-16 bg-blue-50 text-blue-600 rounded-2xl mb-4"><KeyRound size={32} /></div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Forgot Password?</h1>
          <p className="text-slate-500 mt-2 font-medium">Enter your email to receive a reset code</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 size-5" />
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 transition-all">
            {loading ? <Loader2 className="animate-spin" /> : "Send Reset Code"}
            {!loading && <ArrowRight size={20} />}
          </button>
        </form>
        <div className="mt-8 text-center"><Link to="/login" className="text-blue-600 font-bold hover:underline">Back to Login</Link></div>
      </div>
    </div>
  );
};

export default ForgotPassword;