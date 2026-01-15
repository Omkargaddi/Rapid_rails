import React from 'react';

const TimePicker = ({ label, value, onChange }) => {
  const [h, m] = value.split(':').map(Number);
  const hour = h % 12 || 12;
  const minute = m;
  const isPM = h >= 12;

  const handleUpdate = (newHour, newMin, newPM) => {
    let finalHour = parseInt(newHour) % 12;
    if (newPM) finalHour += 12;
    const formatted = `${String(finalHour).padStart(2, '0')}:${String(newMin).padStart(2, '0')}`;
    onChange(formatted);
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider ml-1 mb-3">{label}</label>
      <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-2 shadow-sm" style={{maxWidth:'200px'}}>
        <input 
          type="number" min="1" max="12" value={hour}
          onChange={(e) => handleUpdate(e.target.value, minute, isPM)}
          className="w-12 text-center font-bold text-slate-700 outline-none"
        />
        <span className="font-bold text-slate-400">:</span>
        <input 
          type="number" min="0" max="59" value={minute}
          onChange={(e) => handleUpdate(hour, e.target.value, isPM)}
          className="w-12 text-center font-bold text-slate-700 outline-none"
        />
        <button 
          onClick={() => handleUpdate(hour, minute, !isPM)}
          className={`px-3 py-1 rounded-lg font-bold text-xs transition-all ${isPM ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}
        >
          {isPM ? 'PM' : 'AM'}
        </button>
      </div>
    </div>
  );
};

export default TimePicker;