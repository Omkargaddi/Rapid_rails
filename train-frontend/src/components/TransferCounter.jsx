import React from 'react';
import { Minus, Plus, Layers } from 'lucide-react';

const TransferCounter = ({ value, onChange }) => {
  const increment = () => value < 8 && onChange(value + 1);
  const decrement = () => value > 1 && onChange(value - 1);

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
        <Layers size={14} /> Max Transfers
      </label>
      <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
        <button 
          onClick={decrement}
          className="p-2 rounded-lg hover:bg-slate-50 text-slate-500 transition-colors disabled:opacity-30"
          disabled={value <= 1}
        >
          <Minus size={18} />
        </button>
        
        <div className="flex flex-col items-center">
          <span className="text-xl font-black text-slate-800">{value}</span>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
            {value === 1 ? 'No-transfer' : 'transfers'}
          </span>
        </div>

        <button 
          onClick={increment}
          className="p-2 rounded-lg hover:bg-slate-50 text-slate-500 transition-colors disabled:opacity-30"
          disabled={value >= 8}
        >
          <Plus size={18} />
        </button>
      </div>
    </div>
  );
};

export default TransferCounter;