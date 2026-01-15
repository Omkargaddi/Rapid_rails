import React from 'react';
import { Github, Mail, Train, Info, MapPin, Twitter, ExternalLink } from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-slate-100 pt-16 pb-8 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          
          <div className="space-y-6">
            <img 
              src="/Screenshot From 2026-01-15 11-11-19.png" 
              alt="Rail Route Logo" 
              style={{ width: '180px' }} 
              className="opacity-90"
            />
            <p className="text-slate-500 text-sm leading-relaxed">
              Simplifying Indian Railway journeys with intelligent multi-leg route planning and real-time insights.
            </p>
            <div className="flex gap-4">
              <a href="#" className="p-2 bg-slate-50 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all">
                <Twitter size={18} />
              </a>
              <a href="#" className="p-2 bg-slate-50 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all">
                <Github size={18} />
              </a>
              <a href="#" className="p-2 bg-slate-50 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all">
                <Mail size={18} />
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-slate-900 font-bold text-sm uppercase tracking-wider mb-6">Navigation</h4>
            <ul className="space-y-4">
              <li><a href="/" className="text-slate-500 hover:text-blue-600 text-sm font-medium flex items-center gap-2 transition-colors">Find Routes</a></li>
              <li><a href="/favorites" className="text-slate-500 hover:text-blue-600 text-sm font-medium flex items-center gap-2 transition-colors">Saved Journeys</a></li>
              <li><a href="/schedules" className="text-slate-500 hover:text-blue-600 text-sm font-medium flex items-center gap-2 transition-colors">Live Schedules</a></li>
              <li><a href="/stations" className="text-slate-500 hover:text-blue-600 text-sm font-medium flex items-center gap-2 transition-colors">Station Index</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-slate-900 font-bold text-sm uppercase tracking-wider mb-6">Support</h4>
            <ul className="space-y-4">
              <li><a href="#" className="text-slate-500 hover:text-blue-600 text-sm font-medium flex items-center gap-2 transition-colors">Help Center</a></li>
              <li><a href="#" className="text-slate-500 hover:text-blue-600 text-sm font-medium flex items-center gap-2 transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="text-slate-500 hover:text-blue-600 text-sm font-medium flex items-center gap-2 transition-colors">Terms of Service</a></li>
              <li><a href="#" className="text-slate-500 hover:text-blue-600 text-sm font-medium flex items-center gap-2 transition-colors">Data Sources <ExternalLink size={12}/></a></li>
            </ul>
          </div>

          <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
            <h4 className="text-slate-900 font-bold text-sm mb-2">Platform Status</h4>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-tight">All Systems Operational</span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mb-4">
              Get updates on new features and engine optimizations.
            </p>
            <div className="relative">
              <input 
                type="email" 
                placeholder="Email address" 
                className="w-full pl-4 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
              <button className="absolute right-2 top-1.5 p-1 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                <Mail size={16} />
              </button>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-50 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-slate-400 text-xs font-medium">
            © {currentYear} Rail Route Engine. Built for optimized travel.
          </p>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
              <MapPin size={12} className="text-blue-500" />
              India
            </div>
            <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
              <Info size={12} className="text-blue-500" />
              v2.4.0-stable
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;