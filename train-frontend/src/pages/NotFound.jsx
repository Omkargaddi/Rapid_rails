import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass, Home, ArrowLeft } from 'lucide-react';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="relative mb-8 inline-flex items-center justify-center">
          <div className="absolute inset-0 bg-blue-100 rounded-full blur-3xl opacity-50 animate-pulse"></div>
          <div className="relative size-32 bg-white rounded-full shadow-xl flex items-center justify-center border border-slate-100">
            <Compass size={64} className="text-blue-600 animate-bounce" />
          </div>
        </div>

        <h1 className="text-8xl font-black text-slate-200 mb-2 tracking-tighter">404</h1>
        <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">
          Route Not Found
        </h2>
        <p className="text-slate-500 font-medium mb-10 leading-relaxed">
          The station or page you are looking for doesn't exist in our network. 
          You might have taken a wrong turn or the link is broken.
        </p>

        {/* Navigation Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center gap-2 px-6 py-4 bg-white border border-slate-200 text-slate-700 font-bold rounded-2xl hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
          >
            <ArrowLeft size={20} />
            Go Back
          </button>
          
          <button
            onClick={() => navigate('/')}
            className="flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95"
          >
            <Home size={20} />
            Home Station
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;