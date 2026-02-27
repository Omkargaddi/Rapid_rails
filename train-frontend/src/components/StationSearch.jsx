import React, { useState, useRef, useEffect } from 'react';
import { MapPin, X } from 'lucide-react';
import { STATION_DATA } from '../constants/stations';
import './StationSearch.css'

const StationSearch = ({ label, placeholder, onSelect, value }) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const station = STATION_DATA.find(s => s.code === value);
    if (station) setQuery(station.name);
    else if (!value) setQuery('');
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
    if (e.key === 'ArrowDown') setSelectedIndex(p => (p < filtered.length - 1 ? p + 1 : p));
    else if (e.key === 'ArrowUp') setSelectedIndex(p => (p > 0 ? p - 1 : p));
    else if (e.key === 'Enter' && selectedIndex >= 0) handleSelect(filtered[selectedIndex]);
    else if (e.key === 'Escape') setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <>
      <div className="ss-wrap" ref={dropdownRef}>
        <label className="ss-label">{label}</label>
        <div className="ss-field">
          <MapPin size={18} className="ss-pin" style={{ color: isOpen ? '#f97316' : '#d4c4b0' }} />
          <input
            type="text" value={query} placeholder={placeholder}
            onChange={(e) => { setQuery(e.target.value); setIsOpen(true); setSelectedIndex(-1); }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            className="ss-input"
          />
          {query && (
            <button className="ss-clear" onClick={() => { setQuery(''); onSelect(''); }}>
              <X size={16} />
            </button>
          )}
        </div>

        {isOpen && filtered.length > 0 && (
          <ul className="ss-dropdown">
            <div className="ss-dropdown-hd">Matching Stations</div>
            {filtered.map((station, index) => (
              <li
                key={station.code}
                className={`ss-item ${selectedIndex === index ? 'active' : ''}`}
                onMouseEnter={() => setSelectedIndex(index)}
                onClick={() => handleSelect(station)}
              >
                <div>
                  <div className="ss-item-name">{station.name}</div>
                  <div className="ss-item-sub">India · Rail Network</div>
                </div>
                <span className="ss-code">{station.code}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
};

export default StationSearch;