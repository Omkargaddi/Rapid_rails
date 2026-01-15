import React, { useState, useRef, useEffect } from 'react';
import { Search, MapPin, X } from 'lucide-react';
import { STATION_DATA } from '../constants/stations';

const StationSearch = ({ label, placeholder, onSelect, value }) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const station = STATION_DATA.find(s => s.code === value);
    if (station) {
      setQuery(station.name);
    } else if (!value) {
      setQuery('');
    }
  }, [value]);

  const filtered = query.trim().length > 0 
    ? STATION_DATA.filter(s => 
        s.name.toLowerCase().includes(query.toLowerCase()) || 
        s.code.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 10)
    : [];

  const handleSelect = (station) => {
    setQuery(station.name);
    onSelect(station.code);
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      setSelectedIndex(prev => (prev < filtered.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      handleSelect(filtered[selectedIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <label className="block text-xs font-bold text-slate-400 uppercase tracking-[0.15em] mb-2 ml-1">
        {label}
      </label>
      
      <div className="relative group">
        <MapPin className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200 ${isOpen ? 'text-blue-500' : 'text-slate-400'}`} size={20} />
        <input
          type="text"
          value={query}
          onKeyDown={handleKeyDown}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setSelectedIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full pl-12 pr-12 py-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:bg-white focus:border-blue-500 transition-all outline-none font-medium text-slate-700"
        />
        {query && (
          <button 
            onClick={() => {setQuery(''); onSelect('');}}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {isOpen && filtered.length > 0 && (
        <ul className="absolute z-50 w-full mt-3 bg-white border border-slate-100 rounded-2xl shadow-2xl shadow-slate-200/50 overflow-hidden py-2">
          <div className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50 mb-1">
            Matching Stations
          </div>
          {filtered.map((station, index) => (
            <li
              key={station.code}
              onMouseEnter={() => setSelectedIndex(index)}
              onClick={() => handleSelect(station)}
              className={`px-4 py-3 cursor-pointer flex justify-between items-center transition-colors ${selectedIndex === index ? 'bg-blue-50 text-blue-700' : 'text-slate-600'}`}
            >
              <div className="flex flex-col">
                <span className="font-bold text-sm">{station.name}</span>
                <span className="text-[10px] opacity-70 font-semibold uppercase">India • Rail Network</span>
              </div>
              <span className={`text-xs font-black px-2 py-1 rounded-lg ${selectedIndex === index ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                {station.code}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default StationSearch;