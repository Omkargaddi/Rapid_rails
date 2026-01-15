import React, { useState, useEffect } from 'react';
import { Train, Clock, ChevronRight, Star } from 'lucide-react';
import { formatAbsToAMPM, formatDuration } from '../utils/timeUtils';
import RouteModal from './RouteModal';
import api from '../api/axios';
import { toast } from 'react-toastify';

const JourneyCard = ({ journey, isInitiallyStarred, currentFavCount, onFavToggle }) => {
  const [showModal, setShowModal] = useState(false);
  const [isStarred, setIsStarred] = useState(isInitiallyStarred);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setIsStarred(isInitiallyStarred);
  }, [isInitiallyStarred]);

  const firstLeg = journey.legs[0];
  const lastLeg = journey.legs[journey.legs.length - 1];
  const changes = journey.legs.length - 1;

  const toggleFavorite = async (e) => {
    e.stopPropagation();
    if (loading) return;

    if (!isStarred && currentFavCount >= 10) {
      toast.error("Favorite limit reached (Max 10).");
      return;
    }

    setLoading(true);
    try {
      if (isStarred) {
        await api.delete(`/fav-delete/${journey.hash}`);
        setIsStarred(false);
        onFavToggle(journey.hash, false);
        toast.info("Removed from favorites");
      } else {
        await api.post('/fav-add', journey);
        setIsStarred(true);
        onFavToggle(journey.hash, true);
        toast.success("Added to favorites");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update favorites");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div 
        onClick={() => setShowModal(true)}
        className="group bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:shadow-blue-900/5 transition-all cursor-pointer relative overflow-hidden"
      >
        <div className="flex justify-between items-center mb-10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-2xl text-blue-600 group-hover:bg-[#074287] group-hover:text-white transition-all duration-300">
              <Train size={24}/>
            </div>
            <div>
              <h3 className="font-black text-slate-800 text-xl tracking-tight uppercase">{firstLeg.train_name}</h3>
              <p className="text-xs font-bold text-blue-600">#{firstLeg.train_num}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={toggleFavorite}
              disabled={loading}
              className={`p-2.5 rounded-xl border transition-all ${
                isStarred 
                ? 'bg-yellow-50 border-yellow-200 text-yellow-500' 
                : 'bg-slate-50 border-slate-100 text-slate-300 hover:text-yellow-500 hover:bg-yellow-50'
              }`}
            >
              <Star size={20} fill={isStarred ? "currentColor" : "none"} className={loading ? "animate-pulse" : ""} />
            </button>
            <span className={`px-5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm ${
              changes === 0 ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-orange-50 text-orange-600 border border-orange-100'
            }`}>
              {changes === 0 ? 'Direct' : `${changes} Conn.`}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-8 mb-10">
          <div className="flex-1">
            <p className="text-4xl font-black text-slate-900 tracking-tighter mb-1">{formatAbsToAMPM(firstLeg.dep_abs)}</p>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{firstLeg.from}</p>
          </div>

          <div className="flex-[1.5] flex flex-col items-center px-4 relative">
             <div className="px-4 py-1 bg-slate-50 rounded-full text-[11px] font-black text-slate-500 mb-4 border border-slate-100">
               {formatDuration(journey.total_duration)}
             </div>
             
             <div className="w-full h-[2px] bg-slate-200 rounded-full relative">
                <div className="absolute top-1/2 -translate-y-1/2 left-0 w-3 h-3 rounded-full bg-blue-600 border-4 border-white shadow-sm"></div>
                <div className="absolute top-1/2 -translate-y-1/2 right-0 w-3 h-3 rounded-full bg-blue-600 border-4 border-white shadow-sm"></div>
                {changes > 0 && (
                   <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-orange-400"></div>
                )}
             </div>
          </div>

          <div className="flex-1 text-right">
            <p className="text-4xl font-black text-slate-900 tracking-tighter mb-1">{formatAbsToAMPM(lastLeg.arr_abs)}</p>
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{lastLeg.to}</p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-6 border-t border-slate-50">
          <div className="flex flex-wrap gap-2">
            {journey.legs.slice(1).map((leg, i) => (
              <div key={i} className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                <Clock size={12}/> Wait {formatDuration(leg.dep_abs - journey.legs[i].arr_abs)} at {leg.from}
              </div>
            ))}
          </div>
          
          <button className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2 group-hover:translate-x-1 transition-transform">
             View Details <ChevronRight size={16}/>
          </button>
        </div>
      </div>

      {showModal && <RouteModal journey={journey} onClose={() => setShowModal(false)} />}
    </>
  );
};

export default JourneyCard;