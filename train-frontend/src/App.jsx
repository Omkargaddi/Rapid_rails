import React, { useState, useEffect, useRef } from 'react';
import './App.css'
import { useNavigate } from 'react-router-dom';
import {
  ArrowRightLeft, Search, Loader2, LogOut,
  User, ChevronDown, Timer, Filter, Star
} from 'lucide-react';
import { toast } from 'react-toastify';
import api from './api/axios';
import StationSearch from './components/StationSearch';
import JourneyCard from './components/JourneyCard';
import TransferCounter from './components/TransferCounter';
import Footer from './components/Footer';

const App = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const userEmail = localStorage.getItem('userEmail');
  const dropdownRef = useRef(null);

  const [source, setSource] = useState('');
  const [destination, setDestination] = useState('');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [maxBuffer, setMaxBuffer] = useState(480);
  const [maxLegs, setMaxLegs] = useState(2);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [sortBy, setSortBy] = useState('total_duration');
  const [favoriteHashes, setFavoriteHashes] = useState([]);
  const [favCount, setFavCount] = useState(0);

  useEffect(() => {
    if (token) {
      api.get('/favorites')
        .then(res => {
          setFavoriteHashes(res.data.map(f => f.hash));
          setFavCount(res.data.length);
        })
        .catch(() => toast.error("Could not load your saved journeys"));
    }
  }, [token]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowUserMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFavToggle = (hash, isAdded) => {
    if (isAdded) {
      setFavoriteHashes(prev => [...prev, hash]);
      setFavCount(prev => prev + 1);
    } else {
      setFavoriteHashes(prev => prev.filter(h => h !== hash));
      setFavCount(prev => prev - 1);
    }
  };

  const handleSearch = async () => {
    if (!token) { toast.info("Please sign in to search for routes"); return navigate('/login'); }
    if (!source || !destination) return toast.warn("Please select both source and destination stations");
    setLoading(true);
    const selectedDate = new Date(date);
    const dayValue = selectedDate.getDay() === 0 ? 7 : selectedDate.getDay();
    try {
      const response = await api.post('/search', {
        source, destination, preference: 'convenient', day: dayValue,
        min_buffer: 30, max_buffer: parseInt(maxBuffer), max_legs: parseInt(maxLegs)
      });
      const data = Array.isArray(response.data) ? response.data : [response.data];
      setResults(data);
      if (data.length === 0) toast.info("No routes found for the selected criteria");
      else toast.success(`Found ${data.length} possible routes`);
    } catch {
      toast.error("Search failed. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalWait = (journey) =>
    journey.legs.reduce((acc, leg, idx) => {
      if (idx === 0) return acc;
      return acc + (leg.dep_abs - journey.legs[idx - 1].arr_abs);
    }, 0);

  const initialSorted = [...results].sort((a, b) => a.total_duration - b.total_duration);
  const fastestDuration = initialSorted[0]?.total_duration || 0;
  const filteredResults = initialSorted.filter(j => results.length === 0 || j.total_duration <= 5 * fastestDuration);
  const finalSortedResults = [...filteredResults].sort((a, b) => {
    if (sortBy === 'total_duration') return a.total_duration - b.total_duration;
    if (sortBy === 'departure_time') return a.legs[0].dep_abs - b.legs[0].dep_abs;
    if (sortBy === 'arrival_time') return a.legs[a.legs.length - 1].arr_abs - b.legs[b.legs.length - 1].arr_abs;
    if (sortBy === 'legs') return a.legs.length - b.legs.length;
    if (sortBy === 'total_wait') return calculateTotalWait(a) - calculateTotalWait(b);
    return 0;
  });

  const handleLogout = () => {
    localStorage.clear();
    toast.success("Logged out successfully");
    navigate('/login');
  };

  return (
    <>
      <div className="rr-root">
        <nav className="rr-nav">
          <div className="rr-nav-logo" onClick={() => navigate('/')}>
            <img src="/logo2.png" alt="Rail Route" />
          </div>

          <div style={{ position: 'relative' }} ref={dropdownRef}>
            {token ? (
              <>
                <button className="rr-user-btn" onClick={() => setShowUserMenu(!showUserMenu)}>
                  <div className="rr-avatar"><User size={16} color="#fff" /></div>
                  <ChevronDown size={14} className={`rr-caret ${showUserMenu ? 'open' : ''}`} />
                </button>

                {showUserMenu && (
                  <div className="rr-dropdown">
                    <div className="rr-dd-header">
                      <p className="rr-dd-lbl">Signed in as</p>
                      <p className="rr-dd-email">{userEmail}</p>
                      <div className="rr-dd-badge">● {favCount}/10 Saved</div>
                    </div>
                    <button className="rr-dd-item" onClick={() => navigate('/favorites')}>
                      <Star size={16} /> Saved Journeys
                    </button>
                    <button className="rr-dd-item danger" onClick={handleLogout}>
                      <LogOut size={16} /> Logout
                    </button>
                  </div>
                )}
              </>
            ) : (
              <button className="rr-signin-btn" onClick={() => navigate('/login')}>Sign In</button>
            )}
          </div>
        </nav>

        <main className="rr-hero">
          <div className="rr-blob rr-blob-1" />
          <div className="rr-blob rr-blob-2" />
          <div className="rr-blob rr-blob-3" />

          <div className="rr-badge">
            <span className="rr-badge-dot" />
            <span className="rr-badge-txt">Indian Railway Route Planner</span>
          </div>

          <h1 className="rr-h1">
            Plan Your Journey<br />
            <span className="rr-h1-accent">Smarter &amp; Faster</span>
          </h1>

          <p className="rr-hero-sub">
            Discover optimised multi-leg train routes across India's vast rail network with intelligent planning.
          </p>

          <div className="rr-card">
            <div className="rr-station-row">
              <StationSearch label="Departure" placeholder="Select Source" value={source} onSelect={setSource} />
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <button className="rr-swap" onClick={() => { setSource(destination); setDestination(source); }}>
                  <ArrowRightLeft size={20} />
                </button>
              </div>
              <StationSearch label="Arrival" placeholder="Select Destination" value={destination} onSelect={setDestination} />
            </div>

            <div className="rr-filters">
              <div className="rr-filter-item">
                <div className="rr-filter-lbl">Journey Date</div>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rr-date-input" />
              </div>

              <div className="rr-filter-item">
                <div className="rr-filter-lbl"><Timer size={13} /> Max Buffer</div>
                <div className="rr-slider-wrap">
                  <input type="range" min="30" max="480" step="30" value={maxBuffer}
                    onChange={(e) => setMaxBuffer(e.target.value)} className="rr-slider" />
                  <div className="rr-slider-val">{maxBuffer / 60} hrs</div>
                </div>
              </div>

              <div className="rr-filter-item">
                <TransferCounter value={maxLegs} onChange={setMaxLegs} />
              </div>
            </div>

            <button className="rr-search-btn" onClick={handleSearch} disabled={loading}>
              {loading ? <Loader2 size={22} className="animate-spin" /> : <Search size={22} />}
              {loading ? 'Searching Routes...' : 'SEARCH TRAINS'}
            </button>
          </div>
        </main>

        {results.length > 0 && (
          <section className="rr-results">
            <div className="rr-results-hd">
              <div>
                <div className="rr-accent-line" />
                <h2 className="rr-results-title">Available Routes</h2>
                <p className="rr-results-sub">
                  <strong>{finalSortedResults.length} routes</strong> from{' '}
                  <strong>{source}</strong> → <strong>{destination}</strong>
                </p>
              </div>

              <div className="rr-controls">
                <div className="rr-saved-pill">
                  SAVED:&nbsp;<span className={favCount >= 10 ? 'over' : ''}>{favCount}/10</span>
                </div>
                <div className="rr-sort">
                  <Filter size={14} style={{ color: '#f97316' }} />
                  <span className="rr-sort-lbl">Sort:</span>
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                    <option value="total_duration">Shortest Time</option>
                    <option value="total_wait">Minimum Waiting</option>
                    <option value="departure_time">Earliest Departure</option>
                    <option value="arrival_time">Earliest Arrival</option>
                    <option value="legs">Minimum Changes</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="rr-grid">
              {finalSortedResults.map((j) => (
                <JourneyCard
                  key={j.hash} journey={j}
                  isInitiallyStarred={favoriteHashes.includes(j.hash)}
                  currentFavCount={favCount}
                  onFavToggle={handleFavToggle}
                />
              ))}
            </div>
          </section>
        )}

        <Footer />
      </div>
    </>
  );
};

export default App;