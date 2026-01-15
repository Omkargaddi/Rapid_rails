import React from 'react';
import { X, Train, ExternalLink, Clock } from 'lucide-react';
import { formatAbsToAMPM, formatDuration } from '../utils/timeUtils';

const RouteModal = ({ journey, onClose }) => {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
          <div>
            <h3 className="text-2xl font-black text-slate-800 tracking-tight">Route Map</h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Total Journey: <span className="text-blue-600">{formatDuration(journey.total_duration)}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors shadow-sm border border-slate-100">
            <X size={20} className="text-slate-600"/>
          </button>
        </div>

        <div className="bg-[#074287] p-8 max-h-[75vh] overflow-y-auto">
          
          <div className="relative mb-12 h-20 flex items-center justify-between px-10">
            <div className="absolute top-1/2 left-10 right-10 h-[2px] bg-white/20 -translate-y-1/2"></div>
            {journey.legs.map((leg, i) => (
              <React.Fragment key={i}>
                <div className="flex flex-col items-center gap-2 relative z-10">
                  <div className={`w-4 h-4 rounded-full border-4 border-[#074287] shadow-lg ${i === 0 ? 'bg-green-400' : 'bg-white'}`}></div>
                  <span className="text-[10px] font-black text-slate-100 uppercase tracking-tighter">{leg.from}</span>
                </div>
                {i === journey.legs.length - 1 && (
                  <div className="flex flex-col items-center gap-2 relative z-10">
                    <div className="w-4 h-4 rounded-full bg-red-400 border-4 border-[#074287] shadow-lg"></div>
                    <span className="text-[10px] font-black text-slate-100 uppercase tracking-tighter">{leg.to}</span>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>

          <div className="space-y-8 relative">
            <div className="absolute left-4 top-2 bottom-2 w-[2px] bg-white/20"></div>

            {journey.legs.map((leg, idx) => {
              const waitTime = idx > 0 ? leg.dep_abs - journey.legs[idx-1].arr_abs : 0;
              return (
                <div key={idx} className="relative pl-12">
                  
                  <div className="absolute left-[11px] top-6 w-[10px] h-[10px] rounded-full bg-white border-2 border-blue-400 z-10 shadow-[0_0_10px_rgba(255,255,255,0.3)]"></div>

                  {waitTime > 0 && (
                    <div className="mb-6 -ml-4 flex items-center gap-2 text-amber-300 bg-white/10 px-4 py-1.5 rounded-xl w-fit text-[10px] font-black border border-white/10 backdrop-blur-md">
                      <Clock size={12}/> {formatDuration(waitTime)} LAYOVER AT {leg.from}
                    </div>
                  )}

                  <div className="bg-white p-6 rounded-[1.8rem] shadow-xl border border-white/10">
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex gap-4">
                        <div className="p-3 bg-blue-50 rounded-2xl text-blue-600 border border-blue-100">
                          <Train size={20}/>
                        </div>
                        <div>
                          <h4 className="font-black text-slate-800 text-lg leading-tight uppercase tracking-tight">{leg.train_name}</h4>
                          <p className="text-[10px] font-bold text-blue-600">TRAIN #{leg.train_num} • {leg.train_type}</p>
                        </div>
                      </div>
                      <a href={leg.link} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 hover:text-blue-600 transition-colors tracking-widest">
                        SCHEDULE <ExternalLink size={12}/>
                      </a>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-8 py-4 border-y border-slate-50">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Departure</p>
                        <p className="text-2xl font-black text-slate-800 tracking-tighter">{formatAbsToAMPM(leg.dep_abs)}</p>
                        <p className="text-xs font-bold text-slate-500 uppercase">{leg.from}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Arrival</p>
                        <p className="text-2xl font-black text-slate-800 tracking-tighter">{formatAbsToAMPM(leg.arr_abs)}</p>
                        <p className="text-xs font-bold text-slate-500 uppercase">{leg.to}</p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {leg.classes_available?.map(c => (
                        <span key={c} className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[9px] font-black text-slate-600 uppercase tracking-tighter">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 bg-white border-t border-slate-50 flex justify-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">End of Route</p>
        </div>
      </div>
    </div>
  );
};

export default RouteModal;