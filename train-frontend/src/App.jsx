import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowRightLeft, Search, Loader2, LogOut, 
  User, ChevronDown, Heart, Timer, Filter,
  Star, Clock, FastForward, Settings
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
  
  const [preference, setPreference] = useState('convenient');
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
        .catch(err => {
          console.error("Error fetching favorites", err);
          toast.error("Could not load your saved journeys");
        });
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
      if (favCount >= 10) {
        toast.warning("Limit reached: You can only save 10 journeys");
        return;
      }
      setFavoriteHashes(prev => [...prev, hash]);
      setFavCount(prev => prev + 1);
      toast.success("Journey saved to favorites");
    } else {
      setFavoriteHashes(prev => prev.filter(h => h !== hash));
      setFavCount(prev => prev - 1);
      toast.info("Removed from favorites");
    }
  };

  const handleSearch = async () => {
    if (!token) {
      toast.info("Please sign in to search for routes");
      return navigate('/login');
    }
    if (!source || !destination) return toast.warn("Please select both source and destination stations");
    
    setLoading(true);

    const selectedDate = new Date(date);
    const dayValue = selectedDate.getDay() === 0 ? 7 : selectedDate.getDay();

    try {
      const response = await api.post('/search', { 
        source, 
        destination, 
        preference: preference, 
        day: dayValue,
        min_buffer: 30,
        max_buffer: parseInt(maxBuffer),
        max_legs: preference === 'convenient' ? parseInt(maxLegs) : 8
      });

      const data = Array.isArray(response.data) ? response.data : [response.data];
      setResults(data);

      if (data.length === 0) {
        toast.info("No routes found for the selected criteria");
      } else {
        toast.success(`Found ${data.length} possible routes`);
      }

    } catch (err) { 
      toast.error("Search failed. Please check your connection."); 
      console.error("Search Error:", err);
    } finally { 
      setLoading(false); 
    }
  };

  const calculateTotalWait = (journey) => {
    return journey.legs.reduce((acc, leg, idx) => {
      if (idx === 0) return acc;
      return acc + (leg.dep_abs - journey.legs[idx - 1].arr_abs);
    }, 0);
  };

  const initialSorted = [...results].sort((a, b) => a.total_duration - b.total_duration);
  const fastestDuration = initialSorted[0]?.total_duration || 0;
  
  const filteredResults = initialSorted.filter(j => {
    if (results.length === 0) return true;
    return j.total_duration <= 5 * fastestDuration;
  });

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

  const preferenceInfo = {
    convenient: {
      icon: <Clock size={18} />,
      label: "Convenient",
      desc: "Uses Dijkstra's algo to find routes with the fewest transfers and balanced buffer times."
    },
    fastest: {
      icon: <FastForward size={18} />,
      label: "Earliest Arrival",
      desc: "Uses Dijkstra's algorithm to find the absolute earliest arrival time at your destination. Ignores max transfers and Buffer times."
    },
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <nav className="bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center sticky top-0 z-40">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
          <img src="/Screenshot From 2026-01-15 11-11-19.png" alt="Rail Route Icon" style={{width:'210px'}} />
        </div>
        <div className="relative" ref={dropdownRef}>
          {token ? (
            <>
              <button onClick={() => setShowUserMenu(!showUserMenu)} className="flex items-center gap-2 p-1 pr-3 bg-slate-50 rounded-full hover:bg-slate-100 border border-slate-100 transition-all">
                <div className="bg-slate-900 text-white p-2 rounded-full"><User size={18} /></div>
                <ChevronDown size={14} className={`text-slate-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
              </button>
              {showUserMenu && (
                <div className="absolute right-0 mt-3 w-56 bg-white border border-slate-100 rounded-2xl shadow-xl py-2 z-50">
                   <div className="px-4 py-2 border-b border-slate-50 mb-1">
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">User</p>
                     <p className="text-sm font-bold text-slate-700 truncate">{userEmail}</p>
                     <p className="text-[9px] font-bold text-blue-600 mt-1 uppercase">{favCount}/10 Saved</p>
                   </div>
                   <button onClick={() => navigate('/favorites')} className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 hover:bg-slate-50 text-sm font-medium"><Star size={16}/> Saved Journeys</button>
                   <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 text-sm font-bold border-t border-slate-50 mt-1"><LogOut size={16}/> Logout</button>
                </div>
              )}
            </>
          ) : <button onClick={() => navigate('/login')} className="bg-slate-900 text-white px-6 py-2 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all">Sign In</button>}
        </div>
      </nav>

      <main className="flex flex-col items-center mx-auto p-4 md:p-12 bg-[#074287] min-h-[65vh] relative" style={{ clipPath: 'ellipse(150% 100% at 50% 0%)' }}>
        <section className="bg-white w-full max-w-5xl p-8 md:p-12 rounded-[2.5rem] shadow-2xl border border-white/10 mb-12 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-6 items-end mb-8">
            <StationSearch label="Departure" placeholder="Select Source" value={source} onSelect={setSource} />
            <div className="flex justify-center pb-2">
              <button onClick={() => { setSource(destination); setDestination(source); }} className="p-4 rounded-full bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-600 hover:text-white transition-all active:scale-90"><ArrowRightLeft size={20} /></button>
            </div>
            <StationSearch label="Arrival" placeholder="Select Destination" value={destination} onSelect={setDestination} />
          </div>

          <div className="mb-10 p-6 bg-slate-50 rounded-[2rem] flex justify-start flex-wrap gap-10">
            <div className="flex flex-col w-full max-w-[300px]">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider ml-1 mb-3">Journey Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-medium outline-none" />
            </div>

            {preference === 'convenient' && (
              <div className="space-y-2 w-full max-w-[300px]">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider ml-1"><Timer size={14} /> Max Buffer</label>
              <div className="px-2 pt-4">
                <input type="range" min="30" max="480" step="30" value={maxBuffer} onChange={(e) => setMaxBuffer(e.target.value)} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                <div className="flex justify-center mt-2 font-bold text-blue-600 text-[10px]"><span>{maxBuffer / 60} hrs</span></div>
              </div>
            </div>
            )}
            
            <div className="bg-slate-50 rounded-[2rem] ">  
              {preference === 'convenient' && <TransferCounter value={maxLegs} onChange={setMaxLegs} />}
            </div>
          </div>

          <div className="flex flex-col items-center mb-10">
            <div className="flex flex-wrap gap-4 justify-center mb-4">
              {Object.keys(preferenceInfo).map((p) => (
                <button
                  key={p}
                  onClick={() => setPreference(p)}
                  className={`group relative px-6 py-3 rounded-2xl font-bold transition-all flex items-center gap-2 ${
                    preference === p 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' 
                      : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {preferenceInfo[p].icon}
                  <span className="capitalize">{preferenceInfo[p].label}</span>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 p-2 bg-slate-800 text-white text-[10px] rounded-lg shadow-xl z-50 pointer-events-none">
                    {preferenceInfo[p].desc}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                  </div>
                </button>
              ))}
            </div>
            <div className="bg-blue-50/50 border border-blue-100 rounded-xl px-4 py-2 animate-in fade-in duration-300">
              <p className="text-xs font-semibold text-blue-700 flex items-center gap-2">
                <Settings size={12} className="animate-spin-slow" />
                {preferenceInfo[preference].desc}
              </p>
            </div>
          </div>

          <div className="flex justify-center">
            <button onClick={handleSearch} disabled={loading} className="bg-[#074287] hover:bg-[#06356d] text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-lg w-full max-w-[400px]">
              {loading ? <Loader2 className="animate-spin" size={24}/> : <Search size={24}/>}
              {loading ? "Searching..." : "SEARCH TRAIN"}
            </button>
          </div>
        </section>
      </main>

      {results.length > 0 && (
        <div className="max-w-7xl mx-auto px-4 md:px-8 mt-12 pb-20">
          <div className="flex flex-col md:flex-row justify-between items-end md:items-center mb-8 gap-4">
            <div className='flex' style={{alignItems:'center'}}>
              <div className='mr-6'>
                <h2 className="text-3xl font-black text-slate-800 tracking-tight">Available Routes</h2>
                <div className="h-1 w-12 bg-blue-600 rounded-full mt-1"></div>
              </div>
              <span>
                We found <span className="font-bold text-blue-600">{finalSortedResults.length}</span> routes from <span className="font-bold text-blue-600">{source}</span> to <span className="font-bold text-blue-600">{destination}</span>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-[10px] font-black text-slate-400 bg-white px-4 py-2.5 rounded-2xl border border-slate-200">
                SAVED: <span className={favCount >= 10 ? 'text-red-500' : 'text-blue-600'}>{favCount}/10</span>
              </div>
              <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Sort By:</span>
                <div className="flex items-center gap-2">
                  <Filter size={14} className="text-blue-600"/>
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="text-sm font-bold text-slate-700 outline-none bg-transparent cursor-pointer">
                    <option value="total_duration">Shortest Time</option>
                    <option value="total_wait">Minimum Waiting</option>
                    <option value="departure_time">Earliest Departure</option>
                    <option value="arrival_time">Earliest Arrival</option>
                    <option value="legs">Minimum Changes</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {finalSortedResults.map((j) => (
              <JourneyCard 
                key={j.hash} 
                journey={j} 
                isInitiallyStarred={favoriteHashes.includes(j.hash)}
                currentFavCount={favCount}
                onFavToggle={handleFavToggle}
              />
            ))}
          </div>
        </div>
      )}
      <Footer />
    </div>
  );
};

export default App;